"use client";

// Client half of the enquiry spam checks: fetches the signed "form started" token when a form appears and renders
// the hidden honeypot field. See spam.ts for the server half.
import { type RefObject, useCallback, useEffect, useRef } from "react";
import { getEnquiryToken, type SpamFields } from "./actions";
import { HONEYPOT_FIELD } from "./rules";

export function useEnquiryGuard() {
  const token = useRef("");
  const pending = useRef<Promise<string> | null>(null);
  const trapRef = useRef<HTMLInputElement>(null);

  const refreshToken = useCallback(() => {
    token.current = "";
    const request = getEnquiryToken()
      .then((t) => {
        token.current = t;
        return t;
      })
      .catch(() => "")
      .finally(() => {
        if (pending.current === request) pending.current = null;
      });
    pending.current = request;
    return request;
  }, []);

  useEffect(() => {
    void refreshToken();
  }, [refreshToken]);

  /** Anti-spam fields to send with the form's values. */
  const spamFields = useCallback(async (): Promise<SpamFields> => {
    const t = token.current || (await (pending.current ?? refreshToken()));
    return { token: t, [HONEYPOT_FIELD]: trapRef.current?.value ?? "" };
  }, [refreshToken]);

  return { trapRef, spamFields, refreshToken };
}

/** Off-screen field people never see or reach with the keyboard. Anything typed into it marks the form as spam. */
export function HoneypotField({ inputRef }: { inputRef: RefObject<HTMLInputElement | null> }) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute -left-[10000px] h-px w-px overflow-hidden">
      <label>
        Website
        <input ref={inputRef} type="text" name={HONEYPOT_FIELD} tabIndex={-1} autoComplete="off" defaultValue="" />
      </label>
    </div>
  );
}
