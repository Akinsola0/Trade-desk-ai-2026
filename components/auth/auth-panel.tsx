"use client";

import { DemoAuthForm } from "@/components/auth/demo-auth-form";

/**
 * The auth screen using DemoAuthForm.
 */
export function AuthPanel({ view }: { view: "sign_in" | "sign_up" }) {
  return <DemoAuthForm mode={view === "sign_up" ? "sign_up" : "sign_in"} />;
}
