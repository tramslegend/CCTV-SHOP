import Link from "next/link";
import Image from "next/image";
import type { MegaMenu } from "@/lib/navigation/menu";
import { cn } from "@/lib/utils";
import { ArrowRightIcon, ChevronRightIcon } from "./icons";

/** Menu picture, or an empty tile when there's none. */
function Thumb({ src, size }: { src: string; size: number }) {
  return src ? <Image src={src} alt="" width={size} height={size} className="h-full w-full object-contain" /> : null;
}

/** A category's menu, generated from its subcategories (see src/lib/navigation/menu.ts). */
export function MegaMenuPanel({ category, top }: { category: MegaMenu; top: number }) {
  return (
    <div className="fixed inset-x-0 z-60" style={{ top }}>
      <div className="border-t border-border bg-white shadow-lg dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto max-w-450 px-4 py-6 md:px-6 lg:px-8">
          <div className="mb-6 flex items-center justify-between border-b border-border pb-4 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-white">
                <Thumb src={category.icon} size={40} />
              </div>
              <div>
                <h3 className="text-foreground text-lg font-semibold">{category.name}</h3>
                <p className="text-muted-foreground text-xs">{category.groups.length} subcategories</p>
              </div>
            </div>
            <Link
              className="group/viewall flex items-center gap-2 rounded-lg bg-[#047857]/[0.063] px-4 py-2 text-sm font-medium text-[#047857] transition-all duration-200"
              href={category.href}
            >
              View All
              <ArrowRightIcon className="h-4 w-4 transition-transform duration-200 group-hover/viewall:translate-x-1" />
            </Link>
          </div>
          <div className={cn("grid gap-6 grid-cols-1 lg:grid-cols-2", category.wide && "xl:grid-cols-3")}>
            {category.groups.map((group) => (
              <div key={group.href} className="group/card">
                <Link
                  className="group/header mb-3 flex items-center gap-3 rounded-lg p-2 transition-all duration-200"
                  href={group.href}
                >
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-white">
                    <Thumb src={group.icon} size={48} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-foreground group-hover/header:text-primary truncate font-semibold transition-colors duration-200">
                      {group.name}
                    </h4>
                    {group.items.length > 0 && (
                      <p className="text-muted-foreground text-xs">{group.items.length} types</p>
                    )}
                  </div>
                  <ChevronRightIcon className="h-4 w-4 -translate-x-2 opacity-0 transition-all duration-200 group-hover/header:translate-x-0 group-hover/header:opacity-100" />
                </Link>
                {group.items.length > 0 && (
                  <div className="grid grid-cols-2 gap-1.5 pl-2">
                    {group.items.map((item) => (
                      <Link
                        key={item.href}
                        className="group/item flex items-center gap-2 rounded-md p-1 transition-all duration-200"
                        href={item.href}
                      >
                        <div className="relative h-7 w-7 shrink-0 overflow-hidden rounded bg-white">
                          <Thumb src={item.icon} size={28} />
                        </div>
                        <span className="text-muted-foreground group-hover/item:text-foreground truncate text-xs transition-colors duration-200">
                          {item.name}
                        </span>
                        <div className="ml-auto h-1.5 w-1.5 rounded-full bg-[#047857] opacity-0 transition-opacity duration-200 group-hover/item:opacity-100" />
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
