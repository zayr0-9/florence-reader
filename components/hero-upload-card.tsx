"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import {
  IconArrowRight,
  IconBook,
  IconFileTypePdf,
  IconLoader2,
  IconUpload,
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { saveUploadedBook } from "@/lib/book-storage"
import { buildReadingUnitLabel } from "@/lib/reader-utils"
import { BookFormat } from "@/lib/types"

function detectFormat(fileName: string): BookFormat | null {
  const lower = fileName.toLowerCase()
  if (lower.endsWith(".pdf")) return "pdf"
  if (lower.endsWith(".epub")) return "epub"
  return null
}

export function HeroUploadCard() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  const selectedFormat = useMemo(
    () => (selectedFile ? detectFormat(selectedFile.name) : null),
    [selectedFile]
  )

  async function handleUpload() {
    if (!selectedFile || !selectedFormat) return
    setIsUploading(true)

    try {
      const storedBook = await saveUploadedBook(selectedFile, selectedFormat)

      const draftBook = {
        id: storedBook.id,
        title: selectedFile.name.replace(/\.(pdf|epub)$/i, ""),
        format: selectedFormat,
        size: `${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB`,
        firstUnit: buildReadingUnitLabel(selectedFormat, 0),
      }

      sessionStorage.setItem("florence-upload-draft", JSON.stringify(draftBook))
      window.location.href = `/reader/${storedBook.id}?source=upload`
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="rounded-sm border border-[var(--line-strong)] bg-[linear-gradient(180deg,#f8f0e2_0%,#f1e6d2_100%)] p-6 shadow-[0_30px_70px_-38px_rgba(72,52,27,0.35)] md:p-8">
      <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-5">
          <p className="text-[10px] uppercase tracking-[0.32em] text-[var(--ink-light)]">
            Upload Ebook
          </p>
          <h2 className="font-serif text-4xl font-semibold leading-tight tracking-tight text-[var(--ink)] sm:text-5xl">
            Florence reading room for modern PDFs and EPUBs.
          </h2>
          <p className="max-w-xl text-sm leading-7 text-[var(--ink-light)] sm:text-base">
            Keep the same reader engine, storage, and async pipelines while adopting the manuscript-inspired interface.
          </p>
          <div className="grid gap-3 text-sm text-[var(--ink-light)] sm:grid-cols-3">
            <div className="rounded-sm border border-[var(--line)] bg-[var(--paper)] px-3 py-2">
              Upload local PDF or EPUB
            </div>
            <div className="rounded-sm border border-[var(--line)] bg-[var(--paper)] px-3 py-2">
              Save and resume progress
            </div>
            <div className="rounded-sm border border-[var(--line)] bg-[var(--paper)] px-3 py-2">
              Keep AI activity unobtrusive
            </div>
          </div>
        </div>

        <div className="rounded-sm border border-[var(--line-strong)] bg-[var(--paper)] p-5">
          <div className="flex items-start justify-between gap-4 border-b border-[var(--line)] pb-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.28em] text-[var(--ink-light)]">
                Upload status
              </p>
              <h3 className="mt-2 font-serif text-xl font-semibold text-[var(--ink)]">
                Prepare reading session
              </h3>
            </div>
            {selectedFormat === "pdf" ? (
              <IconFileTypePdf className="size-6 text-[var(--highlight)]" />
            ) : (
              <IconBook className="size-6 text-[var(--highlight-soft)]" />
            )}
          </div>

          <label className="mt-5 flex cursor-pointer flex-col items-center gap-4 rounded-sm border border-dashed border-[var(--line-strong)] bg-[#fbf4e7] px-5 py-8 text-center transition hover:border-[var(--highlight-soft)] hover:bg-[#fdf8ef]">
            <div className="flex size-14 items-center justify-center rounded-sm border border-[var(--line)] bg-[var(--paper)] text-[var(--highlight)]">
              <IconUpload className="size-6" />
            </div>
            <div className="space-y-1.5">
              <p className="font-serif text-lg font-semibold text-[var(--ink)]">
                Select PDF or EPUB
              </p>
              <p className="text-xs text-[var(--ink-light)]">
                Stored in IndexedDB and rendered client-side.
              </p>
            </div>
            <input
              type="file"
              className="hidden"
              accept=".pdf,.epub,application/pdf,application/epub+zip"
              onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
            />
          </label>

          <div className="space-y-3 py-5 text-sm">
            <div className="flex items-center justify-between gap-4">
              <span className="text-[var(--ink-light)]">Selected file</span>
              <span className="max-w-[60%] truncate font-medium text-[var(--ink)]">
                {selectedFile?.name ?? "None"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-[var(--ink-light)]">Detected format</span>
              <span className="font-medium uppercase text-[var(--ink)]">
                {selectedFormat ?? "-"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-[var(--ink-light)]">Initial reading unit</span>
              <span className="font-medium text-[var(--ink)]">
                {selectedFormat ? buildReadingUnitLabel(selectedFormat, 0) : "-"}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              className="flex-1 border-[var(--highlight)] bg-[var(--highlight)] text-[#f8efe0] hover:bg-[#572020]"
              disabled={!selectedFormat || isUploading}
              onClick={handleUpload}
            >
              {isUploading ? (
                <>
                  <IconLoader2 className="size-4 animate-spin" />
                  Loading reader
                </>
              ) : (
                <>
                  Open in reader
                  <IconArrowRight className="size-4" />
                </>
              )}
            </Button>
            <Button
              asChild
              variant="outline"
              className="flex-1 border-[var(--line-strong)] bg-[#f8f1e4] text-[var(--ink)] hover:bg-[#f2e5d0]"
            >
              <Link href="/library">Browse library</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
