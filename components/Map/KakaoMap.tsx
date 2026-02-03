'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Property } from '@/types/property';
import { loadKakaoMapScript } from '@/lib/kakaoMap';

interface MarkerData {
  marker: kakao.maps.Marker;
  infoWindow: kakao.maps.InfoWindow;
  property: Property;
}

interface KakaoMapProps {
  properties: Property[];
  selectedPropertyId?: number | null;
  onPropertySelect?: (property: Property) => void;
  className?: string;
}

export default function KakaoMap({
  properties,
  selectedPropertyId,
  onPropertySelect,
  className = '',
}: KakaoMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<kakao.maps.Map | null>(null);
  const markersRef = useRef<MarkerData[]>([]);
  const clustererRef = useRef<kakao.maps.MarkerClusterer | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

        // 클러스터러 생성
        clustererRef.current = new kakao.maps.MarkerClusterer({
          map,
          averageCenter: true,
          minLevel: 5,
          disableClickZoom: false,
          styles: [
            {
              width: '53px',
              height: '52px',
              background: 'url(https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/markercluster.png) no-repeat',
              color: '#fff',
              textAlign: 'center',
              lineHeight: '54px',
            },
          ],
        });

        // 줌 컨트롤 추가
        const zoomControl = new kakao.maps.ZoomControl();
        map.addControl(zoomControl, kakao.maps.ControlPosition.RIGHT);

        setIsLoaded(true);
      } catch (err) {
        console.error('Failed to load Kakao Map:', err);
        setError('지도를 불러오는데 실패했습니다.');
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

    const marker = new kakao.maps.Marker({
      position,
      title: property.property_name,
    });

    // 인포윈도우 내용
    const formatDeposit = (deposit: number) => {
      if (deposit >= 10000) {
        const eok = Math.floor(deposit / 10000);
        const man = deposit % 10000;
        return man > 0 ? `${eok}억 ${man.toLocaleString()}만` : `${eok}억`;
      }
      return `${deposit.toLocaleString()}만`;
    };

    const infoContent = `
      <div style="padding:10px;min-width:200px;font-size:13px;">
        <div style="font-weight:bold;margin-bottom:5px;color:#333;">${property.property_name}</div>
        <div style="color:#666;margin-bottom:3px;">${property.address}</div>
        <div style="color:#2563eb;font-weight:bold;">보증금: ${formatDeposit(property.deposit)}원</div>
        <div style="color:#666;">면적: ${property.area_m2?.toFixed(1)}㎡</div>
        <div style="color:#666;">경쟁률: ${property.recruitment_count > 0 ? (property.applicant_count / property.recruitment_count).toFixed(2) : '-'}:1</div>
      </div>
    `;

    const infoWindow = new kakao.maps.InfoWindow({
      content: infoContent,
    });

    // 마커 클릭 이벤트
    kakao.maps.event.addListener(marker, 'click', () => {
      // 기존 인포윈도우 닫기
      markersRef.current.forEach((m) => {
        if (m.infoWindow) {
          m.infoWindow.close();
        }
      });

      infoWindow.open(mapRef.current!, marker);
      onPropertySelect?.(property);
    });

    return { marker, infoWindow, property };
  }, [onPropertySelect]);

  // 마커 업데이트
  useEffect(() => {
    if (!isLoaded || !mapRef.current || !clustererRef.current) return;

    const { kakao } = window;

    // 기존 마커 제거
    clustererRef.current.clear();
    markersRef.current = [];

    // 좌표가 있는 매물만 필터링
    const validProperties = properties.filter(p => p.latitude && p.longitude);

    // 새 마커 생성
    const newMarkers: MarkerData[] = [];
    validProperties.forEach((property) => {
      const markerData = createMarker(property);
      if (markerData) {
        newMarkers.push(markerData);
      }
    });

    markersRef.current = newMarkers;

    // 클러스터러에 마커 추가
    const markers = newMarkers.map(m => m.marker);
    clustererRef.current.addMarkers(markers);

    // 마커가 있으면 모든 마커가 보이도록 지도 범위 조정
    if (markers.length > 0) {
      const bounds = new kakao.maps.LatLngBounds();
      markers.forEach((marker) => {
        bounds.extend(marker.getPosition());
      });
      mapRef.current.setBounds(bounds);
    }
  }, [isLoaded, properties, createMarker]);

  // 선택된 매물로 이동
  useEffect(() => {
    if (!isLoaded || !mapRef.current || !selectedPropertyId) return;

    const markerData = markersRef.current.find(
      m => m.property.id === selectedPropertyId
    );

    if (markerData) {
      const position = markerData.marker.getPosition();

      // 지도 중심 이동
      mapRef.current.setCenter(position);
      mapRef.current.setLevel(3);

      // 인포윈도우 열기
      markersRef.current.forEach(m => m.infoWindow?.close());
      markerData.infoWindow.open(mapRef.current, markerData.marker);
    }
  }, [isLoaded, selectedPropertyId]);

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
