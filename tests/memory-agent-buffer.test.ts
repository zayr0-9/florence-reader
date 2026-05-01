import test from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import fs from 'node:fs/promises'
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'
import {
  DEFAULT_BUFFER_SIZE,
  DEFAULT_REFILL_THRESHOLD,
  buildBufferedUnits,
  shouldRefillBuffer,
} from '@/lib/reader-buffer-utils'

type BufferDispatch = {
  visiblePage: number
  startIndex: number
  endIndex: number
  sentPages: number[]
}

type BufferedRequest = {
  visiblePage: number
  sentPages: number[]
}

async function getPdfPageCount() {
  const pdfPath = path.resolve(process.cwd(), 'public/waterbabiesfairy00king_1.pdf')
  const standardFontDataUrl = `${pathToFileURL(path.resolve(process.cwd(), 'node_modules/pdfjs-dist/standard_fonts')).href}/`
  const fileData = await fs.readFile(pdfPath)

  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(fileData),
    useWasm: false,
    isImageDecoderSupported: false,
    standardFontDataUrl,
  })

  const pdf = await loadingTask.promise
  const pageCount = pdf.numPages
  await pdf.destroy()
  return pageCount
}

function simulateSequentialPageFlips(totalPages: number, visiblePagesToSimulate: number) {
  const placeholderUnits = Array.from(
    { length: totalPages },
    (_, index) => `Mock PDF page payload for Page ${index + 1}`
  )

  const processedPages = new Set<number>()
  const dispatches: BufferDispatch[] = []
  let bufferEndIndex = -1

  for (let currentIndex = 0; currentIndex < Math.min(totalPages, visiblePagesToSimulate); currentIndex += 1) {
    const visiblePage = currentIndex + 1
    const visibleAlreadyProcessed = processedPages.has(visiblePage)

    let startIndex: number | null = null

    if (!visibleAlreadyProcessed) {
      startIndex = currentIndex
    } else if (shouldRefillBuffer(currentIndex, bufferEndIndex, DEFAULT_REFILL_THRESHOLD)) {
      startIndex = bufferEndIndex >= currentIndex ? bufferEndIndex + 1 : currentIndex
    }

    if (startIndex === null || startIndex >= totalPages) {
      continue
    }

    const bufferedUnits = buildBufferedUnits(
      placeholderUnits,
      startIndex,
      DEFAULT_BUFFER_SIZE,
      'pdf'
    )

    const unitsToSend = bufferedUnits.filter((unit) => {
      const pageNumber = Number(unit.readingUnitId.replace('Page ', ''))
      return !processedPages.has(pageNumber)
    })

    if (!unitsToSend.length) {
      continue
    }

    const sentPages = unitsToSend.map((unit) => Number(unit.readingUnitId.replace('Page ', '')))

    for (const page of sentPages) {
      processedPages.add(page)
    }

    bufferEndIndex = startIndex + unitsToSend.length - 1
    dispatches.push({
      visiblePage,
      startIndex,
      endIndex: bufferEndIndex,
      sentPages,
    })
  }

  return dispatches
}

async function simulateBufferedRequests(
  totalPages: number,
  visiblePagesToSimulate: number,
  sendBufferedPages: (request: BufferedRequest) => Promise<void>
) {
  const dispatches = simulateSequentialPageFlips(totalPages, visiblePagesToSimulate)

  for (const dispatch of dispatches) {
    await sendBufferedPages({
      visiblePage: dispatch.visiblePage,
      sentPages: dispatch.sentPages,
    })
  }

  return dispatches
}

test('pdf page buffer sends only the expected page windows while flipping one page at a time', async () => {
  const totalPages = await getPdfPageCount()
  assert.equal(totalPages, 320)

  const dispatches = simulateSequentialPageFlips(totalPages, 25)

  assert.deepEqual(
    dispatches.map((entry) => ({
      visiblePage: entry.visiblePage,
      sentPages: entry.sentPages,
    })),
    [
      { visiblePage: 1, sentPages: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
      { visiblePage: 6, sentPages: [11, 12, 13, 14, 15, 16, 17, 18, 19, 20] },
      { visiblePage: 16, sentPages: [21, 22, 23, 24, 25, 26, 27, 28, 29, 30] },
    ]
  )

  const allSentPages = dispatches.flatMap((entry) => entry.sentPages)
  const uniqueSentPages = new Set(allSentPages)

  assert.equal(allSentPages.length, uniqueSentPages.size, 'buffer should not resend overlapping pages')
  assert.deepEqual(allSentPages, Array.from({ length: 30 }, (_, index) => index + 1))
  assert.equal(dispatches.at(-1)?.sentPages.at(-1), 30)

  console.log('\nPDF buffer dispatch trace for waterbabiesfairy00king_1.pdf')
  console.table(
    dispatches.map((entry) => ({
      visiblePage: entry.visiblePage,
      bufferStartPage: entry.startIndex + 1,
      bufferEndPage: entry.endIndex + 1,
      sentPages: entry.sentPages.join(', '),
    }))
  )
})

test('buffered memory flow sends one batch request per refill window instead of one request per page', async () => {
  const totalPages = await getPdfPageCount()
  const requests: BufferedRequest[] = []

  const dispatches = await simulateBufferedRequests(totalPages, 25, async (request) => {
    requests.push(request)
  })

  assert.equal(requests.length, 3, '25 sequential page flips should produce only 3 buffered requests')
  assert.equal(dispatches.length, requests.length)

  assert.deepEqual(requests, [
    { visiblePage: 1, sentPages: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
    { visiblePage: 6, sentPages: [11, 12, 13, 14, 15, 16, 17, 18, 19, 20] },
    { visiblePage: 16, sentPages: [21, 22, 23, 24, 25, 26, 27, 28, 29, 30] },
  ])

  assert.ok(
    requests.every((request) => request.sentPages.length > 1),
    'each buffered request should contain the full page window, not individual per-page sends'
  )

  assert.deepEqual(
    requests.flatMap((request) => request.sentPages),
    Array.from({ length: 30 }, (_, index) => index + 1),
    'the buffered requests should still cover the same ordered pages without gaps'
  )
})
