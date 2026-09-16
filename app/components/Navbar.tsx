"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useSession, signOut } from "next-auth/react";

const navigation = [
  { name: "Dashboard", href: "/dashboard" },
  { name: "Feedback", href: "/feedback" },
  { name: "Themes", href: "/themes" },
  { name: "Reports", href: "/reports" },
  { name: "Ask LOOP", href: "/ask" },
];

export default function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isAdmin = session?.user?.role === "ADMIN";

  const visibleNavigation = isAdmin
    ? [...navigation, { name: "Workspace", href: "/settings" }]
    : navigation;

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  const handleNavigation = () => {
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between px-4 sm:px-6 lg:px-10">
        {/* Logo */}
        <Link
          href="/dashboard"
          className="flex shrink-0 items-center gap-3"
          onClick={handleNavigation}
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-sm font-bold text-white">
            L
          </div>

          <div>
            <p className="text-base font-bold tracking-tight text-slate-950">
              LOOP
            </p>

            <p className="hidden text-[10px] uppercase tracking-widest text-slate-400 sm:block">
              Customer Intelligence
            </p>
          </div>
        </Link>

        {/* Desktop navigation */}
        <div className="hidden items-center gap-1 md:flex">
          <nav className="flex items-center gap-1">
            {visibleNavigation.map((item) => {
              const active = isActive(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-lg px-3.5 py-2 text-sm font-medium transition ${
                    active
                      ? "bg-slate-950 font-semibold text-white"
                      : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  {item.name}
                </Link>
              );
            })}
          </nav>

          <div className="mx-2 h-6 w-px bg-slate-200" />

          <div className="text-right">
            <p className="text-xs font-semibold text-slate-900">
              {session?.user?.name ?? "User"}
            </p>

            <p className="text-[10px] uppercase tracking-wide text-slate-500">
              {session?.user?.role ?? ""}
            </p>
          </div>

          <div className="ml-2 flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
            {session?.user?.name?.charAt(0).toUpperCase() ?? "U"}
          </div>

          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="ml-1 rounded-lg px-3 py-2 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
          >
            Logout
          </button>
        </div>

        {/* Mobile controls */}
        <div className="flex items-center gap-2 md:hidden">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
            {session?.user?.name?.charAt(0).toUpperCase() ?? "U"}
          </div>

          <button
            type="button"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((open) => !open)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-700 transition hover:bg-slate-100"
          >
            {mobileMenuOpen ? (
              <span className="text-lg leading-none">×</span>
            ) : (
              <span className="text-lg leading-none">☰</span>
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="border-t border-slate-200 bg-white md:hidden">
          <nav className="mx-auto max-w-[1600px] px-4 py-3 sm:px-6">
            <div className="space-y-1">
              {visibleNavigation.map((item) => {
                const active = isActive(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={handleNavigation}
                    className={`block rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                      active
                        ? "bg-slate-950 font-semibold text-white"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    {item.name}
                  </Link>
                );
              })}
            </div>

            <div className="mt-3 border-t border-slate-200 pt-3">
              <div className="px-3 py-2">
                <p className="text-sm font-semibold text-slate-900">
                  {session?.user?.name ?? "User"}
                </p>

                <p className="mt-1 text-[10px] uppercase tracking-wide text-slate-500">
                  {session?.user?.role ?? ""}
                </p>
              </div>

              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="mt-1 w-full rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
              >
                Logout
              </button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}