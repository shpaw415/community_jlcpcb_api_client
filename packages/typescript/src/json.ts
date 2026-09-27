export function toPayload(value: unknown): unknown {
  if (value === undefined || value === null) return undefined;
  if (Array.isArray(value)) {
    return value.map((item) => {
      const next = toPayload(item);
      return next === undefined ? null : next;
    });
  }
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      if (item === undefined || item === null) continue;
      const next = toPayload(item);
      if (next !== undefined) out[key] = next;
    }
    return out;
  }
  return value;
}

export function compactJson(value: unknown): string {
  const payload = toPayload(value);
  return JSON.stringify(payload === undefined ? {} : payload);
}
