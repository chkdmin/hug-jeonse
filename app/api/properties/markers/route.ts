import { supabase } from "@/lib/supabase";
import { PropertyFilters } from "@/types/property";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // 필터 파라미터 파싱
    const filters: PropertyFilters = {
      sido: searchParams.get("sido")?.split(",").filter(Boolean),
      gugun: searchParams.get("gugun")?.split(",").filter(Boolean),
      minDeposit: searchParams.get("minDeposit")
        ? parseInt(searchParams.get("minDeposit")!, 10)
        : undefined,
      maxDeposit: searchParams.get("maxDeposit")
        ? parseInt(searchParams.get("maxDeposit")!, 10)
        : undefined,
      minArea: searchParams.get("minArea")
        ? parseFloat(searchParams.get("minArea")!)
        : undefined,
      maxArea: searchParams.get("maxArea")
        ? parseFloat(searchParams.get("maxArea")!)
        : undefined,
      sort: searchParams.get("sort") as PropertyFilters["sort"],
      // 페이지네이션 파라미터는 무시 (전체 조회)
      page: 1,
      limit: 10000,
    };

    // 좌표가 있는 데이터만 조회하기 위한 기본 쿼리
    // 필요한 필드만 선택하여 응답 크기 최적화
    let query = supabase
      .from("properties")
      .select(
        "id, property_name, address, deposit, area_m2, latitude, longitude, recruitment_count, applicant_count"
      )
      .not("latitude", "is", null)
      .not("longitude", "is", null);

    // 필터 적용 (기존 로직과 동일)
    if (filters.sido && filters.sido.length > 0) {
      query = query.in("sido", filters.sido);
    }

    if (filters.gugun && filters.gugun.length > 0) {
      query = query.in("gugun", filters.gugun);
    }

    if (filters.minDeposit !== undefined) {
      query = query.gte("deposit", filters.minDeposit);
    }

    if (filters.maxDeposit !== undefined) {
      query = query.lte("deposit", filters.maxDeposit);
    }

    if (filters.minArea !== undefined) {
      query = query.gte("area_m2", filters.minArea);
    }

    if (filters.maxArea !== undefined) {
      query = query.lte("area_m2", filters.maxArea);
    }

    // 데이터 조회 (최대 2000개 제한 등은 Supabase 설정이나 필요에 따라 조정 가능)
    const { data, error } = await query;

    if (error) {
      console.error("Query error:", error);
      return NextResponse.json(
        { error: "Failed to fetch markers" },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: data || [] });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
