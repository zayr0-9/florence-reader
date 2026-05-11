import { notFound } from "next/navigation"
import { ReaderClient } from "@/components/reader-client"

import { featuredBooks } from "@/lib/mock-data"
import { BookRecord } from "@/lib/types"

export default async function ReaderPage(props: PageProps<"/reader/[bookId]">) {
  const { bookId } = await props.params
  const searchParams = await props.searchParams
  const source = typeof searchParams.source === "string" ? searchParams.source : undefined
  const seededBook = featuredBooks.find((entry) => entry.id === bookId)
  const book: BookRecord | undefined = seededBook ?? (bookId.startsWith("local-") ? buildLocalPlaceholderBook(bookId) : undefined)

  if (!book) {
    notFound()
  }

  return <ReaderClient book={book} source={source} />
}

function buildLocalPlaceholderBook(bookId: string): BookRecord {
  return {
    id: bookId,
    title: "Local upload",
    format: "pdf",
    sizeLabel: "Browser file",
    progressPercent: 0,
    currentUnitLabel: "Loading",
    updatedAt: "Just now",
    status: "ready",
    coverTone: "from-emerald-200 via-teal-200 to-cyan-100",
    synopsis: "Client-side uploaded book placeholder while IndexedDB metadata hydrates.",
  }
}
