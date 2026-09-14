"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";

import { Logo } from "@/components/site/logo";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

/** Both audiences are one click from the first screen — neither is buried. */
const navLinks = [
  { href: "/find", label: "Find a tradesman" },
  { href: "/about", label: "About" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/#compare", label: "Compare" },
];

/**
 * `overlay` renders transparent with white text, for sitting directly on the
 * homepage hero photo — it turns solid the moment the page scrolls past the
 * hero, same pattern Booksy uses. Every other page uses the solid default.
 */
export function SiteHeader({ overlay = false }: { overlay?: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <header
      className={cn(
        "z-40 w-full",
        overlay
          ? "absolute top-0 left-0"
          : "bg-background/95 sticky top-0 border-b backdrop-blur",
      )}
    >
      <div className="mx-auto flex h-18 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo tone={overlay ? "light" : "dark"} />

        <nav
          aria-label="Main"
          className={cn(
            "hidden items-center gap-1 md:flex",
            overlay && "[&_a]:text-white [&_a]:hover:bg-white/10",
          )}
        >
          {navLinks.map((link) => (
            <Button key={link.href} asChild variant="ghost" size="sm">
              <Link href={link.href}>{link.label}</Link>
            </Button>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Button
            asChild
            variant={overlay ? "ghost" : "ghost"}
            size="sm"
            className={overlay ? "text-white hover:bg-white/10" : undefined}
          >
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild size="sm" variant={overlay ? "invert" : "default"}>
            <Link href="/signup">Get started</Link>
          </Button>
        </div>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button
              variant={overlay ? "invert" : "outline"}
              size="icon"
              aria-label="Open menu"
            >
              <Menu />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72">
            <SheetHeader>
              <SheetTitle>Menu</SheetTitle>
            </SheetHeader>
            <nav aria-label="Mobile" className="flex flex-col gap-1 px-4">
              {navLinks.map((link) => (
                <SheetClose asChild key={link.href}>
                  <Link
                    href={link.href}
                    className="hover:bg-secondary rounded-lg px-3 py-2 font-medium"
                  >
                    {link.label}
                  </Link>
                </SheetClose>
              ))}
            </nav>
            <div className="mt-auto flex flex-col gap-2 p-4">
              <SheetClose asChild>
                <Button asChild variant="outline">
                  <Link href="/login">Sign in</Link>
                </Button>
              </SheetClose>
              <SheetClose asChild>
                <Button asChild>
                  <Link href="/signup">Get started</Link>
                </Button>
              </SheetClose>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
