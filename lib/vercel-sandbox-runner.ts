import { Buffer } from "node:buffer"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { Sandbox } from "@vercel/sandbox"
import type { ReadingBufferRequest, ReadingBufferResponse } from "@/lib/types"
import {
  SANDBOX_INPUT_FILE_PATH,
  SANDBOX_RESULT_END_MARKER,
  SANDBOX_RESULT_START_MARKER,
  SANDBOX_SNAPSHOT_FILE_MAP,
  SANDBOX_WORKER_RELATIVE_PATH,
} from "@/sandbox-runtime/manifest"

const SANDBOX_RUNTIME = "node24"
const SANDBOX_TIMEOUT_MS = 5 * 60 * 1000
const SANDBOX_SNAPSHOT_EXPIRATION_MS = 30 * 24 * 60 * 60 * 1000
const SANDBOX_INSTALL_COMMAND = {
  cmd: "npm",
  args: ["install", "--omit=optional", "--no-audit", "--no-fund"],
}
const SANDBOX_WORKER_COMMAND = {
  cmd: "npx",
  args: ["tsx", SANDBOX_WORKER_RELATIVE_PATH],
}

type SandboxExecutionSuccess = {
  ok: true
  snapshotId?: string
  response: ReadingBufferResponse
  stdout: string
}

type SandboxExecutionFailure = {
  ok: false
  snapshotId?: string
  error: string
  stdout?: string
  stderr?: string
}

export type SandboxExecutionResult =
  | SandboxExecutionSuccess
  | SandboxExecutionFailure

let cachedSnapshotId = process.env.VERCEL_SANDBOX_BASE_SNAPSHOT_ID?.trim() || ""
let inFlightSnapshotPromise: Promise<string> | null = null

function hasSandboxAccessConfigured() {
  return Boolean(process.env.VERCEL_OIDC_TOKEN || process.env.VERCEL_ACCESS_TOKEN)
}

function getSandboxAccessError() {
  return "Vercel Sandbox credentials are not configured. Set VERCEL_OIDC_TOKEN or VERCEL_ACCESS_TOKEN."
}

function extractJsonPayloadFromStdout(stdout: string) {
  const startIndex = stdout.lastIndexOf(SANDBOX_RESULT_START_MARKER)
  const endIndex = stdout.lastIndexOf(SANDBOX_RESULT_END_MARKER)

  if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
    throw new Error("Sandbox worker did not emit a result payload.")
  }

  return stdout
    .slice(startIndex + SANDBOX_RESULT_START_MARKER.length, endIndex)
    .trim()
}

async function buildSnapshotFiles() {
  const files = await Promise.all(
    SANDBOX_SNAPSHOT_FILE_MAP.map(async (entry) => {
      const absolutePath = path.join(process.cwd(), entry.localPath)
      const content = await readFile(absolutePath)

      return {
        path: path.posix.join("/vercel/sandbox", entry.remotePath.replace(/\\/g, "/")),
        content: Buffer.from(content),
      }
    })
  )

  return files
}

async function createBaseSnapshot() {
  const sandbox = await Sandbox.create({
    runtime: SANDBOX_RUNTIME,
    timeout: SANDBOX_TIMEOUT_MS,
    env: {
      OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY || "",
      NODE_ENV: process.env.NODE_ENV || "production",
      TS_NODE_PROJECT: "/vercel/sandbox/tsconfig.json",
    },
  })

  await sandbox.mkDir("sandbox-runtime")
  await sandbox.mkDir("lib")
  await sandbox.mkDir("tmp")
  await sandbox.writeFiles(await buildSnapshotFiles())

  const installResult = await sandbox.runCommand(SANDBOX_INSTALL_COMMAND)
  const installStdout = await installResult.stdout()
  const installStderr = await installResult.stderr()

  if (installResult.exitCode !== 0) {
    throw new Error(
      `Sandbox dependency installation failed: ${installStderr || installStdout || "unknown error"}`
    )
  }

  const snapshot = await sandbox.snapshot({
    expiration: SANDBOX_SNAPSHOT_EXPIRATION_MS,
  })

  return snapshot.snapshotId
}

async function getBaseSnapshotId() {
  if (cachedSnapshotId) {
    return cachedSnapshotId
  }

  if (!inFlightSnapshotPromise) {
    inFlightSnapshotPromise = createBaseSnapshot()
      .then((snapshotId) => {
        cachedSnapshotId = snapshotId
        return snapshotId
      })
      .finally(() => {
        inFlightSnapshotPromise = null
      })
  }

  return inFlightSnapshotPromise
}

export function getConfiguredSandboxSnapshotId() {
  return cachedSnapshotId || process.env.VERCEL_SANDBOX_BASE_SNAPSHOT_ID?.trim() || undefined
}

export async function ensureVercelSandboxSnapshot(): Promise<string> {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_API_KEY is not set.")
  }

  if (!hasSandboxAccessConfigured()) {
    throw new Error(getSandboxAccessError())
  }

  return getBaseSnapshotId()
}

export async function runBufferedAgentsInVercelSandbox(
  input: ReadingBufferRequest
): Promise<SandboxExecutionResult> {
  if (!process.env.OPENROUTER_API_KEY) {
    return {
      ok: false,
      error: "OPENROUTER_API_KEY is not set.",
    }
  }

  if (!hasSandboxAccessConfigured()) {
    return {
      ok: false,
      error: getSandboxAccessError(),
    }
  }

  const snapshotId = await getBaseSnapshotId()

  const sandbox = await Sandbox.create({
    runtime: SANDBOX_RUNTIME,
    timeout: SANDBOX_TIMEOUT_MS,
    source: {
      type: "snapshot",
      snapshotId,
    },
    env: {
      OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
      NODE_ENV: process.env.NODE_ENV || "production",
      TS_NODE_PROJECT: "/vercel/sandbox/tsconfig.json",
    },
  })

  try {
    await sandbox.fs.mkdir("/vercel/sandbox/tmp", { recursive: true })
    await sandbox.fs.writeFile(SANDBOX_INPUT_FILE_PATH, JSON.stringify(input))

    const workerResult = await sandbox.runCommand({
      ...SANDBOX_WORKER_COMMAND,
      cwd: "/vercel/sandbox",
    })

    const stdout = await workerResult.stdout()
    const stderr = await workerResult.stderr()
    const jsonPayload = extractJsonPayloadFromStdout(stdout)
    const response = JSON.parse(jsonPayload) as ReadingBufferResponse

    if (!response.ok || workerResult.exitCode !== 0) {
      return {
        ok: false,
        snapshotId,
        stdout,
        stderr,
        error: response.error || stderr || "Sandbox worker failed.",
      }
    }

    return {
      ok: true,
      snapshotId,
      stdout,
      response,
    }
  } finally {
    await sandbox.stop({ blocking: true }).catch(() => undefined)
  }
}
