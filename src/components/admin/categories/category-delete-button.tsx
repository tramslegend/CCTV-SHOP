"use client";

import { useState, useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { deleteCategory } from "@/app/admin/(panel)/categories/actions";
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

const n = (v: number, one: string, many: string) => `${v.toLocaleString("en-GB")} ${v === 1 ? one : many}`;

/** Delete with a confirmation that says what else changes; refused while the category has sub-categories. */
export function CategoryDeleteButton({
  id,
  name,
  childCount,
  primaryCount,
  linkCount,
  isKitRoot,
}: {
  id: number;
  name: string;
  childCount: number;
  primaryCount: number;
  linkCount: number;
  isKitRoot: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const blocked = isKitRoot
    ? "CCTV Kits holds the shop's kit pages, so it can't be deleted. Hide it instead."
    : childCount > 0
      ? `It has ${n(childCount, "sub-category", "sub-categories")}. Move them to another category or delete them first.`
      : null;

  const remove = () =>
    startTransition(async () => {
      // On success the action redirects to the category list.
      const result = await deleteCategory(id);
      if (result && !result.ok) {
        toast.error(result.message);
        setOpen(false);
      }
    });

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)} disabled={pending}>
        <Trash2 /> Delete…
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{blocked ? `${name} can't be deleted` : `Delete ${name}?`}</AlertDialogTitle>
            <AlertDialogDescription render={<div />}>
              {blocked ?? (
                <div className="flex flex-col gap-2">
                  <p>The category page stops working and the category is removed from the shop menus. Products themselves aren&apos;t deleted.</p>
                  <ul className="list-disc pl-5" data-testid="delete-impact">
                    <li>
                      {primaryCount
                        ? `${n(primaryCount, "product has", "products have")} this as the main category; it will be cleared, so their pages show no category in the breadcrumb until you choose a new one.`
                        : "No product has this as its main category."}
                    </li>
                    <li>{linkCount ? `${n(linkCount, "product listing", "product listings")} in this category will be removed.` : "No products are listed in it."}</li>
                  </ul>
                  <p>This can&apos;t be undone. To take it out of the shop for now, hide it instead.</p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{blocked ? "Close" : "Cancel"}</AlertDialogCancel>
            {!blocked && (
              <Button type="button" variant="destructive" onClick={remove} disabled={pending}>
                {pending ? <Loader2 className="animate-spin" /> : <Trash2 />} Delete category
              </Button>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
