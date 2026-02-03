'use client';

import FilterPanel from '@/components/Filters/FilterPanel';
import PropertyDetailModal from '@/components/PropertyDetail/PropertyDetailModal';
import PropertyList from '@/components/PropertyList/PropertyList';
import { useFavorites } from '@/hooks/useFavorites';
import { FilterOptions, Property, PropertyFilters, PropertyListResponse } from '@/types/property';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

// KakaoMap은 SSR에서 window 객체가 없어서 클라이언트에서만 로드
const KakaoMap = dynamic(() => import('@/components/Map/KakaoMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-100 animate-pulse">
      <div className="text-gray-400 flex flex-col items-center gap-2">
        <svg className="w-8 h-8 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0121 18.382V7.618a1 1 0 01-1.447-.894L15 7m0 13V7m0 0L9.553 4.553A1 1 0 0115 7z"></path></svg>
        <span>지도를 불러오는 중...</span>
      </div>
    </div>
  ),
});

export default function Home() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // 상태
  const [properties, setProperties] = useState<Property[]>([]); // 리스트용 데이터 (페이지네이션 적용)
  const [mapProperties, setMapProperties] = useState<Property[]>([]); // 지도용 데이터 (전체)
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [selectedMapPropertyId, setSelectedMapPropertyId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'list' | 'map'>('list');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false); // 모바일 필터 패널 상태

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

  // 공통 파라미터 생성 함수
  const createSearchParams = useCallback((currentFilters: PropertyFilters) => {
    const params = new URLSearchParams();
    if (currentFilters.sido && currentFilters.sido.length > 0) params.set('sido', currentFilters.sido.join(','));
    if (currentFilters.gugun && currentFilters.gugun.length > 0) params.set('gugun', currentFilters.gugun.join(','));
    if (currentFilters.minDeposit !== undefined) params.set('minDeposit', String(currentFilters.minDeposit));
    if (currentFilters.maxDeposit !== undefined) params.set('maxDeposit', String(currentFilters.maxDeposit));
    if (currentFilters.minArea !== undefined) params.set('minArea', String(currentFilters.minArea));
    if (currentFilters.maxArea !== undefined) params.set('maxArea', String(currentFilters.maxArea));
    return params;
  }, []);

  // 리스트 데이터 로드 (페이지네이션 적용)
  useEffect(() => {
    async function loadProperties() {
      setIsLoading(true);
      try {
        const params = createSearchParams(filters);
        if (filters.sort) params.set('sort', filters.sort);
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
  }, [filters, createSearchParams]);

  // 지도용 전체 마커 데이터 로드 (필터 변경 시에만 실행, 페이지 변경 무시)
  useEffect(() => {
    async function loadMapMarkers() {
      try {
        // 페이지 정보 제외하고 필터만 적용
        const params = createSearchParams(filters);
        // 정렬도 지도에는 영향 없으므로 제외 가능하지만, 일관성을 위해 포함해도 무방
        
        const res = await fetch(`/api/properties/markers?${params.toString()}`);
        if (res.ok) {
          const response = await res.json();
          setMapProperties(response.data);
        }
      } catch (error) {
        console.error('Failed to load map markers:', error);
      }
    }
    
    // 페이지 변경은 무시하고, 필터 조건이 바뀔 때만 지도 데이터 갱신
    // filters 객체 전체를 의존성으로 넣으면 페이지 변경 시에도 실행되므로,
    // 필터 값들을 개별적으로 비교하거나, 페이지를 제외한 필터 객체를 메모이제이션해야 함.
    // 여기서는 간단히 JSON.stringify로 비교 (페이지 제외)
    loadMapMarkers();
  }, [
    filters.sido, 
    filters.gugun, 
    filters.minDeposit, 
    filters.maxDeposit, 
    filters.minArea, 
    filters.maxArea,
    createSearchParams
  ]);

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

  // 매물 클릭 핸들러 - 상세 API 호출하여 전체 데이터 가져오기
  const handlePropertyClick = useCallback(async (property: Property) => {
    // 이미 전체 데이터가 있는 경우 (리스트에서 클릭) 바로 표시
    if (property.building_type && property.images) {
      setSelectedProperty(property);
      return;
    }

    // 마커에서 클릭한 경우 상세 API 호출
    try {
      const res = await fetch(`/api/properties/${property.id}`);
      if (res.ok) {
        const fullProperty = await res.json();
        setSelectedProperty(fullProperty);
      } else {
        // API 실패 시 기존 데이터라도 표시
        setSelectedProperty(property);
      }
    } catch (error) {
      console.error('Failed to fetch property details:', error);
      setSelectedProperty(property);
    }
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
    
  // 지도에 표시할 매물 (즐겨찾기 모드일 때는 즐겨찾기만, 아니면 전체 마커)
  const displayMapProperties = showFavoritesOnly
    ? mapProperties.filter(p => favorites.includes(p.id))
    : mapProperties;

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background font-sans text-foreground">
      {/* 헤더 */}
      <header className="bg-primary text-white shadow-lg shrink-0 z-20 relative">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/10 p-2 rounded-lg backdrop-blur-sm">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                <polyline points="9 22 9 12 15 12 15 22"></polyline>
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold leading-none tracking-tight">
                허그 든든전세
              </h1>
              <p className="text-xs text-blue-100 font-light mt-0.5 opacity-80">
                주택도시보증공사 인증 안심 매물
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <a
              href="https://www.khug.or.kr/jeonse/web/s07/s070102.jsp"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-1 text-sm bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full transition-colors text-white/90"
            >
              <span>원본 사이트</span>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
            </a>
          </div>
        </div>
      </header>

      {/* 모바일 탭 & 필터 토글 */}
      <div className="lg:hidden flex border-b border-gray-200 bg-white shrink-0 shadow-sm z-10">
        <button
          onClick={() => setActiveTab('list')}
          className={`flex-1 py-3 text-sm font-medium transition-all relative ${
            activeTab === 'list'
              ? 'text-primary'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          매물 목록
          {activeTab === 'list' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary mx-4 rounded-t-full" />}
        </button>
        <button
          onClick={() => setActiveTab('map')}
          className={`flex-1 py-3 text-sm font-medium transition-all relative ${
            activeTab === 'map'
              ? 'text-primary'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          지도
          {activeTab === 'map' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary mx-4 rounded-t-full" />}
        </button>
        <button
          onClick={() => setIsFilterOpen(!isFilterOpen)}
          className={`px-6 py-3 text-sm font-medium border-l border-gray-100 flex items-center gap-1 ${isFilterOpen ? 'text-primary bg-primary/5' : 'text-gray-600'}`}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"></path></svg>
          필터
        </button>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* 좌측 패널: 필터 (데스크탑) */}
        <div className="hidden lg:flex flex-col w-[320px] shrink-0 border-r border-gray-200 bg-white z-10">
          <FilterPanel
            filterOptions={filterOptions}
            filters={filters}
            onFiltersChange={handleFiltersChange}
            onFavoritesToggle={handleFavoritesToggle}
            showFavoritesOnly={showFavoritesOnly}
            favoritesCount={favoritesCount}
          />
        </div>

        {/* 모바일 필터 오버레이 */}
        {isFilterOpen && (
          <div className="lg:hidden absolute inset-0 z-30 bg-white">
            <FilterPanel
              filterOptions={filterOptions}
              filters={filters}
              onFiltersChange={handleFiltersChange}
              onFavoritesToggle={handleFavoritesToggle}
              showFavoritesOnly={showFavoritesOnly}
              favoritesCount={favoritesCount}
            />
            <button 
              onClick={() => setIsFilterOpen(false)}
              className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-2 rounded-full shadow-lg text-sm font-medium"
            >
              필터 닫기
            </button>
          </div>
        )}

        {/* 리스트 패널 */}
        <div
          className={`flex-col bg-muted/30 transition-all duration-300 ease-in-out ${
            activeTab === 'list' 
              ? 'flex w-full lg:w-[450px] xl:w-[500px] shrink-0 border-r border-gray-200 z-0' 
              : 'hidden lg:flex w-[450px] xl:w-[500px] shrink-0 border-r border-gray-200 z-0'
          }`}
        >
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

        {/* 우측 패널: 지도 */}
        <div
          className={`flex-1 relative ${
            activeTab === 'map' ? 'flex' : 'hidden lg:flex'
          }`}
        >
          <KakaoMap
            properties={displayMapProperties} // 전체 마커 데이터 전달
            selectedPropertyId={selectedMapPropertyId}
            onPropertySelect={handlePropertyClick}
            className="w-full h-full"
            isVisible={activeTab === 'map'}
          />
          
          {/* 지도 위 플로팅 정보 (선택적) */}
          <div className="absolute top-4 left-4 z-[1] bg-white/90 backdrop-blur-md px-4 py-2 rounded-xl shadow-lg border border-white/50 hidden md:block">
            <p className="text-xs font-medium text-gray-500">지도에서 매물을 클릭하여 상세정보를 확인하세요</p>
          </div>
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
