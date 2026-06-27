"use client";

import * as React from "react";
import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DEFAULT_PRICE_TIERS, DEFAULT_ROUND_TO } from "@/lib/constants";
import { createClient } from "@/lib/supabase/browser";

async function saveSetting(key: string, value: unknown) {
  await fetch("/api/admin/settings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, value }),
  });
}

export default function AdminSettingsPage() {
  const [tiers, setTiers] = React.useState<
    { ml: number; coefficient: number }[]
  >(DEFAULT_PRICE_TIERS.map((t) => ({ ml: t.ml, coefficient: t.coefficient })));
  const [roundTo, setRoundTo] = React.useState(DEFAULT_ROUND_TO);
  const [store, setStore] = React.useState({
    name: "vonscent",
    phone: "",
    email: "hello@vonscent.mn",
    address: "Улаанбаатар",
  });
  const [zones, setZones] = React.useState<{ name: string; fee: number }[]>([
    { name: "Улаанбаатар дотор", fee: 5000 },
    { name: "Орон нутаг", fee: 12000 },
  ]);
  const [freeOver, setFreeOver] = React.useState(150000);
  const [invoiceCode, setInvoiceCode] = React.useState("");

  React.useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;
    supabase
      .from("settings")
      .select("key, value")
      .then(({ data }) => {
        for (const row of (data as { key: string; value: unknown }[] | null) ?? []) {
          const v = row.value as Record<string, unknown>;
          if (row.key === "pricing" && v) {
            if (Array.isArray(v.tiers)) setTiers(v.tiers as typeof tiers);
            if (v.roundTo) setRoundTo(Number(v.roundTo));
          }
          if (row.key === "store" && v) setStore((s) => ({ ...s, ...(v as object) }));
          if (row.key === "shipping" && v) {
            if (Array.isArray(v.zones)) setZones(v.zones as typeof zones);
            if (v.freeOver) setFreeOver(Number(v.freeOver));
          }
          if (row.key === "payment" && v) setInvoiceCode(String(v.invoiceCode ?? ""));
        }
      });
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-2xl font-semibold">Тохиргоо</h1>

      {/* Pricing */}
      <Saver title="Шатлалын коэффициент" onSave={() => saveSetting("pricing", { roundTo, tiers })}>
        <div className="grid gap-4 sm:grid-cols-3">
          {tiers.map((t, i) => (
            <div key={t.ml} className="space-y-1.5">
              <Label>{t.ml}ml коэффициент</Label>
              <Input
                type="number"
                step="0.1"
                value={t.coefficient}
                onChange={(e) =>
                  setTiers((ts) =>
                    ts.map((x, j) =>
                      j === i ? { ...x, coefficient: Number(e.target.value) || 0 } : x,
                    ),
                  )
                }
              />
            </div>
          ))}
        </div>
        <div className="max-w-xs space-y-1.5">
          <Label>Бөөрөнхийлөх алхам (₮)</Label>
          <Input
            type="number"
            value={roundTo}
            onChange={(e) => setRoundTo(Number(e.target.value) || 1)}
          />
        </div>
      </Saver>

      {/* Store info */}
      <Saver title="Дэлгүүрийн мэдээлэл" onSave={() => saveSetting("store", store)}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Нэр">
            <Input value={store.name} onChange={(e) => setStore({ ...store, name: e.target.value })} />
          </Field>
          <Field label="Утас">
            <Input value={store.phone} onChange={(e) => setStore({ ...store, phone: e.target.value })} />
          </Field>
          <Field label="Имэйл">
            <Input value={store.email} onChange={(e) => setStore({ ...store, email: e.target.value })} />
          </Field>
          <Field label="Хаяг">
            <Input value={store.address} onChange={(e) => setStore({ ...store, address: e.target.value })} />
          </Field>
        </div>
      </Saver>

      {/* Shipping */}
      <Saver
        title="Хүргэлтийн бүс ба төлбөр"
        onSave={() => saveSetting("shipping", { zones, freeOver })}
      >
        <div className="space-y-2">
          {zones.map((z, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                value={z.name}
                onChange={(e) =>
                  setZones((zs) => zs.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))
                }
                placeholder="Бүсийн нэр"
              />
              <Input
                type="number"
                className="w-32"
                value={z.fee}
                onChange={(e) =>
                  setZones((zs) =>
                    zs.map((x, j) => (j === i ? { ...x, fee: Number(e.target.value) || 0 } : x)),
                  )
                }
                placeholder="Төлбөр"
              />
              <button
                onClick={() => setZones((zs) => zs.filter((_, j) => j !== i))}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setZones((zs) => [...zs, { name: "", fee: 0 }])}
          >
            <Plus className="size-4" /> Бүс нэмэх
          </Button>
        </div>
        <div className="max-w-xs space-y-1.5">
          <Label>Үнэгүй хүргэлтийн босго (₮)</Label>
          <Input
            type="number"
            value={freeOver}
            onChange={(e) => setFreeOver(Number(e.target.value) || 0)}
          />
        </div>
      </Saver>

      {/* Payment */}
      <Saver
        title="Төлбөрийн тохиргоо (QPay)"
        onSave={() => saveSetting("payment", { invoiceCode })}
      >
        <Field label="QPay Invoice Code">
          <Input
            value={invoiceCode}
            onChange={(e) => setInvoiceCode(e.target.value)}
            placeholder="QPAY_INVOICE_CODE"
          />
        </Field>
        <p className="text-xs text-muted-foreground">
          QPay-ийн нэвтрэх нууц мэдээлэл (username/password) нь серверийн орчны
          хувьсагчид (env) хадгалагдана.
        </p>
      </Saver>

      {/* Admin users / roles */}
      <Card>
        <CardContent className="space-y-3 p-6">
          <h2 className="font-serif text-lg font-semibold">
            Админ хэрэглэгч ба эрхийн түвшин
          </h2>
          <p className="text-sm text-muted-foreground">
            Хэрэглэгчдэд оператор / супер админ эрх олгох, хураах үйлдлийг{" "}
            <Link href="/admin/customers" className="text-primary hover:underline">
              Хэрэглэгч
            </Link>{" "}
            хэсгээс хийнэ. (Эрх өөрчлөхөд super admin шаардлагатай.)
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function Saver({
  title,
  children,
  onSave,
}: {
  title: string;
  children: React.ReactNode;
  onSave: () => Promise<void>;
}) {
  const [saved, setSaved] = React.useState(false);
  async function handle() {
    await onSave();
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }
  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <h2 className="font-serif text-lg font-semibold">{title}</h2>
        {children}
        <Button onClick={handle}>{saved ? "Хадгалагдлаа ✓" : "Хадгалах"}</Button>
      </CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
