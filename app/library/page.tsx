import { LibraryClient } from "@/components/library-client"
import { SiteShell } from "@/components/site-shell"

export default function LibraryPage() {
  return (
    <SiteShell currentPath="/library">
      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex flex-col gap-4 border border-black/10 bg-white p-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
              Personal library
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight">
              Keep books, progress, and background state organized.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              This MVP library now mixes seeded demo books with local IndexedDB uploads, so you can reopen real PDF and EPUB files in the browser.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center text-sm">
            <div className="border border-black/10 bg-zinc-50 px-4 py-3">
              <div className="text-2xl font-semibold">PDF</div>
              <div className="text-muted-foreground">client render</div>
            </div>
            <div className="border border-black/10 bg-zinc-50 px-4 py-3">
              <div className="text-2xl font-semibold">EPUB</div>
              <div className="text-muted-foreground">client render</div>
            </div>
            <div className="border border-black/10 bg-zinc-50 px-4 py-3">
              <div className="text-2xl font-semibold">IDB</div>
              <div className="text-muted-foreground">saved local</div>
            </div>
          </div>
        </div>

        <LibraryClient />
      </section>
    </SiteShell>
  )
}
