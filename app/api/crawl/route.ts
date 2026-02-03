import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { crawlAllPages, crawlPropertyDetail, geocodeAddress } from '@/lib/crawler';
import { CrawledProperty } from '@/types/property';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5분 타임아웃 (Vercel Pro 기준)

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
    application_start: detail?.application_start,
    application_end: detail?.application_end,
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

// 페이지 범위별 크롤링 작업
async function crawlPageRange(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  startPage: number,
  endPage: number,
  skipDetail: boolean
): Promise<{ processed: number; errors: number }> {
  const properties = await crawlAllPages(endPage, undefined, startPage);

  let processed = 0;
  let errors = 0;

  for (const property of properties) {
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
  }

  return { processed, errors };
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

    console.log(`Starting crawl: pages ${startPage}-${endPage}, parallel=${parallel}, skipDetail=${skipDetail}`);

    let totalProcessed = 0;
    let totalErrors = 0;

    if (parallel && startPage === 1 && endPage === 70) {
      // 병렬 크롤링: 7개 범위로 나눠서 동시 실행
      const ranges = [
        { start: 1, end: 10 },
        { start: 11, end: 20 },
        { start: 21, end: 30 },
        { start: 31, end: 40 },
        { start: 41, end: 50 },
        { start: 51, end: 60 },
        { start: 61, end: 70 },
      ];

      console.log('Running parallel crawl with 7 workers...');

      const results = await Promise.all(
        ranges.map(({ start, end }) => crawlPageRange(supabase, start, end, skipDetail))
      );

      for (const result of results) {
        totalProcessed += result.processed;
        totalErrors += result.errors;
      }
    } else {
      // 순차 크롤링 (특정 범위 지정 시)
      const result = await crawlPageRange(supabase, startPage, endPage, skipDetail);
      totalProcessed = result.processed;
      totalErrors = result.errors;
    }

    console.log(`Crawl completed: ${totalProcessed} processed, ${totalErrors} errors`);

    return NextResponse.json({
      success: true,
      message: `Crawl completed`,
      stats: {
        total: totalProcessed + totalErrors,
        processed: totalProcessed,
        errors: totalErrors,
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
