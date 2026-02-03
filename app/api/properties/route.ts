import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { PropertyFilters, PropertyListResponse } from '@/types/property';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // 필터 파라미터 파싱
    const filters: PropertyFilters = {
      sido: searchParams.get('sido')?.split(',').filter(Boolean),
      gugun: searchParams.get('gugun')?.split(',').filter(Boolean),
      minDeposit: searchParams.get('minDeposit')
        ? parseInt(searchParams.get('minDeposit')!, 10)
        : undefined,
      maxDeposit: searchParams.get('maxDeposit')
        ? parseInt(searchParams.get('maxDeposit')!, 10)
        : undefined,
      minArea: searchParams.get('minArea')
        ? parseFloat(searchParams.get('minArea')!)
        : undefined,
      maxArea: searchParams.get('maxArea')
        ? parseFloat(searchParams.get('maxArea')!)
        : undefined,
      sort: searchParams.get('sort') as PropertyFilters['sort'],
      page: parseInt(searchParams.get('page') || '1', 10),
      limit: parseInt(searchParams.get('limit') || '20', 10),
    };

    // 기본 쿼리 생성
    let query = supabase.from('properties').select('*', { count: 'exact' });

    // 필터 적용
    if (filters.sido && filters.sido.length > 0) {
      query = query.in('sido', filters.sido);
    }

    if (filters.gugun && filters.gugun.length > 0) {
      query = query.in('gugun', filters.gugun);
    }

    if (filters.minDeposit !== undefined) {
      query = query.gte('deposit', filters.minDeposit);
    }

    if (filters.maxDeposit !== undefined) {
      query = query.lte('deposit', filters.maxDeposit);
    }

    if (filters.minArea !== undefined) {
      query = query.gte('area_m2', filters.minArea);
    }

    if (filters.maxArea !== undefined) {
      query = query.lte('area_m2', filters.maxArea);
    }

    // 정렬 적용
    switch (filters.sort) {
      case 'competition_asc':
        query = query.order('competition_rate', { ascending: true });
        break;
      case 'competition_desc':
        query = query.order('competition_rate', { ascending: false });
        break;
      case 'deposit_asc':
        query = query.order('deposit', { ascending: true });
        break;
      case 'deposit_desc':
        query = query.order('deposit', { ascending: false });
        break;
      default:
        query = query.order('created_at', { ascending: false });
    }

    // 페이지네이션
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 20, 100);
    const offset = (page - 1) * limit;

    query = query.range(offset, offset + limit - 1);

    const { data, count, error } = await query;

    if (error) {
      console.error('Query error:', error);
      return NextResponse.json({ error: 'Failed to fetch properties' }, { status: 500 });
    }

    const response: PropertyListResponse = {
      data: data || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
