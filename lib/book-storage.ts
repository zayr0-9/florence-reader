"use client"

import { BookFormat, BookRecord } from "@/lib/types"

const DB_NAME = "florence-reader-db"
const DB_VERSION = 2
const BOOK_STORE = "books"
const SESSION_STATE_STORE = "readerSessionState"
const READING_UNIT_RESULTS_STORE = "readingUnitResults"
const GENERATED_IMAGES_STORE = "generatedImages"
const READING_UNIT_DEDUPE_STORE = "readingUnitDedupe"

export type StoredBook = {
  id: string
  title: string
  author?: string
  format: BookFormat
  fileName: string
  fileType: string
  fileData: ArrayBuffer
  sizeLabel: string
  progressPercent: number
  currentUnitLabel: string
  updatedAt: string
  status: "ready" | "processing"
  coverTone: string
  synopsis: string
  epubLocationCfi?: string
  epubSpineIndex?: number
  pdfPageIndex?: number
}

export type StoredBookSummary = Omit<StoredBook, "fileData" | "fileType" | "fileName"> & {
  fileName: string
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(BOOK_STORE)) {
        db.createObjectStore(BOOK_STORE, { keyPath: "id" })
      }
      if (!db.objectStoreNames.contains(SESSION_STATE_STORE)) {
        db.createObjectStore(SESSION_STATE_STORE, { keyPath: "key" })
      }
      if (!db.objectStoreNames.contains(READING_UNIT_RESULTS_STORE)) {
        db.createObjectStore(READING_UNIT_RESULTS_STORE, { keyPath: "key" })
      }
      if (!db.objectStoreNames.contains(GENERATED_IMAGES_STORE)) {
        db.createObjectStore(GENERATED_IMAGES_STORE, { keyPath: "key" })
      }
      if (!db.objectStoreNames.contains(READING_UNIT_DEDUPE_STORE)) {
        db.createObjectStore(READING_UNIT_DEDUPE_STORE, { keyPath: "key" })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function makeId(file: File) {
  const safeName = file.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
  return `local-${safeName}-${file.size}`
}

function buildTone(format: BookFormat) {
  return format === "pdf"
    ? "from-rose-200 via-orange-200 to-amber-100"
    : "from-emerald-200 via-teal-200 to-cyan-100"
}

export async function saveUploadedBook(file: File, format: BookFormat): Promise<StoredBookSummary> {
  const db = await openDb()
  const fileData = await file.arrayBuffer()
  const title = file.name.replace(/\.(pdf|epub)$/i, "")
  const id = makeId(file)

  const record: StoredBook = {
    id,
    title,
    format,
    fileName: file.name,
    fileType: file.type,
    fileData,
    sizeLabel: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
    progressPercent: 0,
    currentUnitLabel: format === "pdf" ? "Page 1" : "Location 100",
    updatedAt: new Date().toLocaleString(),
    status: "ready",
    coverTone: buildTone(format),
    synopsis:
      format === "pdf"
        ? "Imported local PDF with client-side rendering and background reading events."
        : "Imported local EPUB with browser rendering, saved progress, and scene generation hooks.",
    epubLocationCfi: undefined,
    epubSpineIndex: format === "epub" ? 0 : undefined,
    pdfPageIndex: format === "pdf" ? 0 : undefined,
  }

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(BOOK_STORE, "readwrite")
    tx.objectStore(BOOK_STORE).put(record)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })

  return summarizeStoredBook(record)
}

export async function getStoredBook(bookId: string): Promise<StoredBook | null> {
  const db = await openDb()

  return new Promise((resolve, reject) => {
    const tx = db.transaction(BOOK_STORE, "readonly")
    const request = tx.objectStore(BOOK_STORE).get(bookId)
    request.onsuccess = () => resolve((request.result as StoredBook | undefined) ?? null)
    request.onerror = () => reject(request.error)
  })
}

export async function listStoredBooks(): Promise<StoredBookSummary[]> {
  const db = await openDb()

  return new Promise((resolve, reject) => {
    const tx = db.transaction(BOOK_STORE, "readonly")
    const request = tx.objectStore(BOOK_STORE).getAll()
    request.onsuccess = () => {
      const items = ((request.result as StoredBook[]) ?? [])
        .map(summarizeStoredBook)
        .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
      resolve(items)
    }
    request.onerror = () => reject(request.error)
  })
}

export async function updateStoredProgress(
  bookId: string,
  progress: Pick<
    StoredBook,
    "progressPercent" | "currentUnitLabel" | "epubLocationCfi" | "epubSpineIndex" | "pdfPageIndex"
  >
) {
  const current = await getStoredBook(bookId)
  if (!current) return

  const nextRecord: StoredBook = {
    ...current,
    ...progress,
    updatedAt: new Date().toLocaleString(),
  }

  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(BOOK_STORE, "readwrite")
    tx.objectStore(BOOK_STORE).put(nextRecord)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export function toBookRecord(stored: StoredBookSummary | StoredBook): BookRecord {
  return {
    id: stored.id,
    title: stored.title,
    author: stored.author,
    format: stored.format,
    sizeLabel: stored.sizeLabel,
    progressPercent: stored.progressPercent,
    currentUnitLabel: stored.currentUnitLabel,
    updatedAt: stored.updatedAt,
    status: stored.status,
    coverTone: stored.coverTone,
    synopsis: stored.synopsis,
  }
}

function summarizeStoredBook(record: StoredBook): StoredBookSummary {
  return {
    id: record.id,
    title: record.title,
    author: record.author,
    format: record.format,
    fileName: record.fileName,
    sizeLabel: record.sizeLabel,
    progressPercent: record.progressPercent,
    currentUnitLabel: record.currentUnitLabel,
    updatedAt: record.updatedAt,
    status: record.status,
    coverTone: record.coverTone,
    synopsis: record.synopsis,
  }
}
