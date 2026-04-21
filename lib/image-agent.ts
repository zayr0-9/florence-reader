import type { GeneratedImage } from "@hyper-labs/hyper-router"
import { OpenRouterProvider } from "@hyper-labs/hyper-router/providers/openrouter"
import { MemoryState, RecentImageHistoryItem, ReadingEventPayload, type GeneratedImagePayload } from "@/lib/types"

const IMAGE_MODEL = "google/gemini-2.5-flash-image"

type RunImageAgentInput = {
  payload: ReadingEventPayload
  illustrationPrompt: string
  label?: string
  memoryState: MemoryState
  recentImageHistory: RecentImageHistoryItem[]
}

type RunImageAgentResult = {
  createdImage: boolean
  skippedReason?: string
  prompt: string
  label: string
  generatedImageCount: number
  image?: GeneratedImagePayload
}

function buildSystemPrompt() {
  return [
    "You are Florence Image Render Agent.",
    "A separate upstream memory agent has already decided this moment should be illustrated.",
    "Your job is to generate the final image, not to rewrite the brief into another prompt.",
    "Use the supplied illustration brief as the primary scene directive.",
    "Use the memory summary only to preserve continuity for recurring characters, settings, objects, tone, and atmosphere.",
    "Use recent image history only to avoid reusing the same framing or repeating a nearly identical beat.",
    "Generate exactly one finished illustration image for this scene.",
    "Do not call tools.",
  ].join(" ")
}

function buildUserInput(input: RunImageAgentInput) {
  return [
    `Book ID: ${input.payload.bookId}`,
    `Reading unit: ${input.payload.readingUnitId}`,
    `Format: ${input.payload.format}`,
    `Progress percent: ${input.payload.progressPercent}`,
    `Scene label hint: ${input.label?.trim() || "[none]"}`,
    "",
    "Illustration brief from memory agent:",
    input.illustrationPrompt.trim(),
    "",
    "Memory summary:",
    input.memoryState.summary.trim() || "[no memory yet]",
    "",
    "Recent memory additions:",
    input.memoryState.recentSummaries.length
      ? input.memoryState.recentSummaries.map((entry, index) => `${index + 1}. ${entry}`).join("\n")
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
    "Current page text:",
    input.payload.currentText.trim() || "[empty]",
    "",
    "Previous context:",
    input.payload.previousText?.trim() || "[none]",
    "",
    "Next context:",
    input.payload.nextText?.trim() || "[none]",
    "",
    "Instruction: generate the final illustration image for this scene now.",
  ].join("\n")
}

function createProvider(apiKey: string) {
  return new OpenRouterProvider({
    apiKey,
  })
}

function logImageAgentRequest(input: RunImageAgentInput, systemPrompt: string, userInput: string) {
  const payloadSummary = {
    bookId: input.payload.bookId,
    readingUnitId: input.payload.readingUnitId,
    format: input.payload.format,
    progressPercent: input.payload.progressPercent,
    illustrationPromptChars: input.illustrationPrompt.length,
    currentTextChars: input.payload.currentText.length,
    previousTextChars: input.payload.previousText?.length ?? 0,
    nextTextChars: input.payload.nextText?.length ?? 0,
    memorySummaryChars: input.memoryState.summary.length,
    recentSummariesCount: input.memoryState.recentSummaries.length,
    recentImageHistoryCount: input.recentImageHistory.length,
    systemPromptChars: systemPrompt.length,
    userInputChars: userInput.length,
    estimatedCombinedChars: systemPrompt.length + userInput.length,
  }
}

function normalizeGeneratedImage(image?: GeneratedImage): GeneratedImagePayload | undefined {
  if (!image) return undefined

  if (image.dataUrl) {
    return {
      mimeType: image.mimeType || inferMimeTypeFromDataUrl(image.dataUrl) || "image/png",
      dataUrl: image.dataUrl,
    }
  }

  return undefined
}

function inferMimeTypeFromDataUrl(dataUrl: string) {
  const match = /^data:([^;,]+)[;,]/u.exec(dataUrl)
  return match?.[1]
}

export async function runImageAgent(input: RunImageAgentInput): Promise<RunImageAgentResult> {
  const currentText = input.payload.currentText.trim()
  const illustrationPrompt = input.illustrationPrompt.trim()
  const label = input.label?.trim() || `Scene for ${input.payload.readingUnitId}`

  if (!currentText) {
    return {
      createdImage: false,
      skippedReason: "Reading unit has no extracted text.",
      prompt: illustrationPrompt,
      label,
      generatedImageCount: 0,
    }
  }

  if (!illustrationPrompt) {
    return {
      createdImage: false,
      skippedReason: "No illustration prompt was provided.",
      prompt: "",
      label,
      generatedImageCount: 0,
    }
  }

  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    return {
      createdImage: false,
      skippedReason: "OPENROUTER_API_KEY is not set.",
      prompt: illustrationPrompt,
      label,
      generatedImageCount: 0,
    }
  }

  const provider = createProvider(apiKey)
  const systemPrompt = buildSystemPrompt()
  const userInput = buildUserInput(input)

  logImageAgentRequest(input, systemPrompt, userInput)

  const providerResult = await provider.generate({
    sessionId: `image-${input.payload.bookId}-${input.payload.readingUnitId}-${Date.now()}`,
    model: IMAGE_MODEL,
    messages: [
      {
        role: "system",
        content: systemPrompt,
        date: new Date(),
      },
      {
        role: "user",
        content: userInput,
        date: new Date(),
      },
    ],
    tools: [],
    previousSessionMetadata: null,
    ephemeral: true,
  })

  const generatedImageCount = providerResult.generatedImages?.length ?? 0
  const image = normalizeGeneratedImage(providerResult.generatedImages?.[0])

  return {
    createdImage: Boolean(image),
    skippedReason: image
      ? undefined
      : "Image model completed but did not return a generated image payload.",
    prompt: illustrationPrompt,
    label,
    generatedImageCount,
    image,
  }
}
