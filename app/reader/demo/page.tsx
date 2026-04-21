import { ReaderClient } from "@/components/reader-client"
import { SiteShell } from "@/components/site-shell"
import { featuredBooks } from "@/lib/mock-data"

export default async function DemoReaderPage(
  props: PageProps<"/reader/demo">
) {
  const searchParams = await props.searchParams
  const source = typeof searchParams.source === "string" ? searchParams.source : undefined

  return (
    <SiteShell currentPath="/reader/demo">
      <ReaderClient book={featuredBooks[0]} source={source} />
    </SiteShell>
  )
}
