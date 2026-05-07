import { createRuntime, defineAgent, defineTool } from "@hyper-labs/hyper-router"
import { OpenRouterProvider } from "@hyper-labs/hyper-router/providers/openrouter"
import { z } from "zod"
import { runImageAgent } from "@/lib/image-agent"
import { EphemeralStorage } from "@/lib/hyper-router-ephemeral-storage"
import {
  MemoryState,
  RecentImageHistoryItem,
  ReadingEventPayload,
  type GeneratedImagePayload,
} from "@/lib/types"

const MEMORY_MODEL = "moonshotai/kimi-k2.5"
const MAX_RECENT_SUMMARIES = 20
const MAX_SUMMARY_LENGTH = 6000
const MAX_RECENT_IMAGE_HISTORY = 20

type RunMemoryAgentInput = {
  payload: ReadingEventPayload
  priorMemoryState: MemoryState
  recentImageHistory: RecentImageHistoryItem[]
}

type RunBufferedMemoryAgentInput = {
  payloads: ReadingEventPayload[]
  priorMemoryState: MemoryState
  recentImageHistory: RecentImageHistoryItem[]
}

type BatchUnitAnalysis = {
  readingUnitId: string
  appendText: string
  skippedReason: string
}

type BatchIllustrationAnalysis = {
  readingUnitId: string
  prompt: string
  label: string
}

type SubmitMemoryBatchToolArgs = {
  units: Array<{
    readingUnitId: string
    append_text?: string
    skipped_reason?: string
  }>
  illustration?: {
    readingUnitId: string
    prompt: string
    label?: string
  }
}

type SubmitMemoryBatchToolOutput = {
  units: BatchUnitAnalysis[]
  illustration?: BatchIllustrationAnalysis
}

type ParsedBatchToolMessage = {
  ok?: boolean
  output?: SubmitMemoryBatchToolOutput
  error?: string
}

type RunMemoryAgentResult = {
  invoked: boolean
  createdMemory: boolean
  skippedReason: string
  memoryAppendText?: string
  updatedMemoryState: MemoryState
  imageRequested: boolean
  imageCreated: boolean
  imageSkippedReason?: string
  imagePrompt?: string
  imageLabel?: string
  imageGeneratedCount?: number
  image?: GeneratedImagePayload
  runtimeStatus?: string
  lastToolOutput?: string
}

type RunBufferedMemoryAgentResult = {
  invoked: boolean
  results: RunMemoryAgentResult[]
  finalMemoryState: MemoryState
  finalRecentImageHistory: RecentImageHistoryItem[]
  runtimeStatus?: string
  lastToolOutput?: string
  skippedReason?: string
}

const submitMemoryBatchInputSchema = z.object({
  units: z
    .array(
      z.object({
        readingUnitId: z.string().min(1),
        append_text: z
          .string()
          .optional()
          .describe("Only the new incremental memory text for this reading unit. Leave empty when nothing durable should be appended."),
        skipped_reason: z
          .string()
          .optional()
          .describe("A brief reason for skipping memory append for this reading unit when append_text is empty."),
      })
    )
    .min(1)
    .describe("Return exactly one entry per buffered reading unit, in the same order as provided."),
  illustration: z
    .object({
      readingUnitId: z.string().min(1).describe("The reading unit id for the single strongest scene worth illustrating across the whole buffer."),
      prompt: z
        .string()
        .min(1)
        .max(1200)
        .describe("A simple illustration brief describing the scene to render."),
      label: z
        .string()
        .min(1)
        .max(120)
        .optional()
        .describe("A short scene label for the illustration."),
    })
    .optional()
    .describe("Optional. Include at most one illustration request across the entire buffered batch."),
})

function sanitizeSegment(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "session"
}

function buildBatchSessionId(payloads: ReadingEventPayload[]) {
  const first = payloads[0]
  const last = payloads[payloads.length - 1] ?? first

  return [
    "memory-agent-batch",
    sanitizeSegment(first?.bookId || "book"),
    sanitizeSegment(first?.readingUnitId || "start"),
    sanitizeSegment(last?.readingUnitId || "end"),
    Date.now().toString(),
  ].join("-")
}

