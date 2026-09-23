import type { AppliedOperation, LedgerEntry } from "./types.ts"
import type { LedgerStore } from "./engine.ts"

export class MemoryLedger implements LedgerStore {
  operations = new Map<string, AppliedOperation>()
  entries: LedgerEntry[] = []

  findOperation(idempotencyKey: string): AppliedOperation | undefined {
    return this.operations.get(idempotencyKey)
  }

  entriesFor(userIds: string[]): LedgerEntry[] {
    const ids = new Set(userIds)
    return this.entries.filter((entry) => ids.has(entry.userId))
  }

  append(operation: AppliedOperation, entries: LedgerEntry[]): void {
    if (this.operations.has(operation.idempotencyKey)) {
      throw new Error("operation already stored")
    }
    this.operations.set(operation.idempotencyKey, operation)
    this.entries.push(...entries)
  }
}
