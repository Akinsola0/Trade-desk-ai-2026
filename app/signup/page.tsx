import type { Metadata } from "next";
import Link from "next/link";

import { AuthLayout } from "@/components/auth/auth-layout";
import { AuthPanel } from "@/components/auth/auth-panel";

export const metadata: Metadata = {
  title: "Create your account",
  description:
    "Create a TradeDesk AI account and let the AI front desk answer your next call.",
};

export default function SignupPage() {
  return (
    <AuthLayout
      title="Create your account"
      subtitle="Free for 14 days. No card, no setup fee, cancel any time."
      footer={
        <>
          Already with us?{" "}
          <Link
            href="/login"
            className="text-primary rounded underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </>
      }
    >
      <AuthPanel view="sign_up" />
    </AuthLayout>
  );
}
