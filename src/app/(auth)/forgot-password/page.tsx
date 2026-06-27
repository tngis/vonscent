import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";

export const metadata: Metadata = { title: "Нууц үг сэргээх" };

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
