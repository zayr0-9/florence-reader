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
      className="flex min-h-dvh w-full flex-col overflow-x-hidden text-foreground"
      style={{ "--site-header-height": "73px" } as React.CSSProperties}
    >
      <header className="shrink-0 h-[var(--site-header-height)] border-b border-[var(--line)] bg-[linear-gradient(180deg,#f8f0e2_0%,#f1e5cf_100%)]">
        <div className="mx-auto flex h-full w-full max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-sm border border-[var(--line-strong)] bg-[var(--paper)] text-[11px] font-semibold tracking-[0.2em] text-[var(--highlight)]">
              FL
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.28em] text-[var(--ink-light)]">
                Florence
              </p>
              <h1 className="truncate font-serif text-sm font-semibold tracking-wide text-[var(--ink)]">
                Reader & Scriptorium
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
                    "inline-flex items-center gap-2 rounded-sm border px-2 py-2 text-[10px] uppercase tracking-[0.2em] transition-colors sm:px-3",
                    active
                      ? "border-[var(--highlight)] bg-[var(--highlight)] text-[#f8efe0]"
                      : "border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:border-[var(--highlight-soft)] hover:bg-[#fbf4e6]",
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
