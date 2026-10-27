import * as pdfjsLib from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.js?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

export { pdfjsLib };

export const SCALE = { min: 0.35, max: 3, fitMax: 2.5, step: 0.15 };

export const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

export const isPdfFile = (file) =>
  !!file && (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'));

export async function openPdf(file) {
  const data = await file.arrayBuffer();
  return pdfjsLib.getDocument({ data: new Uint8Array(data) }).promise;
}
