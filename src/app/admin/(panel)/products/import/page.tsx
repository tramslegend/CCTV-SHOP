import Link from "next/link";
import { ChevronLeft, Download, FileDown } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { ImportWizard } from "@/components/admin/products/import-wizard";
import { buttonVariants } from "@/components/ui/button";
import { requireAdmin } from "@/lib/admin/session";

export const metadata = { title: "Import products" };

// File downloads from the export route handler (plain links: there's no page to navigate to).
const EXPORT_URL = "/admin/products/api/export";
const TEMPLATE_URL = `${EXPORT_URL}?template=1`;

export default async function ImportProductsPage() {
  await requireAdmin("products");
  return (
    <>
      <Link href="/admin/products" className="text-muted-foreground hover:text-foreground mb-3 inline-flex items-center gap-1 text-sm">
        <ChevronLeft className="size-4" aria-hidden="true" /> Products
      </Link>
      <PageHeader
        title="Import products"
        description="Add or update many products at once from a spreadsheet. You see every row checked before anything changes."
        actions={
          <>
            <a href={TEMPLATE_URL} className={buttonVariants({ variant: "outline" })} download>
              <FileDown /> Download template
            </a>
            <a href={EXPORT_URL} className={buttonVariants({ variant: "outline" })} download>
              <Download /> Export current products
            </a>
          </>
        }
      />
      <ImportWizard />
    </>
  );
}
