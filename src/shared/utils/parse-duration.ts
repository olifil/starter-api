const UNIT_TO_MS: Record<string, number> = {
  s: 1_000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

/**
 * Converts a duration string (e.g. '7d', '15m', '1h') into a future Date.
 */
export function computeExpiresAt(duration: string): Date {
  const match = duration.match(/^(\d+)([smhd])$/);
  if (!match) {
    throw new Error(`Invalid duration format: "${duration}"`);
  }
  const value = parseInt(match[1], 10);
  const unit = match[2];
  return new Date(Date.now() + value * UNIT_TO_MS[unit]);
}
