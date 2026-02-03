import * as cheerio from 'cheerio';
import * as iconv from 'iconv-lite';
import { PropertyDetail } from '@/types/property';

const DELAY_MS = 1000;

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchDetailPage(dt: string, no: string): Promise<Buffer> {
  const url = `https://www.khug.or.kr/jeonse/web/s07/s070103.jsp?dt=${dt}&no=${no}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const buffer = await response.arrayBuffer();
  return Buffer.from(buffer);
}

function parseDate(text: string): string | null {
  // "2024.01.15" or "2024-01-15" 형식
  const match = text.match(/(\d{4})[.\-/](\d{2})[.\-/](\d{2})/);
  if (match) {
    return `${match[1]}-${match[2]}-${match[3]}`;
  }
  return null;
}

function parseDetailPage(html: string): PropertyDetail {
  const $ = cheerio.load(html);

  let applicant_count = 0;
  let recruitment_count = 1;
  const images: string[] = [];
  let application_start: string | null = null;
  let application_end: string | null = null;

  // 테이블에서 정보 추출
  $('table th, table td').each((_, el) => {
    const text = $(el).text().trim();
    const nextTd = $(el).next('td').text().trim();

    // 신청자수/모집수 파싱
    if (text.includes('신청자수') || text.includes('신청현황')) {
      const match = nextTd.match(/(\d+)\s*[/명]\s*(\d+)/);
      if (match) {
        applicant_count = parseInt(match[1], 10);
        recruitment_count = parseInt(match[2], 10);
      } else {
        const singleMatch = nextTd.match(/(\d+)/);
        if (singleMatch) {
          applicant_count = parseInt(singleMatch[1], 10);
        }
      }
    }

    // 모집수 별도 파싱
    if (text.includes('모집세대') || text.includes('모집수')) {
      const match = nextTd.match(/(\d+)/);
      if (match) {
        recruitment_count = parseInt(match[1], 10);
      }
    }

    // 청약 기간 파싱
    if (text.includes('청약기간') || text.includes('신청기간')) {
      const dates = nextTd.match(/(\d{4}[.\-/]\d{2}[.\-/]\d{2})/g);
      if (dates && dates.length >= 2) {
        application_start = parseDate(dates[0]);
        application_end = parseDate(dates[1]);
      } else if (dates && dates.length === 1) {
        application_start = parseDate(dates[0]);
      }
    }
  });

  // 이미지 URL 추출 (실제 매물 이미지는 /updata/ 경로 사용)
  $('img').each((_, el) => {
    const src = $(el).attr('src');
    if (src && (src.includes('updata') || src.includes('upload') || src.includes('/cm/'))) {
      // .jpg, .png, .gif 등 이미지 파일만 추출
      if (src.match(/\.(jpg|jpeg|png|gif)$/i)) {
        let imageUrl = src;
        if (!src.startsWith('http')) {
          imageUrl = `https://www.khug.or.kr${src.startsWith('/') ? '' : '/'}${src}`;
        }
        if (!images.includes(imageUrl)) {
          images.push(imageUrl);
        }
      }
    }
  });

  return {
    applicant_count,
    recruitment_count,
    images,
    application_start,
    application_end,
  };
}

export async function crawlPropertyDetail(announcement_no: string): Promise<PropertyDetail | null> {
  try {
    const parts = announcement_no.split('_');
    if (parts.length !== 2) {
      console.error('Invalid announcement_no format:', announcement_no);
      return null;
    }

    const [dt, no] = parts;
    const buffer = await fetchDetailPage(dt, no);
    const html = iconv.decode(buffer, 'EUC-KR');
    return parseDetailPage(html);
  } catch (error) {
    console.error('Error crawling detail for', announcement_no, error);
    return null;
  }
}

export async function crawlMultipleDetails(
  announcement_nos: string[],
  onProgress?: (current: number, total: number) => void
): Promise<Map<string, PropertyDetail>> {
  const results = new Map<string, PropertyDetail>();

  for (let i = 0; i < announcement_nos.length; i++) {
    const no = announcement_nos[i];
    const detail = await crawlPropertyDetail(no);

    if (detail) {
      results.set(no, detail);
    }

    onProgress?.(i + 1, announcement_nos.length);

    if (i < announcement_nos.length - 1) {
      await delay(DELAY_MS);
    }
  }

  return results;
}
