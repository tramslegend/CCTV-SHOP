import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export const metadata = { title: "No access" };

export default function NoAccessPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-20 text-center">
      <ShieldAlert className="text-muted-foreground size-10" aria-hidden="true" />
      <h1 className="mt-4 text-xl font-semibold">You don&apos;t have access to this area</h1>
      <p className="text-muted-foreground mt-2 text-sm">Ask the shop owner or an admin to change your role if you need it.</p>
      <Link href="/admin" className={buttonVariants({ className: "mt-6" })}>
        Back to dashboard
      </Link>
    </div>
  );
}
