"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  GENDERS,
  GENDER_LABEL,
  CONCENTRATIONS,
  SEASONS,
  SEASON_LABEL,
} from "@/lib/constants";
import type { AdminProduct } from "@/features/admin/api";

const FAMILIES = ["floral", "woody", "fresh", "oriental", "citrus", "spicy"];
const TAGS: { slug: "new" | "hot" | "sale"; label: string }[] = [
  { slug: "new", label: "Шинэ" },
  { slug: "hot", label: "Эрэлттэй" },
  { slug: "sale", label: "Хямдрал" },
];

export function ProductEditForm({ product }: { product: AdminProduct }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);
  const [form, setForm] = React.useState({
    name: product.name,
    brand: product.brand,
    gender: product.gender,
    concentration: product.concentration,
    scentFamily: product.scentFamily ?? "fresh",
    season: product.season ?? "all",
    description: product.description,
    notesTop: product.notesTop.join(", "),
    notesHeart: product.notesHeart.join(", "),
    notesBase: product.notesBase.join(", "),
    originCountry: product.originCountry ?? "",
    releaseYear: product.releaseYear ? String(product.releaseYear) : "",
    bottlePrice: String(product.bottlePrice),
    bottleMl: String(product.bottleMl),
    lowStockMl: String(product.lowStockMl),
  });
  const [tags, setTags] = React.useState<string[]>(product.tags);
  const [isActive, setIsActive] = React.useState(product.isActive);
  const [sampleAvailable, setSample] = React.useState(product.sampleAvailable);

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }
  function toggleTag(slug: string) {
    setTags((t) => (t.includes(slug) ? t.filter((x) => x !== slug) : [...t, slug]));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          brand: form.brand,
          gender: form.gender,
          concentration: form.concentration,
          scentFamily: form.scentFamily,
          season: form.season,
          description: form.description,
          notesTop: split(form.notesTop),
          notesHeart: split(form.notesHeart),
          notesBase: split(form.notesBase),
          originCountry: form.originCountry || null,
          releaseYear: form.releaseYear ? Number(form.releaseYear) : null,
          bottlePrice: Number(form.bottlePrice),
          bottleMl: Number(form.bottleMl),
          lowStockMl: Number(form.lowStockMl),
          isActive,
          sampleAvailable,
          tags,
        }),
      });
      const data = await res.json();
      if (data.demo) setMsg("Demo горим: өөрчлөлт хадгалагдсангүй.");
      else if (res.ok) router.push("/admin/products");
      else setMsg("Алдаа гарлаа.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm("Энэ барааг устгах уу?")) return;
    setBusy(true);
    const res = await fetch(`/api/admin/products/${product.id}`, {
      method: "DELETE",
    });
    setBusy(false);
    if (res.ok) router.push("/admin/products");
  }

  return (
    <form onSubmit={save} className="space-y-6">
      <Card>
        <CardContent className="space-y-4 p-6">
          <h2 className="font-serif text-lg font-semibold">Үндсэн мэдээлэл</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Нэр">
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} required />
            </Field>
            <Field label="Брэнд">
              <Input value={form.brand} onChange={(e) => set("brand", e.target.value)} required />
            </Field>
            <Field label="Хүйс">
              <Select value={form.gender} onValueChange={(v) => set("gender", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {GENDERS.map((g) => (
                    <SelectItem key={g} value={g}>{GENDER_LABEL[g]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Төрөл">
              <Select value={form.concentration} onValueChange={(v) => set("concentration", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CONCENTRATIONS.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Үнэрийн төрөл">
              <Select value={form.scentFamily} onValueChange={(v) => set("scentFamily", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FAMILIES.map((f) => (
                    <SelectItem key={f} value={f}>{f}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Гаргасан он">
              <Input type="number" value={form.releaseYear} onChange={(e) => set("releaseYear", e.target.value)} />
            </Field>
            <Field label="Улирал">
              <Select value={form.season} onValueChange={(v) => set("season", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SEASONS.map((s) => (
                    <SelectItem key={s} value={s}>{SEASON_LABEL[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Field label="Гарал үүсэл (улс)">
            <Input value={form.originCountry} onChange={(e) => set("originCountry", e.target.value)} />
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
            <Input value={form.notesTop} onChange={(e) => set("notesTop", e.target.value)} />
          </Field>
          <Field label="Зүрх нот">
            <Input value={form.notesHeart} onChange={(e) => set("notesHeart", e.target.value)} />
          </Field>
          <Field label="Суурь нот">
            <Input value={form.notesBase} onChange={(e) => set("notesBase", e.target.value)} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-6">
          <h2 className="font-serif text-lg font-semibold">Үнэ ба үлдэгдэл</h2>
          <p className="text-sm text-muted-foreground">
            Бүтэн савны үнэ/багтаамжийг өөрчлөхөд 5/10/20ml үнэ автоматаар дахин
            бодогдоно.
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Бүтэн савны үнэ (₮)">
              <Input type="number" value={form.bottlePrice} onChange={(e) => set("bottlePrice", e.target.value)} />
            </Field>
            <Field label="Багтаамж (ml)">
              <Input type="number" value={form.bottleMl} onChange={(e) => set("bottleMl", e.target.value)} />
            </Field>
            <Field label="Доод хязгаар (ml)">
              <Input type="number" value={form.lowStockMl} onChange={(e) => set("lowStockMl", e.target.value)} />
            </Field>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-6">
          <h2 className="font-serif text-lg font-semibold">Таг ба төлөв</h2>
          <div className="flex flex-wrap gap-4">
            {TAGS.map((t) => (
              <label key={t.slug} className="flex cursor-pointer items-center gap-2 text-sm">
                <Checkbox checked={tags.includes(t.slug)} onCheckedChange={() => toggleTag(t.slug)} />
                {t.label}
              </label>
            ))}
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <Checkbox checked={isActive} onCheckedChange={(v) => setIsActive(Boolean(v))} />
            Идэвхтэй (нийтлэх)
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <Checkbox checked={sampleAvailable} onCheckedChange={(v) => setSample(Boolean(v))} />
            Sample боломжтой
          </label>
        </CardContent>
      </Card>

      {msg && <p className="rounded-md bg-secondary px-4 py-3 text-sm">{msg}</p>}

      <div className="flex items-center justify-between">
        <div className="flex gap-3">
          <Button type="submit" size="lg" disabled={busy}>
            {busy ? "Хадгалж байна…" : "Хадгалах"}
          </Button>
          <Button type="button" variant="outline" size="lg" onClick={() => router.push("/admin/products")}>
            Болих
          </Button>
        </div>
        <Button type="button" variant="ghost" onClick={remove} disabled={busy}>
          <Trash2 className="size-4" /> Устгах
        </Button>
      </div>
    </form>
  );
}

function split(s: string) {
  return s.split(",").map((x) => x.trim()).filter(Boolean);
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
