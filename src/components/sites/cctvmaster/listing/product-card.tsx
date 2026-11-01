import { ArrowRight, Package } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { splitPrice, withVat } from "@/lib/cctvmaster/money";
import type { ProductCard as ProductCardData } from "@/lib/cctvmaster/types";
import { cn } from "@/lib/utils";
import { Price } from "../price";
import { CartIconButton, CompareToggle } from "./card-actions";

export const CARD_SIZES = "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1536px) 340px, 25vw";

/** Listing card as on cctvmaster.co.uk: plain (image, name, price) or "decide" (summary line, maker, chips, Good for). */
export function ProductCard({ card, eager = false }: { card: ProductCardData; eager?: boolean }) {
  const decide = card.decide;
  const href = `/products/${card.slug}`;
  const image = card.imageUrl ?? card.image;
  return (
    <div className="flex h-full flex-col gap-2">
      <Link
        href={href}
        className="group flex flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-white transition-all duration-300 hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-[0_18px_30px_-16px_rgba(16,185,129,0.25)] focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:outline-none"
      >
        <div className="relative aspect-square w-full shrink-0 overflow-hidden bg-white">
          {image ? (
            <Image
              src={image}
              alt={decide ? "" : card.name}
              fill
              sizes={CARD_SIZES}
              loading={eager ? "eager" : "lazy"}
              fetchPriority={eager ? "high" : undefined}
              className="object-contain p-2.5 transition-transform duration-500 ease-out group-hover:scale-105"
            />
          ) : (
            <span className="absolute inset-0 flex items-center justify-center text-zinc-300">
              <Package className="h-10 w-10" aria-hidden="true" />
            </span>
          )}
        </div>
        <div className="flex flex-1 flex-col p-4">
          <h2
            className={cn(
              "text-sm font-bold tracking-[-0.02em] text-zinc-900 transition-colors group-hover:text-emerald-800",
              decide ? "line-clamp-3" : "line-clamp-2",
            )}
          >
            {decide ? (
              <>
                {decide.title}
                <span className="sr-only"> — {card.name}</span>
              </>
            ) : (
              card.name
            )}
          </h2>
          {decide?.maker ? (
            <p className="mt-0.5 truncate text-[11px] tracking-wide text-zinc-500">{decide.maker}</p>
          ) : null}
          {decide?.chips.length ? (
            <ul className="mt-2 flex flex-wrap gap-1">
              {decide.chips.map((chip) => (
                <li
                  key={chip.key}
                  className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] leading-4 text-emerald-900"
                >
                  {chip.value}
                </li>
              ))}
            </ul>
          ) : null}
          {decide?.goodFor ? (
            <p className="mt-2 text-xs text-zinc-600">
              <span className="font-semibold text-zinc-800">{decide.goodForLabel ?? "Good for"}:</span> {decide.goodFor}
            </p>
          ) : null}
          <p className="mt-2">
            <Price value={splitPrice(withVat(card.price))} size="md" className="text-emerald-700" />
          </p>
          <div className="mt-auto flex items-center justify-between gap-2 pt-3">
            <CartIconButton
              item={{ slug: card.slug, name: card.name, sku: card.sku, price: card.price, image }}
            />
            <span className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700 group-hover:underline">
              View Details
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
          </div>
        </div>
      </Link>
      {decide?.compare && card.sku ? (
        <CompareToggle
          name={card.name}
          item={{ slug: card.slug, sku: card.sku, title: decide.title, image }}
        />
      ) : null}
    </div>
  );
}
