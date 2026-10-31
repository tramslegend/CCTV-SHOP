"use client";

import { ChevronDown, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { ListingSearch } from "./listing-search";
import type { KitNav, KitNavSystem, QueryState, SidebarNode } from "./types";

interface SidebarProps {
  basePath: string;
  query: QueryState;
  allCount: number;
  nodes: SidebarNode[];
  kitNav: KitNav;
  clearHref?: string;
}

/** Left-hand "Categories" panel of every product listing. */
export function ListingSidebar({ basePath, query, allCount, nodes, kitNav, clearHref }: SidebarProps) {
  return (
    <div className="max-h-[calc(100dvh-9rem)] overflow-y-auto rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
      <ListingSearch basePath={basePath} query={query} />
      <div className="space-y-0.5">
        <p className="mb-2 px-1 text-xs font-semibold tracking-wider text-gray-500 uppercase">Categories</p>
        <Link
          href="/products"
          className="flex min-h-11 w-full items-center justify-between rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 transition-colors"
        >
          <span>All Products</span>
          <span className="text-xs text-gray-500">{allCount}</span>
        </Link>
        <div className="space-y-0.5">
          <Link
            href={kitNav.href}
            className="flex min-h-11 w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 hover:text-emerald-700"
          >
            <span>{kitNav.name}</span>
            <span className="text-xs text-gray-600">{kitNav.count}</span>
          </Link>
          {kitNav.systems.map((system) => (
            <KitSystem key={system.slug} system={system} />
          ))}
        </div>
        {nodes.map((node) => (
          <CategoryBranch key={node.slug} node={node} depth={0} />
        ))}
      </div>
      {clearHref ? (
        <Link
          href={clearHref}
          scroll={false}
          className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-lg border border-gray-100 px-3 py-2 text-xs font-medium text-gray-500 transition-colors hover:border-red-100 hover:bg-red-50 hover:text-red-600"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
          Clear filters
        </Link>
      ) : null}
    </div>
  );
}

function KitSystem({ system }: { system: KitNavSystem }) {
  const [open, setOpen] = useState(false);
  const id = `kit-nav-${system.slug}`;
  return (
    <div className="ml-3 border-l border-gray-100 pl-3">
      <div className="flex items-center gap-1">
        <Link
          href={system.href}
          className="flex min-h-11 flex-1 items-center justify-between rounded-lg px-2.5 py-1.5 text-sm text-gray-700 transition-colors hover:bg-gray-50 hover:text-emerald-700"
        >
          <span>{system.name}</span>
          <span className="text-xs text-gray-600">{system.count}</span>
        </Link>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          aria-label={`${open ? "Hide" : "Show"} ${system.name} subcategories`}
          onClick={() => setOpen((v) => !v)}
          className="flex min-h-11 min-w-11 items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} aria-hidden="true" />
        </button>
      </div>
      <div id={id} className={cn("mt-1 mb-2 ml-2.5 space-y-2", !open && "hidden")}>
        {system.groups.map((group) => (
          <div key={group.label}>
            <p className="px-2 pb-0.5 text-[0.6875rem] font-semibold tracking-wide text-gray-600 uppercase">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex min-h-11 w-full items-center justify-between rounded-lg px-2 py-1 text-xs text-gray-600 transition-colors hover:bg-gray-50 hover:text-emerald-700"
                >
                  <span className="truncate">{link.name}</span>
                  <span className="ml-2 shrink-0 text-gray-600">{link.count}</span>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CategoryBranch({ node, depth }: { node: SidebarNode; depth: number }) {
  const [open, setOpen] = useState(false);
  const hasChildren = node.children.length > 0;
  return (
    <div>
      <Link
        href={node.href}
        className={cn(
          "flex min-h-11 w-full items-center gap-1 rounded-lg text-sm transition-colors hover:bg-gray-50 hover:text-emerald-700",
          depth === 0 ? "px-3 py-2 text-gray-700" : "px-2.5 py-1.5 text-gray-600",
        )}
      >
        <span className="flex-1 text-left">{node.name}</span>
        <span className="text-xs text-gray-500">{node.count}</span>
        {hasChildren ? (
          <span
            role="button"
            tabIndex={-1}
            aria-label={`${open ? "Hide" : "Show"} ${node.name} subcategories`}
            aria-expanded={open}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setOpen((v) => !v);
            }}
            className="-m-2 ml-0.5 rounded p-2 hover:bg-emerald-100"
          >
            <ChevronDown
              className={cn("h-3.5 w-3.5 text-gray-500 transition-transform", open && "rotate-180")}
              aria-hidden="true"
            />
          </span>
        ) : null}
      </Link>
      {hasChildren && open ? (
        <div className="mt-0.5 ml-3 space-y-0.5 border-l border-gray-100 pl-3">
          {node.children.map((child) => (
            <CategoryBranch key={child.slug} node={child} depth={depth + 1} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
