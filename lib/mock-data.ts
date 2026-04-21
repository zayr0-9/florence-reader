import { BookRecord, PipelineStatus } from "@/lib/types"

export const featuredBooks: BookRecord[] = [
  {
    id: "book-dune",
    title: "Dune",
    author: "Frank Herbert",
    format: "epub",
    sizeLabel: "2.1 MB",
    progressPercent: 38,
    currentUnitLabel: "Location 1284",
    updatedAt: "2m ago",
    status: "ready",
    coverTone: "from-amber-200 via-orange-200 to-rose-200",
    synopsis:
      "Epic sci-fi reading session with background memory tracking and scene generation.",
  },
  {
    id: "book-frankenstein",
    title: "Frankenstein",
    author: "Mary Shelley",
    format: "pdf",
    sizeLabel: "12.4 MB",
    progressPercent: 64,
    currentUnitLabel: "Page 119",
    updatedAt: "15m ago",
    status: "processing",
    coverTone: "from-slate-200 via-zinc-200 to-emerald-100",
    synopsis:
      "Reader-first PDF experience with a quiet memory and image pipeline running behind the scenes.",
  },
  {
    id: "book-mobydick",
    title: "Moby-Dick",
    author: "Herman Melville",
    format: "epub",
    sizeLabel: "3.3 MB",
    progressPercent: 12,
    currentUnitLabel: "Location 402",
    updatedAt: "Yesterday",
    status: "ready",
    coverTone: "from-cyan-200 via-sky-200 to-indigo-200",
    synopsis:
      "A long-form reading test case for continuity memory and scene image consistency.",
  },
]

export const pipelineSeed: Record<string, PipelineStatus> = {
  "book-dune": {
    memory: "ready",
    image: "running",
    lastSummary:
      "Paul and Jessica travel deeper into the desert while tension and prophecy keep tightening around them.",
    latestPrompt:
      "Cinematic desert twilight, two travelers crossing dunes, ancient prophecy mood, soft sandstorm haze",
    latestImageLabel: "Desert crossing scene",
    updatedAt: "Just now",
  },
  "book-frankenstein": {
    memory: "running",
    image: "queued",
    lastSummary:
      "Victor is reflecting on the consequences of ambition, isolation, and the dread of what he has made.",
    latestPrompt:
      "Moody arctic journal illustration, candlelit reflection, gothic atmosphere",
    latestImageLabel: "Updating scene...",
    updatedAt: "1 min ago",
  },
  "book-mobydick": {
    memory: "ready",
    image: "ready",
    lastSummary:
      "The crew's routines and the sea's rhythm establish the world before obsession fully dominates the voyage.",
    latestPrompt:
      "Painterly whaling ship at dawn, cold blue sea, disciplined crew, atmospheric mist",
    latestImageLabel: "Dawn aboard the Pequod",
    updatedAt: "8 min ago",
  },
}

export const sampleBookText: Record<string, string[]> = {
  "book-dune": [
    "A beginning is the time for taking the most delicate care that the balances are correct.",
    "Paul studied the old woman carefully, aware that every word in the room carried weight.",
    "The desert waited beyond the walls, enormous and alive with hidden consequence.",
  ],
  "book-frankenstein": [
    "I had desired it with an ardour that far exceeded moderation; but now that I had finished, the beauty of the dream vanished.",
    "Breathless horror and disgust filled my heart.",
    "Unable to endure the aspect of the being I had created, I rushed out of the room.",
  ],
  "book-mobydick": [
    "Call me Ishmael.",
    "Whenever I find myself growing grim about the mouth, I account it high time to get to sea as soon as I can.",
    "There is magic in the oceanic routine before obsession gives it a darker edge.",
  ],
}
