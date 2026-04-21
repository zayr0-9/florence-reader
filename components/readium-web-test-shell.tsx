"use client"

import { ThStoreProvider } from "@edrlab/thorium-web/core/lib"
import { ReadiumWebTest } from "@/components/readium-web-test"

type ReadiumWebTestShellProps = {
  manifestUrl: string
}

export function ReadiumWebTestShell({ manifestUrl }: ReadiumWebTestShellProps) {
  return (
    <ThStoreProvider storageKey="florence-readium-test-store">
      <ReadiumWebTest manifestUrl={manifestUrl} />
    </ThStoreProvider>
  )
}
