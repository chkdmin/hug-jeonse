# 허그 든든전세 매물 수집 및 시각화 웹사이트 구현 계획

## 프로젝트 개요

허그(주택도시보증공사) 든든전세 매물 정보를 자동으로 수집하고, 지도와 함께 시각화하여 사용자가 원하는 조건의 주택을 쉽게 찾을 수 있는 웹사이트를 구축한다.

### 데이터 소스
- URL: https://www.khug.or.kr/jeonse/web/s07/s070102.jsp
- 약 70페이지의 매물 리스트
- 상세 페이지: s070103.jsp?dt={날짜}&no={물건번호}

### 기술 스택
| 구분 | 기술 |
|------|------|
| Frontend | Next.js 14 (App Router), React, TypeScript, Tailwind CSS |
| Backend | Next.js API Routes |
| Database | Supabase (PostgreSQL) |
| Map | Kakao Maps API |
| Deployment | Vercel |
| Crawler | Node.js + Cheerio (또는 Playwright) |

---

## Phase 1: 프로젝트 초기 설정

### Task 1.1: Next.js 프로젝트 생성
- [ ] `npx create-next-app@latest` 실행
  - TypeScript, Tailwind CSS, App Router, ESLint 사용
- [ ] 프로젝트 구조 설정
  ```
  src/
  ├── app/
  │   ├── page.tsx          # 메인 페이지 (지도 + 리스트)
  │   ├── layout.tsx
  │   └── api/
  │       ├── properties/   # 매물 API
  │       └── crawl/        # 크롤링 트리거 API
  ├── components/
  │   ├── Map/
  │   ├── PropertyList/
  │   ├── PropertyCard/
  │   ├── Filters/
  │   └── PropertyDetail/
  ├── lib/
  │   ├── supabase.ts
  │   ├── kakaoMap.ts
  │   └── crawler/
  └── types/
      └── property.ts
  ```

### Task 1.2: Supabase 설정
- [ ] Supabase 프로젝트 생성
- [ ] 환경 변수 설정 (.env.local)
  ```
  NEXT_PUBLIC_SUPABASE_URL=
  NEXT_PUBLIC_SUPABASE_ANON_KEY=
  SUPABASE_SERVICE_ROLE_KEY=
  ```
- [ ] 데이터베이스 스키마 생성:
  ```sql
  CREATE TABLE properties (
    id SERIAL PRIMARY KEY,
    announcement_no VARCHAR(50),      -- 공고번호
    property_name VARCHAR(200),       -- 물건명
    address VARCHAR(300),             -- 주소
    building_type VARCHAR(50),        -- 건물유형
    area_m2 DECIMAL(10,2),           -- 전용면적(m²)
    deposit BIGINT,                   -- 보증금액(원)
    applicant_count INT DEFAULT 0,    -- 신청자수
    recruitment_count INT DEFAULT 1,  -- 모집수
    competition_rate DECIMAL(5,2),    -- 경쟁률
    latitude DECIMAL(10,7),           -- 위도
    longitude DECIMAL(10,7),          -- 경도
    sido VARCHAR(20),                 -- 시도
    gugun VARCHAR(20),                -- 구군
    detail_url VARCHAR(500),          -- 상세페이지 URL
    images TEXT[],                    -- 이미지 URL 배열
    application_start DATE,           -- 청약시작일
    application_end DATE,             -- 청약종료일
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  );

  CREATE INDEX idx_properties_sido ON properties(sido);
  CREATE INDEX idx_properties_gugun ON properties(gugun);
  CREATE INDEX idx_properties_deposit ON properties(deposit);
  CREATE INDEX idx_properties_area ON properties(area_m2);
  CREATE INDEX idx_properties_competition ON properties(competition_rate);
  ```

### Task 1.3: 카카오맵 API 설정
- [ ] 카카오 개발자 등록 및 앱 생성
- [ ] JavaScript 키 발급
- [ ] 환경 변수 추가
  ```
  NEXT_PUBLIC_KAKAO_MAP_KEY=
  KAKAO_REST_API_KEY=        # Geocoding용
  ```

