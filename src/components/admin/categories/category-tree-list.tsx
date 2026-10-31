"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ArrowDown, ArrowUp, CornerDownRight, Eye, EyeOff, FolderTree, Loader2, Pencil, Plus } from "lucide-react";
import { moveCategory, setCategoryVisibility } from "@/app/admin/(panel)/categories/actions";
import { MONO } from "@/components/admin/products/utils";
import { toast } from "@/components/admin/toast";
import { Button, buttonVariants } from "@/components/ui/button";
import type { CategoryTreeRow } from "@/lib/admin/categories/types";
import { cn } from "@/lib/utils";
import { VisibilityBadge } from "./visibility-badge";

const n = (v: number) => v.toLocaleString("en-GB");

function CountCell({ row }: { row: CategoryTreeRow }) {
  if (row.isKitRange)
    return (
      <div className="min-w-0 text-right">
        <p className="text-sm tabular-nums">
          {n(row.count)} {row.count === 1 ? "kit" : "kits"}
        </p>
        <p className="text-muted-foreground truncate text-xs" title={row.customRule ? "Rule set here" : "Built-in rule for this slug"}>
          {row.rule}
          {row.customRule && <span className="ml-1 font-medium text-amber-700">· custom</span>}
        </p>
      </div>
    );
  return (
    <div className="text-right">
      <p className="text-sm tabular-nums">
        {n(row.count)} {row.count === 1 ? "product" : "products"}
      </p>
      {row.liveCount !== row.count && <p className="text-muted-foreground text-xs tabular-nums">{n(row.liveCount)} in the shop</p>}
    </div>
  );
}

/** One section of the category tree (shop categories or kit ranges) with per-row actions. */
export function CategoryTreeList({ rows, emptyText }: { rows: CategoryTreeRow[]; emptyText: string }) {
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<number | null>(null);

  const run = (row: CategoryTreeRow, action: () => Promise<{ ok: boolean; message: string }>) => {
    setBusyId(row.id);
    startTransition(async () => {
      try {
        const result = await action();
        if (result.ok) toast.success(result.message);
        else toast.error(result.message);
      } catch {
        toast.error("That didn't work. Check your connection and try again.");
      } finally {
        setBusyId(null);
      }
    });
  };

  const toggle = (row: CategoryTreeRow) => {
    if (row.visible && row.childCount > 0 && !window.confirm(`Hide ${row.name} from the shop? Its ${row.childCount} sub-categories are hidden too.`)) return;
    run(row, () => setCategoryVisibility(row.id, !row.visible));
  };

  if (!rows.length)
    return (
      <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
        <FolderTree className="text-muted-foreground size-7" aria-hidden="true" />
        <p className="text-muted-foreground text-sm">{emptyText}</p>
      </div>
    );

  return (
    <ul className="divide-y">
      {rows.map((row) => {
        const busy = pending && busyId === row.id;
        return (
          <li key={row.id} className={cn("grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-4 py-2.5 sm:grid-cols-[minmax(0,1fr)_9rem_8.5rem_auto]", busy && "opacity-60")}>
            {/* Indentation is the row's depth in the tree. */}
            <div className="flex min-w-0 items-center gap-1.5" style={{ paddingLeft: `${row.depth * 1.25}rem` }}>
              {row.depth > 0 && <CornerDownRight className="text-muted-foreground/60 size-3.5 shrink-0" aria-hidden="true" />}
              <div className="min-w-0">
                <Link href={`/admin/categories/${row.id}`} className={cn("block truncate text-sm hover:underline", row.depth === 0 && "font-semibold")}>
                  {row.name}
                </Link>
                <p className={cn("text-muted-foreground truncate text-xs", MONO)}>/{row.slug}</p>
              </div>
            </div>
            <div className="hidden sm:block">
              <CountCell row={row} />
            </div>
            <div className="hidden sm:block">
              <VisibilityBadge visible={row.visible} hiddenByParent={row.hiddenByParent} />
            </div>
            <div className="flex items-center justify-end gap-0.5">
              {busy && <Loader2 className="text-muted-foreground mr-1 size-3.5 animate-spin" aria-hidden="true" />}
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Move ${row.name} up`}
                title="Move up"
                disabled={row.isFirst || pending}
                onClick={() => run(row, () => moveCategory(row.id, "up"))}
              >
                <ArrowUp />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Move ${row.name} down`}
                title="Move down"
                disabled={row.isLast || pending}
                onClick={() => run(row, () => moveCategory(row.id, "down"))}
              >
                <ArrowDown />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={row.visible ? `Hide ${row.name}` : `Show ${row.name}`}
                title={row.visible ? "Hide from the shop" : "Show in the shop"}
                disabled={pending}
                onClick={() => toggle(row)}
              >
                {row.visible ? <EyeOff /> : <Eye />}
              </Button>
              <Link
                href={`/admin/categories/new?parent=${row.id}`}
                className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
                aria-label={`Add a sub-category to ${row.name}`}
                title={row.isKitRange ? "Add a kit range below" : "Add a sub-category"}
              >
                <Plus />
              </Link>
              <Link
                href={`/admin/categories/${row.id}`}
                className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
                aria-label={`Edit ${row.name}`}
                title="Edit"
              >
                <Pencil />
              </Link>
            </div>
            <div className="col-span-2 flex items-center justify-between gap-3 sm:hidden">
              <VisibilityBadge visible={row.visible} hiddenByParent={row.hiddenByParent} />
              <CountCell row={row} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
