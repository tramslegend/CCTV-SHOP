"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, RotateCcw } from "lucide-react";
import { BestSellerList } from "./best-sellers";
import { type BestSeller, type FinderRow, filterQuery, type KitFilters, type KitUse, PRICE_BANDS } from "./kit-model";

type QuestionId = "property" | "cabling" | "detail" | "budget";

interface Answer {
  value: string;
  label: string;
  sub?: string;
  test: (r: FinderRow) => boolean;
  filter: KitFilters;
  summary?: string;
}

interface Question {
  id: QuestionId;
  question: string;
  help: string;
  answers: Answer[];
}

const QUESTIONS: Question[] = [
  {
    id: "property",
    question: "Where are the cameras going?",
    help: "This only picks a starting number of cameras. You can change it later.",
    answers: (
      [
        ["home", "A house", "Front door, back garden and the drive. Four cameras is normal.", "home / small property"],
        ["small-business", "A shop or small business", "Entrance, till, stockroom and the back. Normally six to eight.", "shop or small business"],
        ["large-property", "A big property or a yard", "Gates, outbuildings and long boundaries. Between eight and sixteen.", "large property or yard"],
        ["commercial", "A commercial site", "Over sixteen cameras, or more than one building.", "commercial site"],
      ] as const
    ).map(([value, label, sub, summary]) => ({
      value,
      label,
      sub,
      summary,
      test: (r: FinderRow) => r[0] === value,
      filter: { use: value as KitUse },
    })),
  },
  {
    id: "cabling",
    question: "Is there old camera cable you can reuse?",
    help: "Have a look at any old camera on the wall. If there's nothing up yet, choose the first answer.",
    answers: [
      {
        value: "network",
        label: "No, I'm starting from scratch",
        sub: "Each camera gets one network cable that carries both picture and power. Most new systems work this way.",
        summary: "IP (PoE)",
        test: (r) => r[1] === "IP",
        filter: { system: "IP" },
      },
      {
        value: "coax",
        label: "Yes, there's cable from an old system",
        sub: "It's round, with a metal plug that screws on. These kits use it again, so no new cable needs running.",
        summary: "Turbo HD (coax)",
        test: (r) => r[1] === "ANALOG",
        filter: { system: "ANALOG" },
      },
    ],
  },
  {
    id: "detail",
    question: "How clear do you want the picture?",
    help: "All our kits record day and night. What this changes is how far you can zoom in on a recording later.",
    answers: [
      {
        value: "standard",
        label: "Not fussed — show me the lot",
        sub: "All our kits record day and night. You can narrow it down by price afterwards if you like.",
        test: () => true,
        filter: {},
      },
      {
        value: "high",
        label: "Sharp — make out a face across the garden",
        sub: "The usual pick for homes. 5MP or higher.",
        summary: "5MP+",
        test: (r) => r[2] >= 5,
        filter: { resmin: 5 },
      },
      {
        value: "4k",
        label: "Sharpest — zoom right in afterwards",
        sub: "4K: four times the detail. It fills the hard drive quicker.",
        summary: "4K",
        test: (r) => r[2] === 8,
        filter: { res: 8 },
      },
    ],
  },
  {
    id: "budget",
    question: "What's your rough budget?",
    help: "Each kit costs exactly what its parts add up to, and you or your electrician fit it.",
    answers: PRICE_BANDS.map((b) => ({
      value: b.value,
      label: b.label,
      summary: b.label,
      test: (r: FinderRow) => r[3] === b.value,
      filter: { price: b.value },
    })),
  },
];

const PICKS_FOR: Record<string, BestSeller["use"][]> = {
  home: ["home"],
  "small-business": ["business", "yard"],
  "large-property": ["yard", "business"],
  commercial: ["business", "yard"],
};

const linkButton =
  "text-muted-foreground hover:text-foreground min-h-11 text-sm underline underline-offset-4";

