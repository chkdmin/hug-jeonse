'use client';

import { Property } from '@/types/property';
import { useState } from 'react';

interface PropertyDetailModalProps {
  property: Property;
  onClose: () => void;
}

function formatDeposit(deposit: number): string {
  if (deposit >= 10000) {
    const eok = Math.floor(deposit / 10000);
    const man = deposit % 10000;
    return man > 0 ? `${eok}억 ${man.toLocaleString()}` : `${eok}억`;
  }
  return `${deposit.toLocaleString()}만`;
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

  const competitionRate = property.recruitment_count > 0 
    ? (property.applicant_count / property.recruitment_count) 
    : 0;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10 shrink-0">
          <h2 className="text-lg font-bold text-gray-900 truncate pr-4">{property.property_name}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 p-2 rounded-full transition-colors"
            aria-label="닫기"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {/* Image Gallery */}
          <div className="relative bg-black group aspect-video">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={images[currentImageIndex]}
              alt={`${property.property_name} 이미지 ${currentImageIndex + 1}`}
              className="w-full h-full object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/placeholder-house.svg';
              }}
            />

            {images.length > 1 && (
              <>
                <button
                  onClick={handlePrevImage}
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 backdrop-blur-md text-white p-3 rounded-full transition-all opacity-0 group-hover:opacity-100"
                  aria-label="이전 이미지"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={handleNextImage}
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 backdrop-blur-md text-white p-3 rounded-full transition-all opacity-0 group-hover:opacity-100"
                  aria-label="다음 이미지"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md text-white text-xs px-3 py-1.5 rounded-full font-medium">
                  {currentImageIndex + 1} / {images.length}
                </div>
              </>
            )}
          </div>

          {/* Content */}
          <div className="p-6 space-y-8">
            {/* 핵심 정보: 보증금 */}
            <div className="text-center">
              <span className="text-sm font-medium text-gray-500 mb-1 block">보증금</span>
              <p className="text-4xl font-extrabold text-primary tracking-tight">
                {formatDeposit(property.deposit)}<span className="text-xl text-gray-500 font-normal ml-1">원</span>
              </p>
            </div>

            {/* 상세 스펙 그리드 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                <span className="text-xs text-gray-500 block mb-1">전용면적</span>
                <p className="text-lg font-bold text-gray-900">{property.area_m2?.toFixed(2)}㎡</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                <span className="text-xs text-gray-500 block mb-1">건물유형</span>
                <p className="text-lg font-bold text-gray-900">{property.building_type || '-'}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                <span className="text-xs text-gray-500 block mb-1">경쟁률</span>
                <div className="flex items-center gap-2">
                  <p className={`text-lg font-bold ${competitionRate >= 3 ? 'text-red-500' : competitionRate >= 1 ? 'text-yellow-600' : 'text-green-600'}`}>
                    {competitionRate > 0 ? `${competitionRate.toFixed(2)}:1` : '-'}
                  </p>
                  <span className="text-xs text-gray-400">({property.applicant_count}/{property.recruitment_count})</span>
                </div>
              </div>
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                <span className="text-xs text-gray-500 block mb-1">청약기간</span>
                <p className="text-sm font-semibold text-gray-900 break-keep leading-tight">
                  {property.application_start && property.application_end
                    ? `${property.application_start} ~ ${property.application_end}`
                    : '-'}
                </p>
              </div>
            </div>

            {/* 주소 정보 */}
            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                위치 정보
              </h3>
              <p className="text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-100 text-sm">
                {property.address}
              </p>
            </div>
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="p-6 border-t border-gray-100 bg-white shrink-0">
          <div className="flex gap-3">
            <a
              href={property.detail_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 bg-secondary hover:bg-secondary-light text-white text-center py-3.5 rounded-xl font-bold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 group"
            >
              <span>원본 사이트에서 신청하기</span>
              <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