function buildSystemPrompt() {
  return [
    "You are Florence Memory Agent.",
    "Your job is to grow a cumulative memory for a book while the reader moves reading unit by reading unit.",
    "Only create new incremental memory when the current unit contains durable continuity information worth keeping.",
    "If useful new durable memory exists, call create_memory exactly once.",
    "If there is no meaningful incremental memory to add, do not call create_memory.",
    "You may optionally call illustrate exactly once when the current unit introduces a strong, worth-illustrating scene.",
    "Be conservative with illustrate. Do not request an image for ordinary continuation, routine dialogue, or minor updates.",
    "Use recent image history to avoid over-illustrating nearby units or repeating the same beat.",
    "If you call illustrate, send only a simple illustration prompt describing the scene to render.",
    "If you call both tools, call create_memory first and illustrate second.",
    "The create_memory tool input must contain only the new text to append for the current unit.",
    "Prefer durable continuity facts: character state, setting changes, revealed relationships, goals, conflicts, motifs, and important events.",
    "Keep the appended memory concise, concrete, and continuity-focused.",
  ].join(" ")
}

function buildBatchSystemPrompt() {
  return [
    "You are Florence Memory Agent.",
    "You are processing an ordered buffered batch of reading units from the same book in a single pass.",
    "Review the units in order and decide, for each unit, whether it contributes durable continuity information worth appending to running memory.",
    "Prefer durable continuity facts: character state, setting changes, revealed relationships, goals, conflicts, motifs, and important events.",
    "Return only new incremental memory for each unit. Do not repeat the prior memory summary.",
    "Call submit_memory_batch exactly once.",
    "Inside that tool call, return exactly one entry per unit in the same order as provided.",
    "When a unit does not add durable memory, leave append_text empty and provide a short skipped_reason.",
    "Be concise, concrete, and continuity-focused.",
    "You may optionally request at most one illustration across the entire buffer, only for the single strongest scene worth rendering.",
    "Be conservative with illustration. Do not request images for ordinary continuation, routine dialogue, or minor updates.",
    "Use recent image history to avoid over-illustrating nearby units or repeating the same beat.",
    "If you include an illustration, provide only a simple prompt describing the scene to render, plus the target readingUnitId and an optional short label.",
    "Do not produce freeform text outside the tool call.",
  ].join(" ")
}

function buildUserInput(input: RunMemoryAgentInput) {
  return [
    `Book ID: ${input.payload.bookId}`,
    `Reading unit: ${input.payload.readingUnitId}`,
    `Format: ${input.payload.format}`,
    `Progress percent: ${input.payload.progressPercent}`,
    "",
    "Running memory summary:",
    input.priorMemoryState.summary.trim() || "[no memory yet]",
    "",
    "Recent memory additions:",
    input.priorMemoryState.recentSummaries.length
      ? input.priorMemoryState.recentSummaries.map((entry, index) => `${index + 1}. ${entry}`).join("\n")
      : "[none]",
    "",
    "Recent image history (last 20 max):",
    input.recentImageHistory.length
      ? input.recentImageHistory
          .map(
            (entry, index) =>
              `${index + 1}. ${entry.readingUnitId} | ${entry.label || "Scene"} | ${entry.createdAt}`
          )
          .join("\n")
      : "[no previous images]",
    "",
    "Current unit text:",
    input.payload.currentText.trim() || "[empty]",
    "",
    "Previous context:",
    input.payload.previousText?.trim() || "[none]",
    "",
    "Next context:",
    input.payload.nextText?.trim() || "[none]",
    "",
    "Instruction: if there is useful new durable memory from this unit, call create_memory exactly once with append_text containing only the new incremental memory for this unit.",
    "Instruction: if this unit is worth illustrating, call illustrate exactly once with a simple prompt describing the scene to render.",
  ].join("\n")
}

