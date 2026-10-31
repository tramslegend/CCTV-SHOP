import Link from "next/link";
import { Fragment } from "react";
import { cn } from "@/lib/utils";

// Renders the tiny markup used in the clone's copy: **bold** and [label](/local-path).
const TOKEN = /(\*\*[^*]+\*\*|\[[^\]]+\]\([^)\s]+\))/g;

export function RichText({ text, linkClassName }: { text: string; linkClassName?: string }) {
  const parts = text.split(TOKEN).filter(Boolean);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={i} className="text-foreground font-semibold">
              {part.slice(2, -2)}
            </strong>
          );
        }
        const link = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(part);
        if (link) {
          const [, label, href] = link;
          const cls = cn("text-primary font-semibold underline", linkClassName);
          return href.startsWith("/") ? (
            <Link key={i} href={href} className={cls}>
              {label}
            </Link>
          ) : href.startsWith("http") ? (
            <a key={i} href={href} className={cls} target="_blank" rel="noopener noreferrer">
              {label}
            </a>
          ) : (
            <a key={i} href={href} className={cls}>
              {label}
            </a>
          );
        }
        return <Fragment key={i}>{part}</Fragment>;
      })}
    </>
  );
}
