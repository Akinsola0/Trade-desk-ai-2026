"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { LogOut, Menu, PhoneIncoming } from "lucide-react";

import { dashboardNav } from "@/components/dashboard/dashboard-nav";
import { Logo } from "@/components/site/logo";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useAsync } from "@/hooks/use-async";
import { getMatchRequests, getSession, signOut } from "@/lib/api";
import { formatPhone } from "@/lib/format";
import { tradeTypeLabels } from "@/lib/labels";
import { cn } from "@/lib/utils";

function NavLinks({
  pendingRequestCount,
  onNavigate,
}: {
  pendingRequestCount: number;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <nav aria-label="Dashboard" className="flex flex-col gap-1">
      {dashboardNav.map((item) => {
        const active =
          item.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname.startsWith(item.href);
        const badgeCount =
          item.href === "/dashboard/requests" ? pendingRequestCount : 0;

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground",
            )}
          >
            <item.icon className="size-4" aria-hidden />
            {item.label}
            {badgeCount > 0 ? (
              <span
                className={cn(
                  "ml-auto flex size-5 items-center justify-center rounded-full text-xs font-semibold",
                  active
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-destructive text-white",
                )}
              >
                {badgeCount}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * The signed-in shell. The business comes from `getSession()` — no screen ever
 * hardcodes a business id, because RLS decides which one you get.
 */
export function DashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const {
    data: session,
    loading,
    error,
  } = useAsync(useCallback(() => getSession(), []));
  // Loaded here (not just on the requests page) so the nav badge shows
  // pending requests before the owner ever opens the inbox.
  const { data: matchRequests } = useAsync(
    useCallback(() => getMatchRequests(), []),
  );
  const pendingRequestCount =
    matchRequests?.filter((request) => request.status === "pending").length ??
    0;

  // `getSession()` throws when nobody is signed in — that is the gate.
  const signedOut = !loading && !session;
  useEffect(() => {
    if (signedOut) router.replace("/login");
  }, [signedOut, router]);

  async function handleSignOut() {
    await signOut();
    router.replace("/login");
  }

  if (signedOut) {
    return (
      <main id="main" className="flex flex-1 items-center justify-center p-8">
        <p className="text-muted-foreground text-sm">
          {error?.message ?? "You need to sign in to see that."} Taking you to
          the sign-in screen…
        </p>
      </main>
    );
  }

  const initials = session?.profile.name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("");

  return (
    <div className="flex min-h-full flex-1 flex-col lg:flex-row">
      <aside className="bg-secondary/40 hidden w-64 shrink-0 border-r lg:flex lg:flex-col">
        <div className="flex h-16 items-center border-b px-5">
          <Logo />
        </div>
        <div className="flex-1 p-4">
          <NavLinks pendingRequestCount={pendingRequestCount} />
        </div>
        <div className="text-muted-foreground border-t p-5 text-xs">
          {loading ? (
            <Skeleton className="h-8 w-full" />
          ) : session ? (
            <>
              <p className="text-foreground flex items-center gap-1.5 font-medium">
                <PhoneIncoming className="size-3.5" aria-hidden />
                AI answering on
              </p>
              <p className="mt-1">{formatPhone(session.business.phone)}</p>
            </>
          ) : null}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="bg-background/92 sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b px-4 backdrop-blur sm:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild className="lg:hidden">
                <Button variant="outline" size="icon" aria-label="Open menu">
                  <Menu />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64">
                <SheetHeader>
                  <SheetTitle className="text-left">
                    <Logo />
                  </SheetTitle>
                </SheetHeader>
                <div className="px-3">
                  <NavLinks
                    pendingRequestCount={pendingRequestCount}
                    onNavigate={() => setMenuOpen(false)}
                  />
                </div>
              </SheetContent>
            </Sheet>

            <div className="min-w-0">
              {loading || !session ? (
                <Skeleton className="h-5 w-40" />
              ) : (
                <>
                  <p className="display truncate text-lg">
                    {session.business.name}
                  </p>
                  <p className="text-muted-foreground truncate text-xs font-medium">
                    {tradeTypeLabels[session.business.trade_type]} ·{" "}
                    {session.business.timezone}
                  </p>
                </>
              )}
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2">
                <Avatar>
                  <AvatarFallback>{initials ?? "…"}</AvatarFallback>
                </Avatar>
                <span className="hidden sm:inline">
                  {session?.profile.name ?? "Loading"}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel>
                {session?.profile.name ?? "Signed in"}
                <span className="text-muted-foreground block text-xs font-normal capitalize">
                  {session?.profile.role ?? ""}
                </span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/dashboard/settings">Business profile</Link>
              </DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onClick={handleSignOut}>
                <LogOut />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main id="main" className="flex-1 px-4 py-8 sm:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
