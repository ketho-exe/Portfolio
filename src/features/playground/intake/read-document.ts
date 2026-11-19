/**
 * Reads a visitor's document entirely in their browser. Nothing is uploaded:
 * PDF.js and Tesseract.js run locally, loading their code and the OCR model from this site's /vendor/.
 * Both libraries are imported on demand, so pages that never read a document don't pay for them.
 */
import { documentKind, MAX_OCR_PAGES, MAX_PDF_PAGES, MIN_READABLE_CHARS, normaliseText, readableChars } from "./limits";

export type ReadMethod = "pdf-text" | "pdf-ocr" | "image-ocr" | "plain-text";
export type ReadResult = { text: string; method: ReadMethod; pages: number; truncated: boolean };
export type ReadProgress = (message: string, fraction?: number) => void;

/** Errors whose message is safe and useful to show the visitor. */
export class ReadError extends Error {
  override name = "ReadError";
}

const vendor = (path: string) => new URL(`/vendor/${path}`, window.location.origin).href;

export async function readDocument(file: File, onProgress: ReadProgress = () => {}): Promise<ReadResult> {
  const kind = documentKind(file.name);
  if (kind === "text") {
    const { text, truncated } = normaliseText(await file.text());
    return { text, method: "plain-text", pages: 1, truncated };
  }
  if (kind === "image") {
    const raw = await ocr([file], onProgress);
    return { ...normaliseText(raw), method: "image-ocr", pages: 1 };
  }
  if (kind === "pdf") return readPdf(file, onProgress);
  throw new ReadError("This file type can't be read here.");
}

async function readPdf(file: File, onProgress: ReadProgress): Promise<ReadResult> {
  onProgress("Opening PDF");
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = vendor("pdfjs/pdf.worker.min.mjs");

  let doc;
  try {
    doc = await pdfjs.getDocument({
      data: new Uint8Array(await file.arrayBuffer()),
      cMapUrl: vendor("pdfjs/cmaps/"),
      standardFontDataUrl: vendor("pdfjs/standard_fonts/"),
      wasmUrl: vendor("pdfjs/wasm/"),
      iccUrl: vendor("pdfjs/iccs/"),
      enableXfa: false,
    }).promise;
  } catch (e) {
    const name = (e as { name?: string }).name;
    throw new ReadError(
      name === "PasswordException"
        ? "This PDF is password-protected. Remove the password and try again."
        : "This PDF couldn't be opened. It may be damaged.",
    );
  }

  try {
    const pages = Math.min(doc.numPages, MAX_PDF_PAGES);
    let raw = "";
    for (let n = 1; n <= pages; n++) {
      onProgress(`Reading text layer, page ${n} of ${pages}`, (n - 1) / pages);
      const content = await (await doc.getPage(n)).getTextContent();
      for (const item of content.items) {
        if ("str" in item) raw += item.str + (item.hasEOL ? "\n" : "");
      }
      raw += "\n\n";
    }
    if (readableChars(raw) >= MIN_READABLE_CHARS) return { ...normaliseText(raw), method: "pdf-text", pages };

    // No text layer: a scan saved as PDF. Render the first pages and OCR them.
    const ocrPages = Math.min(doc.numPages, MAX_OCR_PAGES);
    const canvases: HTMLCanvasElement[] = [];
    for (let n = 1; n <= ocrPages; n++) {
      onProgress(`No text layer found. Rendering page ${n} of ${ocrPages} for OCR`);
      const page = await doc.getPage(n);
      const base = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: Math.min(2.5, 2400 / base.width) });
      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      await page.render({ canvas, viewport }).promise;
      canvases.push(canvas);
    }
    const text = await ocr(canvases, onProgress);
    return { ...normaliseText(text), method: "pdf-ocr", pages: ocrPages };
  } finally {
    await doc.loadingTask.destroy();
  }
}

async function ocr(images: (Blob | HTMLCanvasElement)[], onProgress: ReadProgress): Promise<string> {
  onProgress("Loading OCR engine (the model is cached after first use)");
  const { createWorker, OEM } = await import("tesseract.js");
  let page = 0;
  const worker = await createWorker("eng", OEM.LSTM_ONLY, {
    workerPath: vendor("tesseract/worker.min.js"),
    corePath: vendor("tesseract/core"),
    langPath: vendor("tesseract/lang"),
    workerBlobURL: false,
    gzip: true,
    logger: (m: { status: string; progress: number }) => {
      if (m.status === "recognizing text") {
        onProgress(`Recognising text${images.length > 1 ? `, page ${page + 1} of ${images.length}` : ""}`, (page + m.progress) / images.length);
      } else if (m.status.startsWith("loading")) {
        onProgress("Loading OCR model (cached after first use)", m.progress);
      }
    },
  });
  try {
    const texts: string[] = [];
    for (page = 0; page < images.length; page++) {
      const { data } = await worker.recognize(images[page]);
      texts.push(data.text);
    }
    return texts.join("\n\n");
  } catch {
    throw new ReadError("The image couldn't be read. Try a clearer PNG or JPG.");
  } finally {
    await worker.terminate();
  }
}
