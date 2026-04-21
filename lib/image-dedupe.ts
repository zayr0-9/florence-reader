import { createHash } from "node:crypto"
import { mkdir, readFile, rename, writeFile } from "node:fs/promises"
import path from "node:path"

export const IMAGE_DEDUPE_FILE_PATH = path.join(
  process.cwd(),
  "memory-artifacts",
  "image-dedupe.json"
)

export type ImageDedupeEntry = {
  bookId: string
  readingUnitId: string
  textHash: string
  sessionId: string
  createdImage: boolean
  prompt: string
  label: string
  lastToolOutput: string
  runtimeStatus?: string
  filePath?: string
  processedAt: string
}

export type RecentImageHistoryItem = {
  readingUnitId: string
  label: string
  prompt: string
  createdAt: string
}

type ImageDedupeData = {
  version: 1
  entries: Record<string, ImageDedupeEntry>
}

const EMPTY_DATA: ImageDedupeData = {
  version: 1,
  entries: {},
}

function buildHash(value: string) {
  return createHash("sha256").update(value).digest("hex")
}

export function buildImageDedupeKey(input: {
  bookId: string
  readingUnitId: string
  sourceText: string
}) {
  return buildHash(
    ["image", input.bookId, input.readingUnitId, input.sourceText.trim()].join("\n---\n")
  )
}

export async function getImageDedupeEntry(key: string) {
  const data = await readData()
  return data.entries[key]
}

export async function setImageDedupeEntry(key: string, entry: ImageDedupeEntry) {
  const data = await readData()
  data.entries[key] = entry
  await writeData(data)
}

export async function getRecentImageHistory(bookId: string, limit = 20) {
  const data = await readData()

  return Object.values(data.entries)
    .filter((entry) => entry.bookId === bookId && entry.createdImage)
    .sort((left, right) => right.processedAt.localeCompare(left.processedAt))
    .slice(0, limit)
    .map<RecentImageHistoryItem>((entry) => ({
      readingUnitId: entry.readingUnitId,
      label: entry.label,
      prompt: entry.prompt,
      createdAt: entry.processedAt,
    }))
}

async function readData(): Promise<ImageDedupeData> {
  try {
    const raw = await readFile(IMAGE_DEDUPE_FILE_PATH, "utf8")
    const parsed = JSON.parse(raw) as Partial<ImageDedupeData>

    return {
      version: 1,
      entries: parsed.entries ?? {},
    }
  } catch (error) {
    if (isMissingFileError(error)) {
      return EMPTY_DATA
    }

    throw error
  }
}

async function writeData(data: ImageDedupeData) {
  await mkdir(path.dirname(IMAGE_DEDUPE_FILE_PATH), { recursive: true })
  const tempFilePath = `${IMAGE_DEDUPE_FILE_PATH}.tmp`
  await writeFile(tempFilePath, `${JSON.stringify(data, null, 2)}\n`, "utf8")
  await rename(tempFilePath, IMAGE_DEDUPE_FILE_PATH)
}

function isMissingFileError(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT"
}
