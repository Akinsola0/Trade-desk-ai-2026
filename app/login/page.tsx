import type { Metadata } from "next";
import Link from "next/link";

import { AuthLayout } from "@/components/auth/auth-layout";
import { AuthPanel } from "@/components/auth/auth-panel";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your TradeDesk AI dashboard.",
};

export default function LoginPage() {
  return (
    <AuthLayout
      title="Sign in"
      subtitle="Your leads, calls and calendar, in one place."
      footer={
        <>
          No account yet?{" "}
          <Link
            href="/signup"
            className="text-primary rounded underline-offset-4 hover:underline"
          >
            Start free for 14 days
          </Link>
        </>
      }
    >
      <AuthPanel view="sign_in" />
    </AuthLayout>
  );
}
