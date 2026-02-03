import * as cheerio from 'cheerio';
import * as iconv from 'iconv-lite';
import { CrawledProperty } from '@/types/property';

const BASE_URL = 'https://www.khug.or.kr/jeonse/web/s07/s070102.jsp';
const DELAY_MS = 1500;

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function parseDeposit(text: string): number {
  // "37,800,000" -> 3780 (만원 단위로 변환)
  const cleaned = text.replace(/[,\s원]/g, '');
  const won = parseInt(cleaned, 10) || 0;
  return Math.round(won / 10000); // 원 -> 만원
}

function parseArea(text: string): number {
  // "16.56" -> 16.56
  const match = text.match(/[\d.]+/);
  return match ? parseFloat(match[0]) : 0;
}

function cleanText(text: string): string {
  // 연속된 공백을 하나로 정리
  return text.replace(/\s+/g, ' ').trim();
}

async function fetchPage(pageNo: number): Promise<Buffer> {
  const formData = new URLSearchParams();
  formData.append('cur_page', pageNo.toString());
  formData.append('searchCondition', '');
  formData.append('searchKeyword', '');

  const response = await fetch(BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
    body: formData.toString(),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const buffer = await response.arrayBuffer();
  return Buffer.from(buffer);
}

function parsePage(html: string): CrawledProperty[] {
  const $ = cheerio.load(html);
  const properties: CrawledProperty[] = [];

  // 테이블 행 파싱 - 새로운 구조: table.d_board.d_list 또는 .d_list
  $('table.d_list tbody tr, table.d_board tbody tr, .d_list tbody tr').each((_, row) => {
    const cells = $(row).find('td');
    if (cells.length < 10) return;

    // 6번째 td에서 상세 링크 추출 (a 태그의 href)
    const detailLink = $(cells.eq(5)).find('a').attr('href') || '';
    // href 예: s070103.jsp?dt=20260130&no=2022158113
    const match = detailLink.match(/dt=(\d+)&no=(\d+)/);
    if (!match) return;

    const [, dt, no] = match;
    const announcement_no = `${dt}_${no}`;
    const detail_url = `https://www.khug.or.kr/jeonse/web/s07/s070103.jsp?dt=${dt}&no=${no}`;

    // 데이터 추출 (새로운 인덱스)
    const address = cleanText($(cells.eq(5)).text()); // 주소
    const sido = cleanText($(cells.eq(3)).text()); // 시도
    const gugun = cleanText($(cells.eq(4)).text()); // 구군
    const building_type = cleanText($(cells.eq(6)).text()); // 건물유형
    const area_m2 = parseArea($(cells.eq(8)).text()); // 면적
    const deposit = parseDeposit($(cells.eq(9)).text()); // 보증금 (원 -> 만원)

    // 물건명 = 주소로 사용 (별도 물건명이 없음)
    const property_name = address;

    properties.push({
      announcement_no,
      property_name,
      address,
      building_type,
      area_m2,
      deposit,
      detail_url,
      sido,
      gugun,
    });
  });

  return properties;
}

export async function crawlListPage(pageNo: number): Promise<CrawledProperty[]> {
  const buffer = await fetchPage(pageNo);
  // 허그 사이트는 EUC-KR 인코딩 사용
  const html = iconv.decode(buffer, 'EUC-KR');
  return parsePage(html);
}

export async function crawlAllPages(
  maxPages: number = 70,
  onProgress?: (page: number, total: number) => void
): Promise<CrawledProperty[]> {
  const allProperties: CrawledProperty[] = [];

  for (let page = 1; page <= maxPages; page++) {
    try {
      const properties = await crawlListPage(page);

      if (properties.length === 0) {
        console.log(`Page ${page}: No more data, stopping.`);
        break;
      }

      allProperties.push(...properties);
      onProgress?.(page, maxPages);
      console.log(`Page ${page}/${maxPages}: ${properties.length} properties found`);

      if (page < maxPages) {
        await delay(DELAY_MS);
      }
    } catch (error) {
      console.error(`Error crawling page ${page}:`, error);
      // 에러 발생 시에도 계속 진행
      await delay(DELAY_MS * 2);
    }
  }

  return allProperties;
}
