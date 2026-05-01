import { config as loadDotEnv } from "dotenv"
import { ensureVercelSandboxSnapshot } from "@/lib/vercel-sandbox-runner"

loadDotEnv({ path: ".env.local" })
loadDotEnv()

async function main() {
  const snapshotId = await ensureVercelSandboxSnapshot()
  console.log(snapshotId)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Unknown snapshot creation error")
  process.exit(1)
})
