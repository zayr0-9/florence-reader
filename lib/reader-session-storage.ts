"use client"

import {
  GeneratedImageRecord,
  ReaderSessionStateRecord,
  ReadingUnitDedupeRecord,
  ReadingUnitResultRecord,
  type ReadingBufferResponse,
} from "@/lib/types"

const DB_NAME = "florence-reader-db"
const DB_VERSION = 2
const SESSION_STATE_STORE = "readerSessionState"
const READING_UNIT_RESULTS_STORE = "readingUnitResults"
const GENERATED_IMAGES_STORE = "generatedImages"
const READING_UNIT_DEDUPE_STORE = "readingUnitDedupe"

type PersistBatchResultInput = {
  userId: string
  bookId: string
  response: ReadingBufferResponse
  progressByReadingUnitId: Record<string, number>
  dedupeKeysByReadingUnitId?: Record<string, string>
  bufferStartUnitIndex?: number
  bufferEndUnitIndex?: number
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result

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

export function buildReaderSessionKey(userId: string, bookId: string) {
  return `${userId}:${bookId}`
}

export function buildReadingUnitResultKey(userId: string, bookId: string, readingUnitId: string) {
  return `${userId}:${bookId}:${readingUnitId}`
}

export async function getSessionState(userId: string, bookId: string) {
  const db = await openDb()
  const key = buildReaderSessionKey(userId, bookId)

  return new Promise<ReaderSessionStateRecord | null>((resolve, reject) => {
    const tx = db.transaction(SESSION_STATE_STORE, "readonly")
    const request = tx.objectStore(SESSION_STATE_STORE).get(key)
    request.onsuccess = () => resolve((request.result as ReaderSessionStateRecord | undefined) ?? null)
    request.onerror = () => reject(request.error)
  })
}

export async function saveSessionState(session: ReaderSessionStateRecord) {
  const db = await openDb()

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(SESSION_STATE_STORE, "readwrite")
    tx.objectStore(SESSION_STATE_STORE).put(session)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function getReadingUnitResult(userId: string, bookId: string, readingUnitId: string) {
  const db = await openDb()
  const key = buildReadingUnitResultKey(userId, bookId, readingUnitId)

  return new Promise<ReadingUnitResultRecord | null>((resolve, reject) => {
    const tx = db.transaction(READING_UNIT_RESULTS_STORE, "readonly")
    const request = tx.objectStore(READING_UNIT_RESULTS_STORE).get(key)
    request.onsuccess = () => resolve((request.result as ReadingUnitResultRecord | undefined) ?? null)
    request.onerror = () => reject(request.error)
  })
}

export async function saveReadingUnitResults(results: ReadingUnitResultRecord[]) {
  if (!results.length) return
  const db = await openDb()

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(READING_UNIT_RESULTS_STORE, "readwrite")
    const store = tx.objectStore(READING_UNIT_RESULTS_STORE)
    for (const result of results) {
      store.put(result)
    }
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function getGeneratedImage(userId: string, bookId: string, readingUnitId: string) {
  const db = await openDb()
  const key = buildReadingUnitResultKey(userId, bookId, readingUnitId)

  return new Promise<GeneratedImageRecord | null>((resolve, reject) => {
    const tx = db.transaction(GENERATED_IMAGES_STORE, "readonly")
    const request = tx.objectStore(GENERATED_IMAGES_STORE).get(key)
    request.onsuccess = () => resolve((request.result as GeneratedImageRecord | undefined) ?? null)
    request.onerror = () => reject(request.error)
  })
}

export async function getGeneratedImagesForBook(userId: string, bookId: string) {
  const db = await openDb()

  return new Promise<GeneratedImageRecord[]>((resolve, reject) => {
    const tx = db.transaction(GENERATED_IMAGES_STORE, "readonly")
    const request = tx.objectStore(GENERATED_IMAGES_STORE).getAll()
    request.onsuccess = () => {
      const results = ((request.result as GeneratedImageRecord[] | undefined) ?? [])
        .filter((image) => image.userId === userId && image.bookId === bookId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      resolve(results)
    }
    request.onerror = () => reject(request.error)
  })
}

export async function saveGeneratedImages(images: GeneratedImageRecord[]) {
  if (!images.length) return
  const db = await openDb()

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(GENERATED_IMAGES_STORE, "readwrite")
    const store = tx.objectStore(GENERATED_IMAGES_STORE)
    for (const image of images) {
      store.put(image)
    }
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function getReadingUnitDedupe(key: string) {
  const db = await openDb()

  return new Promise<ReadingUnitDedupeRecord | null>((resolve, reject) => {
    const tx = db.transaction(READING_UNIT_DEDUPE_STORE, "readonly")
    const request = tx.objectStore(READING_UNIT_DEDUPE_STORE).get(key)
    request.onsuccess = () => resolve((request.result as ReadingUnitDedupeRecord | undefined) ?? null)
    request.onerror = () => reject(request.error)
  })
}

export async function setReadingUnitDedupe(entry: ReadingUnitDedupeRecord) {
  const db = await openDb()

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(READING_UNIT_DEDUPE_STORE, "readwrite")
    tx.objectStore(READING_UNIT_DEDUPE_STORE).put(entry)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function persistBufferResponse(input: PersistBatchResultInput) {
  const sessionKey = buildReaderSessionKey(input.userId, input.bookId)
  const processedAt = new Date().toISOString()

  const readingUnitResults: ReadingUnitResultRecord[] = input.response.results.map((result) => ({
    key: buildReadingUnitResultKey(input.userId, input.bookId, result.readingUnitId),
    sessionKey,
    userId: input.userId,
    bookId: input.bookId,
    readingUnitId: result.readingUnitId,
    progressPercent: input.progressByReadingUnitId[result.readingUnitId] ?? 0,
    createdMemory: result.createdMemory,
    skippedMemoryReason: result.skippedMemoryReason,
    memoryAppendText: result.memoryAppendText,
    memoryStateAfterUnit: result.memoryStateAfterUnit,
    imageRequested: result.imageRequested,
    imageCreated: result.imageCreated,
    imageSkippedReason: result.imageSkippedReason,
    imagePrompt: result.imagePrompt,
    imageLabel: result.imageLabel,
    generatedImageCount: result.generatedImageCount,
    imageDataUrl: result.image?.dataUrl,
    imageMimeType: result.image?.mimeType,
    processedAt,
  }))

  const generatedImages: GeneratedImageRecord[] = input.response.results
    .filter((result) => Boolean(result.image?.dataUrl && result.image?.mimeType))
    .map((result) => ({
      key: buildReadingUnitResultKey(input.userId, input.bookId, result.readingUnitId),
      sessionKey,
      userId: input.userId,
      bookId: input.bookId,
      readingUnitId: result.readingUnitId,
      imageDataUrl: result.image?.dataUrl ?? "",
      imageMimeType: result.image?.mimeType ?? "image/png",
      createdAt: processedAt,
    }))

  const dedupeRecords = input.response.results.reduce<ReadingUnitDedupeRecord[]>((records, result) => {
    const dedupeKey = input.dedupeKeysByReadingUnitId?.[result.readingUnitId]
    if (!dedupeKey) {
      return records
    }

    records.push({
      key: dedupeKey,
      sessionKey,
      userId: input.userId,
      bookId: input.bookId,
      readingUnitId: result.readingUnitId,
      processedAt,
      createdMemory: result.createdMemory,
      imageCreated: result.imageCreated,
      imagePrompt: result.imagePrompt,
    })

    return records
  }, [])

  await saveReadingUnitResults(readingUnitResults)
  await saveGeneratedImages(generatedImages)

  for (const record of dedupeRecords) {
    await setReadingUnitDedupe(record)
  }

  const firstResult = input.response.results[0]
  const lastResult = input.response.results[input.response.results.length - 1]

  await saveSessionState({
    key: sessionKey,
    userId: input.userId,
    bookId: input.bookId,
    currentReadingUnitId: input.response.visibleReadingUnitId,
    bufferStartReadingUnitId: firstResult?.readingUnitId,
    bufferEndReadingUnitId: lastResult?.readingUnitId,
    bufferStartUnitIndex: input.bufferStartUnitIndex,
    bufferEndUnitIndex: input.bufferEndUnitIndex,
    finalMemoryState: input.response.finalMemoryState,
    recentImageHistory: input.response.finalRecentImageHistory,
    updatedAt: processedAt,
  })
}