function buildBatchUserInput(input: RunBufferedMemoryAgentInput) {
  return [
    `Book ID: ${input.payloads[0]?.bookId || "[unknown]"}`,
    `Format: ${input.payloads[0]?.format || "[unknown]"}`,
    `Buffered units: ${input.payloads.length}`,
    "",
    "Running memory summary:",
    input.priorMemoryState.summary.trim() || "[no memory yet]",
    "",
    "Recent memory additions:",
    input.priorMemoryState.recentSummaries.length
      ? input.priorMemoryState.recentSummaries.map((entry, index) => `${index + 1}. ${entry}`).join("\n")
      : "[none]",
    "",
    "Recent image history (last 20 max):",
    input.recentImageHistory.length
      ? input.recentImageHistory
          .map(
            (entry, index) =>
              `${index + 1}. ${entry.readingUnitId} | ${entry.label || "Scene"} | ${entry.createdAt}`
          )
          .join("\n")
      : "[no previous images]",
    "",
    "Buffered reading units in order:",
    ...input.payloads.flatMap((payload, index) => [
      "",
      `Unit ${index + 1}/${input.payloads.length}`,
      `Reading unit: ${payload.readingUnitId}`,
      `Progress percent: ${payload.progressPercent}`,
      "Current text:",
      payload.currentText.trim() || "[empty]",
      "Previous context:",
      payload.previousText?.trim() || "[none]",
      "Next context:",
      payload.nextText?.trim() || "[none]",
    ]),
    "",
    "Instruction: call submit_memory_batch exactly once.",
    "Instruction: return exactly one unit entry per buffered reading unit in the same order as provided.",
    "Instruction: append_text must contain only the new incremental memory for that unit, or be empty when there is nothing durable to append.",
    "Instruction: you may include at most one illustration for the entire buffer.",
  ].join("\n")
}

function createProvider(apiKey: string) {
  return new OpenRouterProvider({
    apiKey,
  })
}

function logMemoryAgentRequest(input: RunMemoryAgentInput, systemPrompt: string, userInput: string) {
  const payloadSummary = {
    bookId: input.payload.bookId,
    readingUnitId: input.payload.readingUnitId,
    format: input.payload.format,
    progressPercent: input.payload.progressPercent,
    currentTextChars: input.payload.currentText.length,
    previousTextChars: input.payload.previousText?.length ?? 0,
    nextTextChars: input.payload.nextText?.length ?? 0,
    priorSummaryChars: input.priorMemoryState.summary.length,
    recentSummariesCount: input.priorMemoryState.recentSummaries.length,
    recentImageHistoryCount: input.recentImageHistory.length,
    systemPromptChars: systemPrompt.length,
    userInputChars: userInput.length,
    estimatedCombinedChars: systemPrompt.length + userInput.length,
  }

  void payloadSummary
}

function logBufferedMemoryAgentRequest(
  input: RunBufferedMemoryAgentInput,
  systemPrompt: string,
  userInput: string
) {
  const payloadSummary = {
    bookId: input.payloads[0]?.bookId,
    firstReadingUnitId: input.payloads[0]?.readingUnitId,
    lastReadingUnitId: input.payloads[input.payloads.length - 1]?.readingUnitId,
    bufferedUnitCount: input.payloads.length,
    totalCurrentTextChars: input.payloads.reduce((sum, payload) => sum + payload.currentText.length, 0),
    totalPreviousTextChars: input.payloads.reduce(
      (sum, payload) => sum + (payload.previousText?.length ?? 0),
      0
    ),
    totalNextTextChars: input.payloads.reduce((sum, payload) => sum + (payload.nextText?.length ?? 0), 0),
    priorSummaryChars: input.priorMemoryState.summary.length,
    recentSummariesCount: input.priorMemoryState.recentSummaries.length,
    recentImageHistoryCount: input.recentImageHistory.length,
    systemPromptChars: systemPrompt.length,
    userInputChars: userInput.length,
    estimatedCombinedChars: systemPrompt.length + userInput.length,
  }

  void payloadSummary
}