---

## Phase 2: 크롤러 개발

### Task 2.1: 리스트 페이지 크롤러
- [ ] `src/lib/crawler/listCrawler.ts` 생성
- [ ] 기능 구현:
  - 페이지네이션 처리 (1~70페이지)
  - 각 매물의 기본 정보 추출:
    - 공고번호, 물건명, 주소
    - 건물유형, 면적, 보증금
    - 상세페이지 URL
  - Rate limiting (요청 간 1-2초 딜레이)
  - 에러 핸들링 및 재시도 로직

### Task 2.2: 상세 페이지 크롤러
- [ ] `src/lib/crawler/detailCrawler.ts` 생성
- [ ] 기능 구현:
  - 상세 정보 추출:
    - 신청자수/모집수
    - 청약 기간
    - 이미지 URL 목록
  - 이미지 URL 패턴 분석 및 추출

### Task 2.3: 주소 → 좌표 변환
- [ ] `src/lib/crawler/geocoding.ts` 생성
- [ ] 카카오 Geocoding API 연동
- [ ] 배치 처리 (API 호출 제한 고려)
- [ ] 변환 실패 시 null 처리 및 로깅

### Task 2.4: 크롤링 API 엔드포인트
- [ ] `src/app/api/crawl/route.ts` 생성
- [ ] 크롤링 실행 → DB 저장 파이프라인
- [ ] 중복 체크 (공고번호 기준)
- [ ] 경쟁률 계산 로직

---

## Phase 3: 프론트엔드 개발

### Task 3.1: 카카오맵 컴포넌트
- [ ] `src/components/Map/KakaoMap.tsx` 생성
- [ ] 기능:
  - 지도 초기화 (서울 중심)
  - 매물 마커 표시
  - 마커 클릭 시 인포윈도우 (간략 정보)
  - 마커 클러스터링 (매물 많을 때)
  - 지도 영역 변경 시 visible 매물 필터링

### Task 3.2: 필터 컴포넌트
- [ ] `src/components/Filters/FilterPanel.tsx` 생성
- [ ] 필터 옵션:
  - 시/도 선택 (다중선택)
  - 구/군 선택 (다중선택, 시도에 따라 동적)
  - 보증금 범위 (슬라이더 또는 min/max)
  - 면적 범위 (슬라이더 또는 min/max)
- [ ] URL 쿼리스트링과 동기화 (공유 가능)

### Task 3.3: 매물 리스트 컴포넌트
- [ ] `src/components/PropertyList/PropertyList.tsx` 생성
- [ ] 기능:
  - 카드/테이블 뷰 전환
  - 정렬 옵션 (경쟁률, 보증금, 면적)
  - 무한 스크롤 또는 페이지네이션
  - 매물 클릭 시 지도에서 해당 위치 표시

### Task 3.4: 매물 카드 컴포넌트
- [ ] `src/components/PropertyCard/PropertyCard.tsx` 생성
- [ ] 표시 정보:
  - 썸네일 이미지
  - 물건명, 주소
  - 보증금, 면적
  - 경쟁률 (신청자수/모집수)
  - 즐겨찾기 버튼

### Task 3.5: 매물 상세 모달
- [ ] `src/components/PropertyDetail/PropertyDetailModal.tsx` 생성
- [ ] 기능:
  - 전체 정보 표시
  - 이미지 갤러리/슬라이더
  - 원본 사이트 링크
  - 청약 기간 표시

### Task 3.6: 즐겨찾기 기능
- [ ] `src/hooks/useFavorites.ts` 생성
- [ ] 로컬스토리지 기반 저장
- [ ] 즐겨찾기 필터 토글

---

## Phase 4: API 개발

