"use client";

import {
  Search,
  Library,
  Bookmark,
  Settings,
  Info,
  SlidersHorizontal,
  BookOpen,
  Bookmark as BookmarkIcon,
  X,
  Type,
  Bell,
  Home,
} from "lucide-react";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { usePathname, useRouter } from "next/navigation";
import { saveUploadedBook, listStoredBooks, toBookRecord } from "@/lib/book-storage";
import {
  manuscripts,
  genreOptions,
  detectFormat,
  bookRecordToManuscript,
  type Manuscript,
} from "@/lib/manuscripts";
import { BookCard } from "@/components/florence/book-card";
import { HomeUploadView } from "@/components/florence/home-upload-view";
import { MobileBookCard } from "@/components/florence/mobile-book-card";
import { EmptyState } from "@/components/florence/ui-primitives";

export default function FlorenceApp({ initialTab = "Home" }: { initialTab?: "Home" | "Library" | "Bookmarks" | "Settings" }) {
  const router = useRouter();
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeGenre, setActiveGenre] = useState('All');
  const [bookmarkedIds, setBookmarkedIds] = useState<Array<string | number>>([]);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [uploadedManuscripts, setUploadedManuscripts] = useState<Manuscript[]>([]);
  const [repoManuscripts, setRepoManuscripts] = useState<Manuscript[]>([]);

  // Track whether we just came back from the reader — sidebar animates only then
  // Lazy initializer reads sessionStorage synchronously on first render — no re-render
  const [returnedFromReader] = useState(() => {
    try {
      if (typeof window !== 'undefined' && sessionStorage.getItem('florence-in-reader') === '1') {
        sessionStorage.removeItem('florence-in-reader');
        return true;
      }
    } catch { }
    return false;
  });

  // Tracking last read book & chapter
  const [lastRead] = useState<{ bookId: string | number; chapterIndex: number }>({
    bookId: 1,
    chapterIndex: 0,
  });

  // Settings State
  const [typeSize, setTypeSize] = useState('medium');
  const [annotations, setAnnotations] = useState(true);

  const goToTab = (
    tab: "Home" | "Library" | "Bookmarks" | "Settings",
    clearSearch = false,
    resetGenre = true
  ) => {
    const tabPath = tab === "Home" ? "/" : `/${tab.toLowerCase()}`;
    setActiveTab(tab);
    if (resetGenre) {
      setActiveGenre("All");
    }
    if (clearSearch) {
      setSearchQuery("");
    }
    if (pathname !== tabPath) {
      router.push(tabPath);
    }
  };

  useEffect(() => {
    let cancelled = false;

    listStoredBooks()
      .then((items) => {
        if (cancelled) return;
        setRepoManuscripts(items.map((item) => bookRecordToManuscript(toBookRecord(item))));
      })
      .catch(() => {
        if (!cancelled) {
          setRepoManuscripts([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const allManuscripts = [...manuscripts, ...repoManuscripts, ...uploadedManuscripts];
  const openBook = (book: Manuscript) => {
    try { sessionStorage.setItem('florence-in-reader', '1'); } catch { }
    router.push(`/reader/${book.backendId ?? book.id}`);
  };

  const handleUpload = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;

    const selectedFormat = detectFormat(file.name);
    if (!selectedFormat) return;

    const storedBook = await saveUploadedBook(file, selectedFormat);
    const uploadedBook = {
      ...bookRecordToManuscript(toBookRecord(storedBook)),
      genre: "Uploaded",
      source: "upload",
    };
    setUploadedManuscripts(prev => [...prev, uploadedBook]);
    setActiveTab("Library");
    setSearchQuery("");
    setActiveGenre('Uploaded');
    sessionStorage.setItem("florence-upload-draft", JSON.stringify({
      id: storedBook.id,
      title: storedBook.title,
      format: storedBook.format,
      size: storedBook.sizeLabel,
      firstUnit: storedBook.currentUnitLabel,
    }));
    router.push(`/reader/${uploadedBook.id}?source=upload`);
  };

  const lastReadBook = allManuscripts.find(b => b.id === lastRead.bookId);

  const filteredManuscripts = allManuscripts.filter(book => {
    if (activeTab === 'Bookmarks' && !bookmarkedIds.includes(book.id)) return false;
    if (activeGenre !== 'All' && book.genre.toLowerCase() !== activeGenre.toLowerCase()) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return book.title.toLowerCase().includes(query) || book.author.toLowerCase().includes(query);
    }
    return true;
  });


  return (
    <>
      {/* MOBILE MAIN LIBRARY / SETTINGS LAYOUT (md:hidden) */}
      <div className="md:hidden flex flex-col h-screen overflow-hidden text-ink bg-page selection:bg-gold/40 w-full">
        {/* Mobile Header */}
        <header className="px-4 py-3 border-b border-ink/10 flex items-center justify-between shrink-0 min-h-[56px]">
          {isMobileSearchOpen ? (
            <div className="flex-1 flex items-center w-full bg-transparent border border-ink/15 rounded-sm px-3 py-1.5 mr-3">
              <Search className="w-[14px] h-[14px] text-ink/50 mr-2 shrink-0" strokeWidth={2} />
              <input
                type="text"
                placeholder="Search manuscripts..."
                value={searchQuery}
                autoFocus
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-[13px] placeholder:text-ink/40 focus:outline-none text-ink"
              />
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <img src="/florence-ui/florence-logo.svg" alt="Florence" className="h-10 w-auto" />
              <span className="text-[9px] italic text-chapter font-medium tracking-[0.5px]">{filteredManuscripts.length} vol.</span>
            </div>
          )}
          <button
            onClick={() => {
              if (isMobileSearchOpen) {
                setIsMobileSearchOpen(false);
                setSearchQuery('');
              } else {
                setIsMobileSearchOpen(true);
              }
            }}
            className="w-8 h-8 flex items-center justify-center shrink-0 border border-transparent rounded-full hover:bg-ink/5 focus:bg-ink/5 transition-colors"
          >
            {isMobileSearchOpen ? (
              <X className="w-[18px] h-[18px] text-ink/70 hover:text-ink cursor-pointer" strokeWidth={1.5} />
            ) : (
              <Search className="w-[18px] h-[18px] text-ink/70 hover:text-ink cursor-pointer" strokeWidth={1.5} />
            )}
          </button>
        </header>

        {activeTab === 'Settings' ? (
          <div className="flex-1 overflow-y-auto px-6 py-6 pb-12 space-y-4">
            <p className="text-[12.5px] italic text-ink/80 mb-6 leading-relaxed">
              Customise your reading experience. Changes apply immediately and are stored for this session.
            </p>

            <div className="border border-ink/10 bg-settings p-5 rounded-sm flex items-center justify-between">
              <div className="flex items-center text-ink flex-1">
                <Bell className="w-4 h-4 mr-3" strokeWidth={1.5} />
                <h3 className="text-[10.5px] tracking-[2px] uppercase">Annotations</h3>
              </div>
              <button
                onClick={() => setAnnotations(!annotations)}
                className={`shrink-0 w-[42px] h-[24px] rounded-full relative transition-colors border ${annotations ? 'bg-ink-dark border-ink-dark' : 'bg-border-main border-border-main'}`}
              >
                <motion.div className="w-[20px] h-[20px] rounded-full bg-settings absolute top-[1px] shadow-sm" animate={{ x: annotations ? 18 : 0 }} transition={{ type: 'spring', stiffness: 400, damping: 28 }}></motion.div>
              </button>
            </div>

            <div className="border border-ink/10 bg-settings p-5 rounded-sm">
              <div className="flex items-center mb-4 text-ink">
                <Type className="w-4 h-4 mr-3" strokeWidth={1.5} />
                <h3 className="text-[10.5px] tracking-[2px] uppercase mt-0.5">Type Size</h3>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {['small', 'medium', 'large'].map((size) => (
                  <button
                    key={size}
                    onClick={() => setTypeSize(size)}
                    className={`py-3 rounded-sm text-[9px] tracking-[1.5px] border uppercase transition-colors ${typeSize === size ? 'bg-ink-dark border-ink-dark text-page' : 'border-ink/15 text-ink/70 hover:bg-ink/5'}`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : activeTab === 'Home' ? (
          <div className="flex-1 overflow-y-auto flex flex-col min-h-0 bg-transparent hide-scrollbar">
            <HomeUploadView compact onUpload={handleUpload} />
          </div>
        ) : (
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Mobile Filters */}
            <div className="overflow-x-auto hide-scrollbar pt-6 pb-2 px-5 flex space-x-2 shrink-0">
              {genreOptions.map((genre) => (
                <button
                  key={genre}
                  onClick={() => { setActiveGenre(genre); setActiveTab('Library'); }}
                  className={`flex-shrink-0 px-4 py-[5px] rounded-full border text-[9.5px] tracking-[1.5px] uppercase font-medium transition-colors ${activeGenre === genre
                      ? 'border-ink bg-ink text-page'
                      : 'border-ink/15 text-ink/60 hover:text-ink bg-transparent'
                    }`}
                >
                  {genre}
                </button>
              ))}
            </div>

            {/* Mobile Scrollable Book List */}
            <div className="flex-1 overflow-y-auto px-5 py-4 pb-10">
              {/* Mobile Continue Reading Banner */}
              {activeTab === 'Library' && lastReadBook && activeGenre === 'All' && !searchQuery && (
                <motion.button
                  onClick={() => {
                    const book = allManuscripts.find((entry) => entry.id === lastRead.bookId);
                    if (book) openBook(book);
                  }}
                  className="w-full flex flex-col bg-banner border border-ink/10 rounded-sm relative overflow-hidden transition-colors text-left mb-6 shrink-0 min-h-[140px]"
                  initial={{ y: -8, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.4 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <div
                    className="absolute inset-0 z-0 opacity-80"
                    style={{ WebkitMaskImage: 'linear-gradient(to left, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0) 80%)', maskImage: 'linear-gradient(to left, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0) 80%)' }}
                  >
                    <img
                      src="https://images.unsplash.com/photo-1599839619722-39751411ea63?q=80&w=800&auto=format&fit=crop&sat=-100"
                      alt="Generated page visual"
                      className="w-full h-full object-cover mix-blend-overlay opacity-30 saturate-0 fade-in"
                    />
                    <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'repeating-linear-gradient(-45deg, #000 0, #000 1px, transparent 1px, transparent 10px)' }} />
                  </div>

                  <div className="absolute right-[10%] top-1/2 -translate-y-1/2 select-none pointer-events-none text-ink/5 italic text-[100px] leading-none font-serif z-0">
                    {lastReadBook.letter}
                  </div>

                  <div className="relative z-10 flex flex-col h-full p-5 justify-between flex-1 w-full">
                    <div className="flex items-center w-3/4 mb-4">
                      <span className="text-[8px] tracking-[2.5px] uppercase text-ink/50 whitespace-nowrap font-medium">Continue Reading</span>
                      <div className="flex-1 h-px bg-ink/10 ml-3"></div>
                    </div>

                    <div className="flex items-end justify-between mt-auto">
                      <div className="flex flex-col flex-1 pr-4 truncate">
                        <h3 className="italic text-[20px] text-ink mb-1.5 leading-none truncate">{lastReadBook.title}</h3>
                        <p className="text-[9px] tracking-[1.5px] text-ink/60 uppercase truncate">
                          {lastReadBook.author}
                          {lastReadBook.chapters && lastReadBook.chapters[lastRead.chapterIndex] && (
                            <>
                              <span className="mx-1.5 opacity-40">·</span>
                              {lastReadBook.chapters[lastRead.chapterIndex].title}
                            </>
                          )}
                        </p>
                      </div>
                      <div className="shrink-0">
                        <motion.div whileTap={{ scale: 0.95 }} className="bg-ink text-banner px-4 py-[7px] rounded-full flex items-center shadow-md border border-black/20">
                          <BookOpen className="w-3 h-3 mr-1.5 opacity-90" />
                          <span className="text-[9px] tracking-[1px] uppercase font-medium">Resume</span>
                        </motion.div>
                      </div>
                    </div>
                  </div>
                </motion.button>
              )}

              <div className="space-y-3.5">
                {filteredManuscripts.length > 0 ? filteredManuscripts.map((book, idx) => (
                  <MobileBookCard
                    key={book.id}
                    book={book}
                    idx={idx}
                    bookmarkedIds={bookmarkedIds}
                    setBookmarkedIds={setBookmarkedIds}
                    openBook={openBook}
                  />
                )) : (
                  <EmptyState
                    title={activeTab === 'Bookmarks' ? 'No saved books' : 'No manuscripts found'}
                    body={activeTab === 'Bookmarks' ? 'Bookmark a manuscript from the library and it will appear here.' : 'Try a different search or genre filter.'}
                  />
                )}
              </div>
            </div>
          </div>
        )}

        {/* Mobile Bottom Navigation Bar */}
        <nav className="border-t border-ink/10 flex justify-around items-end pt-2 pb-safe bg-page shrink-0 h-[56px]">
          <button onClick={() => goToTab("Home", true)} className="flex flex-col items-center flex-1 h-full relative group">
            {activeTab === 'Home' && <motion.div layoutId="mobile-nav-indicator" className="absolute top-[-13px] w-14 h-[2px] bg-ink-dark" transition={{ type: 'spring', stiffness: 400, damping: 30 }}></motion.div>}
            <Home className={`w-4 h-4 mb-[3px] transition-colors ${activeTab === 'Home' ? 'text-ink' : 'text-ink/40'}`} strokeWidth={1.5} />
            <span className={`text-[7px] tracking-[1.7px] uppercase transition-colors ${activeTab === 'Home' ? 'text-ink font-medium' : 'text-muted'}`}>Home</span>
          </button>
          <button onClick={() => goToTab("Library", true)} className="flex flex-col items-center flex-1 h-full relative group">
            {activeTab === 'Library' && <motion.div layoutId="mobile-nav-indicator" className="absolute top-[-13px] w-14 h-[2px] bg-ink-dark" transition={{ type: 'spring', stiffness: 400, damping: 30 }}></motion.div>}
            <Library className={`w-4 h-4 mb-[3px] transition-colors ${activeTab === 'Library' ? 'text-ink' : 'text-ink/40'}`} strokeWidth={1.5} />
            <span className={`text-[7px] tracking-[1.7px] uppercase transition-colors ${activeTab === 'Library' ? 'text-ink font-medium' : 'text-muted'}`}>Library</span>
          </button>
          <button onClick={() => goToTab("Bookmarks")} className="flex flex-col items-center flex-1 h-full relative group">
            {activeTab === 'Bookmarks' && <motion.div layoutId="mobile-nav-indicator" className="absolute top-[-13px] w-14 h-[2px] bg-ink-dark" transition={{ type: 'spring', stiffness: 400, damping: 30 }}></motion.div>}
            <BookmarkIcon className={`w-4 h-4 mb-[3px] transition-colors ${activeTab === 'Bookmarks' ? 'text-ink' : 'text-ink/40'}`} strokeWidth={1.5} />
            <span className={`text-[7px] tracking-[1.7px] uppercase transition-colors ${activeTab === 'Bookmarks' ? 'text-ink font-medium' : 'text-muted'}`}>Saved</span>
          </button>
          <button onClick={() => goToTab("Settings")} className="flex flex-col items-center flex-1 h-full relative group">
            {activeTab === 'Settings' && <motion.div layoutId="mobile-nav-indicator" className="absolute top-[-13px] w-14 h-[2px] bg-ink-dark" transition={{ type: 'spring', stiffness: 400, damping: 30 }}></motion.div>}
            <Settings className={`w-4 h-4 mb-[3px] transition-colors ${activeTab === 'Settings' ? 'text-ink' : 'text-ink/40'}`} strokeWidth={1.5} />
            <span className={`text-[7px] tracking-[1.7px] uppercase transition-colors ${activeTab === 'Settings' ? 'text-ink font-medium' : 'text-muted'}`}>Settings</span>
          </button>
        </nav>
      </div>


      {/* DESKTOP MAIN LIBRARY / SETTINGS LAYOUT (hidden md:flex) */}
      <div className="hidden md:flex h-screen overflow-hidden selection:bg-gold/40 text-ink w-full">
        {(() => {
          const sidebarClass = "w-[220px] border-r border-ink/10 flex flex-col shrink-0 h-full overflow-hidden";
          const sidebarContent = (
            <>
              {/* Logo Area */}
              <div className="px-6 pt-6 pb-4">
                <img src="/florence-ui/florence-logo.svg" alt="Florence" className="h-12 w-auto" />
                <p className="text-[9px] text-ink-light/80 tracking-[2px] mt-1.5 uppercase">Digital Library</p>
              </div>

              <div className="px-3 flex flex-col flex-1">
                {/* Search */}
                <div className="mb-4 px-1.5">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-light/70" />
                    <input
                      type="text"
                      placeholder="Search manuscripts..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-transparent border border-ink/15 rounded-sm py-1.5 pl-8 pr-2 text-[12px] placeholder:text-ink-light/70 focus:outline-none focus:border-ink/30 transition-colors"
                    />
                  </div>
                </div>

                {/* Main Navigation */}
                <nav className="mb-4 items-stretch">
                  <ul className="space-y-0.5 flex flex-col">
                    <li>
                      <button
                        onClick={() => goToTab("Home", true)}
                        className={`w-full flex items-center px-3 py-2 text-[11px] tracking-[2px] rounded-sm group transition-all duration-150 ${activeTab === 'Home' ? 'bg-[#2C2A26] text-[#D6CCBA]' : 'text-[#3D352F]/70 hover:bg-[#3D352F]/5 hover:text-[#3D352F]'}`}
                      >
                        <Home className="w-3 h-3 mr-3" />
                        <span className="uppercase mt-px">Home</span>
                      </button>
                    </li>
                    <li>
                      <button
                        onClick={() => goToTab("Library", true)}
                        className={`w-full flex items-center px-3 py-2 text-[11px] tracking-[2px] rounded-sm group transition-all duration-150 ${activeTab === 'Library' ? 'bg-[#2C2A26] text-[#D6CCBA]' : 'text-[#3D352F]/70 hover:bg-[#3D352F]/5 hover:text-[#3D352F]'}`}
                      >
                        <Library className="w-3 h-3 mr-3" />
                        <span className="uppercase mt-px">Library</span>
                      </button>
                    </li>
                    <li>
                      <button
                        onClick={() => goToTab("Bookmarks", true)}
                        className={`w-full flex items-center px-3 py-2 text-[11px] tracking-[2px] rounded-sm transition-all duration-150 ${activeTab === 'Bookmarks' ? 'bg-[#2C2A26] text-[#D6CCBA]' : 'text-[#3D352F]/70 hover:bg-[#3D352F]/5 hover:text-[#3D352F]'}`}
                      >
                        <Bookmark className="w-3 h-3 mr-3" />
                        <span className="uppercase mt-px">Bookmarks</span>
                      </button>
                    </li>
                    <li>
                      <button
                        onClick={() => goToTab("Settings", true)}
                        className={`w-full flex items-center px-3 py-2 text-[11px] tracking-[2px] rounded-sm transition-all duration-150 ${activeTab === 'Settings' ? 'bg-[#2C2A26] text-[#D6CCBA]' : 'text-[#3D352F]/70 hover:bg-[#3D352F]/5 hover:text-[#3D352F]'}`}
                      >
                        <Settings className="w-3 h-3 mr-3" />
                        <span className="uppercase mt-px">Settings</span>
                      </button>
                    </li>
                  </ul>
                </nav>

                {/* Separator */}
                <div className="h-px bg-ink/10 mx-1.5 mb-4"></div>

                {/* Filters */}
                <div className="mb-1">
                  <h2 className="px-3 text-[11px] text-ink-light tracking-[2px] uppercase mb-2">Filter by Genre</h2>
                  <ul className="space-y-0">
                    {genreOptions.map((genre) => (
                      <li key={genre}>
                        <button
                          onClick={() => { setActiveGenre(genre); goToTab("Library", false, false); }}
                          className={`w-full flex items-center justify-between px-3 py-1.5 text-[11px] tracking-[2px] rounded-sm transition-all duration-150 ${activeGenre === genre ? 'text-ink bg-sidebar' : 'text-ink/70 hover:text-ink hover:bg-ink/5'}`}
                        >
                          <span className="uppercase mt-px">{genre}</span>
                          {activeGenre === genre && <div className="w-1 h-1 rounded-full bg-crimson"></div>}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Footer info */}
              <div className="py-4 mt-auto">
                <div className="flex items-center justify-center text-ink-light/70 text-[8px] italic tracking-[1px] uppercase">
                  <Info className="w-3 h-3 mr-1.5" />
                  All texts in the public domain
                </div>
              </div>
            </>
          );

          return returnedFromReader ? (
            <motion.aside initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: 0.4 }} className={sidebarClass}>
              {sidebarContent}
            </motion.aside>
          ) : (
            <aside className={sidebarClass}>
              {sidebarContent}
            </aside>
          );
        })()}

        <main className="flex-1 flex flex-col h-screen overflow-hidden">
          {/* Header */}
          <header className="flex items-center justify-between px-8 pt-8 pb-8 text-ink-light shrink-0 border-b border-transparent">
            <div className="flex items-center flex-1">
              <h2 className="text-[11px] tracking-[2px] uppercase text-ink">
                {activeTab === 'Settings' ? 'Settings' : (activeTab === 'Home' ? 'Upload Ebook' : (activeTab === 'Bookmarks' ? 'Bookmarks' : (activeGenre === 'All' ? 'All Manuscripts' : `${activeGenre} Manuscripts`)))}
              </h2>
              <div className="h-px bg-ink/10 flex-1 ml-6 mr-12"></div>
            </div>
            {activeTab !== 'Settings' && activeTab !== 'Home' && (
              <div className="flex items-center text-[11px] tracking-[2px] flex-shrink-0">
                <span className="italic mr-2">{filteredManuscripts.length} <span className="not-italic">volume{filteredManuscripts.length !== 1 ? 's' : ''}</span></span>
                <SlidersHorizontal className="w-3.5 h-3.5 ml-4" />
              </div>
            )}
          </header>

          {/* Scrollable Main Area */}
          <div className="flex-1 overflow-y-auto px-8 pb-8">
            {activeTab === 'Settings' ? (
              <div className="max-w-[560px] mt-4">
                <p className="italic text-[13px] text-ink/80 leading-relaxed mb-6">
                  Customise your reading experience. Changes apply immediately and are stored for this session.
                </p>

                <div className="space-y-3">
                  {/* Card 1 */}
                  <div className="border border-ink/10 bg-settings p-5 rounded-sm">
                    <div className="flex items-center mb-2 text-ink">
                      <Type className="w-3.5 h-3.5 mr-2.5" strokeWidth={1.5} />
                      <h3 className="text-[11px] tracking-[2px] uppercase mt-0.5">Type Size</h3>
                    </div>
                    <p className="text-[12px] text-ink/80 italic mb-4">Adjust the manuscript body type size.</p>
                    <div className="flex gap-2.5">
                      {['small', 'medium', 'large'].map((size) => (
                        <button
                          key={size}
                          onClick={() => setTypeSize(size)}
                          className={`px-5 py-2.5 rounded-sm text-[9px] tracking-[1.5px] uppercase transition-colors ${typeSize === size ? 'bg-ink-dark text-page' : 'border border-ink/15 text-ink/70 hover:bg-ink/5'}`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Card 2 */}
                  <div className="border border-ink/10 bg-settings p-5 rounded-sm flex items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center mb-2 text-ink">
                        <Bell className="w-3.5 h-3.5 mr-2.5" strokeWidth={1.5} />
                        <h3 className="text-[11px] tracking-[2px] uppercase mt-0.5">Annotations</h3>
                      </div>
                      <p className="text-[12px] text-ink/80 italic">Show inline margin notes in reader view.</p>
                    </div>
                    <button
                      onClick={() => setAnnotations(!annotations)}
                      className={`shrink-0 w-[42px] h-[24px] rounded-full relative transition-colors border ${annotations ? 'bg-ink-dark border-ink-dark' : 'bg-border-main border-border-main'}`}
                    >
                      <motion.div className="w-[20px] h-[20px] rounded-full bg-settings absolute top-[1px] shadow-sm" animate={{ x: annotations ? 18 : 0 }} transition={{ type: 'spring', stiffness: 400, damping: 28 }}></motion.div>
                    </button>
                  </div>
                </div>
              </div>
            ) : activeTab === 'Home' ? (
              <div className="flex flex-col h-full min-h-[calc(100vh-140px)] -mt-8 -mx-8 relative bg-[#f1ebd9]">
                <div className="absolute inset-x-8 top-8 bottom-8 flex">
                  <HomeUploadView onUpload={handleUpload} />
                </div>
              </div>
            ) : (
              <div className="flex flex-col space-y-8">
                {/* Continue Reading Banner */}
                {activeTab === 'Library' && lastReadBook && activeGenre === 'All' && !searchQuery && (
                  <motion.button
                    onClick={() => {
                      const book = allManuscripts.find((entry) => entry.id === lastRead.bookId);
                      if (book) openBook(book);
                    }}
                    className="w-full flex bg-banner border border-ink/10 rounded-sm relative overflow-hidden group hover:border-ink/20 hover:shadow-sm transition-all text-left h-[120px] shrink-0"
                    initial={{ y: -10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.45 }}
                    whileTap={{ scale: 0.985 }}
                  >
                    <div
                      className="absolute inset-x-0 top-0 bottom-0 z-0 opacity-80"
                      style={{ WebkitMaskImage: 'linear-gradient(to left, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 60%)', maskImage: 'linear-gradient(to left, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 60%)' }}
                    >
                      <img
                        src="https://images.unsplash.com/photo-1599839619722-39751411ea63?q=80&w=800&auto=format&fit=crop&sat=-100"
                        alt="Generated page visual"
                        className="w-full h-full object-cover mix-blend-overlay opacity-30 saturate-0 fade-in"
                      />
                      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'repeating-linear-gradient(-45deg, #000 0, #000 1px, transparent 1px, transparent 10px)' }} />
                    </div>

                    <div className="absolute inset-0 z-10 flex flex-col justify-between p-6 pl-8">
                      <div className="flex items-center w-[200px]">
                        <span className="text-[9px] tracking-[2px] uppercase text-ink/50 whitespace-nowrap font-medium">Continue Reading</span>
                        <div className="flex items-center gap-[6px] ml-3">
                          {[0, 1, 2, 3, 4].map(i => (
                            <motion.div key={i} className="w-[3px] h-[3px] rounded-full bg-ink/20" animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 3, repeat: Infinity, delay: i * 0.18 }} />
                          ))}
                        </div>
                        <div className="flex-1 h-[1px] bg-ink/10 ml-3"></div>
                      </div>

                      <div className="flex items-end justify-between">
                        <div>
                          <h3 className="italic text-[26px] text-ink mb-1.5 leading-none">{lastReadBook.title}</h3>
                          <p className="text-[10px] tracking-[2px] text-ink/60 uppercase">
                            {lastReadBook.author}
                            {lastReadBook.chapters && lastReadBook.chapters[lastRead.chapterIndex] && (
                              <>
                                <span className="mx-2 opacity-30">·</span>
                                {lastReadBook.chapters[lastRead.chapterIndex].title}
                              </>
                            )}
                          </p>
                        </div>
                        <motion.div whileTap={{ scale: 0.95 }} className="bg-ink text-banner px-5 py-2.5 rounded-full flex items-center shadow-md border border-black/20 hover:bg-ink-dark transition-colors mr-2 group/resume">
                          <motion.span className="inline-flex" whileHover={{ x: 2 }} transition={{ type: 'spring', stiffness: 400, damping: 28 }}>
                            <BookOpen className="w-3.5 h-3.5 mr-2 opacity-90" />
                          </motion.span>
                          <span className="text-[10px] tracking-[1.5px] uppercase font-medium">Resume</span>
                        </motion.div>
                      </div>
                    </div>

                    <div className="absolute right-[15%] top-1/2 -translate-y-1/2 select-none pointer-events-none text-ink/5 italic text-[140px] leading-none font-serif z-0">
                      {lastReadBook.letter}
                    </div>
                  </motion.button>
                )}

                <div className="grid gap-5 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
                  {filteredManuscripts.length > 0 ? filteredManuscripts.map((book, idx) => (
                    <BookCard
                      key={book.id}
                      book={book}
                      idx={idx}
                      bookmarkedIds={bookmarkedIds}
                      setBookmarkedIds={setBookmarkedIds}
                      openBook={openBook}
                    />
                  )) : (
                    <EmptyState
                      title={activeTab === 'Bookmarks' ? 'No saved books' : 'No manuscripts found'}
                      body={activeTab === 'Bookmarks' ? 'Bookmark a manuscript from the library and it will appear here.' : 'Try a different search or genre filter.'}
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
}

