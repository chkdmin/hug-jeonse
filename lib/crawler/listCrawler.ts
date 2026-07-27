import * as cheerio from 'cheerio';
import * as iconv from 'iconv-lite';
import type { CrawledProperty } from '@/types/property';

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

function parseApplicationPeriod(text: string): {
  application_start: string | null;
  application_end: string | null;
} {
  // "2026.07.24. 10:00 ~ 2026.08.07. 17:00" -> 2026-07-24 / 2026-08-07
  const dates: string[] = [];
  const re = /(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})/g;
  let match: RegExpExecArray | null;

  while ((match = re.exec(text)) !== null) {
    const [, y, m, d] = match;
    dates.push(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`);
  }

  return {
    application_start: dates[0] ?? null,
    application_end: dates[1] ?? null,
  };
}

async function fetchPage(pageNo: number): Promise<Buffer> {
  const formData = new URLSearchParams();
  formData.append('cur_page', pageNo.toString());
  // 사이트 변경: view_Count=Y 없이는 빈 목록이 반환됨 (조회 버튼이 설정하는 값)
  formData.append('view_Count', 'Y');
  formData.append('CMB_SIDO', 'ALL');
  formData.append('sbGugun', 'ALL');
  formData.append('BJAMT', 'ALL');
  formData.append('BJAREA', 'ALL');
  formData.append('BJORDER', 'ALL');

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
    const applicant_count = parseInt($(cells.eq(10)).text().trim(), 10) || 0; // 신청자수
    // 청약 접수기간은 목록에 이미 노출됨 ("2026.07.24. 10:00 ~ 2026.08.07. 17:00")
    const { application_start, application_end } = parseApplicationPeriod(
      $(cells.eq(2)).text()
    );

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
      applicant_count,
      application_start,
      application_end,
    });
  });

  return properties;
}

function parseTotalCount(html: string): number | null {
  // 목록 상단/하단의 "총 300건" 표기
  const $ = cheerio.load(html);
  const match = $('body').text().replace(/\s+/g, ' ').match(/총\s*([\d,]+)\s*건/);
  return match ? parseInt(match[1].replace(/,/g, ''), 10) : null;
}

/**
 * 사이트가 스스로 밝힌 전체 매물 건수.
 * 크롤 결과가 완전한지 검증하는 용도 (조기 종료/빈 응답 감지).
 */
export async function fetchListTotalCount(): Promise<number | null> {
  const buffer = await fetchPage(1);
  const html = iconv.decode(buffer, 'EUC-KR');
  return parseTotalCount(html);
}

export async function crawlListPage(pageNo: number): Promise<CrawledProperty[]> {
  const buffer = await fetchPage(pageNo);
  // 허그 사이트는 EUC-KR 인코딩 사용
  const html = iconv.decode(buffer, 'EUC-KR');
  return parsePage(html);
}

export interface CrawlAllPagesResult {
  properties: CrawledProperty[];
  /** fetch/파싱에 실패한 페이지 번호. 비어있지 않으면 목록이 불완전하다는 뜻이다. */
  failedPages: number[];
}

export async function crawlAllPages(
  maxPages: number = 70,
  onProgress?: (page: number, total: number) => void,
  startPage: number = 1
): Promise<CrawlAllPagesResult> {
  const allProperties: CrawledProperty[] = [];
  const failedPages: number[] = [];

  for (let page = startPage; page <= maxPages; page++) {
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
      // 에러 발생 시에도 계속 진행하되, 목록이 불완전함을 호출자에게 알린다
      failedPages.push(page);
      await delay(DELAY_MS * 2);
    }
  }

  return { properties: allProperties, failedPages };
}
