import type { Message, RunStatus } from "@hyper-labs/hyper-router"

type SessionMetadata = {
  agentName?: string
  model?: string
  promptHash?: string
  promptSnapshot?: string
  toolsetHash?: string
  updatedAt?: string
  custom?: Record<string, unknown>
}

export class EphemeralStorage {
  private readonly messages = new Map<string, Message[]>()
  private readonly metadata = new Map<string, SessionMetadata>()
  private readonly runs = new Map<string, { sessionId: string; status: RunStatus }>()

  async loadMessages(sessionId: string): Promise<Message[]> {
    return this.messages.get(sessionId) ?? []
  }

  async saveMessages(sessionId: string, messages: Message[]): Promise<void> {
    this.messages.set(sessionId, messages)
  }

  async saveRun(record: { sessionId: string; status: RunStatus }): Promise<void> {
    this.runs.set(record.sessionId, record)
  }

  async getSessionMetadata(sessionId: string): Promise<SessionMetadata | null> {
    return this.metadata.get(sessionId) ?? null
  }

  async setSessionMetadata(sessionId: string, metadata: SessionMetadata): Promise<void> {
    this.metadata.set(sessionId, metadata)
  }
}
