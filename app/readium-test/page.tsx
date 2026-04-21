import Link from "next/link"
import { ReadiumWebTestShell } from "@/components/readium-web-test-shell"
import { SiteShell } from "@/components/site-shell"

const sampleManifestUrl =
  "https://publication-server.readium.org/webpub/Z3M6Ly9yZWFkaXVtLXBsYXlncm91bmQtZmlsZXMvZGVtby9tb2J5LWRpY2suZXB1Yg/manifest.json"

export default function ReadiumTestPage() {
  return (
    <SiteShell currentPath="/readium-test">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-6 space-y-3 border border-black/10 bg-white p-4">
          <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Readium Web test</p>
          <h2 className="text-2xl font-semibold tracking-tight">Thorium / Readium proof of life</h2>
          <p className="max-w-3xl text-sm text-muted-foreground">
            This route tests Readium Web using a known-good hosted EPUB manifest from the Readium Playground stack.
            If this page renders the sample book, the Readium toolchain is viable in Florence Reader and we can move
            on to local-upload integration next.
          </p>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="border border-emerald-500/30 bg-emerald-50 px-3 py-2 text-emerald-800">
              Sample manifest: Moby Dick
            </span>
            <Link
              href={sampleManifestUrl}
              target="_blank"
              className="border border-black/10 px-3 py-2 text-muted-foreground hover:border-emerald-500/40 hover:bg-emerald-50 hover:text-emerald-900"
            >
              Open manifest JSON
            </Link>
          </div>
        </div>

        <ReadiumWebTestShell manifestUrl={sampleManifestUrl} />
      </div>
    </SiteShell>
  )
}
