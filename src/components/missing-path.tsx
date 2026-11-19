"use client";

import { useSyncExternalStore } from "react";

const noop = () => () => {};

/** decodeURI throws on malformed escapes such as "/%E0%A4%A/"; show those as typed. */
export function readablePath(raw: string): string {
  try {
    return decodeURI(raw);
  } catch {
    return raw;
  }
}

/** The path the visitor tried. The 404 page is static, so this is read on the client. */
export function MissingPath() {
  const path = useSyncExternalStore(noop, () => readablePath(window.location.pathname), () => "this link");
  return <>{path}</>;
}
