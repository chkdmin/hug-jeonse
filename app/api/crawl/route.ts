import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import {
  crawlAllPages,
  crawlPropertyDetail,
  fetchListTotalCount,
  geocodeAddress,
} from '@/lib/crawler';
import { CrawledProperty } from '@/types/property';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5분 타임아웃 (Vercel Pro 기준)

// 사이트 목록은 한 페이지에 10건씩 보여준다
const LIST_PAGE_SIZE = 10;

// 목록 수집 시 한 작업이 맡는 페이지 수. 작업들은 동시에 실행된다.
const PAGES_PER_RANGE = 10;

// 신규 매물 1건 처리에 4~5회의 네트워크 왕복이 필요하고, 그중 허그 상세 페이지가
// 3~4초 걸린다. 제한된 동시성으로 처리한다 (허그/카카오 부하 고려해 낮게 유지).
const UPSERT_CONCURRENCY = 5;

// Vercel이 maxDuration에 함수를 강제 종료하면 응답이 사라져 액션이 실패로 기록된다.
// 여유를 두고 신규 매물 처리를 멈춘 뒤 정상 응답하고, 남은 매물은 다음 실행이 이어받는다.
const HEAVY_WORK_BUDGET_MS = (maxDuration - 60) * 1000;

const BULK_UPSERT_CHUNK_SIZE = 500;

type SupabaseClient = ReturnType<typeof createServerSupabaseClient>;

interface ExistingRow {
  id: number;
  announcement_no: string;
  latitude: number | null;
  longitude: number | null;
}

async function mapWithConcurrency<T>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<void>
): Promise<void> {
  let cursor = 0;

  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      await fn(items[index]);
    }
  });

  await Promise.all(workers);
}

function splitPageRanges(startPage: number, endPage: number, pagesPerRange: number) {
  const ranges: { start: number; end: number }[] = [];
  for (let start = startPage; start <= endPage; start += pagesPerRange) {
    ranges.push({ start, end: Math.min(start + pagesPerRange - 1, endPage) });
  }
  return ranges;
}

// 신규 매물: 좌표 + 상세 정보까지 채워서 저장
async function upsertProperty(supabase: SupabaseClient, property: CrawledProperty) {
  const coords = await geocodeAddress(property.address);
  const detail = await crawlPropertyDetail(property.announcement_no);

  const propertyData = {
    ...property,
    latitude: coords?.latitude ?? null,
    longitude: coords?.longitude ?? null,
    recruitment_count: detail?.recruitment_count ?? 1,
    images: detail?.images ?? [],
    // 접수기간은 목록에서 파싱한 값을 우선 사용 (상세 페이지 라벨/형식이 자주 바뀜)
    application_start: property.application_start ?? detail?.application_start ?? null,
    application_end: property.application_end ?? detail?.application_end ?? null,
  };

  const { error } = await supabase
    .from('properties')
    .upsert(propertyData, { onConflict: 'announcement_no' });

  if (error) {
    console.error('Upsert error:', error);
    throw error;
  }

  return propertyData;
}

// 기존 매물: 목록에서 바뀌는 값(신청자수 등)만 일괄 갱신한다.
// 상세 페이지(이미지/모집수)와 좌표는 회차 중에 바뀌지 않으므로 다시 가져오지 않는다.
// 매번 상세를 전부 다시 가져오면 900건 회차에서 300초 제한을 넘는다.
async function refreshListFields(
  supabase: SupabaseClient,
  properties: CrawledProperty[]
): Promise<{ processed: number; errors: number }> {
  let processed = 0;
  let errors = 0;

  for (let i = 0; i < properties.length; i += BULK_UPSERT_CHUNK_SIZE) {
    const chunk = properties.slice(i, i + BULK_UPSERT_CHUNK_SIZE);
    const { error } = await supabase
      .from('properties')
      .upsert(chunk, { onConflict: 'announcement_no' });

    if (!error) {
      processed += chunk.length;
      continue;
    }

    // 한 행의 오류가 청크 전체를 막지 않도록 행 단위로 다시 시도해 문제 행만 걸러낸다
    console.error('Bulk upsert error, retrying row by row:', error);
    for (const property of chunk) {
      const { error: rowError } = await supabase
        .from('properties')
        .upsert(property, { onConflict: 'announcement_no' });

      if (rowError) {
        console.error(`Error refreshing ${property.announcement_no}:`, rowError);
        errors++;
      } else {
        processed++;
      }
    }
  }

  return { processed, errors };
}

