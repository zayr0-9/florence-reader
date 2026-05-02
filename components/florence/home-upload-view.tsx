"use client";

import { DragEvent, useRef, useState } from "react";
import { motion } from "motion/react";
import { GlobeSVG } from "@/components/florence/svg/globe-svg";
import { DragonSVG } from "@/components/florence/svg/dragon-svg";
import { BookOneSVG } from "@/components/florence/svg/book-one-svg";
import { ElegantStarSVG } from "@/components/florence/svg/elegant-star-svg";
import { BirdSVG } from "@/components/florence/svg/bird-svg";
import { EyeSVG } from "@/components/florence/svg/eye-svg";
import { TempleSVG } from "@/components/florence/svg/temple-svg";
import { DecorativePlaceholder } from "@/components/florence/decorative-placeholder";

const elegantStars = [
  { top: "8%", left: "35%", w: 18, d: 0 },
  { top: "15%", left: "45%", w: 14, d: 1.5 },
  { top: "10%", right: "35%", w: 16, d: 0.7 },
  { top: "22%", right: "28%", w: 12, d: 2.2 },
  { top: "18%", left: "28%", w: 15, d: 0.9 },
  { top: "35%", left: "6%", w: 20, d: 1.8 },
  { top: "48%", left: "8%", w: 14, d: 0.3 },
  { top: "65%", left: "5%", w: 16, d: 1.2 },
  { top: "38%", right: "6%", w: 18, d: 2.6 },
  { top: "55%", right: "8%", w: 12, d: 0.5 },
  { top: "68%", right: "5%", w: 15, d: 2.0 },
  { top: "30%", left: "20%", w: 14, d: 2.9 },
  { top: "32%", right: "22%", w: 15, d: 1.1 },
  { bottom: "38%", left: "22%", w: 13, d: 2.5 },
  { bottom: "35%", right: "20%", w: 17, d: 0.8 },
  { bottom: "15%", left: "32%", w: 16, d: 1.9 },
  { bottom: "8%", left: "38%", w: 11, d: 0.2 },
  { bottom: "12%", right: "35%", w: 15, d: 2.8 },
  { bottom: "6%", right: "30%", w: 13, d: 1.4 },
  { top: "12%", left: "55%", w: 9, d: 0.4 },
  { bottom: "25%", left: "6%", w: 10, d: 1.6 },
  { bottom: "28%", right: "6%", w: 12, d: 2.1 },
  { top: "25%", left: "40%", w: 8, d: 0.9 },
  { top: "15%", right: "45%", w: 10, d: 1.3 },
  { bottom: "30%", right: "40%", w: 9, d: 0.1 },
  { top: "60%", left: "25%", w: 11, d: 2.4 },
  { bottom: "40%", right: "28%", w: 8, d: 1.7 },
  { top: "42%", right: "26%", w: 11, d: 0.6 },
  { top: "45%", left: "24%", w: 10, d: 2.3 },
  { bottom: "18%", right: "40%", w: 14, d: 2.7 },
];

type HomeUploadViewProps = {
  compact?: boolean;
  onUpload: (files: FileList | null) => void;
};

