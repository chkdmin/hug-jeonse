import * as cheerio from 'cheerio';
import * as iconv from 'iconv-lite';
import { CrawledProperty } from '@/types/property';

const BASE_URL = 'https://www.khug.or.kr/jeonse/web/s07/s070102.jsp';
const DELAY_MS = 1500;

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function parseDeposit(text: string): number {
  // "12,000" -> 12000 (만원 단위)
  const cleaned = text.replace(/[,\s]/g, '');
  return parseInt(cleaned, 10) || 0;
}

function parseArea(text: string): number {
  // "84.99㎡" -> 84.99
  const match = text.match(/[\d.]+/);
  return match ? parseFloat(match[0]) : 0;
}

function extractSidoGugun(address: string): { sido: string; gugun: string } {
  const parts = address.split(/\s+/);
  return {
    sido: parts[0] || '',
    gugun: parts[1] || '',
  };
}

async function fetchPage(pageNo: number): Promise<Buffer> {
  const formData = new URLSearchParams();
  formData.append('pageIndex', pageNo.toString());
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

  // 테이블 행 파싱 (헤더 제외)
  $('table.list tbody tr, table.list tr').each((_, row) => {
    const cells = $(row).find('td');
    if (cells.length < 6) return;

    // 상세 링크에서 공고번호 추출
    const detailLink = $(cells[1]).find('a').attr('onclick') || '';
    const match = detailLink.match(/fn_detail\('([^']+)',\s*'([^']+)'\)/);
    if (!match) return;

    const [, dt, no] = match;
    const announcement_no = `${dt}_${no}`;
    const detail_url = `https://www.khug.or.kr/jeonse/web/s07/s070103.jsp?dt=${dt}&no=${no}`;

    const property_name = $(cells[1]).text().trim();
    const address = $(cells[2]).text().trim();
    const building_type = $(cells[3]).text().trim();
    const area_m2 = parseArea($(cells[4]).text());
    const deposit = parseDeposit($(cells[5]).text());

    const { sido, gugun } = extractSidoGugun(address);

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
  // EUC-KR 인코딩 처리
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
