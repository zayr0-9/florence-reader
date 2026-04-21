import { promises as fs } from "node:fs"
import path from "node:path"

const IMAGE_DIR = path.join(process.cwd(), "memory-artifacts", "images")
const GENERATED_IMAGE_DIR = path.join(IMAGE_DIR, "generated")

function sanitizeSegment(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "book"
}

function buildBaseName(bookId: string, readingUnitId: string) {
  return `${sanitizeSegment(bookId)}-${sanitizeSegment(readingUnitId)}`
}

export function getImageFilePath(bookId: string, readingUnitId: string) {
  return path.join(IMAGE_DIR, `${buildBaseName(bookId, readingUnitId)}.md`)
}

export function getGeneratedImageFilePath(
  bookId: string,
  readingUnitId: string,
  extension: string,
  suffix = Date.now().toString()
) {
  const normalizedExtension = extension.replace(/^\.+/u, "") || "png"
  return path.join(
    GENERATED_IMAGE_DIR,
    `${buildBaseName(bookId, readingUnitId)}-${suffix}.${normalizedExtension}`
  )
}

export async function ensureImageDir() {
  await fs.mkdir(IMAGE_DIR, { recursive: true })
  await fs.mkdir(GENERATED_IMAGE_DIR, { recursive: true })
}

export async function appendImageEntry(
  bookId: string,
  readingUnitId: string,
  input: {
    label: string
    prompt: string
    imagePath?: string
    imageUrl?: string
    mimeType?: string
  }
) {
  await ensureImageDir()
  const filePath = getImageFilePath(bookId, readingUnitId)

  const label = input.label.trim()
  const prompt = input.prompt.trim()

  if (!prompt) {
    return { filePath, appended: false }
  }

  const timestamp = new Date().toISOString()
  const block = [
    `\n## ${readingUnitId}`,
    `- appended_at: ${timestamp}`,
    `- label: ${label || "Scene"}`,
    ...(input.imagePath ? [`- image_path: ${input.imagePath}`] : []),
    ...(input.imageUrl ? [`- image_url: ${input.imageUrl}`] : []),
    ...(input.mimeType ? [`- image_mime_type: ${input.mimeType}`] : []),
    "",
    "### Prompt",
    prompt,
    "",
  ].join("\n")

  await fs.appendFile(filePath, block, "utf8")

  return { filePath, appended: true }
}

export async function saveGeneratedImage(
  bookId: string,
  readingUnitId: string,
  image: {
    dataUrl?: string
    url?: string
    mimeType?: string
  }
) {
  await ensureImageDir()

  if (image.dataUrl) {
    const { buffer, mimeType } = dataUrlToBuffer(image.dataUrl, image.mimeType)
    const extension = extensionFromMimeType(mimeType)
    const filePath = getGeneratedImageFilePath(bookId, readingUnitId, extension)

    await fs.writeFile(filePath, buffer)

    return {
      filePath,
      mimeType,
      source: "dataUrl" as const,
    }
  }

  if (image.url) {
    const response = await fetch(image.url)
    if (!response.ok) {
      throw new Error(`Failed to download generated image: ${response.status} ${response.statusText}`)
    }

    const arrayBuffer = await response.arrayBuffer()
    const mimeType =
      image.mimeType ||
      response.headers.get("content-type")?.split(";")[0]?.trim() ||
      mimeTypeFromUrl(image.url) ||
      "image/png"

    const extension = extensionFromMimeType(mimeType)
    const filePath = getGeneratedImageFilePath(bookId, readingUnitId, extension)

    await fs.writeFile(filePath, Buffer.from(arrayBuffer))

    return {
      filePath,
      mimeType,
      source: "url" as const,
      url: image.url,
    }
  }

  throw new Error("No image payload was provided.")
}

function dataUrlToBuffer(dataUrl: string, fallbackMimeType?: string) {
  const match = /^data:([^;,]+)?(?:;base64)?,(.*)$/u.exec(dataUrl)
  if (!match) {
    throw new Error("Invalid data URL.")
  }

  const mimeType = fallbackMimeType || match[1] || "image/png"
  const payload = match[2] || ""

  return {
    buffer: Buffer.from(payload, "base64"),
    mimeType,
  }
}

function extensionFromMimeType(mimeType?: string) {
  switch ((mimeType || "").toLowerCase()) {
    case "image/png":
      return "png"
    case "image/jpeg":
    case "image/jpg":
      return "jpg"
    case "image/webp":
      return "webp"
    case "image/gif":
      return "gif"
    case "image/svg+xml":
      return "svg"
    default:
      return "png"
  }
}

function mimeTypeFromUrl(value: string) {
  const pathname = new URL(value).pathname.toLowerCase()

  if (pathname.endsWith(".png")) return "image/png"
  if (pathname.endsWith(".jpg") || pathname.endsWith(".jpeg")) return "image/jpeg"
  if (pathname.endsWith(".webp")) return "image/webp"
  if (pathname.endsWith(".gif")) return "image/gif"
  if (pathname.endsWith(".svg")) return "image/svg+xml"

  return undefined
}
