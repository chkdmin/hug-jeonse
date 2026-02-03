'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Property, PropertyFilters, FilterOptions, PropertyListResponse } from '@/types/property';
import { useFavorites } from '@/hooks/useFavorites';
import FilterPanel from '@/components/Filters/FilterPanel';
import PropertyList from '@/components/PropertyList/PropertyList';
import PropertyDetailModal from '@/components/PropertyDetail/PropertyDetailModal';

// KakaoMap은 SSR에서 window 객체가 없어서 클라이언트에서만 로드
const KakaoMap = dynamic(() => import('@/components/Map/KakaoMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-100">
      <p className="text-gray-500">지도를 불러오는 중...</p>
    </div>
  ),
});

export default function Home() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // 상태
  const [properties, setProperties] = useState<Property[]>([]);
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [selectedMapPropertyId, setSelectedMapPropertyId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'list' | 'map'>('list');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  // 즐겨찾기
  const { favorites, isFavorite, toggleFavorite, count: favoritesCount } = useFavorites();

  // URL에서 필터 상태 읽기
  const getFiltersFromUrl = useCallback((): PropertyFilters => {
    return {
      sido: searchParams.get('sido')?.split(',').filter(Boolean) || [],
      gugun: searchParams.get('gugun')?.split(',').filter(Boolean) || [],
      minDeposit: searchParams.get('minDeposit') ? parseInt(searchParams.get('minDeposit')!, 10) : undefined,
      maxDeposit: searchParams.get('maxDeposit') ? parseInt(searchParams.get('maxDeposit')!, 10) : undefined,
      minArea: searchParams.get('minArea') ? parseFloat(searchParams.get('minArea')!) : undefined,
      maxArea: searchParams.get('maxArea') ? parseFloat(searchParams.get('maxArea')!) : undefined,
      sort: (searchParams.get('sort') as PropertyFilters['sort']) || undefined,
      page: parseInt(searchParams.get('page') || '1', 10),
      limit: parseInt(searchParams.get('limit') || '20', 10),
    };
  }, [searchParams]);

  const [filters, setFilters] = useState<PropertyFilters>(getFiltersFromUrl);

  // URL 업데이트
  const updateUrl = useCallback((newFilters: PropertyFilters) => {
    const params = new URLSearchParams();

    if (newFilters.sido && newFilters.sido.length > 0) {
      params.set('sido', newFilters.sido.join(','));
    }
    if (newFilters.gugun && newFilters.gugun.length > 0) {
      params.set('gugun', newFilters.gugun.join(','));
    }
    if (newFilters.minDeposit !== undefined) {
      params.set('minDeposit', String(newFilters.minDeposit));
    }
    if (newFilters.maxDeposit !== undefined) {
      params.set('maxDeposit', String(newFilters.maxDeposit));
    }
    if (newFilters.minArea !== undefined) {
      params.set('minArea', String(newFilters.minArea));
    }
    if (newFilters.maxArea !== undefined) {
      params.set('maxArea', String(newFilters.maxArea));
    }
    if (newFilters.sort) {
      params.set('sort', newFilters.sort);
    }
    if (newFilters.page && newFilters.page > 1) {
      params.set('page', String(newFilters.page));
    }

    const queryString = params.toString();
    router.push(queryString ? `?${queryString}` : '/', { scroll: false });
  }, [router]);

  // 필터 옵션 로드
  useEffect(() => {
    async function loadFilterOptions() {
      try {
        const res = await fetch('/api/filters');
        if (res.ok) {
          const data = await res.json();
          setFilterOptions(data);
        }
      } catch (error) {
        console.error('Failed to load filter options:', error);
      }
    }

    loadFilterOptions();
  }, []);

  // 매물 데이터 로드
  useEffect(() => {
    async function loadProperties() {
      setIsLoading(true);

      try {
        const params = new URLSearchParams();

        if (filters.sido && filters.sido.length > 0) {
          params.set('sido', filters.sido.join(','));
        }
        if (filters.gugun && filters.gugun.length > 0) {
          params.set('gugun', filters.gugun.join(','));
        }
        if (filters.minDeposit !== undefined) {
          params.set('minDeposit', String(filters.minDeposit));
        }
        if (filters.maxDeposit !== undefined) {
          params.set('maxDeposit', String(filters.maxDeposit));
        }
        if (filters.minArea !== undefined) {
          params.set('minArea', String(filters.minArea));
        }
        if (filters.maxArea !== undefined) {
          params.set('maxArea', String(filters.maxArea));
        }
        if (filters.sort) {
          params.set('sort', filters.sort);
        }
        params.set('page', String(filters.page || 1));
        params.set('limit', String(filters.limit || 20));

        const res = await fetch(`/api/properties?${params.toString()}`);
        if (res.ok) {
          const data: PropertyListResponse = await res.json();
          setProperties(data.data);
          setTotal(data.total);
          setTotalPages(data.totalPages);
        }
      } catch (error) {
        console.error('Failed to load properties:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadProperties();
  }, [filters]);

  // 필터 변경 핸들러
  const handleFiltersChange = useCallback((newFilters: PropertyFilters) => {
    setFilters(newFilters);
    updateUrl(newFilters);
  }, [updateUrl]);

  // 페이지 변경 핸들러
  const handlePageChange = useCallback((page: number) => {
    const newFilters = { ...filters, page };
    setFilters(newFilters);
    updateUrl(newFilters);
  }, [filters, updateUrl]);

  // 매물 클릭 핸들러
  const handlePropertyClick = useCallback((property: Property) => {
    setSelectedProperty(property);
  }, []);

  // 지도에서 보기 핸들러
  const handleMapClick = useCallback((property: Property) => {
    setSelectedMapPropertyId(property.id);
    setActiveTab('map');
  }, []);

  // 즐겨찾기 토글
  const handleFavoritesToggle = useCallback(() => {
    setShowFavoritesOnly(prev => !prev);
  }, []);

  // 표시할 매물 목록 (즐겨찾기 필터 적용)
  const displayProperties = showFavoritesOnly
    ? properties.filter(p => favorites.includes(p.id))
    : properties;

  return (
    <div className="h-screen flex flex-col">
      {/* 헤더 */}
      <header className="bg-white border-b px-4 py-3 flex items-center justify-between shrink-0">
        <h1 className="text-xl font-bold text-gray-900">
          허그 든든전세
        </h1>
        <a
          href="https://www.khug.or.kr/jeonse/web/s07/s070102.jsp"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-blue-600 hover:underline"
        >
          원본 사이트
        </a>
      </header>

      {/* 모바일 탭 */}
      <div className="lg:hidden flex border-b bg-white shrink-0">
        <button
          onClick={() => setActiveTab('list')}
          className={`flex-1 py-3 text-sm font-medium ${
            activeTab === 'list'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500'
          }`}
        >
          매물 목록
        </button>
        <button
          onClick={() => setActiveTab('map')}
          className={`flex-1 py-3 text-sm font-medium ${
            activeTab === 'map'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500'
          }`}
        >
          지도
        </button>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 좌측 패널: 필터 + 리스트 */}
        <div
          className={`w-full lg:w-[400px] xl:w-[480px] flex flex-col bg-white ${
            activeTab === 'list' ? 'flex' : 'hidden lg:flex'
          }`}
        >
          {/* 필터 패널 */}
          <FilterPanel
            filterOptions={filterOptions}
            filters={filters}
            onFiltersChange={handleFiltersChange}
            onFavoritesToggle={handleFavoritesToggle}
            showFavoritesOnly={showFavoritesOnly}
            favoritesCount={favoritesCount}
          />

          {/* 매물 리스트 */}
          <div className="flex-1 overflow-hidden">
            <PropertyList
              properties={displayProperties}
              isLoading={isLoading}
              total={showFavoritesOnly ? displayProperties.length : total}
              page={filters.page || 1}
              totalPages={showFavoritesOnly ? 1 : totalPages}
              onPageChange={handlePageChange}
              isFavorite={isFavorite}
              onFavoriteToggle={toggleFavorite}
              onPropertyClick={handlePropertyClick}
              onMapClick={handleMapClick}
            />
          </div>
        </div>

        {/* 우측 패널: 지도 */}
        <div
          className={`flex-1 ${
            activeTab === 'map' ? 'flex' : 'hidden lg:flex'
          }`}
        >
          <KakaoMap
            properties={displayProperties}
            selectedPropertyId={selectedMapPropertyId}
            onPropertySelect={handlePropertyClick}
            className="w-full h-full"
          />
        </div>
      </div>

      {/* 매물 상세 모달 */}
      {selectedProperty && (
        <PropertyDetailModal
          property={selectedProperty}
          onClose={() => setSelectedProperty(null)}
        />
      )}
    </div>
  );
}
