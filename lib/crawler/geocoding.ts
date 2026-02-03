export interface GeocodingResult {
  latitude: number;
  longitude: number;
}

const DELAY_MS = 200; // Kakao API 요청 간 딜레이

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function geocodeAddress(address: string): Promise<GeocodingResult | null> {
  const apiKey = process.env.KAKAO_REST_API_KEY;
  if (!apiKey) {
    console.error('KAKAO_REST_API_KEY is not set');
    return null;
  }

  try {
    const response = await fetch(
      `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(address)}`,
      {
        headers: {
          Authorization: `KakaoAK ${apiKey}`,
        },
      }
    );

    if (!response.ok) {
      console.error('Geocoding API error:', response.status);
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

    // 주소 검색 실패 시 키워드 검색 시도
    const keywordResponse = await fetch(
      `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(address)}`,
      {
        headers: {
          Authorization: `KakaoAK ${apiKey}`,
        },
      }
    );

    if (keywordResponse.ok) {
      const keywordData = await keywordResponse.json();
      if (keywordData.documents && keywordData.documents.length > 0) {
        const { x, y } = keywordData.documents[0];
        return {
          latitude: parseFloat(y),
          longitude: parseFloat(x),
        };
      }
    }

    return null;
  } catch (error) {
    console.error('Geocoding error for address:', address, error);
    return null;
  }
}

export async function geocodeMultipleAddresses(
  addresses: { id: string; address: string }[],
  onProgress?: (current: number, total: number) => void
): Promise<Map<string, GeocodingResult | null>> {
  const results = new Map<string, GeocodingResult | null>();

  for (let i = 0; i < addresses.length; i++) {
    const { id, address } = addresses[i];
    const result = await geocodeAddress(address);
    results.set(id, result);

    onProgress?.(i + 1, addresses.length);

    if (i < addresses.length - 1) {
      await delay(DELAY_MS);
    }
  }

  return results;
}
