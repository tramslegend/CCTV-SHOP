import Link from "next/link";
import type { Document, Filter } from "mongodb";
import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { contains, type Doc, db, escapeRegex } from "@/db";
import type { AuditLogRow } from "@/db/schema";
import { requireAdmin } from "@/lib/admin/session";

export const metadata = { title: "Activity" };

const PAGE_SIZE = 50;
const when = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/London" });

/** Short human summary of a recorded change set. */
function summarise(changes: Record<string, unknown> | null) {
  if (!changes) return "";
  return Object.entries(changes)
    .slice(0, 4)
    .map(([key, value]) => {
      const v = value && typeof value === "object" && "to" in value ? (value as { to: unknown }).to : value;
      const text = typeof v === "string" ? v : JSON.stringify(v);
      return `${key}: ${text && text.length > 40 ? `${text.slice(0, 40)}…` : text}`;
    })
    .join(" · ");
}

/**
 * Searchable text of a recorded change set, built by the database (Postgres searched `changes::text`): every key and
 * value, nested objects and lists included (up to `depth` levels), joined by spaces.
 */
function changesText(value: unknown, depth = 6): Document {
  const scalar = (input: unknown) => ({ $convert: { input, to: "string", onError: "", onNull: "" } });
  if (depth === 0) return scalar(value);
  const [x, pairs, item] = [`x${depth}`, `p${depth}`, `e${depth}`];
  return {
    $let: {
      vars: { [x]: value },
      in: {
        $let: {
          vars: {
            // Objects and lists as [{ k, v }] (list items with an empty key); anything else stays a single value.
            [pairs]: {
              $switch: {
                branches: [
                  { case: { $eq: [{ $type: `$$${x}` }, "object"] }, then: { $objectToArray: `$$${x}` } },
                  { case: { $isArray: `$$${x}` }, then: { $map: { input: `$$${x}`, as: item, in: { k: "", v: `$$${item}` } } } },
                ],
                default: null,
              },
            },
          },
          in: {
            $cond: [
              { $eq: [`$$${pairs}`, null] },
              scalar(`$$${x}`),
              {
                $reduce: {
                  input: `$$${pairs}`,
                  initialValue: "",
                  in: { $concat: ["$$value", " ", "$$this.k", " ", changesText("$$this.v", depth - 1)] },
                },
              },
            ],
          },
        },
      },
    },
  };
}

export default async function ActivityPage({ searchParams }: PageProps<"/admin/activity">) {
  await requireAdmin("activity");
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const entity = typeof sp.entity === "string" ? sp.entity : "";
  const page = Math.max(1, Number(sp.page) || 1);

  const filters: Filter<Doc<AuditLogRow>>[] = [];
  if (entity) filters.push({ entity });
  if (q) {
    const like = contains(q);
    filters.push({
      $or: [
        { actorEmail: like },
        { action: like },
        { entityId: like },
        { $expr: { $regexMatch: { input: changesText("$changes"), regex: escapeRegex(q), options: "i" } } },
      ],
    });
  }
  const where = filters.length ? { $and: filters } : {};

  const [rows, n, entities] = await Promise.all([
    db.auditLog
      .find(where)
      .sort({ createdAt: -1 })
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .toArray(),
    db.auditLog.countDocuments(where),
    db.auditLog.distinct("entity").then((list) => list.sort()),
  ]);
  const pages = Math.max(1, Math.ceil(n / PAGE_SIZE));
  const href = (p: number) => `/admin/activity?${new URLSearchParams({ ...(q && { q }), ...(entity && { entity }), page: String(p) })}`;

  return (
    <>
      <PageHeader title="Activity" description="Every change made in the back office, newest first." />
      <form className="mb-4 flex flex-wrap gap-2" action="/admin/activity">
        <Input name="q" defaultValue={q} placeholder="Search by person, action, record or detail" className="max-w-xs" />
        <select
          name="entity"
          defaultValue={entity}
          className="border-input h-8 rounded-lg border bg-transparent px-2.5 text-sm"
          aria-label="Record type"
        >
          <option value="">All records</option>
          {entities.map((e) => (
            <option key={e} value={e}>
              {e}
            </option>
          ))}
        </select>
        <button type="submit" className={buttonVariants({ variant: "outline" })}>
          Filter
        </button>
      </form>
      <div className="rounded-xl border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>Who</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Record</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground py-10 text-center">
                  No activity yet.
                </TableCell>
              </TableRow>
            )}
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="whitespace-nowrap tabular-nums">{when.format(r.createdAt)}</TableCell>
                <TableCell>{r.actorEmail ?? "system"}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{r.action}</Badge>
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {r.entity}
                  {r.entityId && <span className="text-muted-foreground"> #{r.entityId.slice(0, 12)}</span>}
                </TableCell>
                <TableCell className="text-muted-foreground max-w-md truncate text-xs">{summarise(r.changes)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="mt-4 flex items-center justify-between text-sm">
        <p className="text-muted-foreground">
          {n.toLocaleString("en-GB")} entries · page {page} of {pages}
        </p>
        <div className="flex gap-2">
          {page > 1 && (
            <Link href={href(page - 1)} className={buttonVariants({ variant: "outline", size: "sm" })}>
              Previous
            </Link>
          )}
          {page < pages && (
            <Link href={href(page + 1)} className={buttonVariants({ variant: "outline", size: "sm" })}>
              Next
            </Link>
          )}
        </div>
      </div>
    </>
  );
}
