"use client";

import { useTransition } from "react";
import { DatabaseZap, Loader2 } from "lucide-react";
import { importExistingImages } from "@/app/admin/(panel)/media/actions";
import { toast } from "@/components/admin/toast";
import { Button } from "@/components/ui/button";

/** "Import existing images": lists every image the catalogue already uses in the library. Safe to run again. */
export function ImportButton() {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      variant="outline"
      disabled={pending}
      title="Add the images products, kits, categories and blog posts already use to the library. Safe to run again: images already listed are skipped."
      onClick={() =>
        startTransition(async () => {
          const result = await importExistingImages();
          if (!result.ok) return void toast.error(result.message);
          // The action revalidates /admin/media, so the grid updates in the same round trip.
          toast.success(result.message);
        })
      }
    >
      {pending ? <Loader2 className="animate-spin" /> : <DatabaseZap />} {pending ? "Importing…" : "Import existing images"}
    </Button>
  );
}
