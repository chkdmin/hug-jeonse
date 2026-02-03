export interface Property {
  id: number;
  announcement_no: string;
  property_name: string;
  address: string;
  building_type: string;
  area_m2: number;
  deposit: number;
  applicant_count: number;
  recruitment_count: number;
  competition_rate: number;
  latitude: number | null;
  longitude: number | null;
  sido: string;
  gugun: string;
  detail_url: string;
  images: string[];
  application_start: string | null;
  application_end: string | null;
  created_at: string;
  updated_at: string;
}

export interface PropertyListResponse {
  data: Property[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface FilterOptions {
  sido: string[];
  gugun: Record<string, string[]>;
  depositRange: { min: number; max: number };
  areaRange: { min: number; max: number };
}

export interface PropertyFilters {
  sido?: string[];
  gugun?: string[];
  minDeposit?: number;
  maxDeposit?: number;
  minArea?: number;
  maxArea?: number;
  sort?: 'competition_asc' | 'competition_desc' | 'deposit_asc' | 'deposit_desc';
  page?: number;
  limit?: number;
}

export interface CrawledProperty {
  announcement_no: string;
  property_name: string;
  address: string;
  building_type: string;
  area_m2: number;
  deposit: number;
  detail_url: string;
  sido: string;
  gugun: string;
}

export interface PropertyDetail {
  applicant_count: number;
  recruitment_count: number;
  images: string[];
  application_start: string | null;
  application_end: string | null;
}
