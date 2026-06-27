"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/browser";

type Mode = "login" | "register";

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/account";

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [fullName, setFullName] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    const supabase = createClient();
    if (!supabase) {
      setError(
        "Нэвтрэлт одоогоор тохируулагдаагүй байна. (Supabase холбоо шаардлагатай)",
      );
      return;
    }
    setLoading(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push(next);
        router.refresh();
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } },
        });
        if (error) throw error;
        setNotice("Бүртгэл амжилттай. Имэйлээ шалгана уу (баталгаажуулалт).");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Алдаа гарлаа.");
    } finally {
      setLoading(false);
    }
  }

  async function oauth(provider: "google" | "facebook") {
    const supabase = createClient();
    if (!supabase) {
      setError("Нэвтрэлт одоогоор тохируулагдаагүй байна.");
      return;
    }
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${next}` },
    });
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="font-serif text-2xl font-semibold">
          {mode === "login" ? "Нэвтрэх" : "Бүртгүүлэх"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {mode === "login"
            ? "Бүртгэлдээ нэвтэрнэ үү"
            : "Шинэ бүртгэл үүсгэнэ үү"}
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        {mode === "register" && (
          <div className="space-y-1.5">
            <Label htmlFor="name">Нэр</Label>
            <Input
              id="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="email">Имэйл</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Нууц үг</Label>
            {mode === "login" && (
              <Link
                href="/forgot-password"
                className="text-xs text-muted-foreground hover:text-primary"
              >
                Нууц үг мартсан?
              </Link>
            )}
          </div>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
        {notice && <p className="text-sm text-success">{notice}</p>}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading
            ? "..."
            : mode === "login"
              ? "Нэвтрэх"
              : "Бүртгүүлэх"}
        </Button>
      </form>

      <div className="flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-xs text-muted-foreground">эсвэл</span>
        <Separator className="flex-1" />
      </div>

      <div className="grid gap-2">
        <Button variant="outline" onClick={() => oauth("google")}>
          Google-ээр үргэлжлүүлэх
        </Button>
        <Button variant="outline" onClick={() => oauth("facebook")}>
          Facebook-ээр үргэлжлүүлэх
        </Button>
      </div>

      <p className="text-center text-sm text-muted-foreground">
        {mode === "login" ? (
          <>
            Бүртгэлгүй юу?{" "}
            <Link href="/register" className="text-primary hover:underline">
              Бүртгүүлэх
            </Link>
          </>
        ) : (
          <>
            Бүртгэлтэй юу?{" "}
            <Link href="/login" className="text-primary hover:underline">
              Нэвтрэх
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
