import type { Data, JsonValue } from "./schema";

const isRecord = (v: unknown): v is Record<string, JsonValue> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/** Read a dot path. Returns `undefined` when any segment is missing. Paths are pre-validated by PathSchema. */
export function getPath(data: Data, path: string): JsonValue | undefined {
  let current: JsonValue | undefined = data;
  for (const key of path.split(".")) {
    if (!isRecord(current) || !Object.hasOwn(current, key)) return undefined;
    current = current[key];
  }
  return current;
}

/** Immutable write of a dot path, creating intermediate objects as needed. */
export function setPath(data: Data, path: string, value: JsonValue): Data {
  const [head, ...rest] = path.split(".");
  if (rest.length === 0) return { ...data, [head]: value };
  const child = isRecord(data[head]) ? (data[head] as Data) : {};
  return { ...data, [head]: setPath(child, rest.join("."), value) };
}
