import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ProductGallery } from "@/features/products/components/product-gallery";
import { ProductPurchase } from "@/features/products/components/product-purchase";
import { WishlistButton } from "@/features/wishlist/components/wishlist-button";
import { ProductCarousel } from "@/features/products/components/product-carousel";
import { SectionHeading } from "@/components/shared/section-heading";
import { getProductBySlug, getRelated } from "@/features/products/api";
import { ReviewSection } from "@/features/reviews/components/review-section";
import { GENDER_LABEL, SEASON_LABEL } from "@/lib/constants";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Бараа олдсонгүй" };
  return {
    title: `${product.name} — ${product.brand}`,
    description: product.description.slice(0, 160),
    openGraph: { images: product.image ? [product.image.url] : [] },
  };
}

const TAG_LABEL: Record<string, string> = {
  new: "Шинэ",
  hot: "Эрэлттэй",
  sale: "Хямдрал",
};

function NoteColumn({ title, notes }: { title: string; notes: string[] }) {
  if (!notes.length) return null;
  return (
    <div>
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      <p className="text-sm">{notes.join(", ")}</p>
    </div>
  );
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const related = await getRelated(slug);

  return (
    <div className="mx-auto max-w-7xl px-4 py-4 sm:py-8">
      {/* Breadcrumb (hidden on mobile for a fuller hero image) */}
      <nav className="mb-6 hidden text-sm text-muted-foreground sm:block">
        <Link href="/" className="hover:text-foreground">
          Нүүр
        </Link>{" "}
        /{" "}
        <Link href="/catalog" className="hover:text-foreground">
          Каталог
        </Link>{" "}
        / <span className="text-foreground">{product.name}</span>
      </nav>

      <div className="grid gap-0 sm:gap-10 lg:grid-cols-2">
        <ProductGallery images={product.images} name={product.name} />

        {/* On mobile this panel slides up over the bottom of the image with a
            rounded top; resets to a plain column from sm up. */}
        <div className="relative z-10 -mx-4 -mt-8 space-y-6 rounded-t-4xl bg-background px-4 pt-8 sm:mx-0 sm:mt-0 sm:rounded-none sm:bg-transparent sm:px-0 sm:pt-0">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm uppercase tracking-wide text-muted-foreground">
                {product.brand}
              </span>
              {product.tags.map((t) => (
                <Badge key={t} variant={t}>
                  {TAG_LABEL[t]}
                </Badge>
              ))}
            </div>
            <div className="flex items-start justify-between gap-3">
              <h1 className="font-serif text-3xl font-semibold tracking-tight">
                {product.name}
              </h1>
              <WishlistButton
                productId={product.id}
                className="size-10 shrink-0 bg-secondary hover:bg-accent"
              />
            </div>
          </div>

          <ProductPurchase product={product} />
        </div>
      </div>

      {/* Notes + details */}
      <div className="mt-14 grid gap-10 lg:grid-cols-2">
        <div>
          <h2 className="mb-4 font-serif text-xl font-semibold">Үнэрийн нот</h2>
          <div className="grid grid-cols-1 gap-3 rounded-lg bg-secondary p-5 sm:grid-cols-3 sm:gap-4">
            <NoteColumn title="Дээд" notes={product.notesTop} />
            <NoteColumn title="Зүрх" notes={product.notesHeart} />
            <NoteColumn title="Суурь" notes={product.notesBase} />
          </div>
        </div>

        <div>
          <Accordion type="single" collapsible defaultValue="desc">
            <AccordionItem value="desc">
              <AccordionTrigger>Дэлгэрэнгүй тайлбар</AccordionTrigger>
              <AccordionContent>{product.description}</AccordionContent>
            </AccordionItem>
            <AccordionItem value="info">
              <AccordionTrigger>Барааны мэдээлэл</AccordionTrigger>
              <AccordionContent>
                <dl className="space-y-1.5">
                  <Row label="Брэнд" value={product.brand} />
                  <Row label="Төрөл" value={product.concentration} />
                  <Row label="Хүйс" value={GENDER_LABEL[product.gender]} />
                  {product.originCountry && (
                    <Row label="Гарал үүсэл" value={product.originCountry} />
                  )}
                  {product.releaseYear && (
                    <Row
                      label="Гаргасан он"
                      value={String(product.releaseYear)}
                    />
                  )}
                  {product.season && (
                    <Row label="Улирал" value={SEASON_LABEL[product.season]} />
                  )}
                </dl>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="ship">
              <AccordionTrigger>Хүргэлт ба буцаалт</AccordionTrigger>
              <AccordionContent>
                Улаанбаатар хотод 24 цагийн дотор хүргэнэ. Орон нутагт 2-4
                хоног. Decant бараа тул эрүүл ахуйн шалтгаанаар буцаалт
                хийгдэхгүй.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>

      <ReviewSection
        productId={product.id}
        ratingAvg={product.ratingAvg}
        ratingCount={product.ratingCount}
      />

      {related.length > 0 && (
        <section className="mt-16">
          <SectionHeading title="Төстэй бараа" />
          <ProductCarousel products={related} />
        </section>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
