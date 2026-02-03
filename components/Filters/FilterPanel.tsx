'use client';

import { useState, useEffect, useCallback } from 'react';
import { FilterOptions, PropertyFilters } from '@/types/property';

interface FilterPanelProps {
  filterOptions: FilterOptions | null;
  filters: PropertyFilters;
  onFiltersChange: (filters: PropertyFilters) => void;
  onFavoritesToggle?: () => void;
  showFavoritesOnly?: boolean;
  favoritesCount?: number;
}

export default function FilterPanel({
  filterOptions,
  filters,
  onFiltersChange,
  onFavoritesToggle,
  showFavoritesOnly = false,
  favoritesCount = 0,
}: FilterPanelProps) {
  const [expandedSido, setExpandedSido] = useState<string | null>(null);
  const [localFilters, setLocalFilters] = useState<PropertyFilters>(filters);

  // 외부 필터 변경 시 동기화
  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  // 필터 변경 핸들러
  const handleFilterChange = useCallback((newFilters: Partial<PropertyFilters>) => {
    const updated = { ...localFilters, ...newFilters, page: 1 };
    setLocalFilters(updated);
    onFiltersChange(updated);
  }, [localFilters, onFiltersChange]);

  // 시도 선택 토글
  const toggleSido = (sido: string) => {
    const currentSido = localFilters.sido || [];
    let newSido: string[];

    if (currentSido.includes(sido)) {
      newSido = currentSido.filter(s => s !== sido);
      // 해당 시도의 구군도 제거
      const currentGugun = localFilters.gugun || [];
      const gugunToRemove = filterOptions?.gugun[sido] || [];
      const newGugun = currentGugun.filter(g => !gugunToRemove.includes(g));
      handleFilterChange({ sido: newSido, gugun: newGugun });
    } else {
      newSido = [...currentSido, sido];
      handleFilterChange({ sido: newSido });
    }
  };

  // 구군 선택 토글
  const toggleGugun = (gugun: string) => {
    const currentGugun = localFilters.gugun || [];
    let newGugun: string[];

    if (currentGugun.includes(gugun)) {
      newGugun = currentGugun.filter(g => g !== gugun);
    } else {
      newGugun = [...currentGugun, gugun];
    }

    handleFilterChange({ gugun: newGugun });
  };

  // 보증금 범위 변경
  const handleDepositChange = (type: 'min' | 'max', value: string) => {
    const numValue = value === '' ? undefined : parseInt(value, 10);
    if (type === 'min') {
      handleFilterChange({ minDeposit: numValue });
    } else {
      handleFilterChange({ maxDeposit: numValue });
    }
  };

  // 면적 범위 변경
  const handleAreaChange = (type: 'min' | 'max', value: string) => {
    const numValue = value === '' ? undefined : parseFloat(value);
    if (type === 'min') {
      handleFilterChange({ minArea: numValue });
    } else {
      handleFilterChange({ maxArea: numValue });
    }
  };

  // 정렬 변경
  const handleSortChange = (sort: PropertyFilters['sort']) => {
    handleFilterChange({ sort });
  };

  // 필터 초기화
  const resetFilters = () => {
    const resetFilters: PropertyFilters = {
      sido: [],
      gugun: [],
      minDeposit: undefined,
      maxDeposit: undefined,
      minArea: undefined,
      maxArea: undefined,
      sort: undefined,
      page: 1,
      limit: 20,
    };
    setLocalFilters(resetFilters);
    onFiltersChange(resetFilters);
  };

  const selectedSido = localFilters.sido || [];
  const selectedGugun = localFilters.gugun || [];

  return (
    <div className="bg-white border-b lg:border-r lg:border-b-0 p-4 space-y-4 overflow-y-auto">
      {/* 즐겨찾기 토글 */}
      {onFavoritesToggle && (
        <div className="flex items-center gap-2">
          <button
            onClick={onFavoritesToggle}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              showFavoritesOnly
                ? 'bg-yellow-100 text-yellow-700 border border-yellow-300'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <svg
              className={`w-4 h-4 ${showFavoritesOnly ? 'text-yellow-500' : 'text-gray-400'}`}
              fill={showFavoritesOnly ? 'currentColor' : 'none'}
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
              />
            </svg>
            즐겨찾기 ({favoritesCount})
          </button>
        </div>
      )}

      {/* 정렬 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">정렬</label>
        <select
          value={localFilters.sort || ''}
          onChange={(e) => handleSortChange(e.target.value as PropertyFilters['sort'])}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">최신순</option>
          <option value="competition_asc">경쟁률 낮은순</option>
          <option value="competition_desc">경쟁률 높은순</option>
          <option value="deposit_asc">보증금 낮은순</option>
          <option value="deposit_desc">보증금 높은순</option>
        </select>
      </div>

      {/* 지역 필터 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">지역</label>
        <div className="space-y-1 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-2">
          {filterOptions?.sido.map((sido) => (
            <div key={sido}>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id={`sido-${sido}`}
                  checked={selectedSido.includes(sido)}
                  onChange={() => toggleSido(sido)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <label
                  htmlFor={`sido-${sido}`}
                  className="flex-1 text-sm text-gray-700 cursor-pointer"
                >
                  {sido}
                </label>
                {filterOptions?.gugun[sido]?.length > 0 && (
                  <button
                    onClick={() => setExpandedSido(expandedSido === sido ? null : sido)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg
                      className={`w-4 h-4 transition-transform ${expandedSido === sido ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                )}
              </div>
              {/* 구군 목록 */}
              {expandedSido === sido && filterOptions?.gugun[sido] && (
                <div className="ml-6 mt-1 space-y-1">
                  {filterOptions.gugun[sido].map((gugun) => (
                    <div key={gugun} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`gugun-${gugun}`}
                        checked={selectedGugun.includes(gugun)}
                        onChange={() => toggleGugun(gugun)}
                        className="w-3 h-3 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <label
                        htmlFor={`gugun-${gugun}`}
                        className="text-xs text-gray-600 cursor-pointer"
                      >
                        {gugun}
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          {(!filterOptions?.sido || filterOptions.sido.length === 0) && (
            <p className="text-sm text-gray-400 text-center py-2">데이터가 없습니다</p>
          )}
        </div>
      </div>

      {/* 보증금 범위 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          보증금 (만원)
        </label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder="최소"
            value={localFilters.minDeposit ?? ''}
            onChange={(e) => handleDepositChange('min', e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-gray-400">~</span>
          <input
            type="number"
            placeholder="최대"
            value={localFilters.maxDeposit ?? ''}
            onChange={(e) => handleDepositChange('max', e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        {filterOptions && (
          <p className="text-xs text-gray-400 mt-1">
            범위: {filterOptions.depositRange.min.toLocaleString()} ~ {filterOptions.depositRange.max.toLocaleString()}
          </p>
        )}
      </div>

      {/* 면적 범위 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          전용면적 (㎡)
        </label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder="최소"
            value={localFilters.minArea ?? ''}
            onChange={(e) => handleAreaChange('min', e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-gray-400">~</span>
          <input
            type="number"
            placeholder="최대"
            value={localFilters.maxArea ?? ''}
            onChange={(e) => handleAreaChange('max', e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        {filterOptions && (
          <p className="text-xs text-gray-400 mt-1">
            범위: {filterOptions.areaRange.min.toFixed(1)} ~ {filterOptions.areaRange.max.toFixed(1)}
          </p>
        )}
      </div>

      {/* 초기화 버튼 */}
      <button
        onClick={resetFilters}
        className="w-full py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
      >
        필터 초기화
      </button>
    </div>
  );
}
