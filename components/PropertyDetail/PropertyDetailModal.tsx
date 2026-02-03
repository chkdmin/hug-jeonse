'use client';

import { useState } from 'react';
import { Property } from '@/types/property';

interface PropertyDetailModalProps {
  property: Property;
  onClose: () => void;
}

function formatDeposit(deposit: number): string {
  if (deposit >= 10000) {
    const eok = Math.floor(deposit / 10000);
    const man = deposit % 10000;
    return man > 0 ? `${eok}억 ${man.toLocaleString()}만원` : `${eok}억원`;
  }
  return `${deposit.toLocaleString()}만원`;
}

function formatCompetitionRate(applicant: number, recruitment: number): string {
  if (recruitment === 0) return '-';
  const rate = applicant / recruitment;
  return `${rate.toFixed(2)}:1 (${applicant}/${recruitment})`;
}

export default function PropertyDetailModal({ property, onClose }: PropertyDetailModalProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const images = property.images && property.images.length > 0
    ? property.images
    : ['/placeholder-house.svg'];

  const handlePrevImage = () => {
    setCurrentImageIndex(prev => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNextImage = () => {
    setCurrentImageIndex(prev => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold truncate pr-4">{property.property_name}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 p-1"
            aria-label="닫기"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Image Gallery */}
        <div className="relative bg-gray-100">
          <div className="aspect-video relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={images[currentImageIndex]}
              alt={`${property.property_name} 이미지 ${currentImageIndex + 1}`}
              className="w-full h-full object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/placeholder-house.svg';
              }}
            />
          </div>

          {images.length > 1 && (
            <>
              <button
                onClick={handlePrevImage}
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70"
                aria-label="이전 이미지"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={handleNextImage}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70"
                aria-label="다음 이미지"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/50 text-white text-sm px-3 py-1 rounded-full">
                {currentImageIndex + 1} / {images.length}
              </div>
            </>
          )}
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* 기본 정보 */}
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">기본 정보</h3>
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm text-gray-500">주소</dt>
                <dd className="text-sm font-medium">{property.address}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">건물유형</dt>
                <dd className="text-sm font-medium">{property.building_type || '-'}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">전용면적</dt>
                <dd className="text-sm font-medium">{property.area_m2?.toFixed(2)}㎡</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">보증금</dt>
                <dd className="text-sm font-medium text-blue-600">{formatDeposit(property.deposit)}</dd>
              </div>
            </dl>
          </div>

          {/* 청약 정보 */}
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">청약 정보</h3>
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm text-gray-500">경쟁률</dt>
                <dd className="text-sm font-medium">
                  {formatCompetitionRate(property.applicant_count, property.recruitment_count)}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">청약기간</dt>
                <dd className="text-sm font-medium">
                  {property.application_start && property.application_end
                    ? `${property.application_start} ~ ${property.application_end}`
                    : '-'}
                </dd>
              </div>
            </dl>
          </div>

          {/* 버튼 영역 */}
          <div className="flex gap-3 pt-4 border-t">
            <a
              href={property.detail_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 bg-blue-600 text-white text-center py-3 rounded-lg hover:bg-blue-700 font-medium"
            >
              원본 사이트에서 보기
            </a>
            <button
              onClick={onClose}
              className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-50 font-medium"
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
