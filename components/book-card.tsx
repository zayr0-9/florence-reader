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

  return (
    <article className="flex h-full flex-col border border-black/10 bg-white p-5">
      <div
        className={`flex h-40 items-end justify-between bg-gradient-to-br ${book.coverTone} p-4 text-black`}
      >
        <div>
          <p className="text-xs uppercase tracking-[0.28em] opacity-70">{book.format}</p>
          <h3 className="mt-2 max-w-[12rem] text-2xl font-semibold leading-tight">
            {book.title}
          </h3>
        </div>
        {isPdf ? <IconFileTypePdf className="size-6" /> : <IconBook className="size-6" />}
      </div>

      <div className="mt-5 flex flex-1 flex-col gap-4">
        <div>
          <p className="text-sm font-medium">{book.author ?? "Unknown author"}</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{book.synopsis}</p>
        </div>

        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Current unit</span>
            <span>{book.currentUnitLabel}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Progress</span>
            <span>{book.progressPercent}%</span>
          </div>
          <div className="h-2 w-full bg-zinc-100">
            <div className="h-full bg-emerald-500" style={{ width: `${book.progressPercent}%` }} />
          </div>
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="inline-flex items-center gap-2">
              <IconClockHour4 className="size-4" />
              {book.updatedAt}
            </span>
            <span>{book.sizeLabel}</span>
          </div>
        </div>

        <Button asChild className="mt-auto w-full justify-between">
          <Link href={`/reader/${book.id}`}>
            Continue reading
            <IconArrowUpRight className="size-4" />
          </Link>
        </Button>
      </div>
    </article>
  )
}
