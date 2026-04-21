"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  IconArrowLeft,
  IconArrowRight,
  IconArrowsMinimize,
  IconChevronRight,
  IconLoader2,
  IconSparkles,
  IconUpload,
  IconX,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import {
  EpubReader,
  type EpubReaderLocation,
  type EpubReaderNavigationRequest,
} from "@/components/epub-reader";
import {
  PdfReader,
  PDF_MAX_ZOOM,
  PDF_MIN_ZOOM,
  PDF_ZOOM_STEP,
} from "@/components/pdf-reader";
import {
  getStoredBook,
  toBookRecord,
  updateStoredProgress,
} from "@/lib/book-storage";
import { sampleBookText } from "@/lib/mock-data";
import {
  buildReadingUnitLabel,
  estimateProgress,
  getFormatLabel,
} from "@/lib/reader-utils";
import {
  buildBufferedUnits,
  buildReadingUnitDedupeKey,
  DEFAULT_BUFFER_SIZE,
  shouldRefillBuffer,
} from "@/lib/reader-buffer-utils";
import {
  getGeneratedImagesForBook,
  getReadingUnitResult,
  getSessionState,
  persistBufferResponse,
} from "@/lib/reader-session-storage";
import { createEmptyMemoryState } from "@/lib/memory-agent";
import {
  BookRecord,
  GeneratedImageRecord,
  MemoryState,
  ReaderSessionStateRecord,
  ReadingBufferRequest,
  ReadingBufferResponse,
  ReadingUnitResultRecord,
  RecentImageHistoryItem,
} from "@/lib/types";

type UploadDraft = {
  title: string;
  format: "pdf" | "epub";
  size: string;
  firstUnit: string;
};

const DEMO_USER_ID = "demo-user";

type StatusView = {
  memory: "idle" | "queued" | "running" | "ready";
  image: "idle" | "queued" | "running" | "ready";
  lastSummary: string;
  latestPrompt: string;
  latestImageLabel: string;
  updatedAt: string;
  memoryDetail: string;
  imageDetail: string;
  imageDataUrl?: string;
  imageMimeType?: string;
};

function buildDefaultStatus(): StatusView {
  return {
    memory: "idle",
    image: "idle",
    lastSummary: "No locally processed reading-unit result yet.",
    latestPrompt: "No illustration prompt generated yet.",
    latestImageLabel: "No scene image yet",
    updatedAt: "Waiting",
    memoryDetail: "Open a reading unit to start buffered processing.",
    imageDetail:
      "Illustrations are generated only when requested by the memory agent.",
  };
}

function buildStatusFromResult(
  result: ReadingUnitResultRecord | null,
  fallbackMemoryState?: MemoryState,
  fallbackImageHistory?: RecentImageHistoryItem[],
): StatusView {
  if (!result) {
    const fallbackSummary = fallbackMemoryState?.summary?.trim();
    return {
      ...buildDefaultStatus(),
      lastSummary:
        fallbackSummary || "No locally processed reading-unit result yet.",
      latestPrompt:
        fallbackImageHistory?.[fallbackImageHistory.length - 1]?.prompt ||
        "No illustration prompt generated yet.",
      latestImageLabel:
        fallbackImageHistory?.[fallbackImageHistory.length - 1]?.label ||
        "No scene image yet",
      updatedAt: fallbackMemoryState?.updatedAt || "Waiting",
    };
  }

  return {
    memory: "ready",
    image:
      result.imageCreated || result.imageRequested || result.imageSkippedReason
        ? "ready"
        : "idle",
    lastSummary: result.createdMemory
      ? result.memoryAppendText || "Memory updated for this reading unit."
      : result.skippedMemoryReason ||
        "No memory append was created for this reading unit.",
    latestPrompt:
      result.imagePrompt ||
      "No illustration prompt generated for this reading unit.",
    latestImageLabel: result.imageCreated
      ? result.imageLabel || `Scene for ${result.readingUnitId}`
      : result.imageSkippedReason || "No scene image yet",
    updatedAt: result.processedAt,
    memoryDetail:
      result.memoryStateAfterUnit.summary ||
      "No running memory summary stored yet.",
    imageDetail: result.imageCreated
      ? `Generated ${result.generatedImageCount ?? 1} image payload${(result.generatedImageCount ?? 1) === 1 ? "" : "s"}.`
      : result.imageSkippedReason ||
        "No illustration was generated for this reading unit.",
    imageDataUrl: result.imageDataUrl,
    imageMimeType: result.imageMimeType,
  };
}

