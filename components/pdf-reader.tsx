"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";
import { truncateText } from "@/lib/text-utils";

type PdfJsModule = typeof import("pdfjs-dist");

type PdfReaderProps = {
  fileData: ArrayBuffer;
  unitIndex: number;
  onPageCount: (count: number) => void;
  onTextReady: (pages: string[]) => void;
  zoomPercent: number;
  onStatusChange?: (status: string) => void;
};

export const PDF_MIN_ZOOM = 50;
export const PDF_MAX_ZOOM = 200;
export const PDF_ZOOM_STEP = 10;

export function PdfReader({
  fileData,
  unitIndex,
  onPageCount,
  onTextReady,
  zoomPercent,
  onStatusChange,
}: PdfReaderProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const viewerRef = useRef<HTMLDivElement | null>(null);
  const pdfModuleRef = useRef<PdfJsModule | null>(null);
  const renderTaskRef = useRef<RenderTask | null>(null);
  const [documentProxy, setDocumentProxy] = useState<PDFDocumentProxy | null>(
    null,
  );
  const [loadingLabel, setLoadingLabel] = useState("Loading PDF...");
  const [viewerWidth, setViewerWidth] = useState(0);

  const currentPage = useMemo(() => unitIndex + 1, [unitIndex]);
  const fittedPageWidth = useMemo(() => {
    if (!viewerWidth) return 760;

    const horizontalPadding = viewerWidth < 640 ? 16 : 24;
    return Math.max(viewerWidth - horizontalPadding, 280);
  }, [viewerWidth]);
  const targetPageWidth = useMemo(
    () => fittedPageWidth * (zoomPercent / 100),
    [fittedPageWidth, zoomPercent],
  );

  useEffect(() => {
    let cancelled = false;

    async function loadPdf() {
      setLoadingLabel("Loading PDF...");

      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.mjs";
      pdfModuleRef.current = pdfjs;

      const loadingTask = pdfjs.getDocument({
        data: new Uint8Array(fileData.slice(0)),
        isImageDecoderSupported: false,
        useWasm: true,
        wasmUrl: "/pdf-wasm/",
      });
      const pdf = await loadingTask.promise;
      if (cancelled) {
        await pdf.destroy();
        return;
      }

      setDocumentProxy(pdf);
      onPageCount(pdf.numPages);
      setLoadingLabel("Extracting text...");

      const pages: string[] = [];
      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
        const page = await pdf.getPage(pageNumber);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item) => ("str" in item ? item.str : ""))
          .join(" ");
        pages.push(truncateText(pageText || `PDF page ${pageNumber}`));
      }

      if (!cancelled) {
        onTextReady(pages);
        setLoadingLabel("");
      }
    }

    loadPdf().catch((error) => {
      console.error(error);
      if (!cancelled) {
        setLoadingLabel("Unable to load PDF in the browser.");
      }
    });

    return () => {
      cancelled = true;
    };
  }, [fileData, onPageCount, onTextReady]);

  useEffect(() => {
    onStatusChange?.(loadingLabel || "");
  }, [loadingLabel, onStatusChange]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    const updateViewerWidth = () => {
      setViewerWidth(viewer.clientWidth);
    };

    updateViewerWidth();

    const observer = new ResizeObserver(() => {
      updateViewerWidth();
    });

    observer.observe(viewer);

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function renderPage() {
      if (!documentProxy || !canvasRef.current || !pdfModuleRef.current) return;

      renderTaskRef.current?.cancel();
      renderTaskRef.current = null;

      const page = await documentProxy.getPage(currentPage);
      const unscaledViewport = page.getViewport({ scale: 1 });
      const scale = targetPageWidth / unscaledViewport.width;
      const baseViewport = page.getViewport({ scale });
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");
      if (!context) return;

      const outputScale = window.devicePixelRatio || 1;
      const viewport = baseViewport;

      canvas.width = Math.floor(viewport.width * outputScale);
      canvas.height = Math.floor(viewport.height * outputScale);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;

      context.setTransform(1, 0, 0, 1, 0, 0);
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);

      const renderTask = page.render({
        canvas,
        canvasContext: context,
        viewport,
        transform:
          outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : undefined,
      });
      renderTaskRef.current = renderTask;

      await renderTask.promise;
      if (cancelled) return;

      if (renderTaskRef.current === renderTask) {
        renderTaskRef.current = null;
      }
    }

    renderPage().catch((error) => {
      if (
        error &&
        typeof error === "object" &&
        "name" in error &&
        error.name === "RenderingCancelledException"
      ) {
        return;
      }
      console.error(error);
      if (!cancelled) {
        setLoadingLabel("Unable to render this page.");
      }
    });

    return () => {
      cancelled = true;
      renderTaskRef.current?.cancel();
      renderTaskRef.current = null;
    };
  }, [currentPage, documentProxy, targetPageWidth]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div
        ref={viewerRef}
        className="min-h-0 flex-1 overflow-auto rounded-[24px] bg-zinc-100/80 p-2 sm:p-3"
      >
        <div className="flex justify-center">
          <div
            className="overflow-hidden rounded-[18px] bg-white shadow-sm"
            style={{ width: `${targetPageWidth}px` }}
          >
            <canvas ref={canvasRef} className="block h-auto w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
