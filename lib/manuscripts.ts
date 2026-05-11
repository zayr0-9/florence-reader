"use client";

import { BookFormat, BookRecord } from "@/lib/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ManuscriptChapter = {
  title: string;
  paragraphs: string[];
};

export type Manuscript = {
  id: string | number;
  backendId?: string;
  genre: string;
  year: string;
  letter: string;
  title: string;
  author: string;
  description: string;
  time: string;
  colorHex: string;
  colorBgText: string;
  chapters: ManuscriptChapter[];
  source?: string;
};

// ---------------------------------------------------------------------------
// Static data – built-in sample manuscripts
// ---------------------------------------------------------------------------

export const manuscripts: Manuscript[] = [
  {
    id: 1,
    backendId: "book-dune",
    genre: "POETRY",
    year: "c. 1390",
    letter: "W",
    title: "The Canterbury Tales",
    author: "GEOFFREY CHAUCER",
    description:
      "Twenty-four tales told by pilgrims journeying to Canterbury — bawdy, holy, comic, and tragic all at once.",
    time: "12 h",
    colorHex: "#6C2424",
    colorBgText: "#9F4E4E",
    chapters: [
      {
        title: "General Prologue",
        paragraphs: [
          "W han that Aprille with his shoures soote,\nThe droghte of March hath perced to the roote,\nAnd bathed every veyne in swich licour\nOf which vertu engendred is the flour;",
          "Whan Zephirus eek with his sweete breeth\nInspired hath in every holt and heeth\nThe tendre croppes, and the yonge sonne\nHath in the Ram his half cours yronne,",
          "And smale foweles maken melodye,\nThat slepen al the nyght with open ye\n(So priketh hem nature in hir corages),\nThanne longen folk to goon on pilgrimages.",
        ],
      },
    ],
  },
  {
    id: 2,
    backendId: "book-frankenstein",
    genre: "EPIC",
    year: "c. 9th C.",
    letter: "S",
    title: "Beowulf",
    author: "ANONYMOUS",
    description:
      "The oldest surviving major work in Old English — a warrior of the Geats faces monsters and mortality.",
    time: "4 h",
    colorHex: "#304D36",
    colorBgText: "#4B7351",
    chapters: [
      {
        title: "The Danish Kings",
        paragraphs: [
          "S o. The Spear-Danes in days gone by\nand the kings who ruled them had courage and greatness.\nWe have heard of those princes' heroic campaigns.",
          "There was Shield Sheafson, scourge of many tribes,\na wrecker of mead-benches, rampaging among foes.\nThis terror of the hall-troops had come far.\nA foundling to start with, he would flourish later on",
          "as his powers waxed and his worth was proved.\nIn the end each clan on the outlying coasts\nbeyond the whale-road had to yield to him\nand begin to pay tribute. That was one good king.",
        ],
      },
      {
        title: "Heorot is Attacked",
        paragraphs: [
          "T hen out of the night came the shadow-stalker,\nstealthy and swift. The hall-guards were slack,\nasleep at their posts, except for one;",
          "it was widely known that God's strict power\nwould preserve the man whom the monster sought\nif it were not His will that the creature kill.",
        ],
      },
    ],
  },
  {
    id: 3,
    backendId: "book-mobydick",
    genre: "ROMANCE",
    year: "c. 1470",
    letter: "I",
    title: "Le Morte d'Arthur",
    author: "SIR THOMAS MALORY",
    description:
      "The rise and ruinous fall of King Arthur's court, rendered in grave and magnificent prose.",
    time: "20 h",
    colorHex: "#26365C",
    colorBgText: "#475B8F",
    chapters: [
      {
        title: "Merlin's Prophecy",
        paragraphs: [
          "I t befell in the days of Uther Pendragon, when he was king of all England, and so reigned, that there was a mighty duke in Cornwall that held war against him long time.",
          "And the duke was called the Duke of Tintagil. And so by means King Uther sent for this duke, charging him to bring his wife with him, for she was called a fair lady, and a passing wise.",
          "Then when the king and the duke met together, they were reconciled, but when the king saw Igraine, he loved her exceedingly, and made her great cheer.",
        ],
      },
    ],
  },
  {
    id: 4,
    backendId: "book-dune",
    genre: "ALLEGORY",
    year: "c. 1308",
    letter: "M",
    title: "The Divine Comedy",
    author: "DANTE ALIGHIERI",
    description:
      "A descent through Hell, ascent of Purgatory, and vision of Paradise — the great poem of the medieval soul.",
    time: "15 h",
    colorHex: "#3A1E4B",
    colorBgText: "#66437A",
    chapters: [
      {
        title: "Inferno: Canto I",
        paragraphs: [
          "M idway upon the journey of our life\nI found myself within a forest dark,\nFor the straightforward pathway had been lost.",
          "Ah me! how hard a thing it is to say\nWhat was this forest savage, rough, and stern,\nWhich in the very thought renews the fear.",
          "So bitter is it, death is little more;\nBut of the good to treat, which there I found,\nSpeak will I of the other things I saw there.",
        ],
      },
    ],
  },
  {
    id: 5,
    backendId: "book-frankenstein",
    genre: "CHANSON",
    year: "c. 1040",
    letter: "K",
    title: "The Song of Roland",
    author: "TUROLDUS",
    description:
      "France's oldest epic — a knight's fatal stand at Roncesvaux, betrayal, glory, and divine vengeance.",
    time: "6 h",
    colorHex: "#48441F",
    colorBgText: "#787241",
    chapters: [
      {
        title: "The Council of King Marsile",
        paragraphs: [
          "C arles li reis, nostre emperere magnes\nSet anz tuz pleins ad estét en Espaigne:\nTresqu'en la mer cunquist la tere altaigne.",
          "N'i ad castel ki devant lui remaigne;\nMur ne citét n'i est remés a fraindre,\nFors Sarraguce, ki est en une muntaigne.",
          "Li reis Marsilie la tient, ki Deu nen aimet;\nMahumet sert e Apollin recleimet:\nNes poet guarder que mals ne l'i ateignet.",
        ],
      },
    ],
  },
  {
    id: 6,
    backendId: "book-mobydick",
    genre: "NOVELLA",
    year: "c. 1353",
    letter: "T",
    title: "The Decameron",
    author: "GIOVANNI BOCCACCIO",
    description:
      "A hundred tales told by Florentines sheltering from the Black Death — cunning, lustful, and merciful.",
    time: "25 h",
    colorHex: "#22483D",
    colorBgText: "#437A6A",
    chapters: [
      {
        title: "First Day",
        paragraphs: [
          "W henever, most gracious ladies, I reflect how pitiful you are all by nature, I recognise that this work will, in your judgement, have a grievous and heavy beginning;",
          "for it recalls the doleful memory of the late mortal pestilence, which was terrible and grievous to all who saw it or in other ways knew it.",
          "But I would not have you deterred by this from reading further, as if you were to pass through the whole of your reading in sighs and tears.",
        ],
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const genreOptions = ["All", "PDF", "EPUB", "Uploaded"] as const;

export const typeScale = {
  small: {
    mobile: "text-[14px] leading-[2]",
    desktop: "text-[15px] leading-[2.1]",
  },
  medium: {
    mobile: "text-[15px] leading-[2.1]",
    desktop: "text-[16px] leading-[2.2]",
  },
  large: {
    mobile: "text-[17px] leading-[2.05]",
    desktop: "text-[18px] leading-[2.15]",
  },
} as const;

export type TypeSize = keyof typeof typeScale;

export function getReaderScale(typeSize: string) {
  return (
    typeScale[typeSize as TypeSize] || typeScale.medium
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function detectFormat(fileName: string): BookFormat | null {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".pdf")) return "pdf";
  if (lower.endsWith(".epub")) return "epub";
  return null;
}

export function bookRecordToManuscript(book: BookRecord): Manuscript {
  const isPdf = book.format === "pdf";
  return {
    id: book.id,
    backendId: book.id,
    genre: book.format.toUpperCase(),
    year: book.updatedAt,
    letter: book.title.charAt(0).toUpperCase() || "F",
    title: book.title,
    author: book.author ?? "LOCAL FILE",
    description: book.synopsis,
    time: book.sizeLabel,
    colorHex: isPdf ? "#6C2424" : "#304D36",
    colorBgText: isPdf ? "#9F4E4E" : "#4B7351",
    chapters: [
      {
        title: book.currentUnitLabel,
        paragraphs: [
          book.synopsis,
          "Open this volume to render it with Florence Reader's PDF and EPUB engine.",
        ],
      },
    ],
  };
}

