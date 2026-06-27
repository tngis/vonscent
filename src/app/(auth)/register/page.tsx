import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "@/features/auth/components/auth-form";

export const metadata: Metadata = { title: "Бүртгүүлэх" };

export default function RegisterPage() {
  return (
    <Suspense>
      <AuthForm mode="register" />
    </Suspense>
  );
}