function trimSummary(value: string, maxLength = MAX_SUMMARY_LENGTH) {
  const trimmed = value.trim()
  if (trimmed.length <= maxLength) return trimmed
  return trimmed.slice(trimmed.length - maxLength)
}

export function createEmptyMemoryState(): MemoryState {
  return {
    summary: "",
    recentSummaries: [],
    updatedAt: new Date().toISOString(),
  }
}

export function applyMemoryAppend(
  prior: MemoryState,
  appendText: string,
  maxRecent = MAX_RECENT_SUMMARIES
): MemoryState {
  const trimmedAppend = appendText.trim()
  if (!trimmedAppend) {
    return {
      summary: prior.summary,
      recentSummaries: [...prior.recentSummaries].slice(-maxRecent),
      updatedAt: new Date().toISOString(),
    }
  }

  const combinedSummary = [prior.summary.trim(), trimmedAppend].filter(Boolean).join("\n\n")

  return {
    summary: trimSummary(combinedSummary),
    recentSummaries: [...prior.recentSummaries, trimmedAppend].slice(-maxRecent),
    updatedAt: new Date().toISOString(),
  }
}

function getSubmitMemoryBatchTool(input: RunBufferedMemoryAgentInput) {
  return defineTool<SubmitMemoryBatchToolArgs, SubmitMemoryBatchToolOutput>({
    name: "submit_memory_batch",
    description:
      "Submit the per-unit memory decisions for the entire buffered batch, and optionally one illustration request for the strongest scene in the buffer.",
    inputSchema: submitMemoryBatchInputSchema,
    async execute(args) {
      const entriesByReadingUnitId = new Map(
        (args.units || []).map((entry) => [entry.readingUnitId, entry] as const)
      )

      const units: BatchUnitAnalysis[] = input.payloads.map((payload) => {
        const entry = entriesByReadingUnitId.get(payload.readingUnitId)
        const appendText = entry?.append_text?.trim() || ""
        const skippedReason = appendText
          ? ""
          : entry?.skipped_reason?.trim() || "Model chose not to append memory for this unit."

        return {
          readingUnitId: payload.readingUnitId,
          appendText,
          skippedReason,
        }
      })

      const illustration =
        args.illustration && input.payloads.some((payload) => payload.readingUnitId === args.illustration?.readingUnitId)
          ? {
              readingUnitId: args.illustration.readingUnitId,
              prompt: args.illustration.prompt.trim(),
              label:
                args.illustration.label?.trim() ||
                `Scene for ${args.illustration.readingUnitId}`,
            }
          : undefined

      return {
        ok: true,
        output: {
          units,
          illustration: illustration?.prompt ? illustration : undefined,
        },
      }
    },
  })
}

function parseBatchToolMessage(content: string) {
  return JSON.parse(content) as ParsedBatchToolMessage
}

function buildSkippedResults(
  payloads: ReadingEventPayload[],
  priorMemoryState: MemoryState,
  skippedReason: string
): RunMemoryAgentResult[] {
  let memoryState = {
    ...priorMemoryState,
    recentSummaries: [...priorMemoryState.recentSummaries],
  }

  return payloads.map((payload) => {
    memoryState = {
      ...memoryState,
      updatedAt: new Date().toISOString(),
    }

    return {
      invoked: false,
      createdMemory: false,
      skippedReason: payload.currentText.trim() ? skippedReason : "Reading unit has no extracted text.",
      updatedMemoryState: memoryState,
      imageRequested: false,
      imageCreated: false,
      imageSkippedReason: payload.currentText.trim()
        ? skippedReason
        : "Reading unit has no extracted text.",
    }
  })
}

