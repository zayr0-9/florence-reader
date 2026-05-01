import Link from "next/link"
import {
  IconArrowUpRight,
  IconBook,
  IconClockHour4,
  IconFileTypePdf,
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { BookRecord } from "@/lib/types"

export function BookCard({ book }: { book: BookRecord }) {
  const isPdf = book.format === "pdf"
  const initial = (book.title.trim().charAt(0) || "F").toUpperCase()

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-sm border border-[var(--line-strong)] bg-[var(--paper)] shadow-[0_20px_45px_-35px_rgba(55,40,18,0.45)] transition-colors hover:bg-[#f8f0e3]">
      <div
        className={`relative flex h-44 items-end justify-between border-b border-[var(--line)] bg-gradient-to-br ${book.coverTone} p-5 text-black`}
      >
        <span className="absolute right-3 top-1 font-serif text-8xl leading-none text-black/10">
          {initial}
        </span>
        <div className="relative z-10">
          <p className="text-[10px] uppercase tracking-[0.28em] opacity-75">
            {book.format}
          </p>
          <h3 className="mt-2 max-w-[14rem] font-serif text-2xl font-semibold leading-tight tracking-tight">
            {book.title}
          </h3>
        </div>
        {isPdf ? (
          <IconFileTypePdf className="relative z-10 size-6 text-[#572020]" />
        ) : (
          <IconBook className="relative z-10 size-6 text-[#5a4322]" />
        )}
      </div>

      <div className="mt-5 flex flex-1 flex-col gap-4 px-5 pb-5">
        <div>
          <p className="font-serif text-sm font-semibold text-[var(--ink)]">
            {book.author ?? "Unknown author"}
          </p>
          <p className="mt-2 text-sm leading-6 text-[var(--ink-light)]">
            {book.synopsis}
          </p>
        </div>

        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-[var(--ink-light)]">Current unit</span>
            <span className="font-medium text-[var(--ink)]">{book.currentUnitLabel}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[var(--ink-light)]">Progress</span>
            <span className="font-medium text-[var(--ink)]">{book.progressPercent}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[#e9dbc4]">
            <div
              className="h-full bg-[linear-gradient(90deg,#6b2020_0%,#8a6a3a_100%)]"
              style={{ width: `${book.progressPercent}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[var(--ink-light)]">
            <span className="inline-flex items-center gap-2">
              <IconClockHour4 className="size-4" />
              {book.updatedAt}
            </span>
            <span>{book.sizeLabel}</span>
          </div>
        </div>

        <Button
          asChild
          className="mt-auto w-full justify-between border-[var(--highlight)] bg-[var(--highlight)] text-[#f8efe0] hover:bg-[#572020]"
        >
          <Link href={`/reader/${book.id}`}>
            Continue reading
            <IconArrowUpRight className="size-4" />
          </Link>
        </Button>
      </div>
    </article>
  )
}
