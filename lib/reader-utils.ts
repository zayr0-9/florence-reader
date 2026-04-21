import { BookFormat } from "@/lib/types"

export function getFormatLabel(format: BookFormat) {
  return format.toUpperCase()
}

export function buildReadingUnitLabel(format: BookFormat, index: number) {
  return format === "pdf" ? `Page ${index + 1}` : `Location ${100 + index * 24}`
}

export function buildReadingWindow(units: string[], index: number) {
  const currentText = units[index] ?? ""
  const previousText = units[Math.max(0, index - 1)] ?? ""
  const nextText = units[Math.min(units.length - 1, index + 1)] ?? ""

  return {
    currentText,
    previousText,
    nextText,
  }
}

export function estimateProgress(index: number, total: number) {
  if (total <= 1) return 100
  return Math.min(100, Math.round((index / (total - 1)) * 100))
}
