"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowDown, ArrowUp, ChevronDown, ChevronsUpDown, Loader2, X } from "lucide-react";
import { bulkUpdateProducts } from "@/app/admin/(panel)/products/actions";
import { toast } from "@/components/admin/toast";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatGBP, withVat } from "@/lib/cctvmaster/money";
import { cn } from "@/lib/utils";
import { type ListSort, type ListState, defaultSortDir, listHref } from "./list-url";
import { ProductThumb } from "./product-thumb";
import { AvailabilityLabel, StatusBadge } from "./status-badges";
import { MONO } from "./utils";
import { AVAILABILITIES, AVAILABILITY_LABELS, type Availability, PRODUCT_STATUSES, type ProductStatus, STATUS_LABELS } from "./types";

export interface ProductTableRow {
  id: string;
  name: string;
  sku: string;
  brand: string | null;
  status: ProductStatus;
  availability: Availability;
  price: number;
  compareAtPrice: number | null;
  stock: number | null;
  trackStock: boolean;
  isContactSales: boolean;
  isCallForPrice: boolean;
  isKit: boolean;
  image: string | null;
  /** Category path, top-level first. */
  category: string[] | null;
  /** Pre-formatted on the server (avoids time-zone hydration differences). */
  updatedLabel: string;
}

function SortHeader({ state, sort, label, className }: { state: ListState; sort: ListSort; label: string; className?: string }) {
  const active = state.sort === sort;
  const nextDir = active ? (state.dir === "asc" ? "desc" : "asc") : defaultSortDir(sort);
  const Icon = !active ? ChevronsUpDown : state.dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <TableHead className={className} aria-sort={active ? (state.dir === "asc" ? "ascending" : "descending") : undefined}>
      <Link
        href={listHref(state, { sort, dir: nextDir })}
        scroll={false}
        className={cn("inline-flex items-center gap-1 hover:text-foreground", active ? "text-foreground" : "text-muted-foreground")}
      >
        {label}
        <Icon className="size-3.5" aria-hidden="true" />
      </Link>
    </TableHead>
  );
}

