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
    <div className="border border-black/10 bg-white p-6 shadow-[0_20px_80px_-40px_rgba(16,185,129,0.5)]">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl space-y-4">
          <p className="text-xs uppercase tracking-[0.3em] text-emerald-700">
            Reader app first
          </p>
          <h2 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            Read PDFs and EPUBs while memory and image generation run quietly in the background.
          </h2>
          <p className="max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
            Florence is a single-pane reading experience: fast book loading, saved progress,
            subtle AI status, and a live scene image that updates without interrupting the act of reading.
          </p>
        </div>

        <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-3 lg:max-w-md lg:grid-cols-1">
          <div className="border border-black/10 bg-zinc-50 p-3">
            Upload a local book
          </div>
          <div className="border border-black/10 bg-zinc-50 p-3">
            Resume from saved progress
          </div>
          <div className="border border-black/10 bg-zinc-50 p-3">
            See scene images refresh async
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <label className="group flex cursor-pointer flex-col items-center justify-center gap-4 border border-dashed border-black/15 bg-zinc-50 px-6 py-12 text-center transition hover:border-emerald-500 hover:bg-emerald-50">
          <div className="flex size-14 items-center justify-center border border-black/10 bg-white text-emerald-700">
            <IconUpload className="size-6" />
          </div>
          <div className="space-y-2">
            <p className="text-lg font-medium">Drop in a PDF or EPUB</p>
            <p className="text-sm text-muted-foreground">
              Uploaded books are saved into IndexedDB and rendered client-side with PDF.js or EPUB.js.
            </p>
          </div>
          <input
            type="file"
            className="hidden"
            accept=".pdf,.epub,application/pdf,application/epub+zip"
            onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
          />
        </label>

        <div className="border border-black/10 bg-white p-5">
          <div className="flex items-center justify-between border-b border-black/10 pb-4">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">
                Upload status
              </p>
              <h3 className="mt-2 text-lg font-semibold">Prepare a new reading session</h3>
            </div>
            {selectedFormat === "pdf" ? (
              <IconFileTypePdf className="size-6 text-red-500" />
            ) : (
              <IconBook className="size-6 text-emerald-600" />
            )}
          </div>

          <div className="space-y-4 py-5 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Selected file</span>
              <span className="font-medium">{selectedFile?.name ?? "None yet"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Detected format</span>
              <span className="font-medium uppercase">{selectedFormat ?? "—"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Initial reading unit</span>
              <span className="font-medium">
                {selectedFormat ? buildReadingUnitLabel(selectedFormat, 0) : "—"}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              className="flex-1"
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
            <Button asChild variant="outline" className="flex-1">
              <Link href="/library">Browse library</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
