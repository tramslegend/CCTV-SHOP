import { PackageSearch } from "lucide-react";
import Link from "next/link";

export default function ProductNotFound() {
  return (
    <div className="bg-background">
      <div className="border-b bg-surface/50">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-3">
          <nav aria-label="Breadcrumb">
            <ol className="text-muted-foreground flex flex-wrap items-center gap-2 text-sm">
              <li>
                <Link className="hover:text-foreground transition-colors" href="/">
                  Home
                </Link>
              </li>
              <li className="flex items-center gap-2">
                <span aria-hidden="true">/</span>
                <Link className="hover:text-foreground transition-colors" href="/products">
                  Products
                </Link>
              </li>
              <li className="flex items-center gap-2" aria-current="page">
                <span aria-hidden="true">/</span>
                <span className="text-foreground font-medium">Not found</span>
              </li>
            </ol>
          </nav>
        </div>
      </div>
      <div className="mx-auto flex w-full max-w-7xl min-h-[60vh] flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-16 text-center">
        <div className="fc-rise flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <PackageSearch className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
        </div>
        <p className="mt-6 text-sm font-semibold tracking-wide text-muted-foreground uppercase">Error 404</p>
        <h1 className="font-sentient mt-2 text-3xl leading-[1.1] font-medium tracking-tight text-balance sm:text-4xl">
          We couldn&apos;t find that product
        </h1>
        <p className="text-muted-foreground mt-4 max-w-md text-sm leading-relaxed sm:text-base">
          It may have been renamed or is no longer listed. Have a look through the catalogue or our ready-made kits
          instead.
        </p>
        <div className="mt-8 flex w-full max-w-md flex-col gap-3 sm:flex-row">
          <Link
            href="/products"
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-12 flex-1 items-center justify-center rounded-md px-6 text-base font-semibold shadow transition-colors"
          >
            Browse all products
          </Link>
          <Link
            href="/kits"
            className="border-input bg-background hover:bg-accent inline-flex h-12 flex-1 items-center justify-center rounded-md border px-6 text-base font-semibold shadow-sm transition-colors"
          >
            Ready-made kits
          </Link>
        </div>
        <Link href="/contact" className="text-primary mt-6 text-sm font-medium underline-offset-2 hover:underline">
          Can&apos;t find a part? Ask our team
        </Link>
      </div>
    </div>
  );
}