export function ProductsTable({ rows, state }: { rows: ProductTableRow[]; state: ListState }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [pending, startTransition] = useTransition();

  // Selection only covers rows on this page; ids that left the page are ignored.
  const visible = rows.filter((r) => selected.has(r.id));
  const all = rows.length > 0 && visible.length === rows.length;
  const some = visible.length > 0 && !all;

  const toggle = (id: string, on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  const apply = (change: { status: ProductStatus } | { availability: Availability }, label: string) => {
    const ids = visible.map((r) => r.id);
    if (!ids.length) return;
    startTransition(async () => {
      const result = await bulkUpdateProducts(ids, change);
      if (result.ok) {
        toast.success(result.data.count ? `${result.message} ${label}.` : result.message);
        setSelected(new Set());
      } else toast.error(result.message);
    });
  };

  return (
    <div className="overflow-hidden rounded-xl bg-white ring-1 ring-black/10">
      {visible.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-b bg-surface px-3 py-2 text-sm" role="toolbar" aria-label="Bulk actions">
          <span className="font-medium">{visible.length} selected</span>
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button type="button" variant="outline" size="sm" disabled={pending} />}>
              Set status <ChevronDown />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              <DropdownMenuGroup>
                <DropdownMenuLabel>Set status to</DropdownMenuLabel>
                {PRODUCT_STATUSES.map((s) => (
                  <DropdownMenuItem key={s} onClick={() => apply({ status: s }, `Status: ${STATUS_LABELS[s].toLowerCase()}`)}>
                    {STATUS_LABELS[s]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button type="button" variant="outline" size="sm" disabled={pending} />}>
              Set availability <ChevronDown />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              <DropdownMenuGroup>
                <DropdownMenuLabel>Set availability to</DropdownMenuLabel>
                {AVAILABILITIES.map((a) => (
                  <DropdownMenuItem key={a} onClick={() => apply({ availability: a }, `Availability: ${AVAILABILITY_LABELS[a].toLowerCase()}`)}>
                    {AVAILABILITY_LABELS[a]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          {pending && <Loader2 className="text-muted-foreground size-4 animate-spin" aria-label="Updating" />}
          <Button type="button" variant="ghost" size="sm" className="ml-auto" onClick={() => setSelected(new Set())}>
            <X /> Clear selection
          </Button>
        </div>
      )}
      <Table className={cn(pending && "opacity-60")}>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-10 pl-3">
              <Checkbox
                aria-label={all ? "Deselect all on this page" : "Select all on this page"}
                checked={all}
                indeterminate={some}
                onCheckedChange={(on) => setSelected(on ? new Set(rows.map((r) => r.id)) : new Set())}
              />
            </TableHead>
            <TableHead className="w-12">
              <span className="sr-only">Image</span>
            </TableHead>
            <SortHeader state={state} sort="name" label="Product" />
            <TableHead className="hidden xl:table-cell">Category</TableHead>
            <SortHeader state={state} sort="price" label="Price" className="text-right [&>a]:justify-end" />
            <SortHeader state={state} sort="stock" label="Stock" />
            <TableHead>Status</TableHead>
            <SortHeader state={state} sort="updated" label="Updated" className="hidden md:table-cell" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => {
            const href = `/admin/products/${r.id}`;
            const isSelected = selected.has(r.id);
            return (
              <TableRow
                key={r.id}
                data-state={isSelected ? "selected" : undefined}
                className="cursor-pointer"
                onClick={(e) => {
                  if ((e.target as HTMLElement).closest("a, button, [role='checkbox'], input")) return;
                  if (e.metaKey || e.ctrlKey) window.open(href, "_blank");
                  else router.push(href);
                }}
              >
                <TableCell className="pl-3">
                  <Checkbox aria-label={`Select ${r.sku}`} checked={isSelected} onCheckedChange={(on) => toggle(r.id, on)} />
                </TableCell>
                <TableCell>
                  <ProductThumb src={r.image} alt="" size={40} />
                </TableCell>
                <TableCell className="max-w-[26rem] min-w-56 whitespace-normal">
                  <Link href={href} className="line-clamp-2 font-medium hover:underline">
                    {r.name}
                  </Link>
                  <p className="text-muted-foreground mt-0.5 flex items-center gap-1.5 text-xs">
                    <span className={MONO}>{r.sku}</span>
                    {r.isKit && <span className="rounded border px-1 text-[10px] leading-4 font-medium text-foreground/80">KIT</span>}
                    {r.brand && <span className="truncate">· {r.brand}</span>}
                  </p>
                </TableCell>
                <TableCell className="text-muted-foreground hidden max-w-56 whitespace-normal xl:table-cell">
                  {r.category ? (
                    <>
                      <span className="text-foreground line-clamp-1">{r.category.at(-1)}</span>
                      {r.category.length > 1 && <span className="line-clamp-1 text-xs">{r.category.slice(0, -1).join(" › ")}</span>}
                    </>
                  ) : (
                    <span className="text-xs">Uncategorised</span>
                  )}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  <p className="font-medium">{formatGBP(withVat(r.price))}</p>
                  <p className="text-muted-foreground text-xs">{formatGBP(r.price)} ex VAT</p>
                  {(r.isCallForPrice || r.isContactSales) && (
                    <p className="text-xs text-amber-700">{r.isCallForPrice ? "Call for price" : "Contact sales"}</p>
                  )}
                </TableCell>
                <TableCell>
                  <AvailabilityLabel availability={r.availability} />
                  {r.trackStock && <p className="text-muted-foreground text-xs tabular-nums">{r.stock ?? 0} in stock</p>}
                </TableCell>
                <TableCell>
                  <StatusBadge status={r.status} />
                </TableCell>
                <TableCell className="text-muted-foreground hidden text-xs md:table-cell">{r.updatedLabel}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