### Task 4.1: 매물 목록 API
- [ ] `src/app/api/properties/route.ts` 생성
- [ ] GET 파라미터:
  - `sido`: 시도 필터 (콤마 구분)
  - `gugun`: 구군 필터 (콤마 구분)
  - `minDeposit`, `maxDeposit`: 보증금 범위
  - `minArea`, `maxArea`: 면적 범위
  - `sort`: 정렬 기준
  - `page`, `limit`: 페이지네이션
- [ ] 응답: 매물 목록 + 전체 개수 + 필터 옵션

### Task 4.2: 매물 상세 API
- [ ] `src/app/api/properties/[id]/route.ts` 생성
- [ ] 상세 정보 반환

### Task 4.3: 필터 옵션 API
- [ ] `src/app/api/filters/route.ts` 생성
- [ ] DB에서 동적으로 시도/구군 목록 추출
- [ ] 보증금/면적 min/max 값 제공

---

## Phase 5: 통합 및 최적화

### Task 5.1: 메인 페이지 통합
- [ ] `src/app/page.tsx` 구현
- [ ] 레이아웃: 좌측 필터+리스트, 우측 지도 (반응형)
- [ ] 상태 관리: URL 쿼리스트링 동기화
- [ ] 초기 데이터 로딩 (SSR 또는 CSR 선택)

### Task 5.2: 반응형 디자인
- [ ] 모바일: 지도/리스트 탭 전환
- [ ] 태블릿: 적응형 레이아웃
- [ ] 데스크톱: 사이드바 레이아웃

### Task 5.3: 성능 최적화
- [ ] 이미지 lazy loading
- [ ] 지도 마커 최적화 (뷰포트 내 마커만 렌더)
- [ ] API 캐싱 (React Query 또는 SWR)
- [ ] 가상 스크롤 (많은 매물 시)

---

## Phase 6: 배포 및 자동화

### Task 6.1: Vercel 배포
- [ ] Vercel 프로젝트 연결
- [ ] 환경 변수 설정
- [ ] 도메인 설정 (선택)

### Task 6.2: 크롤링 스케줄링
- [ ] Vercel Cron 설정 (vercel.json)
  ```json
  {
    "crons": [{
      "path": "/api/crawl",
      "schedule": "0 9 * * *"
    }]
  }
  ```
- [ ] 또는 GitHub Actions 워크플로우 설정
- [ ] 크롤링 결과 알림 (선택: Slack/Discord)

### Task 6.3: 모니터링
- [ ] 에러 로깅 설정
- [ ] 크롤링 상태 대시보드 (선택)

---

## 우선순위 및 의존성

```
Phase 1 (초기 설정)
    │
    ├── Task 1.1 (Next.js) ─┐
    ├── Task 1.2 (Supabase) ├── Phase 2 시작 전 완료 필요
    └── Task 1.3 (카카오맵) ─┘
                            │
                            v
Phase 2 (크롤러) ──────────────> Phase 4 (API)
    │                              │
    │                              v
    └──────────────────────> Phase 3 (프론트엔드)
                                   │
                                   v
                            Phase 5 (통합)
                                   │
                                   v
                            Phase 6 (배포)
```

---

## 리스크 및 대응

| 리스크 | 대응 방안 |
|--------|----------|
| 허그 사이트 구조 변경 | 크롤러 모듈화, 셀렉터 분리 |
| 크롤링 차단 | User-Agent 설정, 요청 간격 조절 |
| Geocoding API 제한 | 배치 처리, 캐싱, 실패 시 재시도 |
| 이미지 URL 만료 | 원본 사이트 링크 제공, 필요시 이미지 저장 전환 |

---

## 완료 기준

- [ ] 허그 든든전세 전체 매물 자동 수집
- [ ] 카카오맵에 매물 마커 표시
- [ ] 다중 조건 필터링 (지역, 가격, 면적)
- [ ] 경쟁률 정렬 기능
- [ ] 즐겨찾기 기능
- [ ] 매물 상세 정보 및 사진 확인
- [ ] 일일 자동 크롤링
- [ ] Vercel 배포 완료