export async function runBufferedMemoryAgent(
  input: RunBufferedMemoryAgentInput
): Promise<RunBufferedMemoryAgentResult> {
  if (!input.payloads.length) {
    return {
      invoked: false,
      results: [],
      finalMemoryState: {
        ...input.priorMemoryState,
        updatedAt: new Date().toISOString(),
      },
      finalRecentImageHistory: [...input.recentImageHistory],
      skippedReason: "No reading units were provided.",
    }
  }

  const hasAnyCurrentText = input.payloads.some((payload) => payload.currentText.trim())

  if (!hasAnyCurrentText) {
    const results = buildSkippedResults(
      input.payloads,
      input.priorMemoryState,
      "Reading unit has no extracted text."
    )

    return {
      invoked: false,
      results,
      finalMemoryState: results[results.length - 1]?.updatedMemoryState || {
        ...input.priorMemoryState,
        updatedAt: new Date().toISOString(),
      },
      finalRecentImageHistory: [...input.recentImageHistory],
      skippedReason: "Buffered reading units have no extracted text.",
    }
  }

  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    const results = buildSkippedResults(input.payloads, input.priorMemoryState, "OPENROUTER_API_KEY is not set.")

    return {
      invoked: false,
      results,
      finalMemoryState: results[results.length - 1]?.updatedMemoryState || {
        ...input.priorMemoryState,
        updatedAt: new Date().toISOString(),
      },
      finalRecentImageHistory: [...input.recentImageHistory],
      skippedReason: "OPENROUTER_API_KEY is not set.",
    }
  }

  const systemPrompt = buildBatchSystemPrompt()
  const userInput = buildBatchUserInput(input)

  logBufferedMemoryAgentRequest(input, systemPrompt, userInput)

  const agent = defineAgent({
    name: "florence-memory-agent-batch",
    instructions: systemPrompt,
    model: MEMORY_MODEL,
    tools: [getSubmitMemoryBatchTool(input)],
  })

  const runtime = createRuntime({
    agent,
    provider: createProvider(apiKey),
    storage: new EphemeralStorage(),
  })

  let runtimeResult: Awaited<ReturnType<typeof runtime.run>>

  try {
    runtimeResult = await runtime.run({
      sessionId: buildBatchSessionId(input.payloads),
      input: userInput,
      maxSteps: 3,
      ephemeral: true,
    })
  } catch (error) {
    const skippedReason = `Memory agent unavailable: ${
      error instanceof Error ? error.message : "Unknown provider error."
    }`
    const results = buildSkippedResults(input.payloads, input.priorMemoryState, skippedReason)

    return {
      invoked: false,
      results,
      finalMemoryState: results[results.length - 1]?.updatedMemoryState || {
        ...input.priorMemoryState,
        updatedAt: new Date().toISOString(),
      },
      finalRecentImageHistory: [...input.recentImageHistory],
      skippedReason,
      runtimeStatus: "provider_error",
      lastToolOutput: skippedReason,
    }
  }

  const reversedMessages = [...runtimeResult.messages].reverse()
  const batchToolMessage = reversedMessages.find(
    (message) => message.role === "tool" && message.name === "submit_memory_batch"
  )

  let unitAnalyses: BatchUnitAnalysis[] = input.payloads.map((payload) => ({
    readingUnitId: payload.readingUnitId,
    appendText: "",
    skippedReason: payload.currentText.trim()
      ? "Model chose not to append memory for this unit."
      : "Reading unit has no extracted text.",
  }))
  let illustrationAnalysis: BatchIllustrationAnalysis | undefined
  let lastToolOutput = ""

  if (batchToolMessage) {
    const parsed = parseBatchToolMessage(batchToolMessage.content)
    if (!parsed.ok) {
      throw new Error(parsed.error || "submit_memory_batch tool returned a failed result.")
    }

    const output = parsed.output
    if (!output) {
      throw new Error("submit_memory_batch tool returned no output payload.")
    }

    unitAnalyses = output.units
    illustrationAnalysis = output.illustration
    lastToolOutput = batchToolMessage.content
  }

  let updatedMemoryState: MemoryState = {
    ...input.priorMemoryState,
    recentSummaries: [...input.priorMemoryState.recentSummaries],
  }

  const results: RunMemoryAgentResult[] = []
  const memoryStateByReadingUnitId = new Map<string, MemoryState>()

  for (const payload of input.payloads) {
    const analysis =
      unitAnalyses.find((entry) => entry.readingUnitId === payload.readingUnitId) ||
      ({
        readingUnitId: payload.readingUnitId,
        appendText: "",
        skippedReason: payload.currentText.trim()
          ? "Model chose not to append memory for this unit."
          : "Reading unit has no extracted text.",
      } satisfies BatchUnitAnalysis)

    const memoryAppendText = payload.currentText.trim() ? analysis.appendText.trim() : ""
    const createdMemory = Boolean(memoryAppendText)

    updatedMemoryState = applyMemoryAppend(updatedMemoryState, memoryAppendText)
    memoryStateByReadingUnitId.set(payload.readingUnitId, updatedMemoryState)

    results.push({
      invoked: true,
      createdMemory,
      skippedReason: createdMemory
        ? ""
        : payload.currentText.trim()
          ? analysis.skippedReason || "Model chose not to append memory for this unit."
          : "Reading unit has no extracted text.",
      memoryAppendText,
      updatedMemoryState,
      imageRequested: false,
      imageCreated: false,
      imageSkippedReason: "Model chose not to request an illustration for this buffered batch.",
      runtimeStatus: runtimeResult.status,
      lastToolOutput,
    })
  }

  let finalRecentImageHistory = [...input.recentImageHistory]

  if (illustrationAnalysis?.prompt) {
    const targetIndex = input.payloads.findIndex(
      (payload) => payload.readingUnitId === illustrationAnalysis?.readingUnitId
    )

    if (targetIndex >= 0) {
      const targetPayload = input.payloads[targetIndex]
      const targetMemoryState =
        memoryStateByReadingUnitId.get(targetPayload.readingUnitId) || updatedMemoryState

      const imageResult = await runImageAgent({
        payload: targetPayload,
        illustrationPrompt: illustrationAnalysis.prompt,
        label: illustrationAnalysis.label,
        memoryState: targetMemoryState,
        recentImageHistory: input.recentImageHistory,
      })

      results[targetIndex] = {
        ...results[targetIndex],
        imageRequested: true,
        imageCreated: imageResult.createdImage,
        imageSkippedReason: imageResult.skippedReason || "",
        imagePrompt: imageResult.prompt,
        imageLabel: imageResult.label,
        imageGeneratedCount: imageResult.generatedImageCount,
        image: imageResult.image,
      }

      if (imageResult.createdImage && imageResult.prompt) {
        finalRecentImageHistory = [
          ...finalRecentImageHistory,
          {
            readingUnitId: targetPayload.readingUnitId,
            label: imageResult.label,
            prompt: imageResult.prompt,
            createdAt: new Date().toISOString(),
          },
        ].slice(-MAX_RECENT_IMAGE_HISTORY)
      }
    }
  }

  return {
    invoked: true,
    results,
    finalMemoryState: updatedMemoryState,
    finalRecentImageHistory,
    runtimeStatus: runtimeResult.status,
    lastToolOutput,
    skippedReason: batchToolMessage ? "" : "Model did not submit buffered memory output.",
  }
}

export async function runMemoryAgent(input: RunMemoryAgentInput): Promise<RunMemoryAgentResult> {
  const systemPrompt = buildSystemPrompt()
  const userInput = buildUserInput(input)

  logMemoryAgentRequest(input, systemPrompt, userInput)

  const batchResult = await runBufferedMemoryAgent({
    payloads: [input.payload],
    priorMemoryState: input.priorMemoryState,
    recentImageHistory: input.recentImageHistory,
  })

  return (
    batchResult.results[0] || {
      invoked: false,
      createdMemory: false,
      skippedReason: batchResult.skippedReason || "Model chose not to append memory for this unit.",
      updatedMemoryState: batchResult.finalMemoryState,
      imageRequested: false,
      imageCreated: false,
      imageSkippedReason: batchResult.skippedReason || "Model chose not to request an illustration for this unit.",
      runtimeStatus: batchResult.runtimeStatus,
      lastToolOutput: batchResult.lastToolOutput,
    }
  )
}