async function fetchExistingRows(supabase: SupabaseClient): Promise<ExistingRow[]> {
  // Supabase는 한 번에 최대 1000행만 반환하므로 페이지네이션으로 전량 조회
  const rows: ExistingRow[] = [];
  const PAGE_SIZE = 1000;

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('properties')
      .select('id, announcement_no, latitude, longitude')
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;
    if (!data || data.length === 0) break;

    rows.push(...data);
    if (data.length < PAGE_SIZE) break;
  }

  return rows;
}

// 현재 모집 회차에 없는 매물(=접수 종료된 지난 회차) 삭제
async function cleanupStaleProperties(
  supabase: SupabaseClient,
  existingRows: ExistingRow[],
  activeAnnouncementNos: Set<string>
): Promise<number> {
  const stale = existingRows.filter(row => !activeAnnouncementNos.has(row.announcement_no));
  if (stale.length === 0) return 0;

  const CHUNK_SIZE = 200;
  for (let i = 0; i < stale.length; i += CHUNK_SIZE) {
    const ids = stale.slice(i, i + CHUNK_SIZE).map(row => row.id);
    const { error } = await supabase.from('properties').delete().in('id', ids);
    if (error) throw error;
  }

  return stale.length;
}

export async function POST(request: Request) {
  const startedAt = Date.now();

  try {
    // 인증 확인 (Vercel Cron 또는 관리자만 접근 가능)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerSupabaseClient();

    // URL에서 옵션 파싱
    const { searchParams } = new URL(request.url);
    const startPage = parseInt(searchParams.get('startPage') || '1', 10);
    const endPageParam = searchParams.get('endPage');
    const skipDetail = searchParams.get('skipDetail') === 'true';
    const parallel = searchParams.get('parallel') !== 'false'; // 기본값 true
    const cleanup = searchParams.get('cleanup') !== 'false'; // 기본값 true

    // 회차마다 매물 수가 다르므로(700 -> 300 -> 900건) 마지막 페이지를 사이트가 밝힌
    // 총 건수로 정한다. 이 값은 정리 단계에서 크롤 결과가 온전한지 검증하는 데도 쓴다.
    const expectedTotal = await fetchListTotalCount();
    const sitePages = expectedTotal === null ? null : Math.ceil(expectedTotal / LIST_PAGE_SIZE);
    const endPage = endPageParam ? parseInt(endPageParam, 10) : sitePages;

    if (endPage === null) {
      return NextResponse.json(
        { error: 'Could not read site total count - crawler may be broken' },
        { status: 500 }
      );
    }

    console.log(
      `Starting crawl: pages ${startPage}-${endPage} (site total ${expectedTotal}), parallel=${parallel}, skipDetail=${skipDetail}`
    );

    // ------------------------------------------------------------------
    // 1단계: 목록 수집 (저렴). 상세/geocoding보다 먼저 끝내서, 뒤 단계가
    //        타임아웃되더라도 만료 매물 정리는 반드시 수행되도록 한다.
    // ------------------------------------------------------------------
    const ranges = parallel
      ? splitPageRanges(startPage, endPage, PAGES_PER_RANGE)
      : [{ start: startPage, end: endPage }];

    const listResults = await Promise.all(
      ranges.map(({ start, end }) => crawlAllPages(end, undefined, start))
    );

    const failedPages = listResults.flatMap(r => r.failedPages);

    // 사이트 목록에 같은 매물이 두 번 실릴 수 있으므로 중복 제거
    const byAnnouncementNo = new Map<string, CrawledProperty>();
    for (const result of listResults) {
      for (const property of result.properties) {
        byAnnouncementNo.set(property.announcement_no, property);
      }
    }
    const properties = [...byAnnouncementNo.values()];
    const activeAnnouncementNos = new Set(byAnnouncementNo.keys());

    console.log(`List crawl done: ${activeAnnouncementNos.size} unique properties`);

    // 0건 크롤링은 사이트 구조 변경 등 크롤러 고장 신호 -> 에러로 처리해서 액션이 감지하게 함
    if (properties.length === 0) {
      return NextResponse.json(
        { error: 'Crawl returned 0 properties - crawler may be broken' },
        { status: 500 }
      );
    }

    // ------------------------------------------------------------------
    // 2단계: 지난 회차 정리. 전체 크롤링이 온전히 끝났을 때만 수행한다.
    //        부분 범위 크롤링이나 목록 누락이 있으면 삭제하면 안 된다.
    // ------------------------------------------------------------------
    const existingRows = await fetchExistingRows(supabase);
    const isFullCrawl = startPage === 1 && sitePages !== null && endPage >= sitePages;
    let removed = 0;
    let cleanupSkippedReason: string | null = null;

    if (!cleanup) {
      cleanupSkippedReason = 'cleanup=false';
    } else if (expectedTotal === null) {
      cleanupSkippedReason = 'could not read site total count';
    } else if (!isFullCrawl) {
      cleanupSkippedReason = `partial crawl (pages ${startPage}-${endPage} of ${sitePages})`;
    } else if (failedPages.length > 0) {
      cleanupSkippedReason = `incomplete list (failed pages: ${failedPages.join(', ')})`;
    } else if (activeAnnouncementNos.size < expectedTotal) {
      // 사이트가 밝힌 총 건수와 대조해 조기 종료/빈 응답으로 인한 오삭제를 막는다.
      // 동시 요청 시 사이트 페이지네이션이 간헐적으로 매물을 누락시키므로,
      // 부족하면 삭제하지 않고 건너뛴다 (매시간 재시도되므로 자동 복구).
      cleanupSkippedReason = `incomplete list (crawled ${activeAnnouncementNos.size} < site total ${expectedTotal})`;
    } else {
      removed = await cleanupStaleProperties(supabase, existingRows, activeAnnouncementNos);
      console.log(`Cleanup: removed ${removed} stale properties`);
    }

    if (cleanupSkippedReason) {
      console.log(`Cleanup skipped: ${cleanupSkippedReason}`);
    }

    // ------------------------------------------------------------------
    // 3단계: 기존 매물은 목록 값만 일괄 갱신 (저렴)
    // ------------------------------------------------------------------
    const existingByNo = new Map(existingRows.map(row => [row.announcement_no, row]));
    const knownProperties = properties.filter(p => existingByNo.has(p.announcement_no));
    const newProperties = properties.filter(p => !existingByNo.has(p.announcement_no));

    const refreshed = await refreshListFields(supabase, knownProperties);
    let processed = refreshed.processed;
    let errors = refreshed.errors;

    // ------------------------------------------------------------------
    // 4단계: 신규 매물 상세/좌표 채우기 (무거움). 시간 예산을 넘기면 멈추고,
    //        남은 매물은 다음 실행에서 여전히 "신규"로 잡혀 이어서 처리된다.
    // ------------------------------------------------------------------
    // 좌표를 못 찾았던 기존 매물은 geocoding만 다시 시도한다
    const missingCoords = knownProperties.filter(p => {
      const row = existingByNo.get(p.announcement_no);
      return !row?.latitude || !row?.longitude;
    });

    const deadline = startedAt + HEAVY_WORK_BUDGET_MS;
    let inserted = 0;
    let deferred = 0;

    await mapWithConcurrency(newProperties, UPSERT_CONCURRENCY, async property => {
      if (Date.now() > deadline) {
        deferred++;
        return;
      }

      try {
        if (skipDetail) {
          const coords = await geocodeAddress(property.address);
          const { error } = await supabase.from('properties').insert({
            ...property,
            latitude: coords?.latitude,
            longitude: coords?.longitude,
            recruitment_count: 1,
            images: [],
          });
          if (error) throw error;
        } else {
          await upsertProperty(supabase, property);
        }
        inserted++;
        processed++;
      } catch (error) {
        console.error(`Error processing ${property.announcement_no}:`, error);
        errors++;
      }
    });

    let geocoded = 0;
    await mapWithConcurrency(missingCoords, UPSERT_CONCURRENCY, async property => {
      if (Date.now() > deadline) return;

      const coords = await geocodeAddress(property.address);
      if (!coords) return;

      const { error } = await supabase
        .from('properties')
        .update({ latitude: coords.latitude, longitude: coords.longitude })
        .eq('announcement_no', property.announcement_no);

      if (error) {
        console.error(`Error geocoding ${property.announcement_no}:`, error);
      } else {
        geocoded++;
      }
    });

    console.log(
      `Crawl completed: ${processed} processed (${inserted} new), ${errors} errors, ${deferred} deferred`
    );

    return NextResponse.json({
      success: true,
      message: `Crawl completed`,
      stats: {
        total: processed + errors + deferred,
        processed,
        inserted,
        errors,
        deferred,
        geocoded,
        active: activeAnnouncementNos.size,
        removed,
        cleanupSkippedReason,
        elapsedSec: Math.round((Date.now() - startedAt) / 1000),
      },
    });
  } catch (error) {
    console.error('Crawl error:', error);
    return NextResponse.json(
      { error: 'Crawl failed', details: String(error) },
      { status: 500 }
    );
  }
}

// Vercel Cron에서 호출될 때 사용
export async function GET(request: Request) {
  // Cron job 인증 확인
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // POST로 리다이렉트
  return POST(request);
}
