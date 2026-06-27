"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatPrice, formatDate } from "@/lib/format";
import type { CouponRow } from "@/db/types";

export function CouponManager({ initial }: { initial: CouponRow[] }) {
  const router = useRouter();
  const [showForm, setShowForm] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [form, setForm] = React.useState({
    code: "",
    type: "percent",
    value: "10",
    minSubtotal: "0",
    maxUses: "",
    endsAt: "",
  });

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/admin/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: form.code,
          type: form.type,
          value: Number(form.value),
          minSubtotal: Number(form.minSubtotal) || 0,
          maxUses: form.maxUses ? Number(form.maxUses) : null,
          endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
          isActive: true,
        }),
      });
      if (res.ok) {
        setForm({ code: "", type: "percent", value: "10", minSubtotal: "0", maxUses: "", endsAt: "" });
        setShowForm(false);
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  async function toggle(c: CouponRow) {
    await fetch(`/api/admin/coupons/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !c.is_active }),
    });
    router.refresh();
  }

  async function remove(id: string) {
    if (!confirm("Купон устгах уу?")) return;
    await fetch(`/api/admin/coupons/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl font-semibold">Урамшуулал / Купон</h1>
        <Button size="sm" onClick={() => setShowForm((s) => !s)}>
          <Plus className="size-4" /> Купон үүсгэх
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="p-6">
            <form onSubmit={create} className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Код</Label>
                <Input value={form.code} onChange={(e) => set("code", e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label>Төрөл</Label>
                <Select value={form.type} onValueChange={(v) => set("type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">Хувь (%)</SelectItem>
                    <SelectItem value="fixed">Тогтсон дүн (₮)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{form.type === "percent" ? "Хувь" : "Дүн (₮)"}</Label>
                <Input type="number" value={form.value} onChange={(e) => set("value", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Доод дүн (₮)</Label>
                <Input type="number" value={form.minSubtotal} onChange={(e) => set("minSubtotal", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Ашиглах хязгаар</Label>
                <Input type="number" value={form.maxUses} onChange={(e) => set("maxUses", e.target.value)} placeholder="Хязгааргүй" />
              </div>
              <div className="space-y-1.5">
                <Label>Дуусах огноо</Label>
                <Input type="date" value={form.endsAt} onChange={(e) => set("endsAt", e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" disabled={busy}>Хадгалах</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {initial.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
          Купон алга.
        </p>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Код</th>
                <th className="px-4 py-3 font-medium">Хямдрал</th>
                <th className="px-4 py-3 font-medium">Ашигласан</th>
                <th className="px-4 py-3 font-medium">Дуусах</th>
                <th className="px-4 py-3 font-medium">Төлөв</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {initial.map((c) => (
                <tr key={c.id} className="border-t border-border">
                  <td className="px-4 py-3 font-mono font-semibold">{c.code}</td>
                  <td className="px-4 py-3">
                    {c.type === "percent" ? `${c.value}%` : formatPrice(c.value)}
                    {c.min_subtotal > 0 && (
                      <span className="text-muted-foreground"> · {formatPrice(c.min_subtotal)}-аас</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {c.used_count}
                    {c.max_uses ? ` / ${c.max_uses}` : ""}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {c.ends_at ? formatDate(c.ends_at) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => toggle(c)}>
                      <Badge variant={c.is_active ? "new" : "secondary"}>
                        {c.is_active ? "Идэвхтэй" : "Идэвхгүй"}
                      </Badge>
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => remove(c.id)}
                      className="text-muted-foreground hover:text-destructive"
                      aria-label="Устгах"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
