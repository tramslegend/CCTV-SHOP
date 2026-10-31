import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PostForm } from "@/components/admin/content/post-form";
import { db } from "@/db";
import { requireAdmin } from "@/lib/admin/session";
import { getShopSettings } from "@/lib/settings/server";
import { todayInUk } from "../../_lib/format";
import { loadPostForm, loadPostOptions } from "../_lib/data";

const parseId = (v: string) => (/^\d{1,9}$/.test(v) ? Number(v) : null);

export async function generateMetadata(props: PageProps<"/admin/content/blog/[id]">): Promise<Metadata> {
  await requireAdmin("content");
  const id = parseId((await props.params).id);
  const post = id ? await db.blogPosts.findOne({ _id: id }, { projection: { _id: 0, title: 1 } }) : null;
  return { title: post ? `Edit ${post.title.slice(0, 60)}` : "Post not found" };
}

export default async function EditPostPage(props: PageProps<"/admin/content/blog/[id]">) {
  await requireAdmin("content");
  const id = parseId((await props.params).id);
  if (!id) notFound();
  const [form, postOptions, shop] = await Promise.all([loadPostForm(id), loadPostOptions(), getShopSettings()]);
  if (!form) notFound();
  return (
    <PostForm
      // A successful save changes the saved time: the form remounts with the saved values as its new baseline.
      key={form.meta.updatedAt}
      mode="edit"
      initialValues={form.values}
      meta={form.meta}
      postOptions={postOptions}
      storeName={shop.store.name}
      today={todayInUk()}
    />
  );
}
