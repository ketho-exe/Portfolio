/** Stable short reference from a string (djb2). Same input → same reference, every run. */
export function simulatedReference(prefix: string, seed: string): string {
  let h = 5381;
  for (let i = 0; i < seed.length; i++) h = ((h << 5) + h + seed.charCodeAt(i)) >>> 0;
  // Low bits: the high bits of djb2 barely change between similar seeds like TX-1 / TX-2.
  return `${prefix}-${h.toString(16).toUpperCase().padStart(8, "0").slice(-6)}`;
}
