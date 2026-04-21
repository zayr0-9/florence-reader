import Link from "next/link";
import { IconBook, IconLibrary, IconSparkles } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Home", icon: IconBook },
  { href: "/library", label: "Library", icon: IconLibrary },
  { href: "/reader/demo", label: "Reader", icon: IconSparkles },
  // { href: "/readium-test", label: "Readium", icon: IconSparkles },
  // { href: "/test", label: "Test", icon: IconSparkles },
];

export function SiteShell({
  children,
  currentPath,
}: {
  children: React.ReactNode;
  currentPath?: string;
}) {
  return (
    <div
      className="flex min-h-dvh w-full flex-col overflow-x-hidden bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.14),_transparent_40%),linear-gradient(180deg,#fafaf9_0%,#f4f4f5_100%)] text-foreground"
      style={{ "--site-header-height": "73px" } as React.CSSProperties}
    >
      <header className="shrink-0 h-[var(--site-header-height)] border-b border-black/5 bg-white/70 backdrop-blur">
        <div className="mx-auto flex h-full w-full max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <div className="flex size-10 items-center justify-center border border-black/10 bg-emerald-400/20 text-emerald-700">
              FL
            </div>
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">
                Florence
              </p>
              <h1 className="truncate text-sm font-semibold tracking-wide">
                Reader-first ebook studio
              </h1>
            </div>
          </Link>

          <nav className="flex shrink-0 items-center gap-2">
            {navItems.map(({ href, label, icon: Icon }) => {
              const active = currentPath === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "inline-flex items-center gap-2 border px-2 py-2 text-xs uppercase tracking-[0.24em] transition-colors sm:px-3",
                    active
                      ? "border-emerald-500 bg-emerald-500 text-white"
                      : "border-black/10 bg-white hover:border-emerald-500/50 hover:bg-emerald-50",
                  )}
                >
                  <Icon className="size-4" />
                  <span className="hidden sm:inline">{label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="min-h-0 w-full flex-1">{children}</main>
    </div>
  );
}
