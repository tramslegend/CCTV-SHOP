"use client";

import { Copy } from "lucide-react";
import { toast } from "@/components/admin/toast";
import { TOKEN_DEFS, type TokenValues } from "@/lib/content/blocks";

/** The {{placeholders}} that can be typed into page text, with what each shows today. Click to copy. */
export function TokenHelp({ values }: { values: TokenValues }) {
  const copy = async (token: string) => {
    try {
      await navigator.clipboard.writeText(token);
      toast.success(`Copied ${token}. Paste it into any text on this page.`);
    } catch {
      toast.error(`Couldn't copy. Type ${token} instead.`);
    }
  };
  return (
    <details className="group rounded-xl bg-white text-sm ring-1 ring-black/10">
      <summary className="cursor-pointer list-none px-5 py-3.5 font-semibold [&::-webkit-details-marker]:hidden">
        Shop details placeholders
        <span className="text-muted-foreground mt-0.5 block text-xs font-normal">
          Type these into any text and the page shows the current value from Settings, so it stays right if your details change.
        </span>
      </summary>
      <ul className="divide-y border-t">
        {TOKEN_DEFS.map(({ key, label }) => {
          const token = `{{${key}}}`;
          return (
            <li key={key}>
              <button
                type="button"
                onClick={() => void copy(token)}
                className="flex w-full items-start gap-2 px-5 py-2 text-left hover:bg-zinc-50"
                title={`Copy ${token}`}
              >
                <span className="min-w-0 flex-1">
                  <span className="block font-mono text-[12px] text-zinc-900">{token}</span>
                  <span className="text-muted-foreground block truncate text-xs">
                    {label}: {values[key] || <em>not set</em>}
                  </span>
                </span>
                <Copy className="text-muted-foreground mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              </button>
            </li>
          );
        })}
      </ul>
    </details>
  );
}
