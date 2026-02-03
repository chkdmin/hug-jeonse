'use client';

import { loadKakaoMapScript } from '@/lib/kakaoMap';
import { Property } from '@/types/property';
import { useCallback, useEffect, useRef, useState } from 'react';

interface MarkerData {
  marker: kakao.maps.Marker;
  customOverlay: kakao.maps.CustomOverlay;
  property: Property;
}

interface GroupedMarkerData {
  marker: kakao.maps.Marker;
  customOverlay: kakao.maps.CustomOverlay;
  properties: Property[];
  coordKey: string;
}

interface KakaoMapProps {
  properties: Property[];
  selectedPropertyId?: number | null;
  onPropertySelect?: (property: Property) => void;
  className?: string;
  isVisible?: boolean;
}

export default function KakaoMap({
  properties,
  selectedPropertyId,
  onPropertySelect,
  className = '',
  isVisible = true,
}: KakaoMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<kakao.maps.Map | null>(null);
  const markersRef = useRef<MarkerData[]>([]);
  const groupedMarkersRef = useRef<GroupedMarkerData[]>([]);
  const allMarkersRef = useRef<kakao.maps.Marker[]>([]); // 지도에 직접 추가된 모든 마커
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 현재 열려있는 오버레이 추적
  const activeOverlayRef = useRef<kakao.maps.CustomOverlay | null>(null);

  // 지도 초기화
  useEffect(() => {
    let mounted = true;

    async function initMap() {
      try {
        await loadKakaoMapScript();

        if (!mounted || !mapContainerRef.current) return;

        const { kakao } = window;

        // 서울 중심 좌표
        const center = new kakao.maps.LatLng(37.5665, 126.9780);

        const options = {
          center,
          level: 8,
        };

        const map = new kakao.maps.Map(mapContainerRef.current, options);
        mapRef.current = map;

        // 줌 컨트롤 추가
        const zoomControl = new kakao.maps.ZoomControl();
        map.addControl(zoomControl, kakao.maps.ControlPosition.RIGHT);

        // 지도 클릭 시 오버레이 닫기
        kakao.maps.event.addListener(map, 'click', () => {
          if (activeOverlayRef.current) {
            activeOverlayRef.current.setMap(null);
            activeOverlayRef.current = null;
          }
        });

        setIsLoaded(true);
      } catch (err) {
        console.error('Failed to load Kakao Map:', err);
        const errorMessage = err instanceof Error ? err.message : '지도를 불러오는데 실패했습니다.';
        setError(errorMessage);
      }
    }

    initMap();

    return () => {
      mounted = false;
    };
  }, []);

  // 마커 생성 함수
  const createMarker = useCallback((property: Property): MarkerData | null => {
    if (!mapRef.current || !property.latitude || !property.longitude) return null;

    const { kakao } = window;
    const position = new kakao.maps.LatLng(property.latitude, property.longitude);

    // 마커 이미지 재생성 - Persimmon(주황색)으로 변경하여 눈에 확 띄게 함
    const markerImageSrc = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#E36414" stroke="white" stroke-width="1.5">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
        <circle cx="12" cy="9" r="2.5" fill="white"/>
      </svg>
    `)}`;
    const markerImageSize = new kakao.maps.Size(36, 36); 
    const markerImageOption = { offset: new kakao.maps.Point(18, 36) };
    const markerImage = new kakao.maps.MarkerImage(markerImageSrc, markerImageSize, markerImageOption);

    const marker = new kakao.maps.Marker({
      position,
      title: property.property_name,
      image: markerImage,
    });

    // 커스텀 오버레이 내용
    const formatDeposit = (deposit: number) => {
      if (deposit >= 10000) {
        const eok = Math.floor(deposit / 10000);
        const man = deposit % 10000;
        return man > 0 ? `${eok}억 ${man.toLocaleString()}` : `${eok}억`;
      }
      return `${deposit.toLocaleString()}만`;
    };

    const competitionRate = property.recruitment_count > 0 
      ? (property.applicant_count / property.recruitment_count) 
      : 0;
      
    const competitionColor = competitionRate >= 3 ? '#ef4444' : competitionRate >= 1 ? '#ca8a04' : '#16a34a';

    // DOM 요소로 오버레이 컨텐츠 생성 (이벤트 연결을 위해)
    const content = document.createElement('div');
    content.className = 'custom-overlay-card';
    content.style.cssText = `
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
      padding: 16px;
      width: 280px;
      font-family: var(--font-sans);
      position: absolute;
      bottom: 42px; /* 핀 높이만큼 위로 띄움 */
      left: 50%;
      transform: translateX(-50%);
      border: 1px solid #e5e7eb;
      cursor: pointer;
      z-index: 100;
      transition: transform 0.2s;
    `;
    
    // 호버 효과 추가
    content.onmouseenter = () => { content.style.transform = 'translateX(-50%) scale(1.02)'; };
    content.onmouseleave = () => { content.style.transform = 'translateX(-50%) scale(1)'; };

    // 오버레이 클릭 시 상세 모달 오픈
    content.onclick = () => {
      onPropertySelect?.(property);
    };

    content.innerHTML = `
      <div style="font-size: 13px; color: #6b7280; margin-bottom: 8px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
        ${property.address}
      </div>
      <div style="display: flex; justify-content: space-between; align-items: flex-end;">
        <div>
          <span style="font-size: 12px; color: #6b7280;">보증금</span>
          <div style="font-weight: 800; font-size: 18px; color: #0F4C5C;">
            ${formatDeposit(property.deposit)}<span style="font-size: 13px; font-weight: normal; color: #6b7280;">원</span>
          </div>
        </div>
        <div style="text-align: right;">
          <span style="font-size: 12px; color: #6b7280;">전용면적</span>
          <div style="font-weight: 600; font-size: 14px; color: #111827;">
            ${property.area_m2?.toFixed(1)}㎡
          </div>
        </div>
      </div>
      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px; padding-top: 8px; border-top: 1px solid #f3f4f6;">
        <span style="font-size: 12px; color: #6b7280;">경쟁률</span>
        <span style="font-weight: 700; font-size: 14px; color: ${competitionColor};">
          ${competitionRate > 0 ? `${Math.round(competitionRate)}:1` : '-'}
        </span>
      </div>
      <!-- 클릭 힌트 -->
      <div style="position: absolute; top: 12px; right: 12px;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>
      </div>

      <!-- 말풍선 꼬리 -->
      <div style="
        position: absolute;
        bottom: -8px;
        left: 50%;
        transform: translateX(-50%);
        width: 0;
        height: 0;
        border-left: 8px solid transparent;
        border-right: 8px solid transparent;
        border-top: 8px solid white;
        filter: drop-shadow(0 2px 1px rgba(0,0,0,0.05));
      "></div>
    `;

    const customOverlay = new kakao.maps.CustomOverlay({
      content: content,
      position: position,
      clickable: true,
      xAnchor: 0.5,
      yAnchor: 1,
      zIndex: 3,
    });

    // 마커 클릭 이벤트
    kakao.maps.event.addListener(marker, 'click', () => {
      // 기존 열린 오버레이 닫기
      if (activeOverlayRef.current) {
        activeOverlayRef.current.setMap(null);
      }

      // 새 오버레이 열기
      customOverlay.setMap(mapRef.current);
      activeOverlayRef.current = customOverlay;
      
      // 여기서는 모달을 띄우지 않고 오버레이만 띄움
      // onPropertySelect는 오버레이 클릭 시 호출됨
    });

    return { marker, customOverlay, property };
  }, [onPropertySelect]);

  // 그룹 마커 생성 함수 (동일 좌표에 여러 매물이 있는 경우)
  const createGroupMarker = useCallback((coordKey: string, groupProperties: Property[]): GroupedMarkerData | null => {
    if (!mapRef.current || groupProperties.length === 0) return null;

    const { kakao } = window;
    const firstProperty = groupProperties[0];
    const position = new kakao.maps.LatLng(firstProperty.latitude!, firstProperty.longitude!);
    const count = groupProperties.length;

    // 숫자 뱃지가 있는 마커 이미지
    const markerImageSrc = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 48" width="40" height="48">
        <path d="M20 2C12.27 2 6 8.27 6 16c0 8.4 14 28 14 28s14-19.6 14-28c0-7.73-6.27-14-14-14z" fill="#E36414" stroke="white" stroke-width="2"/>
        <circle cx="20" cy="16" r="10" fill="white"/>
        <text x="20" y="20" text-anchor="middle" font-size="12" font-weight="bold" fill="#E36414">${count}</text>
      </svg>
    `)}`;
    const markerImageSize = new kakao.maps.Size(40, 48);
    const markerImageOption = { offset: new kakao.maps.Point(20, 48) };
    const markerImage = new kakao.maps.MarkerImage(markerImageSrc, markerImageSize, markerImageOption);

    const marker = new kakao.maps.Marker({
      position,
      title: `${count}개 매물`,
      image: markerImage,
    });

    // 매물 목록 오버레이 생성
    const formatDeposit = (deposit: number) => {
      if (deposit >= 10000) {
        const eok = Math.floor(deposit / 10000);
        const man = deposit % 10000;
        return man > 0 ? `${eok}억 ${man.toLocaleString()}` : `${eok}억`;
      }
      return `${deposit.toLocaleString()}만`;
    };

    const content = document.createElement('div');
    content.className = 'group-overlay-card';
    content.style.cssText = `
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
      padding: 12px;
      width: 300px;
      max-height: 320px;
      overflow-y: auto;
      font-family: var(--font-sans);
      position: absolute;
      bottom: 54px;
      left: 50%;
      transform: translateX(-50%);
      border: 1px solid #e5e7eb;
      z-index: 100;
    `;

    // 헤더 (주소 + 매물 수)
    const header = document.createElement('div');
    header.style.cssText = 'margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid #e5e7eb;';
    header.innerHTML = `
      <div style="font-size: 13px; color: #6b7280; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
        ${firstProperty.address}
      </div>
      <div style="font-weight: 700; font-size: 14px; color: #111827;">
        ${count}개 매물
      </div>
    `;
    content.appendChild(header);

    // 매물 목록
    groupProperties.forEach((property, index) => {
      const item = document.createElement('div');
      item.style.cssText = `
        padding: 10px 8px;
        cursor: pointer;
        border-radius: 8px;
        transition: background 0.15s;
        ${index < groupProperties.length - 1 ? 'border-bottom: 1px solid #f3f4f6;' : ''}
      `;
      item.onmouseenter = () => { item.style.background = '#f9fafb'; };
      item.onmouseleave = () => { item.style.background = 'transparent'; };
      item.onclick = (e) => {
        e.stopPropagation();
        onPropertySelect?.(property);
      };

      const competitionRate = property.recruitment_count > 0
        ? (property.applicant_count / property.recruitment_count)
        : 0;
      const competitionColor = competitionRate >= 3 ? '#ef4444' : competitionRate >= 1 ? '#ca8a04' : '#16a34a';

      item.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
          <span style="font-weight: 700; font-size: 14px; color: #0F4C5C;">${formatDeposit(property.deposit)}원</span>
          <span style="font-size: 12px; color: #6b7280;">${property.area_m2?.toFixed(1)}㎡</span>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 12px; color: #6b7280;">경쟁률</span>
          <span style="font-size: 12px; color: ${competitionColor}; font-weight: 600;">
            ${competitionRate > 0 ? `${Math.round(competitionRate)}:1` : '-'}
          </span>
        </div>
      `;
      content.appendChild(item);
    });

    // 말풍선 꼬리
    const tail = document.createElement('div');
    tail.style.cssText = `
      position: absolute;
      bottom: -8px;
      left: 50%;
      transform: translateX(-50%);
      width: 0;
      height: 0;
      border-left: 8px solid transparent;
      border-right: 8px solid transparent;
      border-top: 8px solid white;
      filter: drop-shadow(0 2px 1px rgba(0,0,0,0.05));
    `;
    content.appendChild(tail);

    const customOverlay = new kakao.maps.CustomOverlay({
      content: content,
      position: position,
      clickable: true,
      xAnchor: 0.5,
      yAnchor: 1,
      zIndex: 3,
    });

    // 마커 클릭 이벤트
    kakao.maps.event.addListener(marker, 'click', () => {
      if (activeOverlayRef.current) {
        activeOverlayRef.current.setMap(null);
      }
      customOverlay.setMap(mapRef.current);
      activeOverlayRef.current = customOverlay;
    });

    return { marker, customOverlay, properties: groupProperties, coordKey };
  }, [onPropertySelect]);

  // 마커 업데이트
  useEffect(() => {
    if (!isLoaded || !mapRef.current) return;

    // 기존 마커 제거 (지도에서 직접 제거)
    allMarkersRef.current.forEach(marker => marker.setMap(null));
    allMarkersRef.current = [];

    // 오버레이 모두 닫기
    if (activeOverlayRef.current) {
        activeOverlayRef.current.setMap(null);
        activeOverlayRef.current = null;
    }

    markersRef.current = [];
    groupedMarkersRef.current = [];

    // 좌표가 있는 매물만 필터링
    const validProperties = properties.filter(p => p.latitude && p.longitude);

    // 좌표별로 매물 그룹화 (소수점 6자리까지 비교)
    const coordGroups = new Map<string, Property[]>();
    validProperties.forEach((property) => {
      const key = `${property.latitude!.toFixed(6)}_${property.longitude!.toFixed(6)}`;
      if (!coordGroups.has(key)) {
        coordGroups.set(key, []);
      }
      coordGroups.get(key)!.push(property);
    });

    // 마커 생성 (단일 매물은 기존 마커, 여러 매물은 그룹 마커)
    const allMarkers: kakao.maps.Marker[] = [];

    coordGroups.forEach((groupProperties, coordKey) => {
      if (groupProperties.length === 1) {
        // 단일 매물: 기존 마커 생성
        const markerData = createMarker(groupProperties[0]);
        if (markerData) {
          markersRef.current.push(markerData);
          allMarkers.push(markerData.marker);
        }
      } else {
        // 여러 매물: 그룹 마커 생성
        const groupMarkerData = createGroupMarker(coordKey, groupProperties);
        if (groupMarkerData) {
          groupedMarkersRef.current.push(groupMarkerData);
          allMarkers.push(groupMarkerData.marker);
          // 개별 매물도 markersRef에 추가 (선택 시 찾기 위해)
          groupProperties.forEach(p => {
            markersRef.current.push({
              marker: groupMarkerData.marker,
              customOverlay: groupMarkerData.customOverlay,
              property: p,
            });
          });
        }
      }
    });

    // 마커를 지도에 직접 추가
    allMarkers.forEach(marker => marker.setMap(mapRef.current));
    allMarkersRef.current = allMarkers;

    // 마커가 있으면 모든 마커가 보이도록 지도 범위 조정 (최초 1회 또는 필터 변경 시)
    // 단, selectedPropertyId가 없을 때만
    if (allMarkers.length > 0 && !selectedPropertyId) {
      const bounds = new window.kakao.maps.LatLngBounds();
      allMarkers.forEach((marker) => {
        bounds.extend(marker.getPosition());
      });
      mapRef.current.setBounds(bounds);
    }
  }, [isLoaded, properties, createMarker, createGroupMarker]);

  // 선택된 매물로 이동 (줌인 및 애니메이션 적용)
  useEffect(() => {
    if (!isLoaded || !mapRef.current || !selectedPropertyId) return;

    // 1. 마커 데이터에서 찾기 시도
    let targetPosition: kakao.maps.LatLng | null = null;
    let targetMarkerData = markersRef.current.find(
      m => m.property.id === selectedPropertyId
    );

    // 2. 마커가 없다면(아직 렌더링 전 등), 원본 properties 데이터에서 좌표 직접 추출 (Fallback)
    if (!targetMarkerData) {
      const targetProperty = properties.find(p => p.id === selectedPropertyId);
      if (targetProperty && targetProperty.latitude && targetProperty.longitude) {
        targetPosition = new window.kakao.maps.LatLng(targetProperty.latitude, targetProperty.longitude);
      }
    } else {
      targetPosition = targetMarkerData.marker.getPosition();
    }

    if (targetPosition) {
      const map = mapRef.current;

      // 1. 먼저 해당 위치로 부드럽게 이동
      map.panTo(targetPosition);

      // 2. 줌 레벨이 너무 멀리 있다면 상세 레벨(3)로 확대
      //    이미 상세 레벨이라면 이동만 함 (불필요한 줌인/아웃 방지)
      if (map.getLevel() > 3) {
        map.setLevel(3, { animate: true });
      }

      // 기존 오버레이 닫기
      if (activeOverlayRef.current) {
        activeOverlayRef.current.setMap(null);
      }

      // 마커 데이터가 있다면 오버레이 띄우기
      if (targetMarkerData) {
        targetMarkerData.customOverlay.setMap(map);
        activeOverlayRef.current = targetMarkerData.customOverlay;
      }
    }
  }, [isLoaded, selectedPropertyId, properties]); // properties 의존성 추가

  // 탭 전환 시 지도 크기 재계산 및 bounds 재설정 (모바일에서 hidden→visible 전환 시 필요)
  useEffect(() => {
    if (!isLoaded || !mapRef.current || !isVisible) return;

    // DOM 렌더링 완료 대기 후 relayout 및 bounds 재설정
    const timer = setTimeout(() => {
      const map = mapRef.current;
      if (!map) return;

      // 1. 지도 크기 재계산
      map.relayout();

      // 2. 마커가 있고 특정 매물이 선택되지 않은 경우, 모든 마커가 보이도록 bounds 재설정
      if (allMarkersRef.current.length > 0 && !selectedPropertyId) {
        const bounds = new window.kakao.maps.LatLngBounds();
        allMarkersRef.current.forEach((marker) => {
          bounds.extend(marker.getPosition());
        });
        map.setBounds(bounds);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [isLoaded, isVisible, selectedPropertyId]);

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 ${className}`}>
        <p className="text-gray-500">{error}</p>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <div ref={mapContainerRef} className="w-full h-full" />
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="text-gray-500">지도를 불러오는 중...</div>
        </div>
      )}
    </div>
  );
}
