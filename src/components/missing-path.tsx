"use client";

import { useSyncExternalStore } from "react";

const noop = () => () => {};

/** The path the visitor tried. The 404 page is static, so this is read on the client. */
export function MissingPath() {
  const path = useSyncExternalStore(noop, () => decodeURI(window.location.pathname), () => "this link");
  return <>{path}</>;
}