/** "Not sure what to get? Try four quick questions" — narrows the local kit list as you answer. */
export function KitFinder({
  rows,
  bestSellers,
  listingPath = "/kits",
}: {
  rows: FinderRow[];
  bestSellers: BestSeller[];
  listingPath?: string;
}) {
  const [picked, setPicked] = useState<Answer[]>([]);
  const [done, setDone] = useState(false);
  const step = picked.length;
  const remaining = rows.filter((r) => picked.every((a) => a.test(r)));

  const restart = () => {
    setPicked([]);
    setDone(false);
  };

  if (done || step >= QUESTIONS.length) {
    const n = remaining.length;
    const filters = picked.reduce<KitFilters>((f, a) => ({ ...f, ...a.filter }), {});
    // Same order as the source: cable, place, detail, budget.
    const order: QuestionId[] = ["cabling", "property", "detail", "budget"];
    const summary = order
      .map((id) => picked.find((a) => QUESTIONS.find((q) => q.id === id)?.answers.includes(a))?.summary)
      .filter(Boolean)
      .join(" · ");
    const property = picked.find((a) => QUESTIONS[0].answers.includes(a));
    const uses = PICKS_FOR[property?.value ?? "home"];
    const picks = bestSellers
      .filter((b) => uses.includes(b.use))
      .sort((a, b) => uses.indexOf(a.use) - uses.indexOf(b.use) || a.rank - b.rank)
      .slice(0, 3);
    return (
      <div className="border-border bg-card rounded-2xl border p-5 sm:p-7">
        <div className="text-muted-foreground mb-2 font-mono text-[11px] font-semibold tracking-wider uppercase">
          What you told us
        </div>
        <h3 className="text-foreground text-xl font-bold sm:text-2xl">
          {n === 0 ? "No boxed kit matches that yet" : `${n.toLocaleString("en-GB")} ${n === 1 ? "kit matches" : "kits match"} what you told us`}
        </h3>
        {summary && <p className="text-muted-foreground mt-2 text-sm">{summary}</p>}
        {n === 0 && (
          <p className="text-muted-foreground mt-2 text-sm">
            We don&apos;t list a kit like that. The kit builder can put it together for you, part by part.
          </p>
        )}
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          {n > 0 ? (
            <Link
              href={`${listingPath}${filterQuery(filters)}#prebuilt-kits`}
              className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-6 text-base font-semibold transition-colors"
            >
              {n === 1 ? "See it" : "See them"}
              <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </Link>
          ) : (
            <Link
              href="/kit-builder/cctv"
              className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-6 text-base font-semibold transition-colors"
            >
              Build it one part at a time
              <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </Link>
          )}
          <button
            type="button"
            onClick={restart}
            className="border-border hover:border-primary inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border px-6 text-sm font-semibold transition-colors"
          >
            Start over
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        {picks.length > 0 && (
          <div className="mt-6">
            <section>
              <p className="text-foreground mb-3 text-base font-semibold">
                Most people with {(property?.label ?? "A house").replace(/^A /, "a ")} choose
              </p>
              <BestSellerList items={picks} wide={false} />
            </section>
          </div>
        )}
      </div>
    );
  }

  const q = QUESTIONS[step];
  const options = q.answers
    .map((a) => ({ a, count: remaining.filter(a.test).length }))
    .filter((o) => o.count > 0);
  const dropped = q.answers.length - options.length;

  return (
    <div className="border-border bg-card rounded-2xl border p-5 sm:p-7">
      <div className="text-muted-foreground mb-2 font-mono text-[11px] font-semibold tracking-wider uppercase">
        Step {step + 1} of {QUESTIONS.length}
      </div>
      <h3 className="text-foreground text-xl font-bold text-balance sm:text-2xl">{q.question}</h3>
      <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{q.help}</p>
      <div className="mt-5 grid grid-cols-1 gap-3">
        {options.map(({ a, count }) => (
          <button
            key={a.value}
            type="button"
            onClick={() => setPicked([...picked, a])}
            className="border-border hover:border-primary focus-visible:ring-ring flex min-h-[4.5rem] w-full flex-col justify-center rounded-2xl border-2 p-4 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            <span className="text-foreground block text-base font-semibold">{a.label}</span>
            {a.sub && <span className="text-muted-foreground mt-1 block text-sm leading-snug">{a.sub}</span>}
            <span className="text-muted-foreground mt-1.5 block text-xs">
              {count.toLocaleString("en-GB")} {count === 1 ? "kit fits" : "kits fit"}
            </span>
          </button>
        ))}
      </div>
      {dropped > 0 && (
        <p className="text-muted-foreground mt-3 text-xs">
          {dropped === 1
            ? "1 other answer doesn't match any kit we sell, so we've left it out."
            : `${dropped} other answers don't match any kit we sell, so we've left them out.`}{" "}
          <Link href="/kit-builder" className="underline underline-offset-4">
            The kit builder can still put that together
          </Link>
        </p>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-4">
        {step === 0 ? (
          <Link href={`${listingPath}#prebuilt-kits`} className={`${linkButton} inline-flex items-center`}>
            Skip this — show me every kit
          </Link>
        ) : (
          <>
            <button type="button" className={linkButton} onClick={() => setPicked(picked.slice(0, -1))}>
              Back
            </button>
            <button type="button" className={linkButton} onClick={() => setDone(true)}>
              That&apos;s enough, show me
            </button>
          </>
        )}
      </div>
    </div>
  );
}
