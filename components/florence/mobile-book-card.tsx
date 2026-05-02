"use client";

import { Bookmark as BookmarkIcon } from "lucide-react";
import { motion, useSpring, useTransform } from "motion/react";
import type { Manuscript } from "@/lib/manuscripts";

type MobileBookCardProps = {
  book: Manuscript;
  idx: number;
  bookmarkedIds: Array<string | number>;
  setBookmarkedIds: React.Dispatch<
    React.SetStateAction<Array<string | number>>
  >;
  openBook: (book: Manuscript) => void;
};

export function MobileBookCard({
  book,
  idx,
  bookmarkedIds,
  setBookmarkedIds,
  openBook,
}: MobileBookCardProps) {
  const springScale = useSpring(1, { stiffness: 300, damping: 24 });
  const glowOpacity = useTransform(springScale, [1, 0.96], [0, 0.1]);

  return (
    <motion.button
      key={book.id}
      initial={{ y: 16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, delay: idx * 0.04 }}
      onPointerDown={() => springScale.set(0.96)}
      onPointerUp={() => springScale.set(1)}
      onPointerCancel={() => springScale.set(1)}
      onPointerLeave={() => springScale.set(1)}
      onClick={() => openBook(book)}
      className="w-full flex items-center p-1.5 pr-4 rounded-none border transition-colors bg-transparent text-left relative overflow-hidden"
      style={{ borderColor: "#E3DBCE", scale: springScale }}
    >
      <motion.div
        className="absolute inset-0 pointer-events-none rounded-none"
        style={{ backgroundColor: book.colorHex, opacity: glowOpacity }}
      />
      {/* Left Icon Square */}
      <div
        className="w-[44px] h-[44px] shrink-0 rounded-none flex items-center justify-center text-[18px] italic text-page shadow-inner relative z-10"
        style={{ backgroundColor: book.colorHex }}
      >
        <span className="-ml-0.5 mt-0.5">{book.letter}</span>
      </div>

      {/* Middle Text */}
      <div className="ml-3.5 flex-1 overflow-hidden flex flex-col justify-center translate-y-[1px] relative z-10">
        <h3 className="italic text-[12px] leading-tight text-ink truncate mb-[2px] font-medium">
          {book.title}
        </h3>
        <p className="text-[8px] tracking-[1.5px] text-muted uppercase truncate">
          {book.author}
        </p>
      </div>

      {/* Right Action */}
      <div className="flex items-center space-x-3 shrink-0 relative z-10">
        <span
          className="px-2.5 py-[3px] rounded-full border text-[8px] uppercase tracking-[1px] font-medium"
          style={{
            color: book.colorBgText,
            borderColor: `${book.colorBgText}30`,
            backgroundColor: "transparent",
          }}
        >
          {book.genre}
        </span>
        <div
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            setBookmarkedIds((prev) =>
              prev.includes(book.id)
                ? prev.filter((id) => id !== book.id)
                : [...prev, book.id]
            );
          }}
          className="p-2 -mr-2 -mt-2 z-20 cursor-pointer"
        >
          <BookmarkIcon
            strokeWidth={1.5}
            className={`w-[13px] h-[13px] transition-colors ${
              bookmarkedIds.includes(book.id) ? "fill-current" : ""
            }`}
            style={{
              color: bookmarkedIds.includes(book.id)
                ? book.colorBgText
                : "#D5CEBF",
            }}
          />
        </div>
      </div>
    </motion.button>
  );
}
