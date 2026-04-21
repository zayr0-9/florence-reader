import { createHash } from "node:crypto"
import { mkdir, readFile, rename, writeFile } from "node:fs/promises"
import path from "node:path"

export const MEMORY_DEDUPE_FILE_PATH = path.join(
  process.cwd(),
  "memory-artifacts",
  "memory-dedupe.json"
)

type MemoryDedupeEntry = {
  bookId: string
  readingUnitId: string
  textHash: string
  sessionId: string
  createdMemory: boolean
  appendedText: string
  lastToolOutput: string
  runtimeStatus?: string
  filePath?: string
  processedAt: string
}

type MemoryDedupeData = {
  version: 1
  entries: Record<string, MemoryDedupeEntry>
}

const EMPTY_DATA: MemoryDedupeData = {
  version: 1,
  entries: {},
}

export function buildMemoryTextHash(value: string) {
  return createHash("sha256").update(value).digest("hex")
}

export function buildMemoryDedupeKey(input: {
  bookId: string
  readingUnitId: string
  currentText: string
}) {
  return buildMemoryTextHash(
    [input.bookId, input.readingUnitId, input.currentText.trim()].join("\n---\n")
  )
}

export async function getMemoryDedupeEntry(key: string) {
  const data = await readData()
  return data.entries[key]
}

export async function setMemoryDedupeEntry(key: string, entry: MemoryDedupeEntry) {
  const data = await readData()
  data.entries[key] = entry
  await writeData(data)
}

async function readData(): Promise<MemoryDedupeData> {
  try {
    const raw = await readFile(MEMORY_DEDUPE_FILE_PATH, "utf8")
    const parsed = JSON.parse(raw) as Partial<MemoryDedupeData>

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

async function writeData(data: MemoryDedupeData) {
  await mkdir(path.dirname(MEMORY_DEDUPE_FILE_PATH), { recursive: true })
  const tempFilePath = `${MEMORY_DEDUPE_FILE_PATH}.tmp`
  await writeFile(tempFilePath, `${JSON.stringify(data, null, 2)}\n`, "utf8")
  await rename(tempFilePath, MEMORY_DEDUPE_FILE_PATH)
}

function isMissingFileError(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT"
}
