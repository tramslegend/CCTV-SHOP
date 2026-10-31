"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { toast } from "./toast";

/**
 * Shows a one-off success toast after a redirect (e.g. "?deleted=SKU") and removes the parameter from the URL,
 * so reloading or sharing the page doesn't repeat it.
 */
export function FlashToast({ message, param }: { message: string; param: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const shown = useRef(false);
  useEffect(() => {
    if (shown.current) return;
    shown.current = true;
    toast.success(message);
    const params = new URLSearchParams(searchParams.toString());
    params.delete(param);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [message, param, pathname, router, searchParams]);
  return null;
}
