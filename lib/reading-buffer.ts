import {
  ReadingBufferRequest,
  ReadingBufferResponse,
} from "@/lib/types"
import { runBufferedMemoryAgent } from "@/lib/memory-agent"

export async function runBufferedAgents(
  input: ReadingBufferRequest
): Promise<ReadingBufferResponse> {
  try {
    const memoryResult = await runBufferedMemoryAgent({
      payloads: input.units.map((unit) => ({
        userId: input.userId,
        bookId: input.bookId,
        format: input.format,
        readingUnitId: unit.readingUnitId,
        currentText: unit.currentText,
        previousText: unit.previousText,
        nextText: unit.nextText,
        progressPercent: unit.progressPercent,
      })),
      priorMemoryState: input.priorMemoryState,
      recentImageHistory: input.recentImageHistory,
    })

    return {
      ok: true,
      visibleReadingUnitId: input.visibleReadingUnitId,
      results: memoryResult.results.map((result, index) => ({
        readingUnitId: input.units[index]?.readingUnitId || "",
        createdMemory: result.createdMemory,
        skippedMemoryReason: result.skippedReason || undefined,
        memoryAppendText: result.memoryAppendText,
        memoryStateAfterUnit: result.updatedMemoryState,
        imageRequested: result.imageRequested,
        imageCreated: result.imageCreated,
        imageSkippedReason: result.imageSkippedReason,
        imagePrompt: result.imagePrompt,
        imageLabel: result.imageLabel,
        generatedImageCount: result.imageGeneratedCount,
        image: result.image,
      })),
      finalMemoryState: memoryResult.finalMemoryState,
      finalRecentImageHistory: memoryResult.finalRecentImageHistory,
    }
  } catch (error) {
    console.error("[reading-buffer] batch error", {
      visibleReadingUnitId: input.visibleReadingUnitId,
      bufferedUnitCount: input.units.length,
      error: error instanceof Error ? error.message : "Unknown memory agent error.",
      memorySummaryCharsAtFailure: input.priorMemoryState.summary.length,
      recentSummariesCountAtFailure: input.priorMemoryState.recentSummaries.length,
      recentImageHistoryCountAtFailure: input.recentImageHistory.length,
    })

    return {
      ok: false,
      visibleReadingUnitId: input.visibleReadingUnitId,
      results: [],
      finalMemoryState: input.priorMemoryState,
      finalRecentImageHistory: input.recentImageHistory,
      error: error instanceof Error ? error.message : "Unknown memory agent error.",
    }
  }
}
