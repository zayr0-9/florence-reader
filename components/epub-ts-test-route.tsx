"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import ePub, { type Book, type Location, type Rendition } from "@likecoin/epub-ts"

type LoadedEpub = {
  name: string
  size: number
  data: ArrayBuffer
  signatureHex: string
  hasZipSignature: boolean
}

type PublicationDebugState = {
  title: string
  creator: string
  language: string
  archived: boolean
  spineCount: number
  tocCount: number
  firstSpineHrefs: string[]
}

type LocationDebugState = {
  index?: number
  href?: string
  cfi?: string
  percentage?: number
}

function formatFileSize(size: number) {
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

function inspectSignature(data: ArrayBuffer) {
  const bytes = Array.from(new Uint8Array(data.slice(0, 4)))
  const signatureHex = bytes.map((byte) => byte.toString(16).padStart(2, "0")).join(" ")
  const hasZipSignature = bytes[0] === 0x50 && bytes[1] === 0x4b

  return {
    signatureHex,
    hasZipSignature,
  }
}

export function EpubTsTestRoute() {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const bookRef = useRef<Book | null>(null)
  const renditionRef = useRef<Rendition | null>(null)
  const [loadedEpub, setLoadedEpub] = useState<LoadedEpub | null>(null)
  const [status, setStatus] = useState("Choose a local EPUB to test with epub.ts.")
  const [error, setError] = useState<string | null>(null)
  const [publication, setPublication] = useState<PublicationDebugState | null>(null)
  const [location, setLocation] = useState<LocationDebugState>({})
  const [isNavigating, setIsNavigating] = useState(false)

  const percentageLabel = useMemo(() => {
    if (typeof location.percentage !== "number") return "—"
    return `${(location.percentage * 100).toFixed(2)}%`
  }, [location.percentage])

  useEffect(() => {
    if (!loadedEpub || !containerRef.current) return

    const selectedEpub = loadedEpub
    let cancelled = false
    let book: Book | null = null
    let rendition: Rendition | null = null

    async function loadEpub() {
      setError(null)
      setPublication(null)
      setLocation({})
      setStatus(`Opening ${selectedEpub.name} with epub.ts…`)

      containerRef.current!.innerHTML = ""
      renditionRef.current?.destroy()
      bookRef.current?.destroy()
      renditionRef.current = null
      bookRef.current = null

      book = ePub(selectedEpub.data.slice(0), {
        replacements: "blobUrl",
      })
      bookRef.current = book

      book.on("openFailed", (nextError) => {
        console.error("epub.ts openFailed", nextError)
        if (!cancelled) {
          setError(nextError.message)
          setStatus("epub.ts reported an open failure.")
        }
      })

      await book.ready
      if (book.replacementsReady) {
        await book.replacementsReady
      }

      if (cancelled || !containerRef.current) {
        book.destroy()
        return
      }

      const metadata = book.packaging.metadata
      const spineItems = (
        book.spine as typeof book.spine & {
          spineItems?: Array<{ index: number; href?: string }>
        }
      ).spineItems ?? []

      setPublication({
        title: metadata.title || selectedEpub.name,
        creator: metadata.creator || "Unknown",
        language: metadata.language || "Unknown",
        archived: book.archived,
        spineCount: spineItems.length,
        tocCount: book.navigation.toc.length,
        firstSpineHrefs: spineItems.slice(0, 5).map((item) => item.href || `spine:${item.index}`),
      })

      rendition = book.renderTo(containerRef.current, {
        width: "100%",
        height: 720,
        flow: "paginated",
        spread: "none",
      })
      renditionRef.current = rendition

      rendition.on("relocated", (nextLocation: Location) => {
        const start = nextLocation.start
        if (!start || cancelled) return

        setLocation({
          index: start.index,
          href: start.href,
          cfi: start.cfi,
          percentage: start.percentage,
        })
        setStatus("epub.ts rendered the current section.")
        setIsNavigating(false)
      })

      rendition.on("displayerror", (nextError: Error) => {
        console.error("epub.ts displayerror", nextError)
        if (!cancelled) {
          setError(nextError.message)
          setStatus("epub.ts failed while displaying a section.")
          setIsNavigating(false)
        }
      })

      await rendition.display()

      if (!cancelled) {
        setStatus("EPUB opened with epub.ts.")
        setIsNavigating(false)
      }
    }

    loadEpub().catch((nextError) => {
      console.error("Failed to load EPUB with epub.ts", nextError)
      if (!cancelled) {
        setError(nextError instanceof Error ? nextError.message : "Unknown epub.ts error")
        setStatus("Unable to open the EPUB with epub.ts.")
      }
    })

    return () => {
      cancelled = true
      rendition?.destroy()
      book?.destroy()
    }
  }, [loadedEpub])

  async function handlePrevPage() {
    const rendition = renditionRef.current
    if (!rendition || isNavigating) return

    setIsNavigating(true)
    setError(null)
    setStatus("Moving to previous EPUB page…")

    try {
      await rendition.prev()
    } catch (nextError) {
      console.error("Failed to move to previous EPUB page", nextError)
      setError(nextError instanceof Error ? nextError.message : "Unable to move to previous page")
      setStatus("Failed to move to previous EPUB page.")
      setIsNavigating(false)
    }
  }

  async function handleNextPage() {
    const rendition = renditionRef.current
    if (!rendition || isNavigating) return

    setIsNavigating(true)
    setError(null)
    setStatus("Moving to next EPUB page…")

    try {
      await rendition.next()
    } catch (nextError) {
      console.error("Failed to move to next EPUB page", nextError)
      setError(nextError instanceof Error ? nextError.message : "Unable to move to next page")
      setStatus("Failed to move to next EPUB page.")
      setIsNavigating(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4 border border-black/10 bg-white p-4">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Test route</p>
          <h2 className="text-2xl font-semibold tracking-tight">epub.ts local EPUB harness</h2>
          <p className="max-w-3xl text-sm text-muted-foreground">
            This page bypasses Readium and epub.js and opens a local EPUB directly with
            <span className="mx-1 font-medium text-foreground">@likecoin/epub-ts</span>.
            Use it to test whether the alternate renderer can open the same large local EPUB that is hanging in the
            main Florence reader.
          </p>
        </div>

        <label className="flex cursor-pointer flex-col gap-3 border border-dashed border-emerald-500/40 bg-emerald-50/50 p-4 text-sm">
          <span className="font-medium text-emerald-900">Choose a local .epub file</span>
          <span className="text-muted-foreground">
            The file is read as an ArrayBuffer in the browser and passed straight into epub.ts.
          </span>
          <input
            type="file"
            accept=".epub,application/epub+zip"
            className="block text-sm"
            onChange={async (event) => {
              const file = event.target.files?.[0]
              if (!file) return

              const data = await file.arrayBuffer()
              const { signatureHex, hasZipSignature } = inspectSignature(data)

              setLoadedEpub({
                name: file.name,
                size: file.size,
                data,
                signatureHex,
                hasZipSignature,
              })
            }}
          />
        </label>

        <div className="grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
          <div className="border border-black/10 bg-zinc-50 p-3">
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Status</p>
            <p className="mt-2 leading-6">{status}</p>
          </div>
          <div className="border border-black/10 bg-zinc-50 p-3">
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">File</p>
            <p className="mt-2 leading-6">{loadedEpub ? loadedEpub.name : "No file selected"}</p>
          </div>
          <div className="border border-black/10 bg-zinc-50 p-3">
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Size</p>
            <p className="mt-2 leading-6">{loadedEpub ? formatFileSize(loadedEpub.size) : "—"}</p>
          </div>
          <div className="border border-black/10 bg-zinc-50 p-3">
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">ZIP signature</p>
            <p className="mt-2 leading-6">
              {loadedEpub
                ? `${loadedEpub.hasZipSignature ? "PK ok" : "Missing PK"} (${loadedEpub.signatureHex})`
                : "—"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => {
              void handlePrevPage()
            }}
            disabled={!loadedEpub || isNavigating}
            className="border border-black/10 bg-white px-4 py-2 text-sm font-medium transition hover:border-emerald-500 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Previous page
          </button>
          <button
            type="button"
            onClick={() => {
              void handleNextPage()
            }}
            disabled={!loadedEpub || isNavigating}
            className="border border-emerald-600 bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next page
          </button>
        </div>

        {error ? (
          <div className="border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
        ) : null}
      </div>

      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <div className="space-y-4 border border-black/10 bg-white p-4 text-sm">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Publication</p>
            <dl className="mt-3 space-y-2 leading-6">
              <div>
                <dt className="font-medium">Title</dt>
                <dd className="text-muted-foreground">{publication?.title || "—"}</dd>
              </div>
              <div>
                <dt className="font-medium">Author</dt>
                <dd className="text-muted-foreground">{publication?.creator || "—"}</dd>
              </div>
              <div>
                <dt className="font-medium">Language</dt>
                <dd className="text-muted-foreground">{publication?.language || "—"}</dd>
              </div>
              <div>
                <dt className="font-medium">Archive mode</dt>
                <dd className="text-muted-foreground">{publication ? (publication.archived ? "archived" : "not archived") : "—"}</dd>
              </div>
              <div>
                <dt className="font-medium">Spine sections</dt>
                <dd className="text-muted-foreground">{publication?.spineCount ?? "—"}</dd>
              </div>
              <div>
                <dt className="font-medium">TOC items</dt>
                <dd className="text-muted-foreground">{publication?.tocCount ?? "—"}</dd>
              </div>
            </dl>
          </div>

          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Current location</p>
            <dl className="mt-3 space-y-2 leading-6">
              <div>
                <dt className="font-medium">Spine index</dt>
                <dd className="text-muted-foreground">{location.index ?? "—"}</dd>
              </div>
              <div>
                <dt className="font-medium">Href</dt>
                <dd className="break-all text-muted-foreground">{location.href || "—"}</dd>
              </div>
              <div>
                <dt className="font-medium">CFI</dt>
                <dd className="break-all text-muted-foreground">{location.cfi || "—"}</dd>
              </div>
              <div>
                <dt className="font-medium">Percent</dt>
                <dd className="text-muted-foreground">{percentageLabel}</dd>
              </div>
            </dl>
          </div>

          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">First spine hrefs</p>
            <ul className="mt-3 space-y-2 text-muted-foreground">
              {publication?.firstSpineHrefs.length ? (
                publication.firstSpineHrefs.map((href) => (
                  <li key={href} className="break-all border border-black/10 bg-zinc-50 px-3 py-2">
                    {href}
                  </li>
                ))
              ) : (
                <li className="border border-black/10 bg-zinc-50 px-3 py-2">No spine data yet.</li>
              )}
            </ul>
          </div>
        </div>

        <div className="border border-black/10 bg-white p-4">
          <div
            ref={containerRef}
            className="min-h-[720px] border border-black/10 bg-zinc-50"
          />
        </div>
      </div>
    </div>
  )
}
