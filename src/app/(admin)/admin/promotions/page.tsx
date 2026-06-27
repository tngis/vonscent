import { getCoupons } from "@/features/admin/api";
import { CouponManager } from "@/features/admin/components/coupon-manager";

export default async function AdminPromotionsPage() {
  const coupons = await getCoupons();
  return <CouponManager initial={coupons} />;
}
