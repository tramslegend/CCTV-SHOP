import { SiteShell } from "@/components/sites/cctvmaster/site-shell";

// Every route other than the homepage shares the store chrome.
export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return <SiteShell variant="store">{children}</SiteShell>;
}
