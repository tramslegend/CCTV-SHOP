// Class strings copied from cctvmaster.co.uk's auth, cart and checkout markup, shared by the commerce/account pages.

/** The source's `.container` (max 1280px, centred, 1rem → 1.5rem → 2rem gutters). */
export const CONTAINER = "mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8";

export const cardShadow = "shadow-[0_1px_2px_rgba(0,0,0,0.04),0_24px_48px_-12px_rgba(0,0,0,0.08)]";

export const eyebrow =
  "mb-3 flex items-center gap-3 font-mono text-[10px] font-medium tracking-[0.18em] text-zinc-500 uppercase";

export const authLabel = "block font-mono text-[10px] font-medium tracking-[0.14em] text-zinc-500 uppercase";

export const authInput =
  "h-11 w-full rounded-md border border-zinc-200 bg-white px-3.5 text-sm text-zinc-950 placeholder:text-zinc-400 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 aria-[invalid=true]:border-red-600";

export const primaryButton =
  "inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-70";

export const secondaryButton =
  "inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-900 transition-colors hover:border-zinc-300 hover:bg-zinc-50 focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2 focus-visible:outline-none";

export const formAlert = "rounded-md border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700";

export const fieldError = "text-xs text-red-700";

/** shadcn button bases the source's cart uses. */
export const shadcnButton =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0";
export const shadcnPrimary = "bg-primary text-primary-foreground shadow hover:bg-primary/90";
export const shadcnOutline = "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground";

/** Checkout form controls. */
export const checkoutLabel = "mb-1 block text-sm font-medium text-zinc-700";
export const checkoutInput =
  "h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-base text-zinc-950 placeholder:text-zinc-400 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 aria-[invalid=true]:border-red-600 md:text-sm";
export const linkButton =
  "text-primary inline-flex min-h-11 items-center text-sm font-semibold underline underline-offset-4 hover:no-underline focus-visible:ring-primary rounded-sm focus-visible:ring-2 focus-visible:outline-none disabled:opacity-50";

/** Account dashboard cards. */
export const panel = "rounded-xl border border-zinc-200 bg-white";
export const emeraldButton =
  "inline-flex h-11 items-center justify-center gap-2 rounded-md bg-emerald-700 px-5 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-60";
export const outlineButton =
  "inline-flex h-11 items-center justify-center gap-2 rounded-md border border-zinc-200 bg-white px-5 text-sm font-semibold text-zinc-900 transition-colors hover:border-zinc-300 hover:bg-zinc-50 focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2 focus-visible:outline-none";