export function HomeUploadView({
  compact = false,
  onUpload,
}: HomeUploadViewProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const processFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;

    if (!/\.(pdf|epub)$/i.test(file.name)) {
      setUploadError("Please choose a PDF or EPUB file.");
      return;
    }

    setUploadError("");
    onUpload(files);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    processFiles(event.dataTransfer.files);
  };

  return (
    <div
      className={`relative w-full h-full ${
        compact
          ? "min-h-[460px] p-4"
          : "min-h-[600px] lg:min-h-[680px] p-8"
      } flex items-center justify-center overflow-hidden`}
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      {/* Decorative SVGs */}
      <DecorativePlaceholder
        Icon={BirdSVG}
        label="Bird"
        delay={0.05}
        className="absolute top-[5%] left-[-5%] md:left-[4%] w-[110px] h-[160px] md:w-[160px] md:h-[220px] -rotate-[6deg]"
      />
      <DecorativePlaceholder
        Icon={TempleSVG}
        label="Temple"
        delay={0.12}
        className="absolute top-[-5%] md:top-[-2%] right-0 md:right-0 w-[150px] h-[210px] md:w-[220px] md:h-[300px] origin-right rotate-[12deg] !opacity-[0.34]"
      />
      <DecorativePlaceholder
        Icon={DragonSVG}
        label="Dragon"
        delay={0.24}
        className="absolute bottom-[4%] right-[-3%] md:right-[6%] w-[110px] h-[150px] md:w-[150px] md:h-[190px] -rotate-[2deg] !opacity-45"
      />
      <DecorativePlaceholder
        Icon={GlobeSVG}
        label="Globe"
        delay={0.18}
        className="absolute bottom-[-18px] md:bottom-[-12px] left-1/2 -translate-x-1/2 w-[130px] h-[130px] md:w-[170px] md:h-[170px] !opacity-60"
      />
      <DecorativePlaceholder
        Icon={EyeSVG}
        label="Ouroboros"
        delay={0.3}
        className="absolute bottom-[4%] md:bottom-[8%] left-[-6%] md:left-[4%] w-[120px] h-[120px] md:w-[170px] md:h-[170px] rotate-[8deg]"
      />

      {/* Elegant Scattered Twinkling Stars */}
      {elegantStars.map((s, i) => (
        <motion.div
          key={i}
          className="absolute pointer-events-none drop-shadow-md"
          style={{
            top: s.top,
            left: (s as Record<string, unknown>).left as string | undefined,
            right: (s as Record<string, unknown>).right as string | undefined,
            bottom: s.bottom,
            width: s.w,
            height: s.w,
            color: "#cca270",
          }}
          animate={{
            opacity: [0.15, 0.9, 0.15],
            scale: [0.95, 1.15, 0.95],
            color: ["#cca270", "#ffffff", "#cca270"],
          }}
          transition={{
            duration: 4 + (i % 3),
            repeat: Infinity,
            delay: s.d,
            ease: "easeInOut",
          }}
        >
          <ElegantStarSVG className="w-full h-full" />
        </motion.div>
      ))}

      {/* Upload Box */}
      <div
        className={`relative z-20 w-full ${
          compact
            ? "max-w-[250px] p-4"
            : "max-w-[320px] md:-translate-y-3 p-6 md:p-8"
        } flex flex-col items-center text-center border border-dashed text-ink rounded-lg bg-page/40 backdrop-blur-sm transition-colors ${
          isDragging
            ? "border-ink/60 bg-white/30"
            : "border-ink/25"
        }`}
      >
        <BookOneSVG className="w-16 h-16 mb-4 text-ink/70" />
        <h2 className="text-[18px] tracking-[3px] uppercase mb-4 font-serif">
          Upload Ebook
        </h2>

        <div className="flex items-center justify-center w-[100px] mb-5">
          <div className="h-px bg-ink/30 flex-1"></div>
          <div className="w-[3px] h-[3px] rotate-45 border border-ink/40 mx-2"></div>
          <div className="w-[3px] h-[3px] border border-ink/40"></div>
          <div className="w-[3px] h-[3px] rotate-45 border border-ink/40 mx-2"></div>
          <div className="h-px bg-ink/30 flex-1"></div>
        </div>

        <p className="text-[12px] text-ink mb-1 font-serif">
          Drag & drop your file here
        </p>
        <p className="text-[12px] text-ink mb-4 font-serif">or</p>

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.epub,application/pdf,application/epub+zip"
          className="hidden"
          onChange={(event) => {
            processFiles(event.target.files);
            event.target.value = "";
          }}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="px-6 py-2 border border-ink/20 hover:border-ink/40 hover:bg-ink/5 transition-colors text-[9px] tracking-[2px] uppercase font-medium mb-4 rounded-[2px] bg-white/10 shadow-sm"
        >
          Select File
        </button>

        <p className="text-[9px] text-ink/60">Supported formats: PDF, EPUB</p>
        {uploadError && (
          <p className="mt-3 text-[10px] text-crimson">{uploadError}</p>
        )}
      </div>
    </div>
  );
}
