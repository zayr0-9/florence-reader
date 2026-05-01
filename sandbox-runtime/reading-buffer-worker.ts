import { readFile } from "node:fs/promises"
import { runBufferedAgents } from "@/lib/reading-buffer"
import type { ReadingBufferRequest, ReadingBufferResponse } from "@/lib/types"
import {
  SANDBOX_INPUT_FILE_PATH,
  SANDBOX_RESULT_END_MARKER,
  SANDBOX_RESULT_START_MARKER,
} from "@/sandbox-runtime/manifest"

async function main() {
  const rawInput = await readFile(SANDBOX_INPUT_FILE_PATH, "utf8")
  const input = JSON.parse(rawInput) as ReadingBufferRequest
  const result = await runBufferedAgents(input)

  process.stdout.write(`${SANDBOX_RESULT_START_MARKER}\n`)
  process.stdout.write(`${JSON.stringify(result satisfies ReadingBufferResponse)}\n`)
  process.stdout.write(`${SANDBOX_RESULT_END_MARKER}\n`)
}

main().catch((error) => {
  const errorResult: ReadingBufferResponse = {
    ok: false,
    visibleReadingUnitId: "",
    results: [],
    finalMemoryState: {
      summary: "",
      recentSummaries: [],
      updatedAt: new Date().toISOString(),
    },
    finalRecentImageHistory: [],
    error: error instanceof Error ? error.message : "Unknown sandbox worker error.",
  }

  process.stderr.write(`${errorResult.error}\n`)
  process.stdout.write(`${SANDBOX_RESULT_START_MARKER}\n`)
  process.stdout.write(`${JSON.stringify(errorResult)}\n`)
  process.stdout.write(`${SANDBOX_RESULT_END_MARKER}\n`)
  process.exit(1)
})
