"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Copy, Loader2, MoreHorizontal, Trash2 } from "lucide-react";
import { deletePost, duplicatePost } from "@/app/admin/(panel)/content/blog/actions";
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

/** Duplicate / delete for the post being edited. */
export function PostActions({
  id,
  title,
  dirty,
  linkedFrom,
}: {
  id: number;
  title: string;
  dirty: boolean;
  linkedFrom: { products: number; posts: number };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const duplicate = () => {
    if (dirty && !window.confirm("You have unsaved changes. Duplicate the last saved version without them?")) return;
    startTransition(async () => {
      const result = await duplicatePost(id);
      if (!result.ok) return void toast.error(result.message);
      toast.success(result.message);
      router.push(`/admin/content/blog/${result.data.id}`);
    });
  };

  const remove = () =>
    startTransition(async () => {
      // On success the action redirects to the blog list.
      const result = await deletePost(id);
      if (result && !result.ok) {
        toast.error(result.message);
        setConfirmDelete(false);
      }
    });

  const links = [
    linkedFrom.products && `${linkedFrom.products} ${linkedFrom.products === 1 ? "product links" : "products link"} to it as a helpful guide`,
    linkedFrom.posts && `${linkedFrom.posts} ${linkedFrom.posts === 1 ? "post lists" : "posts list"} it as related reading`,
  ].filter(Boolean);

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
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={() => setConfirmDelete(true)}>
            <Trash2 /> Delete…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{title}”?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the post; its address will show “not found”. It can&apos;t be undone.
              {links.length ? ` ${links.join(", and ")}: those links are removed too.` : ""} To hide it but keep it, set it to draft or archived instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button type="button" variant="destructive" onClick={remove} disabled={pending}>
              {pending ? <Loader2 className="animate-spin" /> : <Trash2 />} Delete permanently
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
