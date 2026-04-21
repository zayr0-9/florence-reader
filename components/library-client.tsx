"use client"

import { useEffect, useMemo, useState } from "react"
import { BookCard } from "@/components/book-card"
import { featuredBooks } from "@/lib/mock-data"
import { listStoredBooks, toBookRecord } from "@/lib/book-storage"
import { BookRecord } from "@/lib/types"

export function LibraryClient() {
  const [storedBooks, setStoredBooks] = useState<BookRecord[]>([])

  useEffect(() => {
    let cancelled = false

    listStoredBooks()
      .then((items) => {
        if (!cancelled) {
          setStoredBooks(items.map(toBookRecord))
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStoredBooks([])
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  const books = useMemo(() => [...storedBooks, ...featuredBooks], [storedBooks])

  return (
    <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {books.map((book) => (
        <BookCard key={book.id} book={book} />
      ))}
    </div>
  )
}
