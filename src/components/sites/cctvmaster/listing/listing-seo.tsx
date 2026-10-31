import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import styles from "./listing.module.css";

export interface PageCopy {
  /** Optional h2 above the intro. */
  heading?: string;
  /** Paragraphs; `**text**` renders bold. */
  intro: string[];
  chooseHeading?: string;
  choose: { label: string; text: string }[];
  outro?: string;
  faqHeading: string;
  faqs: { q: string; a: string }[];
}

export interface GuideLink {
  slug: string;
  title: string;
  excerpt?: string;
}

const slugId = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

/** Renders `**bold**` spans inside a sentence. */
function rich(text: string): ReactNode {
  return text.split("**").map((part, i) => (i % 2 ? <strong key={i}>{part}</strong> : <Fragment key={i}>{part}</Fragment>));
}

/** Copy block under a listing: intro, "How to choose" list and an FAQ, as laid out on the source. */
export function ListingCopy({ copy }: { copy: PageCopy }) {
  const ChooseHeading = copy.heading ? "h3" : "h2";
  return (
    <div className="mx-auto w-full max-w-4xl px-4 pt-10 pb-6 sm:px-6">
      <div className={styles.prose}>
        {copy.heading ? <h2 id={slugId(copy.heading)}>{copy.heading}</h2> : null}
        {copy.intro.map((p, i) => (
          <p key={i}>{rich(p)}</p>
        ))}
        {copy.choose.length ? (
          <>
            <ChooseHeading id="how-to-choose">{copy.chooseHeading ?? "How to choose"}</ChooseHeading>
            <ul>
              {copy.choose.map((item) => (
                <li key={item.label}>
                  <strong>{item.label}</strong>: {rich(item.text)}
                </li>
              ))}
            </ul>
          </>
        ) : null}
        {copy.outro ? <p>{rich(copy.outro)}</p> : null}
      </div>
      {copy.faqs.length ? <Faq heading={copy.faqHeading} faqs={copy.faqs} /> : null}
    </div>
  );
}

export function Faq({ heading, faqs }: { heading: string; faqs: { q: string; a: string }[] }) {
  return (
    <div className="mt-8">
      <h2 className="text-xl font-bold tracking-[-0.02em]">{heading}</h2>
      <div className="divide-border mt-3 divide-y">
        {faqs.map((f) => (
          <details key={f.q} className="group py-3">
            <summary className="cursor-pointer list-none text-sm font-medium sm:text-base">{f.q}</summary>
            <p className="text-muted-foreground mt-2 text-sm leading-relaxed sm:text-base">{f.a}</p>
          </details>
        ))}
      </div>
    </div>
  );
}

/** "Related guides" cards linking to blog posts. */
export function RelatedGuides({ guides }: { guides: GuideLink[] }) {
  if (!guides.length) return null;
  return (
    <section aria-labelledby="category-guides-heading" className="mx-auto w-full max-w-4xl px-4 pt-8 pb-6 sm:px-6">
      <h2 id="category-guides-heading" className="text-xl font-bold tracking-[-0.02em]">
        Related guides
      </h2>
      <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 [&>*]:min-w-0">
        {guides.map((g) => (
          <li key={g.slug}>
            <Link
              href={`/blog/${g.slug}`}
              className="border-border bg-card hover:border-primary block h-full rounded-lg border p-4 transition-colors"
            >
              <span className="text-foreground block text-sm font-semibold break-words">{g.title}</span>
              {g.excerpt ? (
                <span className="text-muted-foreground mt-1 line-clamp-2 block text-xs leading-relaxed">{g.excerpt}</span>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-sm">
        <Link href="/guides" className="text-primary font-semibold underline-offset-2 hover:underline">
          All guides →
        </Link>
      </p>
    </section>
  );
}
