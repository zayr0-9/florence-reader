"use client"

import { ErrorDisplay } from "@edrlab/thorium-web/misc"
import { StatefulReaderWrapper, usePublication } from "@edrlab/thorium-web/reader"

type ReadiumWebTestProps = {
  manifestUrl: string
}

export function ReadiumWebTest({ manifestUrl }: ReadiumWebTestProps) {
  const { error, publication, profile, localDataKey, isLoading } = usePublication({
    url: manifestUrl,
    onError: (nextError) => {
      console.error("Readium Web test failed to load publication", nextError)
    },
  })

  if (error) {
    return <ErrorDisplay error={error} title="Readium Web test failed" />
  }

  if (!publication || !profile) {
    return (
      <div className="flex h-[calc(100vh-5rem)] min-h-[720px] items-center justify-center border border-black/10 bg-white text-sm text-muted-foreground">
        {isLoading ? "Loading Readium Web test publication…" : "Preparing publication…"}
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-5rem)] min-h-[720px] border border-black/10 bg-white">
      <StatefulReaderWrapper
        profile={profile}
        publication={publication}
        localDataKey={localDataKey}
        isLoading={isLoading}
      />
    </div>
  )
}
