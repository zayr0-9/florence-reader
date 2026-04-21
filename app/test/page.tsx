import { EpubTsTestRoute } from "@/components/epub-ts-test-route"
import { SiteShell } from "@/components/site-shell"

export default function TestPage() {
  return (
    <SiteShell currentPath="/test">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <EpubTsTestRoute />
      </div>
    </SiteShell>
  )
}
