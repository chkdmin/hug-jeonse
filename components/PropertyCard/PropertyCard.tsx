'use client';

import { Property } from '@/types/property';

interface PropertyCardProps {
  property: Property;
  isFavorite: boolean;
  onFavoriteToggle: (id: number) => void;
  onClick: () => void;
  onMapClick?: () => void;
}

function formatDeposit(deposit: number): string {
  if (deposit >= 10000) {
    const eok = Math.floor(deposit / 10000);
    const man = deposit % 10000;
    return man > 0 ? `${eok}억 ${man.toLocaleString()}만` : `${eok}억`;
  }
  return `${deposit.toLocaleString()}만`;
}

function getCompetitionBadge(rate: number) {
  if (rate === 0) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
        대기중
      </span>
    );
  }
  if (rate < 1) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700 border border-green-200">
        여유
      </span>
    );
  }
  if (rate < 3) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-50 text-yellow-700 border border-yellow-200">
        보통
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-700 border border-red-200">
      경쟁치열
    </span>
  );
}

export default function PropertyCard({
  property,
  isFavorite,
  onFavoriteToggle,
  onClick,
  onMapClick,
}: PropertyCardProps) {
  const competitionRate = property.recruitment_count > 0
    ? property.applicant_count / property.recruitment_count
    : 0;

  const thumbnailUrl = property.images && property.images.length > 0
    ? property.images[0]
    : '/placeholder-house.svg';

  return (
    <div
      className="group bg-white rounded-xl overflow-hidden border border-border hover:shadow-lg transition-all duration-300 cursor-pointer flex flex-col h-full"
      onClick={onClick}
    >
      {/* 이미지 섹션 */}
      <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={thumbnailUrl}
          alt={property.property_name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/placeholder-house.svg';
          }}
        />
        
        {/* 그라데이션 오버레이 */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-60" />

        {/* 상단 배지 */}
        <div className="absolute top-3 left-3 flex gap-1">
          {property.building_type && (
            <span className="px-2 py-1 bg-black/50 backdrop-blur-md text-white text-xs font-medium rounded-md shadow-sm">
              {property.building_type}
            </span>
          )}
        </div>

        {/* 즐겨찾기 버튼 */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onFavoriteToggle(property.id);
          }}
          className="absolute top-3 right-3 p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-sm hover:bg-white transition-all transform hover:scale-110 active:scale-95"
          aria-label={isFavorite ? '즐겨찾기 해제' : '즐겨찾기 추가'}
        >
          <svg
            className={`w-5 h-5 transition-colors ${isFavorite ? 'text-yellow-400 fill-yellow-400' : 'text-gray-400'}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        </button>

        {/* 하단 정보 (이미지 위) */}
        <div className="absolute bottom-3 left-3 right-3 text-white">
          <p className="text-xs font-medium opacity-90 truncate flex items-center gap-1">
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            {property.address}
          </p>
        </div>
      </div>

      {/* 콘텐츠 섹션 */}
      <div className="p-4 flex flex-col flex-1">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-bold text-gray-900 truncate flex-1 text-lg pr-2 group-hover:text-primary transition-colors">
            {property.property_name}
          </h3>
          {getCompetitionBadge(competitionRate)}
        </div>

        {/* 가격 정보 (가장 강조) */}
        <div className="mb-4">
          <span className="text-xs text-gray-500 block mb-0.5">보증금</span>
          <p className="text-2xl font-extrabold text-primary">
            {formatDeposit(property.deposit)}
            <span className="text-sm font-normal text-gray-500 ml-1">원</span>
          </p>
        </div>

        {/* 상세 정보 그리드 */}
        <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg mb-4">
          <div className="flex flex-col">
            <span className="text-xs text-gray-400">전용면적</span>
            <span className="font-medium">{property.area_m2?.toFixed(1)}㎡</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-gray-400">경쟁률</span>
            <span className="font-medium text-gray-900">
              {competitionRate > 0 ? `${competitionRate.toFixed(2)}:1` : '-'}
            </span>
          </div>
          <div className="flex flex-col col-span-2">
            <span className="text-xs text-gray-400">신청현황</span>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-secondary transition-all duration-500"
                  style={{ width: `${Math.min((property.applicant_count / property.recruitment_count) * 100, 100)}%` }}
                />
              </div>
              <span className="text-xs font-medium">
                {property.applicant_count}/{property.recruitment_count}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-auto pt-2 flex gap-2">
          {onMapClick && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMapClick();
              }}
              className="flex-1 py-2 text-sm font-medium text-primary bg-primary/5 hover:bg-primary/10 rounded-lg transition-colors flex items-center justify-center gap-1.5"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
                <line x1="8" y1="2" x2="8" y2="18" />
                <line x1="16" y1="6" x2="16" y2="22" />
              </svg>
              지도 위치
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
