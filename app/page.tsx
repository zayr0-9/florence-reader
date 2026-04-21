import Link from "next/link";
import {
  IconArrowRight,
  IconBrain,
  IconLibrary,
  IconPhoto,
} from "@tabler/icons-react";
import { BookCard } from "@/components/book-card";
import { HeroUploadCard } from "@/components/hero-upload-card";
import { SiteShell } from "@/components/site-shell";
import { Button } from "@/components/ui/button";
import { featuredBooks } from "@/lib/mock-data";

export default function HomePage() {
  return (
    <SiteShell currentPath="/">
      <section className="mx-auto flex max-w-7xl flex-col gap-16 px-6 py-10">
        <HeroUploadCard />

        <section className="grid gap-6 lg:grid-cols-[1fr_0.95fr]">
          {/* <div className="border border-black/10 bg-white p-6">
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
              Product shape
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight">
              A reader app with two quiet background systems.
            </h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div className="border border-black/10 bg-zinc-50 p-4">
                <IconLibrary className="size-5 text-emerald-700" />
                <h3 className="mt-3 font-medium">Reader UI</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Fast single-pane reading, progress persistence, and
                  local-first upload handling.
                </p>
              </div>
              <div className="border border-black/10 bg-zinc-50 p-4">
                <IconBrain className="size-5 text-emerald-700" />
                <h3 className="mt-3 font-medium">Memory pipeline</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Background summaries and running memory for continuity across
                  the book.
                </p>
              </div>
              <div className="border border-black/10 bg-zinc-50 p-4">
                <IconPhoto className="size-5 text-emerald-700" />
                <h3 className="mt-3 font-medium">Image pipeline</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Prompt generation and scene visuals tied to the current
                  reading unit.
                </p>
              </div>
            </div>
          </div> */}

          {/* <div className="border border-black/10 bg-zinc-950 p-6 text-zinc-50">
            <p className="text-xs uppercase tracking-[0.3em] text-emerald-300/80">
              MVP scope
            </p>
            <ul className="mt-5 space-y-4 text-sm leading-7 text-zinc-300">
              <li>• Upload or load a PDF / EPUB</li>
              <li>• Save progress and reopen recent books</li>
              <li>• Normalize reading into shared reading units</li>
              <li>• Trigger background memory updates on unit change</li>
              <li>• Trigger async scene-image generation</li>
              <li>• Show latest image and quiet status in the reader</li>
            </ul>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/reader/demo">
                  Open demo reader
                  <IconArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="border-white/20 bg-transparent text-white hover:bg-white/10">
                <Link href="/library">Go to library</Link>
              </Button>
            </div>
          </div> */}
        </section>

        <section className="space-y-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                Recent books
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight">
                Resume reading without surfacing the AI machinery.
              </h2>
            </div>
            <Button asChild variant="outline">
              <Link href="/library">Full library</Link>
            </Button>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {featuredBooks.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        </section>
      </section>
    </SiteShell>
  );
}
