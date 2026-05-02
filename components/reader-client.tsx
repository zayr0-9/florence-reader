"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  IconArrowRight,
  IconLoader2,
  IconSparkles,
  IconUpload,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { ChevronLeft, ChevronDown, PanelLeftClose, Menu, X } from "lucide-react";
import { AnnotationNote, IllustrationPlaceholder } from "@/components/florence/ui-primitives";
import { AIToggle } from "@/components/florence/ai-toggle";
import { bookRecordToManuscript, getReaderScale } from "@/lib/manuscripts";
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

  const router = useRouter();
  const manuscript = bookRecordToManuscript(activeBook);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const readerScale = getReaderScale("medium");

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="flex h-[calc(100dvh-var(--site-header-height,73px))] max-h-[calc(100dvh-var(--site-header-height,73px))] overflow-hidden selection:bg-gold/40 text-ink w-full bg-page">
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.aside 
            initial={{ x: -20, opacity: 0 }} 
            animate={{ x: 0, opacity: 1 }} 
            exit={{ x: -20, opacity: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }} 
            className="w-[260px] border-r border-ink/10 flex flex-col shrink-0 h-full overflow-hidden bg-page hidden md:flex"
          >
            <div className="w-[260px] flex flex-col h-full">
              {/* Back to Library */}
              <div className="px-6 py-6 border-b border-ink/10 shrink-0">
                <button 
                  onClick={() => router.push('/library')} 
                  className="flex items-center text-ink/80 hover:text-ink transition-colors text-[10px] tracking-[2px] uppercase"
                >
                  <ChevronLeft className="w-3.5 h-3.5 mr-2" />
                  Library
                </button>
              </div>

              <div className="px-6 pt-8 pb-8 flex flex-col flex-1 overflow-y-auto">
                {/* Logo/Book */}
                <div className="mb-8">
                  <div className="text-[72px] italic text-border-main leading-none mb-4 select-none pointer-events-none">
                    {manuscript.letter}
                  </div>
                  <h1 className="italic text-[16px] text-ink mb-1 truncate">{manuscript.title}</h1>
                  <p className="text-[9px] text-muted tracking-[1.5px] uppercase truncate">{manuscript.author}</p>
                </div>

                <div className="flex flex-col space-y-4 text-[10px] tracking-[1.5px] uppercase text-ink-light mt-4">
                  <p>Format: {activeBook.format}</p>
                  <p>Progress: {progress}%</p>
                  {isBufferLoading ? <p className="text-amber-600 flex items-center"><IconLoader2 className="w-3 h-3 mr-1 animate-spin" /> Updating</p> : null}
                  {pdfStatusLabel && activeBook.format === 'pdf' ? <p className="text-sky-600 flex items-center">{pdfStatusLabel}</p> : null}
                </div>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      <motion.main initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.28 }} className="flex-1 flex flex-col h-full overflow-hidden bg-page relative">
        <header className="flex items-center justify-between px-6 md:px-10 py-4 md:py-6 border-b border-ink/5 shrink-0 bg-page z-30">
          <div className="flex items-center">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="mr-5 text-ink-light hover:text-ink transition-colors shrink-0 hidden md:block"
              title={isSidebarOpen ? "Close Sidebar" : "Open Sidebar"}
            >
              {isSidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
            <button 
              onClick={() => router.push('/library')} 
              className="mr-3 text-ink-light hover:text-ink transition-colors shrink-0 md:hidden"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h2 className="text-[10px] tracking-[2px] uppercase text-ink-light truncate max-w-[150px] md:max-w-[300px]">
              {mounted ? readingUnitLabel : "Loading..."}
            </h2>
          </div>
          <div className="flex items-center gap-4 md:gap-6">
            <AIToggle enabled={isAiEnabled} onToggle={() => setIsAiEnabled(prev => !prev)} compact={false} />
            <span className="hidden md:block text-[10px] tracking-[2px] text-ink-light/50">
              {progress}%
            </span>
            <button 
              onClick={() => router.push('/library')} 
              className="hidden md:flex w-8 h-8 items-center justify-center border border-ink/15 text-ink-light hover:text-ink hover:border-ink/30 rounded-sm transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </header>

        <div 
          className="flex-1 overflow-y-auto px-4 md:px-12 lg:px-20 py-8 md:py-16 flex justify-center w-full"
          style={{ '--drop-cap-color': manuscript.colorBgText } as React.CSSProperties}
        >
          <div className="flex-1 max-w-[640px] w-full text-ink flex flex-col min-h-0">
            {/* Ink dots — chapter start */}
            <div className="flex justify-center gap-[6px] mb-6">
              {[0,1,2,3,4].map(i => (
                <motion.div key={i} className="w-[4px] h-[4px] rounded-full bg-ink/15" animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 3, repeat: Infinity, delay: i * 0.18 }} />
              ))}
            </div>

            {/* Floating dots */}
            <div className="flex justify-center gap-[10px] mb-4">
              {[0,1,2].map(i => (
                <motion.div key={i} className="w-[3px] h-[3px] rounded-full bg-ink/10" animate={{ scale: [1, 1.12, 1], y: [0, -2, 0] }} transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.3 }} />
              ))}
            </div>

             <AnimatePresence mode="wait">
               <motion.div
                 key={unitIndex}
                 initial={{ y: 14, opacity: 0 }}
                 animate={{ y: 0, opacity: 1 }}
                 exit={{ y: -14, opacity: 0 }}
                 transition={{ duration: 0.32 }}
                 className="w-full flex-1 min-h-[500px]"
               >
              {mounted ? (
                fileData ? (
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
                  <div className="flex items-center justify-center h-full text-ink-light">
                     <IconLoader2 className="w-5 h-5 animate-spin mr-2" /> Loading document...
                  </div>
                )
              ) : null}
             </motion.div>
            </AnimatePresence>

            {/* Ink dots — chapter end */}
            <div className="flex justify-center gap-[6px] mt-6">
              {[0,1,2,3,4].map(i => (
                <motion.div key={`end-${i}`} className="w-[4px] h-[4px] rounded-full bg-ink/15" animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 3, repeat: Infinity, delay: i * 0.18 }} />
              ))}
            </div>
            
            <div className="flex justify-between items-center py-6 mt-8 mb-12 border-t border-ink/10">
              <Button
                variant="outline"
                size="icon"
                className="rounded-full border-ink/20 w-10 h-10 hover:bg-ink/5"
                disabled={!canMovePrev}
                onClick={() => {
                  if (activeBook.format === "epub") {
                    setEpubNavigationRequest({
                      direction: "prev",
                      nonce: Date.now(),
                    });
                    return;
                  }
                  setUnitIndex((value) => Math.max(0, value - 1));
                }}
              >
                <ChevronLeft className="w-4 h-4 text-ink" />
              </Button>
              <span className="text-[10px] tracking-[2px] text-ink-light uppercase">
                {unitIndex + 1} / {Math.max(1, effectiveTotalUnits)}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="rounded-full border-ink/20 w-10 h-10 hover:bg-ink/5"
                disabled={!canMoveNext}
                onClick={() => {
                  if (activeBook.format === "epub") {
                    setEpubNavigationRequest({
                      direction: "next",
                      nonce: Date.now(),
                    });
                    return;
                  }
                  setUnitIndex((value) => Math.min(effectiveTotalUnits - 1, value + 1));
                }}
              >
                <IconArrowRight className="size-4 text-ink" />
              </Button>
            </div>
            
            {/* Mobile Illustration */}
            <div className="lg:hidden w-full mb-12">
               {status.imageDataUrl ? (
                  <div className="w-full aspect-[4/3] rounded-sm overflow-hidden border border-ink/10 mb-4 fade-in">
                    <img src={status.imageDataUrl} alt="AI Generation" className="w-full h-full object-cover mix-blend-multiply opacity-90 saturate-50" />
                  </div>
               ) : (
                  <IllustrationPlaceholder title={mounted ? readingUnitLabel : "Loading"} isMobile={true} isEnhanced={isAiEnabled} />
               )}
               {status.memory === 'ready' && status.lastSummary && (
                 <AnnotationNote compact />
               )}
            </div>
          </div>

          {/* Desktop Illustration Placeholder */}
          <div className="hidden lg:flex w-[260px] xl:w-[320px] shrink-0 sticky top-0 flex-col items-start ml-12 xl:ml-20 h-[calc(100vh-200px)] pt-2">
             {status.imageDataUrl ? (
                <div className="w-full aspect-[3/4] rounded-[1px] overflow-hidden border border-ink/10 shadow-sm fade-in relative group transition-opacity">
                  <div className="absolute inset-0 bg-ink/5 mix-blend-multiply opacity-20 pointer-events-none z-10"></div>
                  <img src={status.imageDataUrl} alt="AI Generation" className="w-full h-full object-cover mix-blend-multiply opacity-[0.85] saturate-[0.6] sepia-[0.2]" />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-page/90 to-transparent p-4 z-20">
                     <span className="text-[8px] uppercase tracking-[2px] text-ink/70 mb-1 block">AI Frontispiece</span>
                     <p className="text-[12px] italic text-ink/90 font-serif leading-snug">"{mounted ? readingUnitLabel : "Loading"}"</p>
                  </div>
                </div>
             ) : (
                <IllustrationPlaceholder title={mounted ? readingUnitLabel : "Loading"} isEnhanced={isAiEnabled} />
             )}
             
             {status.memory === 'ready' && status.lastSummary && (
               <div className="mt-8 w-full">
                  <AnnotationNote />
               </div>
             )}
          </div>
        </div>
      </motion.main>
    </div>
  );
}
