import { calcTierPrices, resolveVariantPrice } from "@/lib/pricing/calc";
import { DEFAULT_PRICE_TIERS, DEFAULT_ROUND_TO } from "@/lib/constants";
import type { ProductDetail } from "@/lib/types";
import type {
  Concentration,
  Gender,
  ScentFamily,
  Season,
  TagKind,
} from "@/db/types";

/**
 * Seed catalogue used by the demo when Supabase is not configured, and by the
 * DB seed script. Prices are NOT hard-coded — they are derived from the bottle
 * price + ml through the pricing core, exactly like production.
 */
interface SeedInput {
  slug: string;
  name: string;
  brand: string;
  gender: Gender;
  concentration: Concentration;
  scentFamily: ScentFamily;
  season?: Season;
  originCountry: string;
  releaseYear: number;
  bottlePrice: number; // ₮
  bottleMl: number;
  notesTop: string[];
  notesHeart: string[];
  notesBase: string[];
  description: string;
  tags: TagKind[];
  onHandMl: number;
  ratingAvg: number;
  ratingCount: number;
  /** Optional per-ml overrides keyed by ml size. */
  overrides?: Partial<Record<number, number>>;
}

const RAW: SeedInput[] = [
  {
    slug: "dior-sauvage-edp",
    name: "Sauvage",
    brand: "Dior",
    gender: "male",
    concentration: "EDP",
    scentFamily: "fresh",
    originCountry: "Франц",
    releaseYear: 2018,
    bottlePrice: 480000,
    bottleMl: 100,
    notesTop: ["Бергамот", "Чинжүү"],
    notesHeart: ["Сычуань чинжүү", "Лаванда", "Гэрийн заамар"],
    notesBase: ["Амбра", "Кедр", "Лабданум"],
    description:
      "Цөл шиг тунгалаг, шинэхэн нэгэн агшин. Бергамотын гэрэлт эхлэл амброксын дулаан сүүлээр төгсдөг — өдөр тутамд тохирох, эрхэмсэг сонголт.",
    tags: ["hot"],
    onHandMl: 60,
    ratingAvg: 4.7,
    ratingCount: 128,
  },
  {
    slug: "chanel-coco-mademoiselle",
    name: "Coco Mademoiselle",
    brand: "Chanel",
    gender: "female",
    concentration: "EDP",
    scentFamily: "floral",
    originCountry: "Франц",
    releaseYear: 2001,
    bottlePrice: 620000,
    bottleMl: 100,
    notesTop: ["Жүрж", "Бергамот"],
    notesHeart: ["Сарнай", "Жасмин", "Личи"],
    notesBase: ["Пачули", "Ваниль", "Вэтивер"],
    description:
      "Зоригтой, эмэгтэйлэг сонгодог. Цитрусын тод эхлэл сарнай-жасмины зүрхээр дамжин пачулийн гүн ул мөр үлдээнэ.",
    tags: ["hot", "new"],
    onHandMl: 45,
    ratingAvg: 4.8,
    ratingCount: 96,
  },
  {
    slug: "tom-ford-oud-wood",
    name: "Oud Wood",
    brand: "Tom Ford",
    gender: "unisex",
    concentration: "EDP",
    scentFamily: "woody",
    originCountry: "АНУ",
    releaseYear: 2007,
    bottlePrice: 1150000,
    bottleMl: 100,
    notesTop: ["Зүүн модны од", "Розвуд", "Кардамон"],
    notesHeart: ["Сандал", "Палисандр", "Од"],
    notesBase: ["Тонка", "Ваниль", "Амбра"],
    description:
      "Ховор зүүн модны од (oud)-ыг зөөлрүүлсэн чамин найрлага. Утаат, дулаахан, нэр төртэй — унисекс шилдэг сонголт.",
    tags: ["hot"],
    onHandMl: 30,
    ratingAvg: 4.9,
    ratingCount: 64,
    overrides: { 5: 78000 },
  },
  {
    slug: "creed-aventus",
    name: "Aventus",
    brand: "Creed",
    gender: "male",
    concentration: "EDP",
    scentFamily: "fresh",
    originCountry: "Их Британи",
    releaseYear: 2010,
    bottlePrice: 1450000,
    bottleMl: 100,
    notesTop: ["Хан боргоцой", "Алимны навч", "Бергамот"],
    notesHeart: ["Хус мод", "Пачули", "Сарнай"],
    notesBase: ["Заамар", "Хувь", "Ваниль"],
    description:
      "Хүч ба эрхэмсэг байдлын домог. Утаат хус, шүүслэг хан боргоцой — амжилтын үнэр хэмээн нэрлэгддэг.",
    tags: ["hot"],
    onHandMl: 25,
    ratingAvg: 4.9,
    ratingCount: 210,
  },
  {
    slug: "ysl-libre-edp",
    name: "Libre",
    brand: "Yves Saint Laurent",
    gender: "female",
    concentration: "EDP",
    scentFamily: "floral",
    originCountry: "Франц",
    releaseYear: 2019,
    bottlePrice: 540000,
    bottleMl: 90,
    notesTop: ["Мандарин", "Лаванда", "Үхрийн нүд"],
    notesHeart: ["Лаванда", "Жасмин", "Цэцэгт гэрийн заамар"],
    notesBase: ["Ваниль", "Кедр", "Амбра"],
    description:
      "Эрх чөлөөний илэрхийлэл — Францын лаванда, Марокын улбар цэцгийн зоримог нийлэмж.",
    tags: ["new"],
    onHandMl: 50,
    ratingAvg: 4.6,
    ratingCount: 73,
  },
  {
    slug: "maison-margiela-by-the-fireplace",
    name: "By the Fireplace",
    brand: "Maison Margiela",
    gender: "unisex",
    concentration: "EDT",
    scentFamily: "spicy",
    originCountry: "Франц",
    releaseYear: 2015,
    bottlePrice: 430000,
    bottleMl: 100,
    notesTop: ["Гваякийн мод", "Цурампи", "Улаан чинжүү"],
    notesHeart: ["Тооно шарсан үнэр", "Гэрийн заамар"],
    notesBase: ["Ваниль", "Кедр", "Шатсан модны утаа"],
    description:
      "Өвлийн задгай зуухны дэргэдэх дулаан агшин. Утаат, чихэрлэг, тайвшруулах гэрийн мэдрэмж.",
    tags: ["sale"],
    onHandMl: 18,
    ratingAvg: 4.5,
    ratingCount: 41,
  },
  {
    slug: "acqua-di-parma-colonia",
    name: "Colonia",
    brand: "Acqua di Parma",
    gender: "unisex",
    concentration: "EDC",
    scentFamily: "citrus",
    originCountry: "Итали",
    releaseYear: 1916,
    bottlePrice: 510000,
    bottleMl: 100,
    notesTop: ["Сицилийн нимбэг", "Бергамот", "Жүрж"],
    notesHeart: ["Лаванда", "Розмарин", "Вербена"],
    notesBase: ["Вэтивер", "Сандал", "Заамар"],
    description:
      "Италийн сонгодог одеколон. Цитрусын цэвэр, сэргэг эхлэл — цаг хугацааг дассан эрхэмсэг энгийн байдал.",
    tags: [],
    onHandMl: 8,
    ratingAvg: 4.4,
    ratingCount: 33,
  },
  {
    slug: "jo-malone-wood-sage-sea-salt",
    name: "Wood Sage & Sea Salt",
    brand: "Jo Malone",
    gender: "unisex",
    concentration: "EDC",
    scentFamily: "fresh",
    originCountry: "Их Британи",
    releaseYear: 2014,
    bottlePrice: 460000,
    bottleMl: 100,
    notesTop: ["Далайн давс", "Шүүслэг улаан анар"],
    notesHeart: ["Шавар", "Гэрийн заамар"],
    notesBase: ["Шарилж", "Замаг", "Цагаан мод"],
    description:
      "Эрэг дагуух салхи. Давслаг, ургамалт, цайвар — задгай агаарын чөлөөт мэдрэмж.",
    tags: ["new", "sale"],
    onHandMl: 38,
    ratingAvg: 4.5,
    ratingCount: 57,
  },
];

