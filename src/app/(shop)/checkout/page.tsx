"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  User,
  MapPin,
  CreditCard,
  Truck,
  Sparkles,
  ShieldCheck,
  ShoppingCart,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { checkoutSchema } from "@/lib/validators/order";
import {
  SHIPPING_ZONES,
  FREE_SHIP_OVER,
  PAYMENT_METHODS,
} from "@/lib/constants";
import { formatPrice } from "@/lib/format";
import { useCart, selectSubtotal } from "@/features/cart/store";
import { createClient } from "@/lib/supabase/browser";
import type { AddressRow } from "@/db/types";

const formSchema = checkoutSchema.omit({ items: true });
type FormValues = z.infer<typeof formSchema>;

export default function CheckoutPage() {
  const router = useRouter();
  const items = useCart((s) => s.items);
  const subtotal = useCart(selectSubtotal);
  const coupon = useCart((s) => s.coupon);
  const clear = useCart((s) => s.clear);
  const [mounted, setMounted] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);

  const [authed, setAuthed] = React.useState(false);
  const [addresses, setAddresses] = React.useState<AddressRow[]>([]);
  const [loyaltyPoints, setLoyaltyPoints] = React.useState(0);
  const [redeemRate, setRedeemRate] = React.useState(1);
  const [useLoyalty, setUseLoyalty] = React.useState(false);
  const [saveAddr, setSaveAddr] = React.useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      shipCity: "Улаанбаатар",
      shipZone: SHIPPING_ZONES[0].name,
      paymentMethod: "qpay",
    },
  });

  React.useEffect(() => {
    setMounted(true);
    const supabase = createClient();
    if (!supabase) return;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setAuthed(true);
      const [{ data: profile }, { data: addrs }, { data: setting }] =
        await Promise.all([
          supabase
            .from("profiles")
            .select("full_name, phone, loyalty_points")
            .eq("id", user.id)
            .maybeSingle(),
          supabase
            .from("addresses")
            .select("*")
            .eq("user_id", user.id)
            .order("is_default", { ascending: false }),
          supabase.from("settings").select("value").eq("key", "loyalty").maybeSingle(),
        ]);
      const p = profile as {
        full_name?: string;
        phone?: string;
        loyalty_points?: number;
      } | null;
      if (p?.full_name) setValue("contactName", p.full_name);
      if (p?.phone) setValue("contactPhone", p.phone);
      if (user.email) setValue("contactEmail", user.email);
      setLoyaltyPoints(p?.loyalty_points ?? 0);
      setAddresses((addrs as AddressRow[] | null) ?? []);
      const rate = (setting as { value?: { redeemRate?: number } } | null)?.value
        ?.redeemRate;
      if (rate) setRedeemRate(rate);
    })();
  }, [setValue]);

  const zone = watch("shipZone");
  const payment = watch("paymentMethod");
  const shippingFee =
    subtotal >= FREE_SHIP_OVER
      ? 0
      : (SHIPPING_ZONES.find((z) => z.name === zone)?.fee ??
        SHIPPING_ZONES[0].fee);

  const discount = coupon ? Math.min(coupon.discount, subtotal) : 0;
  const maxLoyalty = Math.min(
    Math.floor(loyaltyPoints * redeemRate),
    Math.max(subtotal + shippingFee - discount, 0),
  );
  const loyaltyApplied = useLoyalty ? maxLoyalty : 0;
  const total = Math.max(subtotal + shippingFee - discount - loyaltyApplied, 0);

  function selectAddress(id: string) {
    const a = addresses.find((x) => x.id === id);
    if (!a) return;
    setValue("contactName", a.recipient);
    setValue("contactPhone", a.phone);
    setValue("shipCity", a.city);
    setValue("shipDistrict", a.district ?? "");
    setValue("shipDetail", a.detail);
  }

  if (mounted && items.length === 0) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-5 px-4 md:px-8 py-28 text-center">
        <span className="flex size-16 items-center justify-center rounded-full bg-secondary">
          <ShoppingCart className="size-7 text-muted-foreground" />
        </span>
        <div className="space-y-1">
          <h1 className="font-serif text-2xl font-semibold">
            Сагс хоосон байна
          </h1>
          <p className="text-sm text-muted-foreground">
            Захиалга өгөхийн тулд эхлээд бараа нэмнэ үү.
          </p>
        </div>
        <Button asChild size="lg">
          <Link href="/catalog">Бараа үзэх</Link>
        </Button>
      </div>
    );
  }

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    setServerError(null);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          couponCode: coupon?.code,
          loyaltyUsed: loyaltyApplied,
          saveAddress: saveAddr,
          items: items.map((i) => ({
            productId: i.productId,
            variantId: i.variantId,
            ml: i.ml,
            qty: i.qty,
            isSample: i.isSample,
          })),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setServerError(
          data.error === "OUT_OF_STOCK"
            ? "Уучлаарай, зарим бараа дууссан байна."
            : "Захиалга үүсгэхэд алдаа гарлаа. Дахин оролдоно уу.",
        );
        return;
      }
      const order = await res.json();
      sessionStorage.setItem(
        "vonscent-last-order",
        JSON.stringify({
          orderNo: order.orderNo,
          total: order.total,
          paymentMethod: order.paymentMethod,
          contactName: values.contactName,
          qpay: order.qpay ?? null,
          qpayMock: order.qpayMock ?? false,
        }),
      );
      clear();
      router.push("/order/success");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-[88rem] px-4 md:px-8 py-8">
      <div className="mb-8">
        <Link
          href="/cart"
          className="text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          ← Сагс руу буцах
        </Link>
        <h1 className="mt-1 font-serif text-3xl font-semibold tracking-tight">
          Захиалга өгөх
        </h1>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="grid gap-6 lg:grid-cols-[1fr_400px] lg:gap-10"
      >
        <div className="space-y-6">
          {/* Guest prompt: register to earn loyalty points */}
          {mounted && !authed && (
            <div className="flex items-start gap-3 rounded-2xl bg-secondary px-4 py-3.5 text-sm">
              <Sparkles className="mt-0.5 size-4 shrink-0 text-gold-strong" />
              <p>
                <Link
                  href="/register"
                  className="font-semibold underline-offset-2 hover:underline"
                >
                  Бүртгүүлээд
                </Link>{" "}
                захиалга бүртээ V point цуглуулаарай. Зочноор захиалга хийвэл
                оноо хуримтлуулахгүй.
              </p>
            </div>
          )}

          {/* Saved addresses */}
          {authed && addresses.length > 0 && (
            <Section step={0} icon={MapPin} title="Хадгалсан хаяг">
              <Select onValueChange={selectAddress}>
                <SelectTrigger>
                  <SelectValue placeholder="Хадгалсан хаягаас сонгох" />
                </SelectTrigger>
                <SelectContent>
                  {addresses.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.recipient} — {a.city}
                      {a.district ? `, ${a.district}` : ""}, {a.detail}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Section>
          )}

          {/* Contact */}
          <Section step={1} icon={User} title="Холбоо барих">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Нэр" error={errors.contactName?.message}>
                <Input {...register("contactName")} placeholder="Таны нэр" />
              </Field>
              <Field label="Утас" error={errors.contactPhone?.message}>
                <Input
                  {...register("contactPhone")}
                  placeholder="99112233"
                  inputMode="numeric"
                />
              </Field>
            </div>
            <Field
              label="Имэйл (заавал биш)"
              error={errors.contactEmail?.message}
            >
              <Input {...register("contactEmail")} placeholder="name@mail.com" />
            </Field>
          </Section>

          {/* Shipping */}
          <Section step={2} icon={MapPin} title="Хүргэлтийн хаяг">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Хот / Аймаг">
                <Input {...register("shipCity")} />
              </Field>
              <Field label="Дүүрэг / Сум">
                <Input
                  {...register("shipDistrict")}
                  placeholder="Сонгино хайрхан"
                />
              </Field>
            </div>
            <Field label="Дэлгэрэнгүй хаяг" error={errors.shipDetail?.message}>
              <Input {...register("shipDetail")} placeholder="Хороо, байр, тоот" />
            </Field>
            <Field label="Хүргэлтийн бүс" error={errors.shipZone?.message}>
              <Select value={zone} onValueChange={(v) => setValue("shipZone", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SHIPPING_ZONES.map((z) => (
                    <SelectItem key={z.name} value={z.name}>
                      {z.name} — {formatPrice(z.fee)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Нэмэлт тэмдэглэл (заавал биш)">
              <Input
                {...register("note")}
                placeholder="Жишээ: оройн цагаар залгаарай"
              />
            </Field>
            {authed && (
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <Checkbox
                  checked={saveAddr}
                  onCheckedChange={(v) => setSaveAddr(Boolean(v))}
                />
                Энэ хаягийг хадгалах
              </label>
            )}
          </Section>

          {/* Payment */}
          <Section step={3} icon={CreditCard} title="Төлбөрийн арга">
            <RadioGroup
              value={payment}
              onValueChange={(v) =>
                setValue("paymentMethod", v as FormValues["paymentMethod"])
              }
              className="gap-3"
            >
              {PAYMENT_METHODS.map((m) => (
                <label
                  key={m.value}
                  className="flex cursor-pointer items-center gap-3 rounded-xl bg-secondary p-4 ring-2 ring-transparent transition-all hover:bg-accent has-checked:ring-foreground"
                >
                  <RadioGroupItem value={m.value} />
                  <span className="text-sm font-medium">{m.label}</span>
                </label>
              ))}
            </RadioGroup>
          </Section>
        </div>

        {/* Summary */}
        <div className="lg:sticky lg:top-24 lg:h-fit">
          <Card className="overflow-hidden">
            <CardContent className="space-y-5 p-6">
              <h2 className="font-serif text-lg font-semibold">
                Захиалгын тойм
              </h2>

              <div className="space-y-3">
                {mounted &&
                  items.map((i) => (
                    <div key={i.key} className="flex items-center gap-3">
                      <div className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-muted">
                        {i.image && (
                          <Image
                            src={i.image}
                            alt={i.name}
                            fill
                            sizes="56px"
                            className="object-cover"
                          />
                        )}
                        <span className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-foreground text-[10px] font-semibold text-background">
                          {i.qty}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium leading-tight">
                          {i.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {i.brand} · {i.ml}ml
                        </p>
                      </div>
                      <span className="text-sm font-medium">
                        {formatPrice(i.unitPrice * i.qty)}
                      </span>
                    </div>
                  ))}
              </div>

              <div className="gold-rule" />

              <div className="space-y-2.5">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Дэд дүн</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Купон {coupon?.code}
                    </span>
                    <span className="text-success">
                      −{formatPrice(discount)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Truck className="size-4" /> Хүргэлт
                  </span>
                  <span>
                    {shippingFee === 0 ? "Үнэгүй" : formatPrice(shippingFee)}
                  </span>
                </div>
              </div>

              {/* Loyalty */}
              {authed && maxLoyalty > 0 && (
                <label className="flex cursor-pointer items-center justify-between gap-2 rounded-xl bg-secondary px-3 py-2.5 text-sm">
                  <span className="flex items-center gap-2">
                    <Checkbox
                      checked={useLoyalty}
                      onCheckedChange={(v) => setUseLoyalty(Boolean(v))}
                    />
                    Loyalty оноо ашиглах ({loyaltyPoints})
                  </span>
                  {useLoyalty && (
                    <span className="text-success">
                      −{formatPrice(loyaltyApplied)}
                    </span>
                  )}
                </label>
              )}

              <div className="gold-rule" />

              <div className="flex items-baseline justify-between">
                <span className="font-medium">Нийт төлөх</span>
                <span className="font-serif text-2xl font-semibold">
                  {formatPrice(total)}
                </span>
              </div>

              {serverError && (
                <p className="rounded-xl bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
                  {serverError}
                </p>
              )}

              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={submitting}
              >
                {submitting ? "Илгээж байна…" : "Захиалга баталгаажуулах"}
              </Button>
              <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
                <ShieldCheck className="size-3.5" />
                Баталгаажуулснаар та үйлчилгээний нөхцөлийг зөвшөөрнө.
              </p>
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  );
}

function Section({
  step,
  icon: Icon,
  title,
  children,
}: {
  step: number;
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl bg-card p-5 sm:p-6">
      <div className="mb-5 flex items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary">
          {step > 0 ? (
            <span className="text-sm font-semibold">{step}</span>
          ) : (
            <Icon className="size-[18px]" />
          )}
        </span>
        <h2 className="font-serif text-lg font-semibold">{title}</h2>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
