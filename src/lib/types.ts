import type {
  Concentration,
  Gender,
  ScentFamily,
  Season,
  TagKind,
} from "@/db/types";

/** A priced decant size for a product. */
export interface Variant {
  id: string;
  ml: number;
  /** Effective charged price in integer ₮ (override ?? auto). */
  price: number;
  isActive: boolean;
}

export interface ProductImage {
  url: string;
  alt: string;
}

/** Compact shape used in catalog grids and home rails. */
export interface ProductListItem {
  id: string;
  slug: string;
  name: string;
  brand: string;
  gender: Gender;
  concentration: Concentration;
  scentFamily: ScentFamily | null;
  season: Season | null;
  image: ProductImage | null;
  /** Lowest active variant price (display "from …"). */
  startingPrice: number;
  tags: TagKind[];
  soldOut: boolean;
  sampleAvailable: boolean;
  ratingAvg: number;
  ratingCount: number;
  createdAt: string;
}

/** Full product detail page payload. */
export interface ProductDetail extends ProductListItem {
  description: string;
  notesTop: string[];
  notesHeart: string[];
  notesBase: string[];
  originCountry: string | null;
  releaseYear: number | null;
  images: ProductImage[];
  variants: Variant[];
  /** Available source ml (on_hand - reserved). */
  availableMl: number;
  bottleMl: number;
}

export interface CatalogFilters {
  brand?: string[];
  gender?: Gender[];
  family?: ScentFamily[];
  season?: Season[];
  tags?: TagKind[];
  ml?: number[];
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  sort?: "new" | "price_asc" | "price_desc" | "name" | "popular";
  page?: number;
  perPage?: number;
}

export interface CatalogResult {
  items: ProductListItem[];
  total: number;
  page: number;
  perPage: number;
}
