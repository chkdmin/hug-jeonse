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

function getCompetitionColor(rate: number): string {
  if (rate === 0) return 'text-gray-500';
  if (rate < 1) return 'text-green-600';
  if (rate < 3) return 'text-yellow-600';
  return 'text-red-600';
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
      className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
      onClick={onClick}
    >
      {/* 썸네일 */}
      <div className="relative aspect-video bg-gray-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={thumbnailUrl}
          alt={property.property_name}
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/placeholder-house.png';
          }}
        />
        {/* 즐겨찾기 버튼 */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onFavoriteToggle(property.id);
          }}
          className="absolute top-2 right-2 p-1.5 bg-white/80 rounded-full hover:bg-white transition-colors"
          aria-label={isFavorite ? '즐겨찾기 해제' : '즐겨찾기 추가'}
        >
          <svg
            className={`w-5 h-5 ${isFavorite ? 'text-yellow-500' : 'text-gray-400'}`}
            fill={isFavorite ? 'currentColor' : 'none'}
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
        </button>
        {/* 건물유형 배지 */}
        {property.building_type && (
          <span className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/60 text-white text-xs rounded">
            {property.building_type}
          </span>
        )}
      </div>

      {/* 내용 */}
      <div className="p-3">
        {/* 물건명 */}
        <h3 className="font-medium text-gray-900 truncate mb-1">
          {property.property_name}
        </h3>

        {/* 주소 */}
        <p className="text-sm text-gray-500 truncate mb-2">
          {property.address}
        </p>

        {/* 정보 그리드 */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-gray-500">보증금</span>
            <p className="font-semibold text-blue-600">{formatDeposit(property.deposit)}원</p>
          </div>
          <div>
            <span className="text-gray-500">면적</span>
            <p className="font-medium">{property.area_m2?.toFixed(1)}㎡</p>
          </div>
          <div>
            <span className="text-gray-500">경쟁률</span>
            <p className={`font-semibold ${getCompetitionColor(competitionRate)}`}>
              {competitionRate > 0 ? `${competitionRate.toFixed(2)}:1` : '-'}
            </p>
          </div>
          <div>
            <span className="text-gray-500">신청현황</span>
            <p className="font-medium">
              {property.applicant_count}/{property.recruitment_count}
            </p>
          </div>
        </div>

        {/* 지도에서 보기 버튼 */}
        {property.latitude && property.longitude && onMapClick && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMapClick();
            }}
            className="mt-3 w-full py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded border border-blue-200 transition-colors"
          >
            지도에서 보기
          </button>
        )}
      </div>
    </div>
  );
}
