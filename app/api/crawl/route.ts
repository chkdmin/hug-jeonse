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

// 매물 1건 처리에 4~5회의 네트워크 왕복이 필요하다. 순차 처리하면 300건이
// 타임아웃을 넘기므로 제한된 동시성으로 처리한다 (허그/카카오 부하 고려해 낮게 유지).
const UPSERT_CONCURRENCY = 5;

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

async function upsertProperty(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  property: CrawledProperty
) {
  // 기존 데이터 확인
  const { data: existing } = await supabase
    .from('properties')
    .select('id, latitude, longitude')
    .eq('announcement_no', property.announcement_no)
    .single();

  // 좌표가 없는 경우에만 geocoding 수행
  let latitude = existing?.latitude;
  let longitude = existing?.longitude;

  if (!latitude || !longitude) {
    const coords = await geocodeAddress(property.address);
    if (coords) {
      latitude = coords.latitude;
      longitude = coords.longitude;
    }
  }

  // 상세 정보 크롤링
  const detail = await crawlPropertyDetail(property.announcement_no);

  const propertyData = {
    announcement_no: property.announcement_no,
    property_name: property.property_name,
    address: property.address,
    building_type: property.building_type,
    area_m2: property.area_m2,
    deposit: property.deposit,
    detail_url: property.detail_url,
    sido: property.sido,
    gugun: property.gugun,
    latitude,
    longitude,
    applicant_count: property.applicant_count,
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

// 현재 모집 회차에 없는 매물(=접수 종료된 지난 회차) 삭제
async function cleanupStaleProperties(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  activeAnnouncementNos: Set<string>
): Promise<number> {
  // Supabase는 한 번에 최대 1000행만 반환하므로 페이지네이션으로 전량 조회
  const existing: { id: number; announcement_no: string }[] = [];
  const PAGE_SIZE = 1000;

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('properties')
      .select('id, announcement_no')
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;
    if (!data || data.length === 0) break;

    existing.push(...data);
    if (data.length < PAGE_SIZE) break;
  }

  const stale = existing.filter(row => !activeAnnouncementNos.has(row.announcement_no));
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
    const endPage = parseInt(searchParams.get('endPage') || '70', 10);
    const skipDetail = searchParams.get('skipDetail') === 'true';
    const parallel = searchParams.get('parallel') !== 'false'; // 기본값 true
    const cleanup = searchParams.get('cleanup') !== 'false'; // 기본값 true

    console.log(
      `Starting crawl: pages ${startPage}-${endPage}, parallel=${parallel}, skipDetail=${skipDetail}`
    );

    // ------------------------------------------------------------------
    // 1단계: 목록 수집 (저렴). 상세/geocoding보다 먼저 끝내서, 뒤 단계가
    //        타임아웃되더라도 만료 매물 정리는 반드시 수행되도록 한다.
    // ------------------------------------------------------------------
    const ranges =
      parallel && startPage === 1 && endPage === 70
        ? [
            { start: 1, end: 10 },
            { start: 11, end: 20 },
            { start: 21, end: 30 },
            { start: 31, end: 40 },
            { start: 41, end: 50 },
            { start: 51, end: 60 },
            { start: 61, end: 70 },
          ]
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
    const isFullCrawl = startPage === 1 && endPage >= 70;
    let removed = 0;
    let cleanupSkippedReason: string | null = null;

    if (!cleanup) {
      cleanupSkippedReason = 'cleanup=false';
    } else if (!isFullCrawl) {
      cleanupSkippedReason = `partial crawl (pages ${startPage}-${endPage})`;
    } else if (failedPages.length > 0) {
      cleanupSkippedReason = `incomplete list (failed pages: ${failedPages.join(', ')})`;
    } else {
      // 사이트가 밝힌 총 건수와 대조해 조기 종료/빈 응답으로 인한 오삭제를 막는다.
      // 동시 요청 시 사이트 페이지네이션이 간헐적으로 매물을 누락시키므로,
      // 부족하면 삭제하지 않고 건너뛴다 (매시간 재시도되므로 자동 복구).
      const expectedTotal = await fetchListTotalCount();

      if (expectedTotal === null) {
        cleanupSkippedReason = 'could not read site total count';
      } else if (activeAnnouncementNos.size < expectedTotal) {
        cleanupSkippedReason = `incomplete list (crawled ${activeAnnouncementNos.size} < site total ${expectedTotal})`;
      } else {
        removed = await cleanupStaleProperties(supabase, activeAnnouncementNos);
        console.log(`Cleanup: removed ${removed} stale properties`);
      }
    }

    if (cleanupSkippedReason) {
      console.log(`Cleanup skipped: ${cleanupSkippedReason}`);
    }

    // ------------------------------------------------------------------
    // 3단계: 상세 정보/좌표 채우기 (무거움). 타임아웃되면 다음 실행이 이어받는다.
    // ------------------------------------------------------------------
    let processed = 0;
    let errors = 0;

    await mapWithConcurrency(properties, UPSERT_CONCURRENCY, async property => {
      try {
        if (skipDetail) {
          const { data: existing } = await supabase
            .from('properties')
            .select('id')
            .eq('announcement_no', property.announcement_no)
            .single();

          if (!existing) {
            const coords = await geocodeAddress(property.address);
            await supabase.from('properties').insert({
              ...property,
              latitude: coords?.latitude,
              longitude: coords?.longitude,
              recruitment_count: 1,
              images: [],
            });
          }
        } else {
          await upsertProperty(supabase, property);
        }
        processed++;
      } catch (error) {
        console.error(`Error processing ${property.announcement_no}:`, error);
        errors++;
      }
    });

    console.log(`Crawl completed: ${processed} processed, ${errors} errors`);

    return NextResponse.json({
      success: true,
      message: `Crawl completed`,
      stats: {
        total: processed + errors,
        processed,
        errors,
        active: activeAnnouncementNos.size,
        removed,
        cleanupSkippedReason,
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
