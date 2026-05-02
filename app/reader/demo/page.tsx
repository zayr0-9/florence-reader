import { ReaderClient } from "@/components/reader-client"

import { featuredBooks } from "@/lib/mock-data"

export default async function DemoReaderPage(
  props: PageProps<"/reader/demo">
) {
  const searchParams = await props.searchParams
  const source = typeof searchParams.source === "string" ? searchParams.source : undefined

  return <ReaderClient book={featuredBooks[0]} source={source} />
}
