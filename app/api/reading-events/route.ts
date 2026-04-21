import { NextResponse } from "next/server"
import { PipelineStatus, ReadingEventPayload, ReadingEventResponse } from "@/lib/types"
import { runBufferedAgents } from "@/lib/reading-buffer"
import { createEmptyMemoryState } from "@/lib/memory-agent"

export async function POST(request: Request) {
  const body = (await request.json()) as ReadingEventPayload
  const trimmedCurrentText = body.currentText.trim()

  if (!trimmedCurrentText) {
    const pipeline: PipelineStatus = {
      memory: "idle",
      image: "idle",
      lastSummary: `Skipped memory creation for ${body.readingUnitId} because no extracted text was available.`,
      latestPrompt: "No image prompt generated yet.",
      latestImageLabel: "No scene image yet",
      updatedAt: new Date().toLocaleTimeString(),
      memoryDebug: {
        dedupeHit: false,
      },
    }

    const response: ReadingEventResponse = {
      ok: true,
      queued: false,
      pipeline,
      memoryAgent: {
        invoked: false,
        createdMemory: false,
        skippedReason: "No extracted page text.",
        dedupeHit: false,
        imageCreated: false,
        imageGeneratedCount: 0,
        imageSkippedReason: "No extracted page text.",
      },
    }

    return NextResponse.json(response)
  }

  try {
    const batchResult = await runBufferedAgents({
      userId: body.userId,
      bookId: body.bookId,
      format: body.format,
      visibleReadingUnitId: body.readingUnitId,
      units: [
        {
          readingUnitId: body.readingUnitId,
          currentText: body.currentText,
          previousText: body.previousText,
          nextText: body.nextText,
          progressPercent: body.progressPercent,
        },
      ],
      priorMemoryState: createEmptyMemoryState(),
      recentImageHistory: [],
    })

    const unitResult = batchResult.results[0]

    const summary = unitResult?.createdMemory
      ? `Appended memory for ${body.readingUnitId}: ${unitResult.memoryAppendText?.slice(0, 160) ?? ""}${(unitResult.memoryAppendText?.length ?? 0) > 160 ? "…" : ""}`
      : unitResult?.skippedMemoryReason || `No memory appended for ${body.readingUnitId}.`

    const imageStatus: PipelineStatus["image"] = unitResult?.imageCreated
      ? "ready"
      : unitResult?.imageRequested || unitResult?.imageSkippedReason
        ? "ready"
        : "idle"

    const pipeline: PipelineStatus = {
      memory: unitResult?.createdMemory ? "ready" : "idle",
      image: imageStatus,
      lastSummary: summary,
      latestPrompt: unitResult?.imagePrompt || "Use /api/reading-buffer for stateless buffered processing.",
      latestImageLabel: unitResult?.imageCreated
        ? unitResult.imageLabel || `Scene for ${body.readingUnitId}`
        : unitResult?.imageSkippedReason || "No scene image yet",
      updatedAt: new Date().toLocaleTimeString(),
      memoryDebug: {
        runtimeStatus: batchResult.ok ? "completed" : "failed",
        lastToolOutput: "Deprecated route. Use /api/reading-buffer.",
        dedupeHit: false,
      },
    }

    const response: ReadingEventResponse = {
      ok: batchResult.ok,
      queued: false,
      pipeline,
      memoryAgent: unitResult
        ? {
            invoked: true,
            createdMemory: unitResult.createdMemory,
            skippedReason: unitResult.skippedMemoryReason || "",
            appendedText: unitResult.memoryAppendText,
            runtimeStatus: batchResult.ok ? "completed" : "failed",
            lastToolOutput: "Deprecated route. Use /api/reading-buffer.",
            dedupeHit: false,
            imageCreated: unitResult.imageCreated,
            imagePrompt: unitResult.imagePrompt,
            imageLabel: unitResult.imageLabel,
            imageMimeType: unitResult.image?.mimeType,
            imageGeneratedCount: unitResult.generatedImageCount,
            imageSkippedReason: unitResult.imageSkippedReason,
            image: unitResult.image,
          }
        : undefined,
    }

    return NextResponse.json(response, {
      headers: {
        "X-Florence-Deprecated": "Use /api/reading-buffer",
      },
      status: batchResult.ok ? 200 : 500,
    })
  } catch (error) {
    console.error("Memory agent failed", error)

    const pipeline: PipelineStatus = {
      memory: "ready",
      image: "idle",
      lastSummary: "Memory agent failed. Falling back without appending memory.",
      latestPrompt: error instanceof Error ? error.message : "Unknown memory agent error",
      latestImageLabel: "No scene image yet",
      updatedAt: new Date().toLocaleTimeString(),
      memoryDebug: {
        dedupeHit: false,
      },
    }

    const response: ReadingEventResponse = {
      ok: false,
      queued: false,
      pipeline,
    }

    return NextResponse.json(response, { status: 500 })
  }
}
