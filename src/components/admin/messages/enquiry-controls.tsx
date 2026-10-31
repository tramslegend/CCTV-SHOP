"use client";

import { type FormEvent, useState, useTransition } from "react";
import { Archive, CircleDot, RotateCcw, Send, StickyNote } from "lucide-react";
import { type ActionResult, addEnquiryNote, replyToEnquiry, setEnquiryStatus } from "@/app/admin/(panel)/messages/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { EnquiryStatus } from "@/lib/enquiries/types";

function Notice({ result }: { result: ActionResult | null }) {
  if (!result) return null;
  return (
    <p role={result.ok ? "status" : "alert"} className={result.ok ? "text-sm text-emerald-700" : "text-sm text-red-700"}>
      {result.ok ? result.message : result.error}
    </p>
  );
}

/** New → Open → Closed, and Reopen for closed messages. */
export function StatusControls({ id, status }: { id: number; status: EnquiryStatus }) {
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, start] = useTransition();
  const run = (next: EnquiryStatus) => start(async () => setResult(await setEnquiryStatus(id, next)));

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {status === "new" && (
          <Button variant="outline" disabled={pending} onClick={() => run("open")}>
            <CircleDot /> Mark as open
          </Button>
        )}
        {status !== "closed" ? (
          <Button disabled={pending} onClick={() => run("closed")}>
            <Archive /> Close
          </Button>
        ) : (
          <Button variant="outline" disabled={pending} onClick={() => run("open")}>
            <RotateCcw /> Reopen
          </Button>
        )}
      </div>
      <Notice result={result} />
    </div>
  );
}

export function NoteForm({ id }: { id: number }) {
  const [text, setText] = useState("");
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, start] = useTransition();

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    start(async () => {
      const r = await addEnquiryNote(id, text);
      setResult(r);
      if (r.ok) setText("");
    });
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2">
      <Label htmlFor="enquiry-note" className="sr-only">
        Internal note
      </Label>
      <Textarea
        id="enquiry-note"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        placeholder="Add an internal note — only the back office sees these."
        className="bg-white"
      />
      <div className="flex items-center justify-between gap-3">
        <Notice result={result} />
        <Button type="submit" variant="outline" disabled={pending || !text.trim()} className="ml-auto">
          <StickyNote /> {pending ? "Adding…" : "Add note"}
        </Button>
      </div>
    </form>
  );
}

export function ReplyForm({ id, to, defaultSubject }: { id: number; to: string; defaultSubject: string }) {
  const [subject, setSubject] = useState(defaultSubject);
  const [text, setText] = useState("");
  const [close, setClose] = useState(false);
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, start] = useTransition();

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    start(async () => {
      const r = await replyToEnquiry(id, { subject, text, close });
      setResult(r);
      if (r.ok) {
        setText("");
        setClose(false);
      }
    });
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <p className="text-muted-foreground text-sm">
        Sends an email to <span className="text-foreground font-medium">{to}</span> from the shop and records it below. Their
        reply comes back to the shop inbox.
      </p>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="reply-subject">Subject</Label>
        <Input id="reply-subject" value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={200} required />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="reply-text">Message</Label>
        <Textarea
          id="reply-text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
          placeholder="Write your reply…"
          className="min-h-32 bg-white"
          required
        />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={close}
            onChange={(e) => setClose(e.target.checked)}
            className="size-4 accent-zinc-900"
          />
          Close the message after sending
        </label>
        <Button type="submit" disabled={pending || !text.trim() || !subject.trim()} className="ml-auto">
          <Send /> {pending ? "Sending…" : "Send reply"}
        </Button>
      </div>
      <Notice result={result} />
    </form>
  );
}
