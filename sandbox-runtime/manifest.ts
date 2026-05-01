export const SANDBOX_RUNTIME_ROOT = "/vercel/sandbox"
export const SANDBOX_WORKER_RELATIVE_PATH = "sandbox-runtime/reading-buffer-worker.ts"
export const SANDBOX_INPUT_FILE_PATH = "/vercel/sandbox/tmp/florence-reading-buffer-input.json"
export const SANDBOX_RESULT_START_MARKER = "__FLORENCE_RESULT_START__"
export const SANDBOX_RESULT_END_MARKER = "__FLORENCE_RESULT_END__"

export const SANDBOX_SNAPSHOT_FILE_MAP = [
  {
    localPath: "sandbox-runtime/package.json",
    remotePath: "package.json",
  },
  {
    localPath: "sandbox-runtime/tsconfig.json",
    remotePath: "tsconfig.json",
  },
  {
    localPath: "sandbox-runtime/manifest.ts",
    remotePath: "sandbox-runtime/manifest.ts",
  },
  {
    localPath: "sandbox-runtime/reading-buffer-worker.ts",
    remotePath: "sandbox-runtime/reading-buffer-worker.ts",
  },
  {
    localPath: "lib/types.ts",
    remotePath: "lib/types.ts",
  },
  {
    localPath: "lib/hyper-router-ephemeral-storage.ts",
    remotePath: "lib/hyper-router-ephemeral-storage.ts",
  },
  {
    localPath: "lib/image-agent.ts",
    remotePath: "lib/image-agent.ts",
  },
  {
    localPath: "lib/memory-agent.ts",
    remotePath: "lib/memory-agent.ts",
  },
  {
    localPath: "lib/reading-buffer.ts",
    remotePath: "lib/reading-buffer.ts",
  },
] as const
