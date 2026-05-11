"use client";

export function AnnotationNote({ compact = false }: { compact?: boolean }) {
  return (
    <aside
      className={`${
        compact
          ? "my-6 px-4 py-3 text-[11px]"
          : "my-8 px-5 py-4 text-[12px]"
      } border-l border-ink/20 bg-ink/5 italic text-ink/70`}
    >
      Reader note: imagery and context markers are enabled for this passage.
    </aside>
  );
}

export function EmptyState({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <div className="border border-ink/10 bg-settings rounded-sm px-6 py-10 text-center text-ink/75">
      <h3 className="text-[11px] tracking-[2px] uppercase text-ink mb-3">
        {title}
      </h3>
      <p className="text-[13px] italic leading-relaxed">{body}</p>
    </div>
  );
}

export function IllustrationPlaceholder({
  title,
  isMobile = false,
  isEnhanced = false,
}: {
  title: string;
  isMobile?: boolean;
  isEnhanced?: boolean;
}) {
  if (isMobile) {
    return (
      <div
        className="w-full my-12 py-12 border-y border-ink/10 flex flex-col items-center justify-center opacity-70 mix-blend-multiply bg-ink/5 relative"
        style={{
          backgroundImage:
            "repeating-linear-gradient(-45deg, rgba(0,0,0,0.02) 0, rgba(0,0,0,0.02) 1px, transparent 1px, transparent 10px)",
        }}
      >
        <span className="text-[9px] uppercase tracking-[3px] text-ink/60 mb-2 font-medium">
          {isEnhanced ? "AI Plate" : "Plate"}
        </span>
        <p className='text-[12px] italic text-ink/70 text-center font-serif px-6'>
          &quot;{title}&quot;
        </p>
      </div>
    );
  }

  return (
    <div
      className="w-full aspect-[3/4] flex flex-col items-center justify-center border border-ink/10 rounded-[1px] opacity-70 mix-blend-multiply bg-ink/5 relative overflow-hidden group transition-opacity hover:opacity-100"
      style={{
        backgroundImage:
          "repeating-linear-gradient(-45deg, rgba(0,0,0,0.02) 0, rgba(0,0,0,0.02) 1px, transparent 1px, transparent 10px)",
      }}
    >
      <div className="absolute inset-0 border border-ink/5 m-2 pointer-events-none rounded-[1px]" />
      <div className="relative z-10 flex flex-col items-center px-6 text-center">
        <span className="text-[9px] uppercase tracking-[3px] text-ink/60 mb-3 font-medium">
          {isEnhanced ? "AI Frontispiece" : "Frontispiece"}
        </span>
        <p className="text-[14px] italic text-ink/80 leading-relaxed font-serif">
          &quot;{title}&quot;
        </p>
      </div>
    </div>
  );
}