function buildVariants(input: SeedInput) {
  const auto = calcTierPrices(
    input.bottlePrice,
    input.bottleMl,
    DEFAULT_PRICE_TIERS,
    DEFAULT_ROUND_TO,
  );
  return auto.map((t, i) => ({
    id: `${input.slug}-${t.ml}`,
    ml: t.ml,
    price: resolveVariantPrice(t.price, input.overrides?.[t.ml] ?? null),
    isActive: true,
    // mark the 5ml variant as the implicit "sample"
    _index: i,
  }));
}

const unsplash = (id: string) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=800&q=80`;

/**
 * Real perfume photos per product (Unsplash, verified resolvable). Each product
 * has a unique primary image plus a couple of supporting shots for the gallery.
 */
const PRODUCT_IMAGE_IDS: Record<string, string[]> = {
  "dior-sauvage-edp": [
    "1541643600914-78b084683601",
    "1547887538-e3a2f32cb1cc",
    "1605651202774-7d573fd3f12d",
  ],
  "chanel-coco-mademoiselle": [
    "1592945403244-b3fbafd7f539",
    "1563170351-be82bc888aa4",
    "1585386959984-a4155224a1ad",
  ],
  "tom-ford-oud-wood": [
    "1588405748880-12d1d2a59f75",
    "1619994403073-2cec844b8e63",
    "1592914610354-fd354ea45e48",
  ],
  "creed-aventus": [
    "1594035910387-fea47794261f",
    "1610461888750-10bfc601b874",
    "1615634260167-c8cdede054de",
  ],
  "ysl-libre-edp": [
    "1610461888750-10bfc601b874",
    "1523293182086-7651a899d37f",
    "1557170334-a9632e77c6e4",
  ],
  "maison-margiela-by-the-fireplace": [
    "1615634260167-c8cdede054de",
    "1547887538-e3a2f32cb1cc",
    "1541643600914-78b084683601",
  ],
  "acqua-di-parma-colonia": [
    "1523293182086-7651a899d37f",
    "1605651202774-7d573fd3f12d",
    "1592945403244-b3fbafd7f539",
  ],
  "jo-malone-wood-sage-sea-salt": [
    "1557170334-a9632e77c6e4",
    "1563170351-be82bc888aa4",
    "1588405748880-12d1d2a59f75",
  ],
};

/** Resolvable perfume image URLs for a product slug. */
export function productImageUrls(slug: string): string[] {
  const ids = PRODUCT_IMAGE_IDS[slug] ?? ["1541643600914-78b084683601"];
  return ids.map(unsplash);
}

export const SEED_PRODUCTS: ProductDetail[] = RAW.map((input) => {
  const variants = buildVariants(input).map(({ _index, ...v }) => {
    void _index;
    return v;
  });
  const startingPrice = Math.min(...variants.map((v) => v.price));
  const images = productImageUrls(input.slug).map((url) => ({
    url,
    alt: input.name,
  }));
  return {
    id: input.slug,
    slug: input.slug,
    name: input.name,
    brand: input.brand,
    gender: input.gender,
    concentration: input.concentration,
    scentFamily: input.scentFamily,
    season: input.season ?? null,
    image: images[0],
    images,
    startingPrice,
    tags: input.tags,
    soldOut: input.onHandMl <= 0,
    sampleAvailable: true,
    ratingAvg: input.ratingAvg,
    ratingCount: input.ratingCount,
    createdAt: new Date(2024, 0, 1 + RAW.indexOf(input)).toISOString(),
    description: input.description,
    notesTop: input.notesTop,
    notesHeart: input.notesHeart,
    notesBase: input.notesBase,
    originCountry: input.originCountry,
    releaseYear: input.releaseYear,
    variants,
    availableMl: input.onHandMl,
    bottleMl: input.bottleMl,
  };
});

export const SEED_RAW = RAW;
