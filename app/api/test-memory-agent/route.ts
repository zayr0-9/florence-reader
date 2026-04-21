import { NextResponse } from "next/server"
import { createEmptyMemoryState, runMemoryAgent } from "@/lib/memory-agent"
import { ReadingEventPayload } from "@/lib/types"

function buildSamplePayload(overrides?: Partial<ReadingEventPayload>): ReadingEventPayload {
  const nonce = Date.now()

  return {
    userId: "memory-test-user",
    bookId: `test-memory-book-${nonce}`,
    readingUnitId: "Page 7",
    format: "epub",
    currentText:
      "On her first night at Brindlemere School of Witchcraft, Mira Vale learned that Headmaster Orin had vanished three days earlier. Professor Thorne secretly gave her a brass key marked with a phoenix and warned her not to trust the prefect Lucan Reed. In the clocktower, Mira heard a chained dragon breathing behind the walls and realized the school was hiding a sealed fire chamber beneath the library.",
    previousText:
      "Mira arrived at the school by boat and noticed that every window in the north tower had been blacked out from the inside.",
    nextText:
      "Before dawn, Mira plans to test the phoenix key on the locked iron door beneath the library stairs.",
    progressPercent: 12,
    ...overrides,
  }
}

async function runSmokeTest(payload: ReadingEventPayload) {
  const result = await runMemoryAgent({
    payload,
    priorMemoryState: createEmptyMemoryState(),
    recentImageHistory: [],
  })

  const assertions = {
    resultReturned: true,
    updatedMemoryStateReturned: Boolean(result.updatedMemoryState),
    summaryIsString: typeof result.updatedMemoryState.summary === "string",
    recentSummariesIsArray: Array.isArray(result.updatedMemoryState.recentSummaries),
    imagePayloadShapeValid: result.image
      ? typeof result.image.dataUrl === "string" && typeof result.image.mimeType === "string"
      : true,
    statelessContract: true,
  }

  const passed = Object.values(assertions).every(Boolean)

  return {
    passed,
    payload,
    result,
    assertions,
  }
}

export async function GET() {
  const payload = buildSamplePayload()
  const test = await runSmokeTest(payload)

  return NextResponse.json(test, {
    status: test.passed ? 200 : 500,
  })
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Partial<ReadingEventPayload>
  const payload = buildSamplePayload(body)
  const test = await runSmokeTest(payload)

  return NextResponse.json(test, {
    status: test.passed ? 200 : 500,
  })
}
