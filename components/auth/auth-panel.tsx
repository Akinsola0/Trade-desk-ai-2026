"use client";

import { DemoAuthForm } from "@/components/auth/demo-auth-form";

/**
 * The auth screen using DemoAuthForm.
 */
export function AuthPanel({
  view,
  next,
  notice,
}: {
  view: "sign_in" | "sign_up";
  next?: string;
  notice?: string;
}) {
  return (
    <DemoAuthForm
      mode={view === "sign_up" ? "sign_up" : "sign_in"}
      next={next}
      notice={notice}
    />
  );
}
