"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Archive, Copy, Loader2, MoreHorizontal, Trash2 } from "lucide-react";
import { archiveProduct, deleteProduct, duplicateProduct } from "@/app/admin/(panel)/products/actions";
import { toast } from "@/components/admin/toast";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { ProductStatus } from "./types";

/** Duplicate / archive / delete for the product being edited. */
export function ProductActions({
  id,
  sku,
  status,
  orderCount,
  usedInKits,
  dirty,
}: {
  id: string;
  sku: string;
  status: ProductStatus;
  orderCount: number;
  usedInKits: number;
  dirty: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const blockedReason =
    orderCount > 0
      ? `It appears on ${orderCount} order ${orderCount === 1 ? "line" : "lines"}, so it can't be deleted. Archive it instead to hide it from the shop and keep order history intact.`
      : usedInKits > 0
        ? `It's a component of ${usedInKits} ${usedInKits === 1 ? "kit" : "kits"}. Remove it from those kits first, or archive it instead.`
        : null;

  const unsavedOk = (what: string) => !dirty || window.confirm(`You have unsaved changes. ${what} without them?`);

  const duplicate = () => {
    if (!unsavedOk("Duplicate the last saved version")) return;
    startTransition(async () => {
      const result = await duplicateProduct(id);
      if (!result.ok) return void toast.error(result.message);
      toast.success(result.message);
      router.push(`/admin/products/${result.data.id}`);
    });
  };

  const archive = () => {
    if (!unsavedOk("Archive and discard them")) return;
    startTransition(async () => {
      const result = await archiveProduct(id);
      if (result.ok) toast.success(result.message);
      else toast.error(result.message);
    });
  };

  const remove = () =>
    startTransition(async () => {
      // On success the action redirects to the products list.
      const result = await deleteProduct(id);
      if (result && !result.ok) {
        toast.error(result.message);
        setConfirmDelete(false);
      }
    });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button type="button" variant="outline" size="sm" disabled={pending} aria-label="More actions" />}>
          {pending ? <Loader2 className="animate-spin" /> : <MoreHorizontal />} More
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={duplicate}>
            <Copy /> Duplicate as draft
          </DropdownMenuItem>
          {status !== "archived" && (
            <DropdownMenuItem onClick={archive}>
              <Archive /> Archive
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={() => setConfirmDelete(true)}>
            <Trash2 /> Delete…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{blockedReason ? `${sku} can't be deleted` : `Delete ${sku}?`}</AlertDialogTitle>
            <AlertDialogDescription>
              {blockedReason ??
                "This permanently removes the product, its images, category links and related-product links. It can't be undone. To hide it from the shop but keep it, archive it instead."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            {blockedReason ? (
              status !== "archived" && (
                <Button
                  type="button"
                  onClick={() => {
                    setConfirmDelete(false);
                    archive();
                  }}
                >
                  <Archive /> Archive instead
                </Button>
              )
            ) : (
              <Button type="button" variant="destructive" onClick={remove} disabled={pending}>
                {pending ? <Loader2 className="animate-spin" /> : <Trash2 />} Delete permanently
              </Button>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
