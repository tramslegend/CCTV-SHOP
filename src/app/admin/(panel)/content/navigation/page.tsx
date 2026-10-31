import { NavigationEditor } from "@/components/admin/navigation/navigation-editor";
import { requireAdmin } from "@/lib/admin/session";
import { navigationEditorData } from "@/lib/navigation/admin";
import { linkWarnings } from "@/lib/navigation/link-check";
import { navigationLinks } from "@/lib/navigation/validation";

export const metadata = { title: "Navigation" };

export default async function AdminNavigationPage() {
  await requireAdmin("content");
  const { values, meta, hiddenCategories } = await navigationEditorData();
  const warnings = await linkWarnings(navigationLinks(values));
  return <NavigationEditor initial={values} initialWarnings={warnings} meta={meta} hiddenCategories={hiddenCategories} />;
}
