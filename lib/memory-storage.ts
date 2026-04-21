import { promises as fs } from "node:fs"
import path from "node:path"

const MEMORY_DIR = path.join(process.cwd(), "memory-artifacts")

function sanitizeSegment(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "book"
}

export function getMemoryFilePath(bookId: string) {
  return path.join(MEMORY_DIR, `${sanitizeSegment(bookId)}.md`)
}

export async function ensureMemoryDir() {
  await fs.mkdir(MEMORY_DIR, { recursive: true })
}

export async function readMemoryFile(bookId: string) {
  await ensureMemoryDir()
  const filePath = getMemoryFilePath(bookId)

  try {
    return await fs.readFile(filePath, "utf8")
  } catch (error) {
    const maybeError = error as NodeJS.ErrnoException
    if (maybeError.code === "ENOENT") {
      return ""
    }
    throw error
  }
}

export async function appendMemoryEntry(bookId: string, pageLabel: string, memoryText: string) {
  await ensureMemoryDir()
  const filePath = getMemoryFilePath(bookId)
  const trimmed = memoryText.trim()

  if (!trimmed) {
    return {
      filePath,
      appended: false,
    }
  }

  const timestamp = new Date().toISOString()
  const block = [`\n## ${pageLabel}`, `- appended_at: ${timestamp}`, "", trimmed, ""].join("\n")

  await fs.appendFile(filePath, block, "utf8")

  return {
    filePath,
    appended: true,
  }
}
