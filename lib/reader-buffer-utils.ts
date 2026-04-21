import { BookFormat, BufferedReadingUnit } from "@/lib/types"
import { buildReadingUnitLabel, estimateProgress } from "@/lib/reader-utils"

export const DEFAULT_BUFFER_SIZE = 10
export const DEFAULT_REFILL_THRESHOLD = 4

export function buildBufferedUnits(
  units: string[],
  startIndex: number,
  count: number,
  format: BookFormat
): BufferedReadingUnit[] {
  const safeStart = Math.max(0, startIndex)
  const safeEnd = Math.min(units.length, safeStart + Math.max(0, count))
  const result: BufferedReadingUnit[] = []

  for (let index = safeStart; index < safeEnd; index += 1) {
    result.push({
      readingUnitId: buildReadingUnitLabel(format, index),
      currentText: units[index] ?? "",
      previousText: index > 0 ? units[index - 1] ?? "" : "",
      nextText: index < units.length - 1 ? units[index + 1] ?? "" : "",
      progressPercent: estimateProgress(index, units.length),
    })
  }

  return result
}

export function shouldRefillBuffer(
  currentIndex: number,
  bufferEndIndex: number,
  threshold = DEFAULT_REFILL_THRESHOLD
) {
  if (bufferEndIndex < currentIndex) return true
  return bufferEndIndex - currentIndex <= threshold
}

export async function buildReadingUnitDedupeKey(input: {
  bookId: string
  readingUnitId: string
  currentText: string
}) {
  const encoder = new TextEncoder()
  const data = encoder.encode(
    [input.bookId, input.readingUnitId, input.currentText.trim()].join("\n---\n")
  )
  const digest = await crypto.subtle.digest("SHA-256", data)
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
}
