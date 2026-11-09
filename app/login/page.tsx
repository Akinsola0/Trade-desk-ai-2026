import type { Metadata } from "next";
import Link from "next/link";

import { AuthLayout } from "@/components/auth/auth-layout";
import { AuthPanel } from "@/components/auth/auth-panel";
import { safeNextPath } from "@/lib/safe-redirect";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your TradeDesk AI dashboard.",
};

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  // `proxy.ts` sends signed-out dashboard visitors here with ?next=…
  const next = safeNextPath(first(params.next));
  const notice =
    first(params.error) === "confirmation_failed"
      ? "That confirmation link couldn't be used here — it may have expired or been opened in a different browser. If you already confirmed your email, just sign in."
      : undefined;

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
      <AuthPanel view="sign_in" next={next} notice={notice} />
    </AuthLayout>
  );
}
