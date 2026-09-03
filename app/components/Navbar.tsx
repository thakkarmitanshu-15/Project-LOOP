"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";

const navigation = [
  {
    name: "Dashboard",
    href: "/dashboard",
  },
  {
    name: "Feedback",
    href: "/feedback",
  },
  {
    name: "Themes",
    href: "/themes",
  },
];

export default function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between px-6 lg:px-10">
        {/* Brand */}
        <Link
          href="/dashboard"
          className="flex items-center gap-3"
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

        {/* Navigation + User */}
        <div className="flex items-center gap-1">
          <nav className="flex items-center gap-1">
            {navigation.map((item) => {
              const isActive =
                pathname === item.href ||
                pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-lg px-3.5 py-2 text-sm font-medium transition ${
                    isActive
                      ? "bg-slate-950 font-semibold text-white"
                      : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  {item.name}
                </Link>
              );
            })}
          </nav>

          <div className="mx-2 hidden h-6 w-px bg-slate-200 sm:block" />

          {/* User information */}
          <div className="hidden text-right sm:block">
            <p className="text-xs font-semibold text-slate-900">
              {session?.user?.name ?? "User"}
            </p>

            <p className="text-[10px] uppercase tracking-wide text-slate-500">
              {session?.user?.role ?? ""}
            </p>
          </div>

          {/* Avatar */}
          <div className="ml-1 flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
            {session?.user?.name
              ?.charAt(0)
              .toUpperCase() ?? "U"}
          </div>

          {/* Logout */}
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="ml-1 hidden rounded-lg px-3 py-2 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 md:block"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}