// In-memory spend tracker — resets on redeploy (good enough for testing)

const SPEND_CAP_DOLLARS = 10.0;

// Estimated costs per operation (conservative — slightly overestimates)
export const COST_PER_OP = {
  identify: 0.006,     // vision + response
  personality: 0.007,  // prompt + long response
  chat: 0.004,         // system + history + response
  voice: 0.005,        // ElevenLabs TTS per turn
} as const;

type OpType = keyof typeof COST_PER_OP;

class SpendTracker {
  private totalSpent = 0;
  private opCounts: Record<OpType, number> = {
    identify: 0,
    personality: 0,
    chat: 0,
    voice: 0,
  };

  record(op: OpType): boolean {
    const cost = COST_PER_OP[op];
    if (this.totalSpent + cost > SPEND_CAP_DOLLARS) {
      return false; // would exceed cap
    }
    this.totalSpent += cost;
    this.opCounts[op]++;
    return true;
  }

  getStats() {
    return {
      totalSpent: Math.round(this.totalSpent * 1000) / 1000,
      cap: SPEND_CAP_DOLLARS,
      remaining: Math.round((SPEND_CAP_DOLLARS - this.totalSpent) * 1000) / 1000,
      ops: { ...this.opCounts },
    };
  }

  isOverCap(): boolean {
    return this.totalSpent >= SPEND_CAP_DOLLARS;
  }
}

// Global singleton
const g = globalThis as unknown as { __spend: SpendTracker };
if (!g.__spend) {
  g.__spend = new SpendTracker();
}

export const spend = g.__spend;
