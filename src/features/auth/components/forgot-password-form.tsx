"use client";

import * as React from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/browser";

/** Sends a Supabase password-reset email; user sets a new password in /account. */
export function ForgotPasswordForm() {
  const [email, setEmail] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [sent, setSent] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const supabase = createClient();
    if (!supabase) {
      setError("Нэвтрэлт одоогоор тохируулагдаагүй байна.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/account`,
      });
      if (error) throw error;
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Алдаа гарлаа.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="font-serif text-2xl font-semibold">Нууц үг сэргээх</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Бүртгэлтэй имэйлээ оруулна уу. Сэргээх холбоос илгээнэ.
        </p>
      </div>

      {sent ? (
        <p className="rounded-md bg-secondary px-4 py-3 text-center text-sm">
          Сэргээх холбоос илгээгдлээ. Имэйлээ шалгаад шинэ нууц үгээ тохируулна
          уу.
        </p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
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
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Илгээж байна…" : "Сэргээх холбоос илгээх"}
          </Button>
        </form>
      )}

      <p className="text-center text-sm text-muted-foreground">
        <Link href="/login" className="text-primary hover:underline">
          Нэвтрэх рүү буцах
        </Link>
      </p>
    </div>
  );
}
