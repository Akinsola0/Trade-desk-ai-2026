"use client";

import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";

import { DemoAuthForm } from "@/components/auth/demo-auth-form";
import {
  getSupabaseBrowserClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";

/**
 * The auth screen, in whichever mode the environment allows.
 *
 * With `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` set, this
 * is Supabase Auth UI against the real project. Without them it's the demo form
 * — the same sign-up and sign-in, kept in the browser, so the dashboard is
 * usable before the backend exists.
 */
export function AuthPanel({ view }: { view: "sign_in" | "sign_up" }) {
  // No Supabase project yet: sign up and sign in against browser-local accounts.
  if (!isSupabaseConfigured) {
    return <DemoAuthForm mode={view === "sign_up" ? "sign_up" : "sign_in"} />;
  }

  return (
    <Auth
      supabaseClient={getSupabaseBrowserClient()}
      view={view}
      // TODO(backend): confirm which providers the project enables. Email +
      // magic link only for now; add Google here once it's switched on.
      providers={[]}
      redirectTo={
        typeof window === "undefined"
          ? undefined
          : `${window.location.origin}/dashboard`
      }
      appearance={{
        theme: ThemeSupa,
        variables: {
          default: {
            colors: {
              brand: "#2b4bbf",
              brandAccent: "#243fa0",
              inputBorder: "#e3e6ec",
              inputBorderFocus: "#2b4bbf",
              inputBorderHover: "#c9cfda",
            },
            radii: {
              borderRadiusButton: "0.5rem",
              inputBorderRadius: "0.5rem",
              buttonBorderRadius: "0.5rem",
            },
            fonts: {
              bodyFontFamily: "var(--font-geist-sans), system-ui, sans-serif",
              buttonFontFamily: "var(--font-geist-sans), system-ui, sans-serif",
              inputFontFamily: "var(--font-geist-sans), system-ui, sans-serif",
              labelFontFamily: "var(--font-geist-sans), system-ui, sans-serif",
            },
          },
        },
      }}
      localization={{
        variables: {
          sign_in: {
            email_label: "Email",
            password_label: "Password",
            button_label: "Sign in",
          },
          sign_up: {
            email_label: "Email",
            password_label: "Password",
            button_label: "Create account",
          },
        },
      }}
    />
  );
}
