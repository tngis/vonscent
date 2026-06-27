"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PriceCalculator,
  type VariantDraft,
} from "./price-calculator";
import {
  GENDERS,
  GENDER_LABEL,
  CONCENTRATIONS,
  SEASONS,
  SEASON_LABEL,
} from "@/lib/constants";

const FAMILIES = ["floral", "woody", "fresh", "oriental", "citrus", "spicy"];

export function ProductForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = React.useState(false);
  const [result, setResult] = React.useState<string | null>(null);

  const [form, setForm] = React.useState({
    name: "",
    brand: "",
    gender: "unisex",
    concentration: "EDP",
    scentFamily: "fresh",
    notesTop: "",
    notesHeart: "",
    notesBase: "",
    description: "",
    originCountry: "",
    releaseYear: "",
    season: "all",
    onHandMl: "100",
    lowStockMl: "20",
  });

  const calcRef = React.useRef<{
    bottlePrice: number;
    bottleMl: number;
    variants: VariantDraft[];
  }>({ bottlePrice: 0, bottleMl: 0, variants: [] });

  const onCalcChange = React.useCallback(
    (state: {
      bottlePrice: number;
      bottleMl: number;
      variants: VariantDraft[];
    }) => {
      calcRef.current = state;
    },
    [],
  );

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setResult(null);
    try {
      const payload = {
        ...form,
        releaseYear: form.releaseYear ? Number(form.releaseYear) : null,
        onHandMl: Number(form.onHandMl),
        lowStockMl: Number(form.lowStockMl),
        notesTop: form.notesTop.split(",").map((s) => s.trim()).filter(Boolean),
        notesHeart: form.notesHeart
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        notesBase: form.notesBase
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        ...calcRef.current,
      };
      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.demo) {
        setResult(
          "Demo горим: Supabase холбогдсоны дараа бараа бодитоор хадгалагдана. (Үнэ тооцоо ажиллаж байна ✓)",
        );
      } else if (res.ok) {
        router.push("/admin/products");
      } else {
        setResult("Алдаа гарлаа.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <Card>
        <CardContent className="space-y-4 p-6">
          <h2 className="font-serif text-lg font-semibold">Үндсэн мэдээлэл</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Нэр">
              <Input
                required
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
              />
            </Field>
            <Field label="Брэнд">
              <Input
                required
                value={form.brand}
                onChange={(e) => set("brand", e.target.value)}
              />
            </Field>
            <Field label="Хүйс">
              <Select
                value={form.gender}
                onValueChange={(v) => set("gender", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GENDERS.map((g) => (
                    <SelectItem key={g} value={g}>
                      {GENDER_LABEL[g]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Төрөл">
              <Select
                value={form.concentration}
                onValueChange={(v) => set("concentration", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONCENTRATIONS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Үнэрийн төрөл">
              <Select
                value={form.scentFamily}
                onValueChange={(v) => set("scentFamily", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FAMILIES.map((f) => (
                    <SelectItem key={f} value={f}>
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Гаргасан он">
              <Input
                type="number"
                value={form.releaseYear}
                onChange={(e) => set("releaseYear", e.target.value)}
              />
            </Field>
            <Field label="Улирал">
              <Select value={form.season} onValueChange={(v) => set("season", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SEASONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {SEASON_LABEL[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Field label="Гарал үүсэл (улс)">
            <Input
              value={form.originCountry}
              onChange={(e) => set("originCountry", e.target.value)}
            />
          </Field>
          <Field label="Тайлбар">
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              className="flex w-full rounded-md bg-secondary px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-6">
          <h2 className="font-serif text-lg font-semibold">Үнэрийн нот</h2>
          <Field label="Дээд нот (таслалаар)">
            <Input
              value={form.notesTop}
              onChange={(e) => set("notesTop", e.target.value)}
              placeholder="Бергамот, Чинжүү"
            />
          </Field>
          <Field label="Зүрх нот">
            <Input
              value={form.notesHeart}
              onChange={(e) => set("notesHeart", e.target.value)}
            />
          </Field>
          <Field label="Суурь нот">
            <Input
              value={form.notesBase}
              onChange={(e) => set("notesBase", e.target.value)}
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-6">
          <h2 className="font-serif text-lg font-semibold">
            Үнэ (ml шатлал авто тооцоо)
          </h2>
          <PriceCalculator onChange={onCalcChange} />
          <Separator />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Эх савны үлдэгдэл (ml)">
              <Input
                type="number"
                value={form.onHandMl}
                onChange={(e) => set("onHandMl", e.target.value)}
              />
            </Field>
            <Field label="Доод хязгаар (ml)">
              <Input
                type="number"
                value={form.lowStockMl}
                onChange={(e) => set("lowStockMl", e.target.value)}
              />
            </Field>
          </div>
        </CardContent>
      </Card>

      {result && (
        <p className="rounded-md bg-secondary px-4 py-3 text-sm">{result}</p>
      )}

      <div className="flex gap-3">
        <Button type="submit" size="lg" disabled={submitting}>
          {submitting ? "Хадгалж байна…" : "Бараа хадгалах"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={() => router.push("/admin/products")}
        >
          Болих
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
