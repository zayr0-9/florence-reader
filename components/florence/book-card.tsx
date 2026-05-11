"use client";

import { Clock, Bookmark as BookmarkIcon } from "lucide-react";
import { motion, useSpring, useTransform } from "motion/react";
import type { Manuscript } from "@/lib/manuscripts";

type BookCardProps = {
  book: Manuscript;
  idx: number;
  bookmarkedIds: Array<string | number>;
  setBookmarkedIds: React.Dispatch<
    React.SetStateAction<Array<string | number>>
  >;
  openBook: (book: Manuscript) => void;
};

export function BookCard({
  book,
  idx,
  bookmarkedIds,
  setBookmarkedIds,
  openBook,
}: BookCardProps) {
  const springScale = useSpring(1, { stiffness: 300, damping: 24 });
  const glowOpacity = useTransform(springScale, [1, 1.015], [0, 0.1]);

  return (
    <motion.button
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, delay: idx * 0.05 }}
      whileTap={{ scale: 0.985 }}
      onHoverStart={() => springScale.set(1.015)}
      onHoverEnd={() => springScale.set(1)}
      className="relative group bg-white/40 border border-ink/5 p-6 pb-4 flex flex-col h-[280px] transition-colors duration-300 rounded-sm cursor-pointer hover:border-ink/15 hover:bg-white/60 text-left"
      style={{
        boxShadow: "0 2px 20px -10px rgba(0,0,0,0.03)",
        scale: springScale,
      }}
      onClick={() => openBook(book)}
    >
      <motion.div
        className="absolute inset-0 pointer-events-none rounded-sm transition-colors duration-300"
        style={{ backgroundColor: book.colorHex, opacity: glowOpacity }}
      />

      {/* Top Row */}
      <div className="flex justify-between items-center mb-6 relative z-10 text-ink-light">
        <span className="text-[7px] tracking-[1px] uppercase">
          {book.genre}
        </span>
        <div className="flex items-center">
          <span className="text-[8px] italic mr-3">{book.year}</span>
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
            className="p-1 -mr-1 -mt-1 z-20 cursor-pointer"
          >
            <BookmarkIcon
              className={`w-3.5 h-3.5 transition-colors ${
                bookmarkedIds.includes(book.id)
                  ? "text-crimson fill-crimson"
                  : "hover:text-ink"
              }`}
            />
          </div>
        </div>
      </div>

      {/* Decorative Text */}
      <div className="absolute top-16 left-6 select-none pointer-events-none text-search-focus/30 italic text-[80px] leading-none -ml-4 z-0">
        {book.letter}
      </div>

      {/* Title & Author */}
      <div className="relative z-10 mb-4 mt-2">
        <h3 className="italic text-[15px] mb-1 text-ink">{book.title}</h3>
        <p className="text-[9px] tracking-[1.5px] text-ink-light uppercase">
          {book.author}
        </p>
      </div>

      {/* Separator */}
      <div className="w-10 h-px bg-ink/15 mb-4 relative z-10"></div>

      {/* Description */}
      <p className="text-[11px] italic leading-relaxed text-ink/80 relative z-10 flex-1 pr-4">
        {book.description}
      </p>

      {/* Bottom Action Row */}
      <div className="flex justify-between items-center mt-4 pt-4 border-t border-ink/5 relative z-10">
        <div className="flex items-center text-ink-light text-[8px]">
          <Clock className="w-3.5 h-3.5 mr-2" />
          {book.time}
        </div>
      </div>
    </motion.button>
  );
}
