import { PostForm } from "@/components/admin/content/post-form";
import { requireAdmin } from "@/lib/admin/session";
import { getShopSettings } from "@/lib/settings/server";
import { todayInUk } from "../../_lib/format";
import { emptyPostValues, loadPostOptions } from "../_lib/data";

export const metadata = { title: "New blog post" };

export default async function NewPostPage() {
  await requireAdmin("content");
  const [postOptions, shop] = await Promise.all([loadPostOptions(), getShopSettings()]);
  return <PostForm mode="create" initialValues={emptyPostValues()} postOptions={postOptions} storeName={shop.store.name} today={todayInUk()} />;
}
