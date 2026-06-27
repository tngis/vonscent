import { Stars } from "@/components/shared/stars";
import { formatDate } from "@/lib/format";
import { getProductReviews } from "@/features/reviews/api";
import { createClient } from "@/lib/supabase/server";
import { ReviewForm } from "./review-form";
import { DeleteReviewButton } from "./delete-review-button";

/**
 * Server-rendered reviews block for the product page: rating summary, the
 * existing reviews, and the (client) submission form.
 */
export async function ReviewSection({
  productId,
  ratingAvg,
  ratingCount,
}: {
  productId: string;
  ratingAvg: number;
  ratingCount: number;
}) {
  const reviews = await getProductReviews(productId);
  const supabase = await createClient();
  const currentUserId = supabase
    ? (await supabase.auth.getUser()).data.user?.id ?? null
    : null;

  return (
    <section className="mt-16">
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <h2 className="font-serif text-xl font-semibold">Үнэлгээ ба сэтгэгдэл</h2>
        {ratingCount > 0 && (
          <div className="flex items-center gap-2">
            <Stars rating={ratingAvg} />
            <span className="text-sm text-muted-foreground">
              {ratingAvg.toFixed(1)} · {ratingCount} үнэлгээ
            </span>
          </div>
        )}
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          {reviews.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Одоогоор сэтгэгдэл алга. Хамгийн түрүүнд үнэлгээ өгөөрэй.
            </p>
          ) : (
            reviews.map((r) => (
              <div key={r.id} className="border-b border-border pb-5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{r.authorName}</span>
                  <span className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {formatDate(r.createdAt)}
                    </span>
                    {currentUserId === r.userId && (
                      <DeleteReviewButton reviewId={r.id} productId={productId} />
                    )}
                  </span>
                </div>
                <Stars rating={r.rating} size={14} className="mt-1" />
                {r.body && (
                  <p className="mt-2 text-sm text-foreground/90">{r.body}</p>
                )}
              </div>
            ))
          )}
        </div>

        <ReviewForm productId={productId} />
      </div>
    </section>
  );
}
