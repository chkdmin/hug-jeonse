export function loadKakaoMapScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("Window is not defined"));
      return;
    }

    // 환경 변수 검증
    const apiKey = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY;
    if (!apiKey) {
      reject(
        new Error(
          "NEXT_PUBLIC_KAKAO_MAP_KEY 환경 변수가 설정되지 않았습니다. .env.local 파일을 확인해주세요."
        )
      );
      return;
    }

    if (window.kakao?.maps) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    const scriptUrl = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${apiKey}&autoload=false&libraries=clusterer`;
    console.log("[KakaoMap] Loading script:", scriptUrl);
    script.src = scriptUrl;
    script.async = true;

    script.onload = () => {
      console.log("[KakaoMap] Script loaded, initializing maps...");
      window.kakao.maps.load(() => {
        console.log("[KakaoMap] Maps initialized successfully");
        resolve();
      });
    };

    script.onerror = (event) => {
      console.error("[KakaoMap] Script load error:", event);
      reject(
        new Error(
          "카카오맵 스크립트 로드에 실패했습니다. API 키와 도메인 설정을 확인해주세요."
        )
      );
    };

    document.head.appendChild(script);
  });
}

export interface GeocodingResult {
  latitude: number;
  longitude: number;
}

export async function geocodeAddress(
  address: string
): Promise<GeocodingResult | null> {
  const apiKey = process.env.KAKAO_REST_API_KEY;
  if (!apiKey) {
    console.error("KAKAO_REST_API_KEY is not set");
    return null;
  }

  try {
    const response = await fetch(
      `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(
        address
      )}`,
      {
        headers: {
          Authorization: `KakaoAK ${apiKey}`,
        },
      }
    );

    if (!response.ok) {
      console.error("Geocoding API error:", response.status);
      return null;
    }

    const data = await response.json();

    if (data.documents && data.documents.length > 0) {
      const { x, y } = data.documents[0];
      return {
        latitude: parseFloat(y),
        longitude: parseFloat(x),
      };
    }

    return null;
  } catch (error) {
    console.error("Geocoding error:", error);
    return null;
  }
}
