"use client";

import { useState, type DragEvent } from "react";
import { formatBytes, type DocumentKind } from "../intake/limits";
import { workflows } from "../workflows";

export const acceptByKind: Record<DocumentKind, string> = {
  pdf: ".pdf,application/pdf",
  image: ".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp",
  text: ".txt,text/plain",
  email: ".eml,message/rfc822",
};
/** Every file kind some workflow can read. */
export const uploadKinds = [...new Set(workflows.flatMap((w) => w.upload?.kinds ?? []))];

/** File picker and drop zone for the visitor's own document. Reading happens in the runner. */
export function UploadBox({
  accept,
  file,
  error,
  disabled,
  canRun,
  onFile,
  onRun,
  onClear,
}: {
  accept: string;
  file: File | null;
  error: string | null;
  disabled: boolean;
  canRun: boolean;
  onFile: (f: File) => void;
  onRun: () => void;
  onClear: () => void;
}) {
  const [over, setOver] = useState(false);
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    const f = e.dataTransfer.files[0];
    if (f && !disabled) onFile(f);
  };
  return (
    <div className="min-w-0 flex-[1_1_420px]">
      {file ? (
        <div className="panel flex flex-col gap-4 rounded-card border-2! border-accent-line! p-6 sm:p-8">
          <p className="min-w-0">
            <span className="block font-mono text-xs text-accent">Ready on this device</span>
            <span className="mt-2 block truncate text-lg font-medium">{file.name}</span>
            <span className="text-sm text-soft">{formatBytes(file.size)} · not uploaded</span>
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onRun}
              disabled={!canRun}
              className="tap inline-flex min-h-11 cursor-pointer items-center rounded-control bg-accent px-5 text-base font-medium text-accent-fg disabled:cursor-not-allowed disabled:opacity-40"
            >
              Run it
            </button>
            <button
              type="button"
              onClick={onClear}
              disabled={disabled}
              className="inline-flex min-h-11 cursor-pointer items-center rounded-control border border-border-strong px-5 text-base font-medium transition-colors hover:bg-surface-2 disabled:opacity-40"
            >
              Remove file
            </button>
          </div>
        </div>
      ) : (
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={onDrop}
          className={`panel flex cursor-pointer flex-col items-center justify-center gap-3 rounded-card border-2! border-dashed! p-9 text-center transition-colors focus-within:border-accent! hover:border-accent! ${
            over ? "border-accent! bg-accent-soft!" : "border-border-strong!"
          }`}
        >
          <svg aria-hidden="true" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 16V4M7 9l5-5 5 5M5 20h14" />
          </svg>
          <span className="text-lg font-medium">Choose a file or drop it here</span>
          <span className="font-mono text-xs leading-[1.7] text-soft">
            PDF, PNG, JPG, WebP, TXT or .eml · up to 10 MB
            <br />
            first 5 PDF pages (3 with OCR) · English OCR
          </span>
          <input
            type="file"
            accept={accept}
            className="sr-only"
            disabled={disabled}
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) onFile(f);
            }}
          />
        </label>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      )}
      <p className="mt-3 text-sm text-muted">
        Read in this browser and never uploaded. Nothing is saved: it&apos;s gone when you reset or leave the page.
      </p>
    </div>
  );
}
