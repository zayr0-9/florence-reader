import { NextResponse } from "next/server"
import { z } from "zod"
import { runBufferedAgents } from "@/lib/reading-buffer"

const requestSchema = z.object({
  userId: z.string().min(1),
  bookId: z.string().min(1),
  format: z.enum(["pdf", "epub"]),
  visibleReadingUnitId: z.string().min(1),
  units: z
    .array(
      z.object({
        readingUnitId: z.string().min(1),
        currentText: z.string(),
        previousText: z.string().optional(),
        nextText: z.string().optional(),
        progressPercent: z.number().min(0).max(100),
      })
    )
    .min(1)
    .max(10),
  priorMemoryState: z.object({
    summary: z.string(),
    recentSummaries: z.array(z.string()),
    updatedAt: z.string().optional(),
  }),
  recentImageHistory: z.array(
    z.object({
      readingUnitId: z.string().min(1),
      label: z.string(),
      prompt: z.string(),
      createdAt: z.string(),
    })
  ),
})

export async function POST(request: Request) {
  try {
    const json = await request.json()
    const input = requestSchema.parse(json)

    const result = await runBufferedAgents(input)

    return NextResponse.json(result, {
      status: result.ok ? 200 : 500,
    })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Invalid request",
      },
      { status: 400 }
    )
  }
}
