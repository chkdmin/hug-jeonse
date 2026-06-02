import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { FilterOptions } from '@/types/property';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 시도 목록 조회
    const { data: sidoData, error: sidoError } = await supabase
      .from('properties')
      .select('sido')
      .not('sido', 'is', null)
      .not('sido', 'eq', '');

    if (sidoError) {
      console.error('Sido query error:', sidoError);
      return NextResponse.json({ error: 'Failed to fetch sido list' }, { status: 500 });
    }

    // 중복 제거된 시도 목록
    const sidoSet = new Set(sidoData?.map(item => item.sido).filter(Boolean));
    const sido = Array.from(sidoSet).sort();

    // 시도별 구군 목록 조회
    const { data: gugunData, error: gugunError } = await supabase
      .from('properties')
      .select('sido, gugun')
      .not('gugun', 'is', null)
      .not('gugun', 'eq', '');

    if (gugunError) {
      console.error('Gugun query error:', gugunError);
      return NextResponse.json({ error: 'Failed to fetch gugun list' }, { status: 500 });
    }

    // 시도별 구군 그룹화
    const gugun: Record<string, string[]> = {};
    gugunData?.forEach(item => {
      if (item.sido && item.gugun) {
        if (!gugun[item.sido]) {
          gugun[item.sido] = [];
        }
        if (!gugun[item.sido].includes(item.gugun)) {
          gugun[item.sido].push(item.gugun);
        }
      }
    });

    // 각 시도의 구군 정렬
    Object.keys(gugun).forEach(key => {
      gugun[key].sort();
    });

    // 보증금 범위 조회
    const { data: depositData, error: depositError } = await supabase
      .from('properties')
      .select('deposit')
      .not('deposit', 'is', null)
      .order('deposit', { ascending: true });

    if (depositError) {
      console.error('Deposit query error:', depositError);
      return NextResponse.json({ error: 'Failed to fetch deposit range' }, { status: 500 });
    }

    const deposits = depositData?.map(item => item.deposit).filter(d => d != null) || [];
    const depositRange = {
      min: deposits.length > 0 ? Math.min(...deposits) : 0,
      max: deposits.length > 0 ? Math.max(...deposits) : 0,
    };

    // 면적 범위 조회
    const { data: areaData, error: areaError } = await supabase
      .from('properties')
      .select('area_m2')
      .not('area_m2', 'is', null)
      .order('area_m2', { ascending: true });

    if (areaError) {
      console.error('Area query error:', areaError);
      return NextResponse.json({ error: 'Failed to fetch area range' }, { status: 500 });
    }

    const areas = areaData?.map(item => item.area_m2).filter(a => a != null) || [];
    const areaRange = {
      min: areas.length > 0 ? Math.min(...areas) : 0,
      max: areas.length > 0 ? Math.max(...areas) : 0,
    };

    // 경쟁률 범위 조회
    const { data: competitionRateData, error: competitionRateError } = await supabase
      .from('properties')
      .select('competition_rate')
      .not('competition_rate', 'is', null)
      .order('competition_rate', { ascending: true });

    if (competitionRateError) {
      console.error('Competition rate query error:', competitionRateError);
      return NextResponse.json({ error: 'Failed to fetch competition rate range' }, { status: 500 });
    }

    const competitionRates = competitionRateData?.map(item => item.competition_rate).filter(r => r != null) || [];
    const competitionRateRange = {
      min: competitionRates.length > 0 ? Math.min(...competitionRates) : 0,
      max: competitionRates.length > 0 ? Math.max(...competitionRates) : 0,
    };

    const response: FilterOptions = {
      sido,
      gugun,
      depositRange,
      areaRange,
      competitionRateRange,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
