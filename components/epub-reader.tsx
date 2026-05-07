"use client";

import { useEffect, useRef, useState } from "react";
import ePub, {
  type Book,
  type Location,
  type Rendition,
} from "@likecoin/epub-ts";
import { stripHtmlTags, truncateText } from "@/lib/text-utils";

export type EpubReaderLocation = {
  index: number;
  cfi?: string;
  spineIndex?: number;
};

export type EpubReaderNavigationRequest = {
  direction: "prev" | "next";
  nonce: number;
};

type EpubReaderProps = {
  fileData: ArrayBuffer;
  unitIndex: number;
  initialCfi?: string;
  navigationRequest?: EpubReaderNavigationRequest | null;
  onUnitCount: (count: number) => void;
  onTextReady: (updater: (current: string[]) => string[]) => void;
  onLocationChange: (location: EpubReaderLocation) => void;
};

export function EpubReader({
  fileData,
  unitIndex,
  initialCfi,
  navigationRequest,
  onUnitCount,
  onTextReady,
  onLocationChange,
}: EpubReaderProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const bookRef = useRef<Book | null>(null);
  const renditionRef = useRef<Rendition | null>(null);
  const sectionTextCacheRef = useRef<Map<number, string>>(new Map());
  const lastNavigationNonceRef = useRef<number | null>(null);
  const [status, setStatus] = useState("Loading EPUB…");

  useEffect(() => {
    if (!fileData || !containerRef.current) return;

    const initialSpineIndex = unitIndex;
    const initialTargetCfi = initialCfi;
    let cancelled = false;
    let book: Book | null = null;
    let rendition: Rendition | null = null;

    async function extractSectionText(spineIndex: number) {
      const currentBook = bookRef.current;
      if (!currentBook) return;
      if (sectionTextCacheRef.current.has(spineIndex)) return;

      const section = currentBook.section(spineIndex);
      if (!section?.url) return;

      try {
        const rendered = await section.render(
          currentBook.load.bind(currentBook),
        );
        if (cancelled) return;

        const text = truncateText(stripHtmlTags(rendered));
        sectionTextCacheRef.current.set(spineIndex, text);
        onTextReady((current) => {
          const next = [...current];
          next[spineIndex] = text;
          return next;
        });
      } catch (error) {
        console.warn("Failed to extract EPUB section text", spineIndex, error);
      }
    }

    async function loadBook() {
      setStatus("Loading EPUB…");
      sectionTextCacheRef.current = new Map();
      lastNavigationNonceRef.current = null;

      renditionRef.current?.destroy();
      bookRef.current?.destroy();
      renditionRef.current = null;
      bookRef.current = null;

      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }

      book = ePub({
        replacements: "blobUrl",
      });
      book.open(fileData.slice(0), "binary");
      bookRef.current = book;

      book.on("openFailed", (error) => {
        console.error("epub.ts openFailed", error);
        if (!cancelled) {
          setStatus("Unable to open EPUB archive.");
        }
      });

      await book.ready;
      if (book.replacementsReady) {
        await book.replacementsReady;
      }

      if (cancelled || !containerRef.current) {
        book.destroy();
        return;
      }

      const spineItems =
        (
          book.spine as typeof book.spine & {
            spineItems?: Array<{ index: number }>;
          }
        ).spineItems ?? [];

      onUnitCount(spineItems.length);

      rendition = book.renderTo(containerRef.current, {
        width: "100%",
        height: 620,
        flow: "paginated",
        spread: "none",
      });
      renditionRef.current = rendition;

      rendition.on("relocated", (nextLocation: Location) => {
        const start = nextLocation.start;
        if (!start || cancelled) return;

        const safeIndex =
          typeof start.index === "number" && !Number.isNaN(start.index)
            ? Math.max(0, Math.min(spineItems.length - 1, start.index))
            : 0;

        onLocationChange({
          index: safeIndex,
          cfi: start.cfi,
          spineIndex: safeIndex,
        });

        void extractSectionText(safeIndex);
        void extractSectionText(Math.max(0, safeIndex - 1));
        void extractSectionText(Math.min(spineItems.length - 1, safeIndex + 1));

        if (!cancelled) {
          setStatus(
            start.cfi ? "Reading EPUB section." : "Rendered EPUB section",
          );
        }
      });

      rendition.on("displayerror", (error: Error) => {
        console.error("epub.ts displayerror", error);
        if (!cancelled) {
          setStatus("Unable to display EPUB section.");
        }
      });

      const initialIndex = Math.max(
        0,
        Math.min(initialSpineIndex, spineItems.length - 1),
      );
      const initialTarget =
        initialTargetCfi ?? spineItems[initialIndex]?.index ?? 0;
      await rendition.display(initialTarget);

      void extractSectionText(initialIndex);
      void extractSectionText(
        Math.min(spineItems.length - 1, initialIndex + 1),
      );

      if (!cancelled) {
        setStatus(
          initialTargetCfi
            ? "Restored saved EPUB location."
            : "Rendered EPUB section",
        );
      }
    }

    loadBook().catch((error) => {
      console.error("Failed to load EPUB with epub.ts", error);
      if (!cancelled) {
        setStatus("Unable to load EPUB in the browser.");
      }
    });

    return () => {
      cancelled = true;
      rendition?.destroy();
      book?.destroy();
      renditionRef.current = null;
      bookRef.current = null;
      sectionTextCacheRef.current = new Map();
      lastNavigationNonceRef.current = null;
    };
  }, [fileData, onLocationChange, onTextReady, onUnitCount]);

  useEffect(() => {
    const rendition = renditionRef.current;
    if (!rendition || !navigationRequest) return;
    if (lastNavigationNonceRef.current === navigationRequest.nonce) return;

    lastNavigationNonceRef.current = navigationRequest.nonce;

    const movePromise =
      navigationRequest.direction === "next"
        ? rendition.next()
        : rendition.prev();

    movePromise.catch((error) => {
      console.error("Failed to navigate EPUB page", error);
      setStatus("Unable to navigate EPUB page.");
    });
  }, [navigationRequest]);

  return (
    <div className="space-y-4">
      {/* <div className="border p-4 text-sm text-muted-foreground">
        {status || "Rendered EPUB section"}
      </div> */}
      <div className="overflow-hidden bg-white p-4">
        <div ref={containerRef} className="min-h-[620px] w-full" />
      </div>
    </div>
  );
}
