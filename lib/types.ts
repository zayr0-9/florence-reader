export type BookFormat = "pdf" | "epub"

export type BookRecord = {
  id: string
  title: string
  author?: string
  format: BookFormat
  sizeLabel: string
  progressPercent: number
  currentUnitLabel: string
  updatedAt: string
  status: "ready" | "processing"
  coverTone: string
  synopsis: string
}

export type ReadingEventPayload = {
  userId: string
  bookId: string
  readingUnitId: string
  format: BookFormat
  currentText: string
  previousText?: string
  nextText?: string
  progressPercent: number
}

export type BufferedReadingUnit = {
  readingUnitId: string
  currentText: string
  previousText?: string
  nextText?: string
  progressPercent: number
}

export type MemoryState = {
  summary: string
  recentSummaries: string[]
  updatedAt?: string
}

export type RecentImageHistoryItem = {
  readingUnitId: string
  label: string
  prompt: string
  createdAt: string
}

export type ReadingBufferRequest = {
  userId: string
  bookId: string
  format: BookFormat
  visibleReadingUnitId: string
  units: BufferedReadingUnit[]
  priorMemoryState: MemoryState
  recentImageHistory: RecentImageHistoryItem[]
}

export type GeneratedImagePayload = {
  mimeType: string
  dataUrl: string
  width?: number
  height?: number
}

export type ReadingUnitAgentResult = {
  readingUnitId: string
  createdMemory: boolean
  skippedMemoryReason?: string
  memoryAppendText?: string
  memoryStateAfterUnit: MemoryState
  imageRequested: boolean
  imageCreated: boolean
  imageSkippedReason?: string
  imagePrompt?: string
  imageLabel?: string
  generatedImageCount?: number
  image?: GeneratedImagePayload
}

export type ReadingBufferResponse = {
  ok: boolean
  visibleReadingUnitId: string
  results: ReadingUnitAgentResult[]
  finalMemoryState: MemoryState
  finalRecentImageHistory: RecentImageHistoryItem[]
  error?: string
}

export type ReadingUnitResultRecord = {
  key: string
  sessionKey: string
  userId: string
  bookId: string
  readingUnitId: string
  progressPercent: number
  createdMemory: boolean
  skippedMemoryReason?: string
  memoryAppendText?: string
  memoryStateAfterUnit: MemoryState
  imageRequested: boolean
  imageCreated: boolean
  imageSkippedReason?: string
  imagePrompt?: string
  imageLabel?: string
  generatedImageCount?: number
  imageDataUrl?: string
  imageMimeType?: string
  processedAt: string
}

export type GeneratedImageRecord = {
  key: string
  sessionKey: string
  userId: string
  bookId: string
  readingUnitId: string
  imageDataUrl: string
  imageMimeType: string
  createdAt: string
}

export type ReadingUnitDedupeRecord = {
  key: string
  sessionKey: string
  userId: string
  bookId: string
  readingUnitId: string
  processedAt: string
  createdMemory: boolean
  imageCreated: boolean
  imagePrompt?: string
}

export type ReaderSessionStateRecord = {
  key: string
  userId: string
  bookId: string
  currentReadingUnitId: string
  bufferStartReadingUnitId?: string
  bufferEndReadingUnitId?: string
  bufferStartUnitIndex?: number
  bufferEndUnitIndex?: number
  finalMemoryState: MemoryState
  recentImageHistory: RecentImageHistoryItem[]
  updatedAt: string
}

export type MemoryDebugInfo = {
  sessionId?: string
  runtimeStatus?: string
  transcriptFilePath?: string
  lastToolOutput?: string
  dedupeHit?: boolean
}

export type PipelineStatus = {
  memory: "idle" | "queued" | "running" | "ready"
  image: "idle" | "queued" | "running" | "ready"
  lastSummary: string
  latestPrompt: string
  latestImageLabel: string
  updatedAt: string
  memoryDebug?: MemoryDebugInfo
}

export type ReadingEventResponse = {
  ok: boolean
  queued: boolean
  pipeline: PipelineStatus
  memoryAgent?: {
    invoked: boolean
    createdMemory: boolean
    skippedReason: string
    appendedText?: string
    runtimeStatus?: string
    sessionId?: string
    lastToolOutput?: string
    dedupeHit?: boolean
    imageCreated?: boolean
    imagePrompt?: string
    imageLabel?: string
    imageMimeType?: string
    imageGeneratedCount?: number
    imageSkippedReason?: string
    image?: GeneratedImagePayload
  }
}
