"use client";

import { useRouter } from "next/navigation";
import { dismissToast, useToasts } from "./shop-state";

// Basket/wishlist confirmations styled like the source's Sonner "rich colors" success toast (top centre).
export function Toaster() {
  const toasts = useToasts();
  const router = useRouter();
  return (
    <ol
      aria-live="polite"
      className="pointer-events-none fixed top-4 left-1/2 z-[70] flex w-[calc(100%-2rem)] max-w-[356px] -translate-x-1/2 flex-col gap-3.5 sm:top-6"
    >
      {toasts.map((t) => (
        <li
          key={t.id}
          className="fc-rise pointer-events-auto relative flex items-center gap-1.5 rounded-lg border border-[hsl(145,92%,87%)] bg-[hsl(143,85%,96%)] p-4 text-[13px] text-[hsl(140,100%,27%)] shadow-[0_4px_12px_rgba(0,0,0,0.1)]"
        >
          <button
            type="button"
            aria-label="Close toast"
            onClick={() => dismissToast(t.id)}
            className="absolute -top-1.5 -left-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-[hsl(145,92%,87%)] bg-[hsl(143,85%,96%)] transition-colors hover:bg-white"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
          <svg viewBox="0 0 20 20" fill="currentColor" height="20" width="20" aria-hidden="true" className="mr-1 shrink-0">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
              clipRule="evenodd"
            />
          </svg>
          <div className="min-w-0 flex-1 leading-normal font-medium">
            {t.title}
            {t.description && <div className="font-normal">{t.description}</div>}
          </div>
          {t.action && (
            <button
              type="button"
              onClick={() => {
                dismissToast(t.id);
                router.push(t.action!.href);
              }}
              className="ml-auto h-6 shrink-0 rounded px-2 text-xs font-medium text-white bg-black"
            >
              {t.action.label}
            </button>
          )}
        </li>
      ))}
    </ol>
  );
}