async function fetchBufferedReadingResult(
  input: ReadingBufferRequest,
  signal?: AbortSignal,
) {
  const response = await fetch("/api/reading-buffer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    signal,
  });

  const data = (await response.json()) as ReadingBufferResponse;

  if (!response.ok || !data.ok) {
    throw new Error(data.error || "Buffered reading request failed.");
  }

  return data;
}

export function ReaderClient({
  book,
  source,
}: {
  book: BookRecord;
  source?: string;
}) {
  const [activeBook, setActiveBook] = useState(book);
  const [unitIndex, setUnitIndex] = useState(0);
  const [totalUnits, setTotalUnits] = useState(0);
  const [unitTexts, setUnitTexts] = useState<string[]>([]);
  const [fileData, setFileData] = useState<ArrayBuffer | null>(null);
  const [status, setStatus] = useState<StatusView>(() => buildDefaultStatus());
  const [isBufferLoading, setIsBufferLoading] = useState(false);
  const [uploadedDraft, setUploadedDraft] = useState<UploadDraft | null>(null);
  const [epubLocation, setEpubLocation] = useState<Partial<EpubReaderLocation>>(
    {},
  );
  const [epubNavigationRequest, setEpubNavigationRequest] =
    useState<EpubReaderNavigationRequest | null>(null);
  const [storageStatus, setStorageStatus] = useState<string>(
    book.id.startsWith("local-") ? "Loading local file..." : "",
  );
  const [sessionState, setSessionState] =
    useState<ReaderSessionStateRecord | null>(null);
  const [visibleResult, setVisibleResult] =
    useState<ReadingUnitResultRecord | null>(null);
  const [generatedImages, setGeneratedImages] = useState<
    GeneratedImageRecord[]
  >([]);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [isFloatingControlsCollapsed, setIsFloatingControlsCollapsed] =
    useState(false);
  const [pdfZoomPercent, setPdfZoomPercent] = useState(100);
  const [pdfStatusLabel, setPdfStatusLabel] = useState("");
  const [isAiEnabled, setIsAiEnabled] = useState(true);
  const inFlightBufferRef = useRef<Set<string>>(new Set());
  const bufferAbortControllerRef = useRef<AbortController | null>(null);

  const units = useMemo(() => {
    if (
      unitTexts.some((entry) => typeof entry === "string" && entry.length > 0)
    ) {
      return unitTexts;
    }
    return sampleBookText[activeBook.id] ?? sampleBookText["book-dune"];
  }, [activeBook.id, unitTexts]);

  const effectiveTotalUnits = Math.max(totalUnits, units.length);
  const progress = estimateProgress(unitIndex, effectiveTotalUnits);
  const readingUnitLabel =
    activeBook.format === "epub" && epubLocation.spineIndex !== undefined
      ? buildReadingUnitLabel(activeBook.format, epubLocation.spineIndex)
      : buildReadingUnitLabel(activeBook.format, unitIndex);

  useEffect(() => {
    if (source !== "upload") return;

    const raw = sessionStorage.getItem("florence-upload-draft");
    if (!raw) return;

    try {
      setUploadedDraft(JSON.parse(raw) as UploadDraft);
    } catch {
      setUploadedDraft(null);
    }
  }, [source]);

  useEffect(() => {
    setUnitTexts([]);
    setTotalUnits(0);
    setEpubLocation({});
    setEpubNavigationRequest(null);
    setSessionState(null);
    setVisibleResult(null);
    setGeneratedImages([]);
    setStatus(buildDefaultStatus());
    setPdfZoomPercent(100);
    setPdfStatusLabel("");
    inFlightBufferRef.current = new Set();

    if (!activeBook.id.startsWith("local-")) return;
    let cancelled = false;

    getStoredBook(activeBook.id)
      .then((stored) => {
        if (!stored || cancelled) return;
        setActiveBook(toBookRecord(stored));
        setFileData(stored.fileData);
        setUnitIndex(
          stored.format === "pdf"
            ? (stored.pdfPageIndex ?? 0)
            : (stored.epubSpineIndex ?? 0),
        );
        setEpubLocation({
          cfi: stored.epubLocationCfi,
          spineIndex: stored.epubSpineIndex,
        });
        setStorageStatus("");
      })
      .catch(() => {
        if (!cancelled) {
          setStorageStatus("Unable to load local file from browser storage.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeBook.id]);

  useEffect(() => {
    if (!activeBook.id.startsWith("local-")) return;
    updateStoredProgress(activeBook.id, {
      progressPercent: progress,
      currentUnitLabel: readingUnitLabel,
      epubLocationCfi:
        activeBook.format === "epub" ? epubLocation.cfi : undefined,
      epubSpineIndex: activeBook.format === "epub" ? unitIndex : undefined,
      pdfPageIndex: activeBook.format === "pdf" ? unitIndex : undefined,
    }).catch(() => undefined);
  }, [
    activeBook.format,
    activeBook.id,
    epubLocation.cfi,
    progress,
    readingUnitLabel,
    unitIndex,
  ]);

  useEffect(() => {
    let cancelled = false;

    getSessionState(DEMO_USER_ID, activeBook.id)
      .then((stored) => {
        if (cancelled) return;
        setSessionState(stored);
      })
      .catch(() => {
        if (!cancelled) {
          setSessionState(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeBook.id]);

  useEffect(() => {
    let cancelled = false;

    getReadingUnitResult(DEMO_USER_ID, activeBook.id, readingUnitLabel)
      .then((result) => {
        if (cancelled) return;
        setVisibleResult(result);
      })
      .catch(() => {
        if (!cancelled) {
          setVisibleResult(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeBook.id, readingUnitLabel, sessionState?.updatedAt]);

  useEffect(() => {
    let cancelled = false;

    getGeneratedImagesForBook(DEMO_USER_ID, activeBook.id)
      .then((images) => {
        if (cancelled) return;
        setGeneratedImages(images);
      })
      .catch(() => {
        if (!cancelled) {
          setGeneratedImages([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeBook.id, sessionState?.updatedAt]);

  useEffect(() => {
    setStatus(
      buildStatusFromResult(
        visibleResult,
        sessionState?.finalMemoryState,
        sessionState?.recentImageHistory,
      ),
    );
  }, [
    sessionState?.finalMemoryState,
    sessionState?.recentImageHistory,
    visibleResult,
  ]);

  useEffect(() => {
    if (!isGalleryOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsGalleryOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isGalleryOpen]);

  useEffect(() => {
    if (isAiEnabled) return;

    bufferAbortControllerRef.current?.abort();
    bufferAbortControllerRef.current = null;
    setIsBufferLoading(false);
  }, [isAiEnabled]);

  const runBufferedProcessing = useCallback(
    async (startIndex: number) => {
      if (!isAiEnabled || !units.length) return;
      const bufferKey = `${activeBook.id}:${startIndex}`;
      if (inFlightBufferRef.current.has(bufferKey)) return;

      const bufferedUnits = buildBufferedUnits(
        units,
        startIndex,
        DEFAULT_BUFFER_SIZE,
        activeBook.format,
      );
      if (!bufferedUnits.length) return;

      inFlightBufferRef.current.add(bufferKey);
      setIsBufferLoading(true);

      let abortController: AbortController | null = null;

      try {
        const progressByReadingUnitId: Record<string, number> = {};
        const dedupeKeysByReadingUnitId: Record<string, string> = {};
        const unitsToProcess: typeof bufferedUnits = [];

        for (const unit of bufferedUnits) {
          progressByReadingUnitId[unit.readingUnitId] = unit.progressPercent;
          const dedupeKey = await buildReadingUnitDedupeKey({
            bookId: activeBook.id,
            readingUnitId: unit.readingUnitId,
            currentText: unit.currentText,
          });
          dedupeKeysByReadingUnitId[unit.readingUnitId] = dedupeKey;

          const existingResult = await getReadingUnitResult(
            DEMO_USER_ID,
            activeBook.id,
            unit.readingUnitId,
          );
          if (existingResult) {
            continue;
          }

          unitsToProcess.push(unit);
        }

        if (!unitsToProcess.length || !isAiEnabled) {
          return;
        }

        setStatus((current) => ({
          ...current,
          memory: "queued",
          image: "idle",
          updatedAt: "Queued now",
        }));

        const requestBody: ReadingBufferRequest = {
          userId: DEMO_USER_ID,
          bookId: activeBook.id,
          format: activeBook.format,
          visibleReadingUnitId: readingUnitLabel,
          units: unitsToProcess,
          priorMemoryState:
            sessionState?.finalMemoryState ?? createEmptyMemoryState(),
          recentImageHistory: sessionState?.recentImageHistory ?? [],
        };

        abortController = new AbortController();
        bufferAbortControllerRef.current = abortController;

        const response = await fetchBufferedReadingResult(
          requestBody,
          abortController.signal,
        );

        await persistBufferResponse({
          userId: DEMO_USER_ID,
          bookId: activeBook.id,
          response,
          progressByReadingUnitId,
          dedupeKeysByReadingUnitId,
          bufferStartUnitIndex: startIndex,
          bufferEndUnitIndex: startIndex + unitsToProcess.length - 1,
        });

        const refreshedSession = await getSessionState(
          DEMO_USER_ID,
          activeBook.id,
        );
        const refreshedResult = await getReadingUnitResult(
          DEMO_USER_ID,
          activeBook.id,
          readingUnitLabel,
        );
        setSessionState(refreshedSession);
        setVisibleResult(refreshedResult);
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }

        setStatus((current) => ({
          ...current,
          memory: "ready",
          image: "ready",
          lastSummary:
            error instanceof Error
              ? error.message
              : "Buffered reading request failed.",
          latestPrompt: "Buffer processing failed.",
          latestImageLabel: "No scene image yet",
          updatedAt: "Local fallback",
          memoryDetail:
            "The browser kept local state, but the batch request failed.",
          imageDetail:
            "No image was generated because buffer processing failed.",
        }));
      } finally {
        if (bufferAbortControllerRef.current === abortController) {
          bufferAbortControllerRef.current = null;
        }
        inFlightBufferRef.current.delete(bufferKey);
        setIsBufferLoading(false);
      }
    },
    [
      activeBook.format,
      activeBook.id,
      isAiEnabled,
      readingUnitLabel,
      sessionState?.finalMemoryState,
      sessionState?.recentImageHistory,
      units,
    ],
  );

  useEffect(() => {
    if (!isAiEnabled || !units.length) return;
    const currentText = units[unitIndex] ?? "";
    if (!currentText.trim()) return;

    let cancelled = false;

    async function ensureVisibleAndBuffered() {
      const localVisibleResult = await getReadingUnitResult(
        DEMO_USER_ID,
        activeBook.id,
        readingUnitLabel,
      );
      if (cancelled) return;
      if (!localVisibleResult) {
        await runBufferedProcessing(unitIndex);
        return;
      }

      const bufferEndIndex = sessionState?.bufferEndUnitIndex ?? -1;
      if (shouldRefillBuffer(unitIndex, bufferEndIndex)) {
        await runBufferedProcessing(
          bufferEndIndex >= unitIndex ? bufferEndIndex + 1 : unitIndex,
        );
      }
    }

    void ensureVisibleAndBuffered();

    return () => {
      cancelled = true;
    };
  }, [
    activeBook.id,
    isAiEnabled,
    readingUnitLabel,
    runBufferedProcessing,
    sessionState?.bufferEndUnitIndex,
    unitIndex,
    units,
  ]);

  const handleEpubTextReady = useCallback(
    (updater: (current: string[]) => string[]) => {
      setUnitTexts((current) => updater(current));
    },
    [],
  );

  const handleEpubLocationChange = useCallback(
    ({ index, cfi, spineIndex }: EpubReaderLocation) => {
      setUnitIndex(index);
      setEpubLocation({ cfi, spineIndex });
    },
    [],
  );

  const canMovePrev = unitIndex > 0;
  const canMoveNext = unitIndex < Math.max(effectiveTotalUnits - 1, 0);
  const hasCurrentImage = Boolean(status.imageDataUrl);

  return (
    <>
      <div className="mx-auto h-[calc(100dvh-var(--site-header-height,73px))] max-h-[calc(100dvh-var(--site-header-height,73px))] min-h-0 w-full max-w-[2200px] overflow-hidden px-2 py-2 sm:px-6 sm:py-4 lg:px-8">
        <div className="flex h-full min-h-0 overflow-hidden rounded-[20px] bg-[linear-gradient(180deg,#ffffff_0%,#fafaf9_100%)] shadow-[0_20px_80px_rgba(0,0,0,0.06)] sm:rounded-[28px]">
          <div className="flex h-full min-h-0 flex-1 flex-col">
            <div className="shrink-0 border-b border-black/10 px-3 py-2 sm:px-8 sm:py-4">
              <div className="flex flex-col gap-2 sm:gap-4">
                <div className="min-w-0 space-y-1">
                  {/* <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
                    {activeBook.format.toUpperCase()}
                  </p> */}
                  <h2 className="truncate text-md font-semibold tracking-tight text-zinc-900 sm:text-3xl">
                    {activeBook.title}
                  </h2>
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                    <p className="truncate text-xs text-muted-foreground sm:text-sm">
                      {activeBook.author ?? "Unknown author"} · {readingUnitLabel}
                    </p>
                    <div className="rounded-full bg-white px-3 py-1.5 text-[11px] font-medium text-zinc-700 shadow-sm">
                      {progress}%
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsAiEnabled((value) => !value)}
                      aria-pressed={isAiEnabled}
                      aria-label={
                        isAiEnabled
                          ? "Disable AI processing"
                          : "Enable AI processing"
                      }
                      className={`h-auto rounded-full border px-3 py-1.5 text-[11px] font-medium shadow-none ${
                        isAiEnabled
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                          : "border-zinc-200 bg-zinc-100 text-zinc-500 hover:bg-zinc-200"
                      }`}
                    >
                      AI {isAiEnabled ? "On" : "Off"}
                    </Button>
                    {activeBook.format === "pdf" && pdfStatusLabel ? (
                      <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-[11px] font-medium text-sky-700">
                        <IconLoader2
                          className={`size-4 ${
                            pdfStatusLabel.includes("Unable")
                              ? ""
                              : "animate-spin"
                          }`}
                        />
                        {pdfStatusLabel}
                      </div>
                    ) : null}
                    {isBufferLoading ? (
                      <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] font-medium text-amber-700">
                        <IconLoader2 className="size-4 animate-spin" />
                        Updating
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>

              {uploadedDraft ? (
                <div className="mt-3 hidden flex-wrap items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 sm:flex">
                  <IconUpload className="size-4" />
                  <span>
                    Loaded local draft: <strong>{uploadedDraft.title}</strong> (
                    {uploadedDraft.format.toUpperCase()})
                  </span>
                  <span className="text-emerald-700">{uploadedDraft.size}</span>
                </div>
              ) : null}
            </div>

            <div className="grid min-h-0 flex-1 grid-cols-1 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.8fr)]">
              <section className="min-h-0 bg-white xl:border-r xl:border-black/10">
                <div className="flex h-full min-h-0 flex-col">
                  <div className="min-h-0 flex-1 px-2 py-1 sm:px-5 sm:py-3 lg:px-6 lg:py-4">
                    <div className="relative flex h-full min-h-0 flex-col gap-2 sm:gap-4">
                      {storageStatus ? (
                        <div className="rounded-xl bg-zinc-50 px-3 py-2 text-xs text-muted-foreground sm:rounded-2xl sm:p-4 sm:text-sm">
                          {storageStatus}
                        </div>
                      ) : null}

                      <div className="min-h-0 flex-1 overflow-hidden rounded-[18px] bg-[#fcfcfb] shadow-inner sm:rounded-[28px]">
                        <div className="h-full min-h-0 overflow-hidden p-1.5 sm:p-4">
                          {fileData ? (
                            activeBook.format === "pdf" ? (
                              <PdfReader
                                fileData={fileData}
                                unitIndex={unitIndex}
                                onPageCount={setTotalUnits}
                                onTextReady={setUnitTexts}
                                zoomPercent={pdfZoomPercent}
                                onStatusChange={setPdfStatusLabel}
                              />
                            ) : (
                              <EpubReader
                                fileData={fileData}
                                unitIndex={unitIndex}
                                initialCfi={epubLocation.cfi}
                                navigationRequest={epubNavigationRequest}
                                onUnitCount={setTotalUnits}
                                onTextReady={handleEpubTextReady}
                                onLocationChange={handleEpubLocationChange}
                              />
                            )
                          ) : (
                            <article className="mx-auto max-w-3xl space-y-3 rounded-[18px] bg-white p-4 text-base leading-7 text-zinc-800 shadow-sm sm:rounded-[20px] sm:p-6 sm:text-lg sm:leading-9">
                              <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                                Preview
                              </p>
                              <p>{units[unitIndex]}</p>
                              <p className="text-sm leading-6 text-zinc-600 sm:text-base sm:leading-8">
                                Local reader preview.
                              </p>
                            </article>
                          )}
                        </div>
                      </div>

                      <div className="pointer-events-none absolute inset-x-0 bottom-3 z-10 px-2 sm:px-6">
                        <div
                          className={`pointer-events-auto absolute bottom-0 flex items-center gap-2 rounded-full border border-white/70 bg-white/65 text-xs shadow-[0_12px_40px_rgba(0,0,0,0.16)] backdrop-blur-xl will-change-transform transition-[left,transform,padding,width,max-width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] supports-[backdrop-filter]:bg-white/45 [&>*]:shrink-0 sm:text-sm ${
                            isFloatingControlsCollapsed
                              ? "left-0 w-max translate-x-0 px-1.5 py-1.5 sm:px-2 sm:py-2"
                              : "left-1/2 w-[calc(100vw-1.5rem)] max-w-[calc(100vw-1.5rem)] -translate-x-1/2 justify-start overflow-x-auto px-2 py-2 sm:w-max sm:max-w-none sm:justify-center sm:overflow-visible sm:px-4 sm:py-3"
                          }`}
                        >
                          <Button
                            type="button"
                            variant="outline"
                            className="h-8 rounded-full border-white/80 bg-white/70 px-2 sm:h-10 sm:px-3"
                            onClick={() =>
                              setIsFloatingControlsCollapsed((value) => !value)
                            }
                            aria-label={
                              isFloatingControlsCollapsed
                                ? "Expand floating controls"
                                : "Collapse floating controls"
                            }
                          >
                            {isFloatingControlsCollapsed ? (
                              <>
                                <IconChevronRight className="size-4" />
                                {/* <span className="sr-only">Expand controls</span> */}
                              </>
                            ) : (
                              <IconArrowsMinimize className="size-4" />
                            )}
                          </Button>

                          {isFloatingControlsCollapsed ? (
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="icon"
                                className="size-8 rounded-full border-white/80 bg-white/70 sm:size-10"
                                disabled={!canMovePrev}
                                onClick={() => {
                                  if (activeBook.format === "epub") {
                                    setEpubNavigationRequest({
                                      direction: "prev",
                                      nonce: Date.now(),
                                    });
                                    return;
                                  }

                                  setUnitIndex((value) =>
                                    Math.max(0, value - 1),
                                  );
                                }}
                                aria-label="Previous"
                              >
                                <IconArrowLeft className="size-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="icon"
                                className="size-8 rounded-full border-white/80 bg-white/70 sm:size-10"
                                disabled={!canMoveNext}
                                onClick={() => {
                                  if (activeBook.format === "epub") {
                                    setEpubNavigationRequest({
                                      direction: "next",
                                      nonce: Date.now(),
                                    });
                                    return;
                                  }

                                  setUnitIndex((value) =>
                                    Math.min(
                                      effectiveTotalUnits - 1,
                                      value + 1,
                                    ),
                                  );
                                }}
                                aria-label="Next"
                              >
                                <IconArrowRight className="size-4" />
                              </Button>
                            </div>
                          ) : (
                            <>
                              <div className="rounded-full bg-zinc-900/5 px-3 py-1.5 text-center sm:px-4 sm:py-2">
                                <p className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground sm:text-[10px] sm:tracking-[0.22em]">
                                  Reading
                                </p>
                                <p className="mt-0.5 font-medium text-zinc-900 sm:mt-1">
                                  {readingUnitLabel}
                                </p>
                              </div>
                              <div className="rounded-full bg-zinc-900/5 px-3 py-1.5 text-center sm:px-4 sm:py-2">
                                <p className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground sm:text-[10px] sm:tracking-[0.22em]">
                                  Total
                                </p>
                                <p className="mt-0.5 font-medium text-zinc-900 sm:mt-1">
                                  {effectiveTotalUnits}
                                </p>
                              </div>
                              {/* <div className="rounded-full bg-zinc-900/5 px-4 py-2 text-center">
                                <p className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground sm:text-[10px] sm:tracking-[0.22em]">
                                  Buffer size
                                </p>
                                <p className="mt-0.5 font-medium text-zinc-900 sm:mt-1">
                                  {DEFAULT_BUFFER_SIZE}
                                </p>
                              </div> */}
                              {activeBook.format === "pdf" ? (
                                <>
                                  <div className="mx-1 hidden h-10 w-px bg-black/10 lg:block" />
                                  <div className="flex items-center gap-2">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      className="h-8 rounded-full border-white/80 bg-white/70 px-2 text-xs sm:h-10 sm:px-4 sm:text-sm"
                                      onClick={() =>
                                        setPdfZoomPercent((value) =>
                                          Math.max(
                                            PDF_MIN_ZOOM,
                                            value - PDF_ZOOM_STEP,
                                          ),
                                        )
                                      }
                                    >
                                      -
                                    </Button>
                                    <label className="flex items-center gap-2 rounded-full bg-zinc-900/5 px-3 py-2">
                                      <span className="min-w-[54px] text-center font-medium text-zinc-900">
                                        {pdfZoomPercent}%
                                      </span>
                                      <input
                                        type="range"
                                        min={PDF_MIN_ZOOM}
                                        max={PDF_MAX_ZOOM}
                                        step={PDF_ZOOM_STEP}
                                        value={pdfZoomPercent}
                                        onChange={(event) =>
                                          setPdfZoomPercent(
                                            Number(event.target.value),
                                          )
                                        }
                                        className="h-2 w-24 accent-zinc-900 sm:w-28"
                                        aria-label="Adjust PDF zoom"
                                      />
                                    </label>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      className="h-8 rounded-full border-white/80 bg-white/70 px-2 text-xs sm:h-10 sm:px-4 sm:text-sm"
                                      onClick={() =>
                                        setPdfZoomPercent((value) =>
                                          Math.min(
                                            PDF_MAX_ZOOM,
                                            value + PDF_ZOOM_STEP,
                                          ),
                                        )
                                      }
                                    >
                                      +
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      className="h-8 rounded-full border-white/80 bg-white/70 px-2 text-xs sm:h-10 sm:px-4 sm:text-sm"
                                      onClick={() => setPdfZoomPercent(100)}
                                    >
                                      Fit width
                                    </Button>
                                  </div>
                                </>
                              ) : null}
                              <div className="mx-1 hidden h-10 w-px bg-black/10 lg:block" />
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  className="h-8 rounded-full border-white/80 bg-white/70 px-2 text-xs sm:h-10 sm:px-4 sm:text-sm"
                                  disabled={!canMovePrev}
                                  onClick={() => {
                                    if (activeBook.format === "epub") {
                                      setEpubNavigationRequest({
                                        direction: "prev",
                                        nonce: Date.now(),
                                      });
                                      return;
                                    }

                                    setUnitIndex((value) =>
                                      Math.max(0, value - 1),
                                    );
                                  }}
                                >
                                  <IconArrowLeft className="size-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  className="h-8 rounded-full border-white/80 bg-white/70 px-2 text-xs sm:h-10 sm:px-4 sm:text-sm"
                                  disabled={!canMoveNext}
                                  onClick={() => {
                                    if (activeBook.format === "epub") {
                                      setEpubNavigationRequest({
                                        direction: "next",
                                        nonce: Date.now(),
                                      });
                                      return;
                                    }

                                    setUnitIndex((value) =>
                                      Math.min(
                                        effectiveTotalUnits - 1,
                                        value + 1,
                                      ),
                                    );
                                  }}
                                >
                                  <IconArrowRight className="size-4" />
                                </Button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <section className="hidden min-h-0 bg-zinc-50/60 xl:block">
                <div className="flex h-full min-h-0 flex-col">
                  <div className="shrink-0 border-b border-black/10 px-6 py-4 sm:px-8">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
                          Generated image
                        </p>
                        {/* <h3 className="mt-1 text-xl font-semibold text-zinc-900">
                          {status.latestImageLabel}
                        </h3> */}
                        {/* <p className="mt-1 text-sm text-zinc-600">
                          Illustration panel for the current reading context.
                        </p> */}
                        {generatedImages.length} stored
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          className="rounded-full"
                          onClick={() => setIsGalleryOpen(true)}
                        >
                          Open gallery
                        </Button>
                        <IconSparkles className="mt-1 size-5 text-amber-500" />
                      </div>
                    </div>
                  </div>

                  <div className="flex min-h-0 flex-1 flex-col gap-4 p-4 sm:p-5 lg:p-6">
                    {hasCurrentImage ? (
                      <div className="overflow-hidden rounded-[24px]   bg-[linear-gradient(180deg,rgba(251,191,36,0.10),rgba(16,185,129,0.10)),#ffffff] p-3 shadow-sm sm:p-4 xl:flex-none">
                        <img
                          src={status.imageDataUrl}
                          alt={status.latestImageLabel}
                          className="mx-auto block aspect-[4/5] max-h-[48vh] w-full rounded-[18px]   bg-white object-contain xl:max-h-[40vh]"
                        />
                      </div>
                    ) : null}
                  </div>
                </div>
              </section>
            </div>
          </div>

          {isGalleryOpen ? (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm sm:p-8"
              onClick={() => setIsGalleryOpen(false)}
            >
              <div
                className="flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-[28px] border border-white/20 bg-white shadow-[0_30px_120px_rgba(0,0,0,0.28)]"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="flex items-start justify-between gap-4 border-b border-black/10 px-6 py-5 sm:px-8">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
                      Gallery
                    </p>
                    <h3 className="mt-1 text-2xl font-semibold text-zinc-900">
                      Generated images for {activeBook.title}
                    </h3>
                    <p className="mt-2 text-sm text-zinc-600">
                      {generatedImages.length} stored image
                      {generatedImages.length === 1 ? "" : "s"}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    className="rounded-full"
                    onClick={() => setIsGalleryOpen(false)}
                  >
                    <IconX className="size-4" />
                  </Button>
                </div>

                <div className="overflow-y-auto p-6 sm:p-8">
                  {generatedImages.length ? (
                    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                      {generatedImages.map((image) => (
                        <div
                          key={image.key}
                          className="overflow-hidden rounded-[24px]   bg-zinc-50 shadow-sm"
                        >
                          <img
                            src={image.imageDataUrl}
                            alt={`Generated scene for ${image.readingUnitId}`}
                            className="block aspect-[4/5] w-full bg-white object-contain"
                          />
                          <div className="border-t border-black/10 bg-white p-4 text-sm">
                            <div className="flex items-center justify-between gap-3">
                              <strong className="truncate text-zinc-900">
                                {image.readingUnitId}
                              </strong>
                              <span className="shrink-0 text-[11px] text-muted-foreground">
                                {new Date(image.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="mt-2 text-xs text-zinc-600">
                              {image.imageMimeType}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-[24px] border border-dashed border-black/15 bg-zinc-50 p-8 text-sm text-muted-foreground">
                      No generated images for this book have been stored yet.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : null}

          {isGalleryOpen ? (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm sm:p-8"
              onClick={() => setIsGalleryOpen(false)}
            >
              <div
                className="flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-[28px] border border-white/20 bg-white shadow-[0_30px_120px_rgba(0,0,0,0.28)]"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="flex items-start justify-between gap-4 border-b border-black/10 px-6 py-5 sm:px-8">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
                      Gallery
                    </p>
                    <h3 className="mt-1 text-2xl font-semibold text-zinc-900">
                      Generated images for {activeBook.title}
                    </h3>
                    <p className="mt-2 text-sm text-zinc-600">
                      {generatedImages.length} stored image
                      {generatedImages.length === 1 ? "" : "s"}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    className="rounded-full"
                    onClick={() => setIsGalleryOpen(false)}
                  >
                    <IconX className="size-4" />
                  </Button>
                </div>

                <div className="overflow-y-auto p-6 sm:p-8">
                  {generatedImages.length ? (
                    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                      {generatedImages.map((image) => (
                        <div
                          key={image.key}
                          className="overflow-hidden rounded-[24px]   bg-zinc-50 shadow-sm"
                        >
                          <img
                            src={image.imageDataUrl}
                            alt={`Generated scene for ${image.readingUnitId}`}
                            className="block aspect-[4/5] w-full bg-white object-contain"
                          />
                          <div className="border-t border-black/10 bg-white p-4 text-sm">
                            <div className="flex items-center justify-between gap-3">
                              <strong className="truncate text-zinc-900">
                                {image.readingUnitId}
                              </strong>
                              <span className="shrink-0 text-[11px] text-muted-foreground">
                                {new Date(image.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="mt-2 text-xs text-zinc-600">
                              {image.imageMimeType}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-[24px] border border-dashed border-black/15 bg-zinc-50 p-8 text-sm text-muted-foreground">
                      No generated images for this book have been stored yet.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}
