'use client';

import PropertyCard from '@/components/PropertyCard/PropertyCard';
import { Property } from '@/types/property';

interface PropertyListProps {
  properties: Property[];
  isLoading: boolean;
  total: number;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  isFavorite: (id: number) => boolean;
  onFavoriteToggle: (id: number) => void;
  onPropertyClick: (property: Property) => void;
  onMapClick?: (property: Property) => void;
}

// 스켈레톤 UI 컴포넌트
function PropertyCardSkeleton() {
  return (
    <div className="bg-white rounded-xl overflow-hidden border border-gray-100 shadow-sm">
      <div className="aspect-[4/3] bg-gray-200 animate-pulse" />
      <div className="p-4 space-y-3">
        <div className="h-6 bg-gray-200 rounded w-3/4 animate-pulse" />
        <div className="h-8 bg-gray-200 rounded w-1/2 animate-pulse" />
        <div className="h-24 bg-gray-100 rounded animate-pulse" />
      </div>
    </div>
  );
}

export default function PropertyList({
  properties,
  isLoading,
  total,
  page,
  totalPages,
  onPageChange,
  isFavorite,
  onFavoriteToggle,
  onPropertyClick,
  onMapClick,
}: PropertyListProps) {
  // 페이지 번호 배열 생성 로직 유지
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (page <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (page >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push('...');
        pages.push(page - 1);
        pages.push(page);
        pages.push(page + 1);
        pages.push('...');
        pages.push(totalPages);
      }
    }

    return pages;
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="px-6 py-4 border-b border-border bg-white/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="h-5 bg-gray-200 rounded w-32 animate-pulse" />
        </div>
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {[...Array(6)].map((_, i) => (
              <PropertyCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (properties.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
          <svg className="w-12 h-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">조건에 맞는 매물이 없어요</h3>
        <p className="text-gray-500 mb-6 max-w-xs">
          필터 조건을 조금 더 넓게 설정해보시거나, 다른 지역을 검색해보세요.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* 결과 요약 */}
      <div className="px-6 py-4 border-b border-border bg-white/80 backdrop-blur-sm sticky top-0 z-10 flex justify-between items-center">
        <span className="text-sm text-gray-600">
          총 <span className="font-bold text-primary">{total.toLocaleString()}</span>개의 매물
        </span>
      </div>

      {/* 매물 그리드 */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {properties.map((property) => (
            <PropertyCard
              key={property.id}
              property={property}
              isFavorite={isFavorite(property.id)}
              onFavoriteToggle={onFavoriteToggle}
              onClick={() => onPropertyClick(property)}
              onMapClick={onMapClick ? () => onMapClick(property) : undefined}
            />
          ))}
        </div>
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="px-4 py-4 border-t border-border bg-white flex items-center justify-center gap-1.5 sticky bottom-0 z-10">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page === 1}
            className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed text-gray-500 transition-colors"
            aria-label="이전 페이지"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {getPageNumbers().map((pageNum, index) => (
            <button
              key={index}
              onClick={() => typeof pageNum === 'number' && onPageChange(pageNum)}
              disabled={pageNum === '...'}
              className={`min-w-[36px] h-9 px-3 rounded-lg text-sm font-medium transition-all ${
                pageNum === page
                  ? 'bg-primary text-white shadow-md shadow-primary/30 transform scale-105'
                  : pageNum === '...'
                  ? 'cursor-default text-gray-400'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {pageNum}
            </button>
          ))}

          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page === totalPages}
            className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed text-gray-500 transition-colors"
            aria-label="다음 페이지"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
