import { NextResponse } from "next/server"
import { runImageAgent } from "@/lib/image-agent"
import { ReadingEventPayload, type MemoryState, type RecentImageHistoryItem } from "@/lib/types"

const emptyMemoryState: MemoryState = {
  summary: "",
  recentSummaries: [],
}

const emptyImageHistory: RecentImageHistoryItem[] = []

export async function POST(request: Request) {
  const body = (await request.json()) as ReadingEventPayload & {
    illustrationPrompt?: string
    label?: string
  }

  if (!body.currentText?.trim()) {
    return NextResponse.json({
      ok: true,
      queued: false,
      result: {
        createdImage: false,
        skippedReason: "No extracted page text.",
      },
    })
  }

  if (!body.illustrationPrompt?.trim()) {
    return NextResponse.json({
      ok: true,
      queued: false,
      result: {
        createdImage: false,
        skippedReason: "No illustration prompt was provided.",
      },
    })
  }

  try {
    const result = await runImageAgent({
      payload: body,
      illustrationPrompt: body.illustrationPrompt,
      label: body.label,
      memoryState: emptyMemoryState,
      recentImageHistory: emptyImageHistory,
    })

    return NextResponse.json(
      { ok: true, queued: false, result },
      {
        headers: {
          "X-Florence-Deprecated": "Image generation should flow through /api/reading-buffer",
        },
      }
    )
  } catch (error) {
    console.error("Image agent failed", error)
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown image agent error",
      },
      { status: 500 }
    )
  }
}
