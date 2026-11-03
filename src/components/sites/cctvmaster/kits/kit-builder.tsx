"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Cable,
  Check,
  HardDrive,
  Minus,
  Plus,
  RotateCcw,
  ShieldCheck,
  ShoppingCart,
  SlidersHorizontal,
  TriangleAlert,
  Wifi,
  X,
  Zap,
} from "lucide-react";
import { withVat } from "@/lib/cctvmaster/money";
import { cn } from "@/lib/utils";
import { cartStore, showToast } from "../shop-state";
import {
  ampsFor,
  type BuilderCamera,
  type BuilderCatalog,
  type BuilderLine,
  type BuilderOptionItem,
  type BuilderPart,
  type BuilderSeed,
  daysFor,
  resName,
  tbLabel,
} from "./builder-model";
import { gbp, type KitSystem } from "./kit-model";

type StepId =
  | "system"
  | "resolution"
  | "cameras"
  | "channels"
  | "recorder"
  | "storage"
  | "power"
  | "cables"
  | "extras"
  | "summary";

const STEP_TITLES: Record<StepId, string> = {
  system: "Your system",
  resolution: "How much detail",
  cameras: "Your cameras",
  channels: "Recorder size",
  recorder: "Your recorder",
  storage: "How long to keep",
  power: "Power",
  cables: "Cable",
  extras: "Extras",
  summary: "Your system",
};

const stepsFor = (system?: KitSystem): StepId[] => [
  "system",
  "resolution",
  "cameras",
  "channels",
  "recorder",
  "storage",
  ...(system === "IP" ? [] : (["power"] as StepId[])),
  "cables",
  "extras",
  "summary",
];

interface State {
  step: StepId;
  system?: KitSystem;
  res?: number;
  cameras: BuilderLine[];
  channels?: number;
  recorder?: BuilderLine;
  /** null: the customer chose to leave it out. */
  drive?: BuilderLine | null;
  psu?: BuilderLine | null;
  cables: BuilderLine[];
  accessories: BuilderLine[];
}

const EMPTY: State = { step: "system", cameras: [], cables: [], accessories: [] };

function stateFromSeed(seed: BuilderSeed): State {
  const of = (role: BuilderLine["role"]) => seed.lines.filter((l) => l.role === role);
  return {
    step: "summary",
    system: seed.system,
    res: seed.res,
    cameras: of("camera"),
    channels: seed.channels,
    recorder: of("recorder")[0],
    drive: of("drive")[0] ?? null,
    psu: of("psu")[0] ?? (seed.system === "IP" ? undefined : null),
    cables: of("cable"),
    accessories: of("accessory"),
  };
}

const RES_WORDS: Record<number, { word: string; sentence: string }> = {
  2: { word: "good", sentence: "You'll see what happened — and who, if they got close to the camera. It's the cheapest way to cover your property." },
  3: { word: "sharper", sentence: "A step up from Full HD, still easy on the hard drive." },
  4: { word: "sharper", sentence: "Clear enough to make out a face at your front door, or a car parked on a short drive." },
  5: { word: "sharp", sentence: "Make out a face across the garden, and zoom into a recording without it going blurry. The one most homes go for." },
  8: { word: "sharpest", sentence: "You get four times the detail you'd get from the cheapest one, so you can zoom right in afterwards. It fills the hard drive quicker." },
};

const RUNG_SUBS = [
  "Long enough to notice something and look back for it.",
  "The usual choice — covers you for a fortnight away.",
  "For a place you don't visit often.",
];

const exVatTotal = (lines: BuilderLine[]) => lines.reduce((sum, l) => sum + l.part.price * l.qty, 0);
const incVat = (lines: BuilderLine[]) => withVat(Math.round(exVatTotal(lines) * 100) / 100);
const lineTotal = (l: BuilderLine) => Math.round(withVat(l.part.price) * l.qty * 100) / 100;
const camCount = (cams: BuilderLine[]) => cams.reduce((n, c) => n + c.qty, 0);
const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

function joinList(parts: string[]) {
  return parts.length < 2 ? parts.join("") : `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}`;
}

// ---------- small UI pieces ----------

function Thumb({ src, size = "h-14 w-14" }: { src?: string; size?: string }) {
  return (
    <span className={cn("bg-muted relative block shrink-0 overflow-hidden rounded-xl", size)}>
      {src && <Image src={src} alt="" fill sizes="56px" className="object-cover" />}
    </span>
  );
}

function IconBox({ children }: { children: ReactNode }) {
  return <span className="bg-muted flex h-12 w-12 items-center justify-center rounded-xl">{children}</span>;
}

function NumberBox({ value, unit }: { value: string | number; unit: string }) {
  return (
    <span className="bg-muted flex h-12 w-12 flex-col items-center justify-center rounded-xl">
      <span className="text-base leading-none font-bold">{value}</span>
      <span className="text-[10px] font-medium opacity-70">{unit}</span>
    </span>
  );
}

function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-[11px] font-semibold tracking-wide">
      {children}
    </span>
  );
}

function Choice({
  type = "radio",
  name,
  value,
  selected,
  onPick,
  media,
  title,
  badges,
  sub,
  chip,
  price,
  each,
  children,
}: {
  type?: "radio" | "checkbox";
  name: string;
  value: string;
  selected: boolean;
  onPick: () => void;
  media?: ReactNode;
  title: ReactNode;
  badges?: ReactNode;
  sub?: ReactNode;
  chip?: ReactNode;
  price?: string;
  each?: boolean;
  children?: ReactNode;
}) {
  return (
    <div>
      <label
        className={cn(
          "group has-[:focus-visible]:ring-ring relative flex min-h-[4.5rem] w-full cursor-pointer items-center gap-3.5 rounded-2xl border-2 p-4 transition-[border-color,background-color,transform] active:scale-[0.99] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-offset-2",
          selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 hover:bg-muted/40",
        )}
      >
        <input
          type={type}
          name={name}
          value={value}
          checked={selected}
          onChange={() => undefined}
          onClick={onPick}
          className="sr-only"
        />
        {media && <div className="shrink-0">{media}</div>}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-foreground line-clamp-2 text-base leading-snug font-semibold">{title}</span>
            {badges}
          </div>
          {sub && <p className="text-muted-foreground mt-1 line-clamp-3 text-sm leading-snug">{sub}</p>}
          {chip && <p className="text-foreground/80 bg-muted mt-2 rounded-lg px-2.5 py-1.5 text-xs leading-snug">{chip}</p>}
        </div>
        {price && (
          <div className="shrink-0 text-right text-sm font-semibold">
            <span className="block">
              {price}
              {each && <span className="text-muted-foreground block text-xs font-normal">each</span>}
            </span>
          </div>
        )}
        <span
          aria-hidden="true"
          className={cn(
            "flex h-6 w-6 shrink-0 items-center justify-center border-2 transition-colors",
            type === "radio" ? "rounded-full" : "rounded-md",
            selected ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/30",
          )}
        >
          {selected && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
        </span>
      </label>
      {children}
    </div>
  );
}

function Stepper({
  label,
  value,
  onLess,
  onMore,
  moreDisabled,
}: {
  label: string;
  value: number;
  onLess: () => void;
  onMore: () => void;
  moreDisabled?: boolean;
}) {
  const btn =
    "border-border bg-background hover:border-primary/40 flex h-11 w-11 items-center justify-center rounded-xl border-2 transition-colors disabled:opacity-40";
  return (
    <div role="group" aria-label={label} className="flex items-center gap-2">
      <button type="button" className={btn} aria-label={`One less: ${label}`} onClick={onLess}>
        <Minus className="h-4 w-4" aria-hidden="true" />
      </button>
      <output className="min-w-8 text-center text-lg font-bold tabular-nums">{value}</output>
      <button type="button" className={btn} aria-label={`One extra: ${label}`} onClick={onMore} disabled={moreDisabled}>
        <Plus className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}

function Hint({ summary, children }: { summary: string; children: ReactNode }) {
  return (
    <details className="border-border bg-muted/30 mt-4 rounded-xl border">
      <summary className="text-foreground flex min-h-12 cursor-pointer list-none items-center px-4 text-sm font-medium">
        {summary}
      </summary>
      <div className="text-muted-foreground border-border/60 border-t px-4 py-3 text-sm leading-relaxed">{children}</div>
    </details>
  );
}

function StepHeader({ title, help }: { title: string; help?: ReactNode }) {
  return (
    <header className="mb-5">
      <h2 className="text-foreground text-[1.375rem] leading-tight font-bold text-balance sm:text-2xl">{title}</h2>
      {help && <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{help}</p>}
    </header>
  );
}

// ---------- the builder ----------

export function KitBuilder({ catalog, seed }: { catalog: BuilderCatalog; seed?: BuilderSeed }) {
  const router = useRouter();
  const [s, setS] = useState<State>(() => (seed ? stateFromSeed(seed) : EMPTY));
  const [busy, setBusy] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);
  const firstRender = useRef(true);

  const steps = stepsFor(s.system);
  const index = steps.indexOf(s.step);
  const total = s.system === "IP" ? 9 : 10;

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [s.step]);

  const camTotal = camCount(s.cameras);
  const maxCamRes = Math.max(0, ...s.cameras.map((c) => c.res ?? 0));
  const lines: BuilderLine[] = useMemo(
    () =>
      [...s.cameras, s.recorder, s.drive, s.psu, ...s.cables, ...s.accessories].filter(
        (l): l is BuilderLine => !!l && l.qty > 0,
      ),
    [s],
  );
  const totalInc = incVat(lines);

  const compatible = catalog.recorders.filter((r) => r.system === s.system && r.maxRes >= maxCamRes);
  const channelOptions = [...new Set(compatible.map((r) => r.channels))]
    .filter((c) => c >= Math.max(1, camTotal))
    .sort((a, b) => a - b);
  const maxChannels = Math.max(0, ...compatible.map((r) => r.channels));
  const recorderChannels = s.recorder ? (s.channels ?? maxChannels) : undefined;

  const go = (step: StepId) => setS((p) => ({ ...p, step }));
  const next = (from: State = s) => {
    const list = stepsFor(from.system);
    return list[Math.min(list.indexOf(from.step) + 1, list.length - 1)];
  };
  const advance = (patch: Partial<State> = {}) =>
    setS((p) => {
      const merged = { ...p, ...patch };
      const moved = { ...merged, step: next(merged) };
      // Entering the power step pre-selects a supply big enough for the cameras, as the source does.
      if (moved.step === "power" && moved.psu === undefined) {
        const need = ampsFor(camCount(moved.cameras) || 1);
        const n = camCount(moved.cameras);
        const psu = catalog.psus.filter((x) => x.amps >= need).find((x) => n > 1 || x.amps < 5);
        if (psu) moved.psu = { role: "psu", part: psu, qty: 1 };
      }
      return moved;
    });
  const back = () => setS((p) => ({ ...p, step: stepsFor(p.system)[Math.max(0, stepsFor(p.system).indexOf(p.step) - 1)] }));
  const restart = () => setS(EMPTY);

  // ----- choices -----
  const chooseSystem = (system: KitSystem) =>
    advance(
      system === s.system
        ? {}
        : { system, res: undefined, cameras: [], channels: undefined, recorder: undefined, drive: undefined, psu: undefined, cables: [], accessories: [] },
    );

  const camerasFor = (res?: number) =>
    catalog.cameras.filter((c) => c.system === s.system && (res === undefined || c.res === res));

  const resOptions = [...new Set(catalog.cameras.filter((c) => c.system === s.system).map((c) => c.res))].sort((a, b) => a - b);
  const popularRes = resOptions.includes(s.system === "IP" ? 4 : 5) ? (s.system === "IP" ? 4 : 5) : resOptions[0];

  const chooseRes = (res: number) => {
    const keep = s.res === res;
    advance(keep ? {} : { res, cameras: [], channels: undefined, recorder: undefined });
  };

  const setCameras = (cameras: BuilderLine[]) =>
    setS((p) => {
      const n = camCount(cameras);
      const tooSmall = p.channels !== undefined && p.channels < n;
      return { ...p, cameras, ...(tooSmall ? { channels: undefined, recorder: undefined } : {}) };
    });

  const cameraLine = (c: BuilderCamera, qty: number): BuilderLine => ({
    role: "camera",
    part: { ...c, detail: resName(c.res) },
    qty,
    res: c.res,
  });

  const toggleCamera = (c: BuilderCamera) => {
    const has = s.cameras.some((l) => l.part.slug === c.slug);
    if (has) setCameras(s.cameras.filter((l) => l.part.slug !== c.slug));
    else setCameras([...s.cameras, cameraLine(c, s.cameras.length ? 1 : Math.min(4, maxChannels || 4))]);
  };

  const bumpCamera = (slug: string, d: number) => {
    const list = s.cameras
      .map((l) => (l.part.slug === slug ? { ...l, qty: l.qty + d } : l))
      .filter((l) => l.qty > 0);
    setCameras(list);
  };

  const ourPickCamera = (): BuilderCamera | undefined => {
    const list = camerasFor(s.res);
    return list.find((c) => c.pick) ?? [...list].sort((a, b) => a.price - b.price)[0];
  };

  const chooseChannels = (channels: number) =>
    advance({ channels, ...(s.recorder && compatible.find((r) => r.slug === s.recorder?.part.slug)?.channels !== channels ? { recorder: undefined } : {}) });

  const recorderOptions = compatible
    .filter((r) => r.channels === s.channels)
    .sort((a, b) => b.popularity - a.popularity || a.price - b.price);
  const pickRecorder = recorderOptions[0];
  const cheapestRecorder = [...recorderOptions].sort((a, b) => a.price - b.price)[0];

  const chooseRecorder = (slug: string) => {
    const r = compatible.find((x) => x.slug === slug);
    if (!r) return;
    advance({
      recorder: { role: "recorder", part: { ...r, detail: `Holds up to ${r.channels} cameras` }, qty: 1 },
      channels: r.channels,
    });
  };

  // Drives: three suggested sizes ("rungs"), then the rest.
  const camForDays = s.cameras.map((c) => ({ res: c.res, qty: c.qty }));
  const driveRows = catalog.drives.map((d) => ({ d, days: daysFor(camForDays, d.tb) ?? 0 }));
  const rungs: typeof driveRows = [];
  for (const min of [7, 30, 55]) {
    const after = rungs.at(-1)?.d.tb ?? 0;
    const hit = driveRows.find((r) => r.d.tb > after && r.days >= min) ?? driveRows.find((r) => r.d.tb > after);
    if (hit) rungs.push(hit);
  }
  const driveOrder = [...rungs, ...driveRows.filter((r) => !rungs.includes(r))];
  const suggestedDrive = rungs[1] ?? rungs[0];

  const chooseDrive = (slug: string | null) => {
    if (slug === null) return advance({ drive: null });
    const d = catalog.drives.find((x) => x.slug === slug);
    if (d) advance({ drive: { role: "drive", part: { ...d, detail: tbLabel(d.tb) }, qty: 1 } });
  };

  const ampsNeeded = ampsFor(camTotal || 1);
  const psuOptions = catalog.psus.filter((p) => p.amps >= ampsNeeded);
  const defaultPsu = psuOptions.find((p) => camTotal > 1 || p.amps < 5) ?? psuOptions[0];
  const psuLine = (p: BuilderPart): BuilderLine => ({ role: "psu", part: p, qty: 1 });

  const setExtra = (key: "cables" | "accessories", item: BuilderOptionItem, qty: number) =>
    setS((p) => {
      const role = key === "cables" ? "cable" : "accessory";
      const rest = p[key].filter((l) => l.part.slug !== item.slug);
      const list = qty > 0 ? [...rest, { role, part: { ...item, detail: item.label }, qty: Math.min(99, qty) } as BuilderLine] : rest;
      return { ...p, [key]: list };
    });

  const extraQty = (key: "cables" | "accessories", slug: string) => s[key].find((l) => l.part.slug === slug)?.qty ?? 0;

  // ----- basket -----
  const blocked = !!s.recorder && recorderChannels !== undefined && camTotal > recorderChannels;
  const addToBasket = async (thenCheckout: boolean) => {
    if (!lines.length || blocked) return;
    setBusy(true);
    cartStore.set((cart) => {
      const out = [...cart];
      for (const l of lines) {
        const i = out.findIndex((c) => c.slug === l.part.slug);
        if (i >= 0) out[i] = { ...out[i], qty: Math.min(999, out[i].qty + l.qty) };
        else out.push({ slug: l.part.slug, name: l.part.name, sku: l.part.sku, price: l.part.price, image: l.part.image, qty: l.qty });
      }
      return out;
    });
    const n = lines.reduce((sum, l) => sum + l.qty, 0);
    showToast({ title: `Done — ${n} item(s) now in your basket`, action: { label: "View basket", href: "/cart" } });
    if (thenCheckout) router.push("/checkout");
    setBusy(false);
  };

  // ----- bottom bar -----
  const trail: string[] = [];
  if (s.system) trail.push(s.system === "IP" ? "Network cameras" : "Coax cameras");
  if (s.res) trail.push(resName(s.res));
  if (camTotal) trail.push(`${camTotal} ${plural(camTotal, "camera", "cameras")}`);
  if (s.recorder) trail.push("recorder picked");
  if (s.drive) trail.push(s.drive.part.detail ?? "drive");

  let primary: { label: string; onClick: () => void; disabled?: boolean } = { label: "Next", onClick: () => advance() };
  let note: string | undefined = "Or tap any option above if you'd rather choose yourself";
  switch (s.step) {
    case "system":
      primary = s.system
        ? { label: "Next: picture detail", onClick: () => advance() }
        : { label: "Start fresh — most people do", onClick: () => chooseSystem("IP") };
      break;
    case "resolution":
      primary =
        s.res !== undefined
          ? { label: "Next: cameras", onClick: () => advance() }
          : popularRes !== undefined
            ? { label: `Go with ${resName(popularRes).match(/\((.+)\)/)?.[1] ?? resName(popularRes)} — the usual home choice`, onClick: () => chooseRes(popularRes) }
            : { label: "Next", onClick: () => advance(), disabled: true };
      break;
    case "cameras": {
      const pick = ourPickCamera();
      primary = camTotal
        ? { label: "Next: recorder size", onClick: () => advance() }
        : pick
          ? {
              label: "Add 4 of our pick",
              onClick: () =>
                advance({
                  cameras: [cameraLine(pick, 4)],
                  ...(s.channels !== undefined && s.channels < 4 ? { channels: undefined, recorder: undefined } : {}),
                }),
            }
          : { label: "Pick a detail level", onClick: () => go("resolution") };
      break;
    }
    case "channels":
      primary =
        s.channels !== undefined
          ? { label: "Next: your recorder", onClick: () => advance() }
          : channelOptions.length
            ? { label: `Pick one that takes ${camTotal || channelOptions[0]} cameras`, onClick: () => chooseChannels(channelOptions[0]) }
            : { label: "Change your cameras", onClick: () => go("cameras") };
      break;
    case "recorder":
      primary = s.recorder
        ? { label: "Next: storage", onClick: () => advance() }
        : pickRecorder
          ? { label: "Go with our pick", onClick: () => chooseRecorder(pickRecorder.slug) }
          : { label: "Choose a recorder size", onClick: () => go("channels") };
      break;
    case "storage":
      primary =
        s.drive !== undefined
          ? { label: s.system === "IP" ? "Next: cable" : "Next: power", onClick: () => advance() }
          : suggestedDrive
            ? { label: "Take the drive we suggest", onClick: () => chooseDrive(suggestedDrive.d.slug) }
            : { label: "Next", onClick: () => advance({ drive: null }) };
      break;
    case "power":
      note = undefined;
      primary = {
        label: "Next: cable",
        onClick: () => advance(s.psu === undefined && defaultPsu ? { psu: psuLine(defaultPsu) } : {}),
      };
      break;
    case "cables":
      note = undefined;
      primary = { label: "Next: extras", onClick: () => advance() };
      break;
    case "extras":
      note = undefined;
      primary = { label: "See your finished system", onClick: () => advance() };
      break;
    case "summary":
      note = blocked ? "Swap the recorder above, then you can order" : "VAT included · delivery worked out at the checkout";
      primary = { label: busy ? "Adding it to your basket…" : "Buy it now", onClick: () => addToBasket(true), disabled: !lines.length || blocked || busy };
      break;
  }

  const partsCount = lines.length;
  const barLeft =
    s.step === "summary" && lines.length
      ? `${partsCount} ${plural(partsCount, "part", "parts")} · ${blocked ? "needs a bigger recorder" : "all checked"}`
      : trail.length
        ? trail.join(" · ")
        : "Nothing picked yet";

  // ----- step bodies -----
  let body: ReactNode = null;
  if (s.step === "system") {
    body = (
      <div>
        <StepHeader
          title="Is this a brand-new system, or are you replacing an old one?"
          help="All this does is decide which cameras and recorders you'll see. You can change it whenever you like."
        />
        <fieldset>
          <legend className="sr-only">New system or replacing an old one</legend>
          <div className="grid gap-3">
            <Choice
              name="system-type"
              value="IP"
              selected={s.system === "IP"}
              onPick={() => chooseSystem("IP")}
              media={
                <IconBox>
                  <Wifi className="h-5 w-5" aria-hidden="true" />
                </IconBox>
              }
              title="Brand new — new cameras, new cable"
              badges={<Badge>Most new systems</Badge>}
              sub={
                <>
                  Each camera has one network cable that brings both the picture and the power, so you don&apos;t need a
                  plug by every camera. Most new systems are done this way.
                  <span className="text-muted-foreground/70 mt-1 block text-xs">You might see it called: IP (PoE) system</span>
                </>
              }
            />
            <Choice
              name="system-type"
              value="Turbo HD"
              selected={s.system === "ANALOG"}
              onPick={() => chooseSystem("ANALOG")}
              media={
                <IconBox>
                  <Cable className="h-5 w-5" aria-hidden="true" />
                </IconBox>
              }
              title="Replacing an old system — there's cable already"
              sub={
                <>
                  Uses the round coax cable your old system left behind — no new cable to run through your walls.
                  <span className="text-muted-foreground/70 mt-1 block text-xs">
                    You might see it called: Turbo HD (coax) system
                  </span>
                </>
              }
            />
          </div>
        </fieldset>
        <Hint summary="Not sure what you've got?">
          Look at the cable going into one of your old cameras. A flat cable with a clip-on plug, like broadband, means a
          network system — pick the first answer. A round cable with a screw-on metal end is coax — pick the second. No
          cameras up yet? Pick the first.
          <span className="mt-2 block">
            Still not sure? Pick one and keep going — every part is checked against the others before you buy, and you
            can come back and change this.
          </span>
        </Hint>
      </div>
    );
  } else if (s.step === "resolution") {
    body = (
      <div>
        <StepHeader
          title="How clear do you want the picture?"
          help="They all record day and night. Where they differ is the price, and how far you can zoom in on a recording later."
        />
        <fieldset>
          <legend className="sr-only">How clear the cameras should be</legend>
          <div className="grid gap-3">
            {resOptions.map((res) => {
              const n = camerasFor(res).length;
              const words = RES_WORDS[res] ?? RES_WORDS[4];
              return (
                <Choice
                  key={res}
                  name="resolution"
                  value={`${res}MP`}
                  selected={s.res === res}
                  onPick={() => chooseRes(res)}
                  media={<NumberBox value={res} unit="MP" />}
                  title={`${resName(res)} — ${words.word} picture`}
                  badges={res === popularRes ? <Badge>Most popular</Badge> : undefined}
                  sub={words.sentence}
                  chip={`${n} ${plural(n, "camera", "cameras")} to pick from`}
                />
              );
            })}
          </div>
        </fieldset>
        <Hint summary="Which one do I really need?">
          For a house, the middle option is nearly always right: faces at garden and driveway distance, without filling
          the drive as fast as 4K.
          <span className="mt-2 block">
            Choose the sharpest only if you want to zoom right in on recordings — and pick a bigger drive to keep the
            same number of days.
          </span>
        </Hint>
      </div>
    );
  } else if (s.step === "cameras") {
    const list = camerasFor(s.res);
    const cheapest = [...list].sort((a, b) => a.price - b.price)[0];
    const ordered = [...list].sort(
      (a, b) =>
        Number(!!b.pick) - Number(!!a.pick) ||
        Number(b.slug === cheapest?.slug) - Number(a.slug === cheapest?.slug) ||
        a.price - b.price,
    );
    const extraSelected = s.cameras.filter((l) => !list.some((c) => c.slug === l.part.slug));
    const full = maxChannels > 0 && camTotal >= maxChannels;
    body = (
      <div>
        <StepHeader
          title="Which camera do you want?"
          help={
            s.cameras.length
              ? "Tap another camera to add it too, or use − and + to change how many of each. They all work with your system."
              : "These all work with your system. Tap one, tell us how many, then add a different model if you'd like a mix."
          }
        />
        {extraSelected.length > 0 && (
          <div className="mb-4 space-y-3">
            <p className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
              Your cameras are still in the build
            </p>
            {extraSelected.map((l) => (
              <div key={l.part.slug} className="border-primary bg-primary/5 flex items-center gap-3 rounded-2xl border-2 p-4">
                <Thumb src={l.part.image} />
                <div className="min-w-0 flex-1">
                  <p className="text-foreground line-clamp-2 text-base leading-snug font-semibold">{l.part.name}</p>
                  {l.part.detail && <p className="text-muted-foreground mt-1 text-sm">{l.part.detail}</p>}
                </div>
                <Stepper
                  label={l.part.name}
                  value={l.qty}
                  onLess={() => bumpCamera(l.part.slug, -1)}
                  onMore={() => bumpCamera(l.part.slug, 1)}
                  moreDisabled={full}
                />
              </div>
            ))}
          </div>
        )}
        <fieldset>
          <legend className="sr-only">Choose cameras</legend>
          <div className="grid gap-3">
            {ordered.map((c) => {
              const line = s.cameras.find((l) => l.part.slug === c.slug);
              return (
                <Choice
                  key={c.slug}
                  type="checkbox"
                  name={`camera-${c.sku}`}
                  value={c.sku}
                  selected={!!line}
                  onPick={() => toggleCamera(c)}
                  media={<Thumb src={c.image} />}
                  title={c.name}
                  badges={
                    c.pick ? <Badge>Our pick</Badge> : c.slug === cheapest?.slug ? <Badge>Lowest price</Badge> : undefined
                  }
                  sub={c.pick ? undefined : c.detail}
                  price={gbp(withVat(c.price))}
                  each
                >
                  {line && (
                    <div className="border-border bg-muted/30 mx-2 -mt-2 rounded-b-2xl border border-t-0 px-4 pt-4 pb-3">
                      <p className="text-foreground text-sm font-semibold">How many do you need?</p>
                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
                        <Stepper
                          label={c.name}
                          value={line.qty}
                          onLess={() => bumpCamera(c.slug, -1)}
                          onMore={() => bumpCamera(c.slug, 1)}
                          moreDisabled={full}
                        />
                        <button
                          type="button"
                          onClick={() => setCameras(s.cameras.filter((l) => l.part.slug !== c.slug))}
                          className="text-muted-foreground hover:text-foreground inline-flex min-h-11 items-center gap-1 text-xs underline underline-offset-4"
                        >
                          <X className="h-3.5 w-3.5" aria-hidden="true" />
                          Take it out
                        </button>
                      </div>
                      <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
                        {gbp(withVat(c.price))} each. Most homes end up with 4: the drive, the front and back doors, and
                        one spot you can&apos;t otherwise see.
                      </p>
                      {full && <p className="text-muted-foreground mt-1 text-xs">That&apos;s the most cameras one recorder can handle.</p>}
                    </div>
                  )}
                </Choice>
              );
            })}
            {!ordered.length && (
              <p className="text-muted-foreground py-8 text-center text-sm">
                Right now we haven&apos;t got cameras for this kind of system. Head back and pick the other answer, or get
                in touch and we&apos;ll price a kit for you.
              </p>
            )}
          </div>
        </fieldset>
        {camTotal > 0 && (
          <p className="text-muted-foreground mt-3 text-sm">
            {camTotal} {plural(camTotal, "camera", "cameras")} altogether · {s.cameras.length}{" "}
            {plural(s.cameras.length, "model", "models")}
          </p>
        )}
        <Hint summary="How many cameras do I need?">
          Think about how people get in and what you&apos;d want to look back on: the front and back doors, the drive, and
          hidden corners like the shed or the bins. Most houses end up with four.
          <span className="mt-2 block">
            You can add more later — where the price allows, we&apos;ll pick a recorder with room to spare.
          </span>
        </Hint>
      </div>
    );
  } else if (s.step === "channels") {
    body = (
      <div>
        <StepHeader
          title="How big a recorder do you need?"
          help={`Your footage lives on the recorder. Its sockets are fixed, and you need one for every camera you picked — so at least ${camTotal || 1}.`}
        />
        <fieldset>
          <legend className="sr-only">Recorder size</legend>
          <div className="grid gap-3">
            {channelOptions.map((ch, i) => {
              const spare = ch - camTotal;
              return (
                <Choice
                  key={ch}
                  name="channels"
                  value={String(ch)}
                  selected={s.channels === ch}
                  onPick={() => chooseChannels(ch)}
                  media={<NumberBox value={ch} unit="CH" />}
                  title={`Takes up to ${ch} ${plural(ch, "camera", "cameras")}`}
                  badges={i === 0 ? <Badge>{spare > 0 ? "Fits, with space to grow" : "Fits your cameras"}</Badge> : undefined}
                  sub={
                    spare > 0
                      ? `There's space to add ${spare} more ${plural(spare, "camera", "cameras")} later, with no need for another recorder.`
                      : `Just right for your ${camTotal} ${plural(camTotal, "camera", "cameras")} — but one more later and you'd need a bigger recorder.`
                  }
                />
              );
            })}
            {!channelOptions.length && (
              <p className="text-muted-foreground py-8 text-center text-sm">
                Right now we&apos;ve no {s.system === "IP" ? "network recorder" : "coax recorder"} in stock that takes {camTotal}{" "}
                cameras. Go back and pick fewer, or ask us and we&apos;ll price one for you.
              </p>
            )}
          </div>
        </fieldset>
        <Hint summary="Should I get a bigger one than I need?">
          A recorder keeps the number of sockets it came with. If you might add a camera in a year or two, going one size
          up now costs far less than a second recorder later.
        </Hint>
      </div>
    );
  } else if (s.step === "recorder") {
    body = (
      <div>
        <StepHeader
          title="Which recorder do you want?"
          help={`Any of these will record all ${camTotal} ${plural(camTotal, "camera", "cameras")} and work with the phone app — we've already taken out the ones that wouldn't.`}
        />
        <fieldset>
          <legend className="sr-only">Choose your recorder</legend>
          <div className="grid gap-3">
            {recorderOptions.map((r) => (
              <Choice
                key={r.slug}
                name="recorder"
                value={r.sku}
                selected={s.recorder?.part.slug === r.slug}
                onPick={() => chooseRecorder(r.slug)}
                media={<Thumb src={r.image} />}
                title={r.name}
                badges={
                  r.slug === pickRecorder?.slug ? (
                    <Badge>Our pick</Badge>
                  ) : r.slug === cheapestRecorder?.slug ? (
                    <Badge>Lowest price</Badge>
                  ) : undefined
                }
                sub={`Takes up to ${r.channels} cameras · Records at up to ${resName(r.maxRes)}`}
                price={gbp(withVat(r.price))}
              />
            ))}
            {!recorderOptions.length && (
              <div className="border-border rounded-2xl border p-5 text-sm">
                <p className="text-foreground font-semibold">We couldn&apos;t find a recorder that fits</p>
                <p className="text-muted-foreground mt-1">
                  There&apos;s no recorder of that size that works with every camera you picked. Go back and change your
                  cameras, or choose a different size of recorder.
                </p>
              </div>
            )}
          </div>
        </fieldset>
        <Hint summary="Does it matter which one I choose?">
          Not much. They all record your cameras at the quality you picked and use the same phone app. Paying more mostly
          buys spare sockets and smarter motion alerts.
        </Hint>
      </div>
    );
  } else if (s.step === "storage") {
    body = (
      <div>
        <StepHeader
          title="How far back do you want to look?"
          help="When the drive's full, the recorder records over the oldest footage. So the size of drive you pick decides how long you've got to spot something."
        />
        <fieldset>
          <legend className="sr-only">How many days of footage to keep</legend>
          <div className="grid gap-3">
            {driveOrder.map(({ d, days }, i) => (
              <Choice
                key={d.slug}
                name="storage"
                value={tbLabel(d.tb)}
                selected={s.drive?.part.slug === d.slug}
                onPick={() => chooseDrive(d.slug)}
                media={
                  <IconBox>
                    <HardDrive className="h-5 w-5" aria-hidden="true" />
                  </IconBox>
                }
                title={days ? `Around ${days} ${plural(days, "day", "days")}` : tbLabel(d.tb)}
                badges={d.slug === suggestedDrive?.d.slug ? <Badge>The one most people pick</Badge> : undefined}
                sub={i < rungs.length ? RUNG_SUBS[i] : undefined}
                chip={`${tbLabel(d.tb)} hard drive`}
                price={gbp(withVat(d.price))}
              />
            ))}
          </div>
        </fieldset>
        <button
          type="button"
          onClick={() => chooseDrive(null)}
          className={cn(
            "text-muted-foreground hover:text-foreground mt-3 inline-flex min-h-11 items-center text-sm underline underline-offset-4",
            s.drive === null && "text-foreground font-semibold",
          )}
        >
          I&apos;ve already got a hard drive — leave it out
        </button>
        {camTotal > 0 && (
          <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
            Those times assume {camTotal} {plural(camTotal, "camera", "cameras")} at{" "}
            {maxCamRes ? resName(maxCamRes) : "this resolution"} recording non-stop, day and night. If it only records
            when something moves, you&apos;ll usually get about twice as long.
          </p>
        )}
        <Hint summary="What happens when the drive's full?">
          Nothing breaks. The recorder simply records over the oldest day, so you always have the latest footage — which
          is why we ask about days rather than disk space.
        </Hint>
      </div>
    );
  } else if (s.step === "power") {
    body = (
      <div>
        <StepHeader
          title="Your cameras need power"
          help={`One mains supply runs all ${camTotal || 1} of your ${plural(camTotal || 1, "camera", "cameras")}, so you don't need a plug by each one. We've picked one that's powerful enough — ${ampsNeeded} amps or more — so just carry on.`}
        />
        <fieldset>
          <legend className="sr-only">Power supply</legend>
          <div className="grid gap-3">
            {psuOptions.map((p) => {
              const selected = s.psu === undefined ? p.slug === defaultPsu?.slug : s.psu?.part.slug === p.slug;
              return (
                <Choice
                  key={p.slug}
                  name="psu"
                  value={p.sku}
                  selected={selected}
                  onPick={() => advance({ psu: psuLine(p) })}
                  media={
                    <IconBox>
                      <Zap className="h-5 w-5" aria-hidden="true" />
                    </IconBox>
                  }
                  title={p.name}
                  sub={`12V, up to ${p.amps}A`}
                  price={gbp(withVat(p.price))}
                />
              );
            })}
            {!psuOptions.length && (
              <div className="border-border rounded-2xl border p-5 text-sm">
                <p className="text-foreground font-semibold">No power supplies to choose from</p>
                <p className="text-muted-foreground mt-1">We haven&apos;t got a power supply that suits your system at the moment.</p>
              </div>
            )}
          </div>
        </fieldset>
        <button
          type="button"
          onClick={() => advance({ psu: null })}
          className="text-muted-foreground hover:text-foreground mt-3 inline-flex min-h-11 items-center text-sm underline underline-offset-4"
        >
          Skip it — I don&apos;t need a power supply
        </button>
      </div>
    );
  } else if (s.step === "cables" || s.step === "extras") {
    const key = s.step === "cables" ? "cables" : "accessories";
    const groups = (key === "cables" ? catalog.cables : catalog.accessories).filter((g) => !g.system || !s.system || g.system === s.system);
    body = (
      <div>
        {key === "cables" ? (
          <StepHeader
            title="How far away are the cameras from the recorder?"
            help="Pick one lead per camera, sized for the longest run to your recorder. Only cables that suit your system type are shown."
          />
        ) : (
          <StepHeader
            title="Anything else you need?"
            help="Extras are optional and all compatible with your build. Skip this step if you're unsure and review your system in the summary bar."
          />
        )}
        <div className="space-y-4">
          {groups.length ? (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                  {key === "cables" ? "Cables" : "Extras"}
                </p>
              </div>
              <div className="space-y-3">
                {groups.map((g) => (
                  <div key={g.title} className="rounded-2xl border p-4">
                    <div className="mb-4 flex items-center gap-3">
                      <div className="bg-muted flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
                        <Cable className="h-5 w-5" aria-hidden="true" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold">{g.title}</p>
                        </div>
                        <p className="text-muted-foreground text-xs">{g.sub}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {g.items.map((item) => {
                        const qty = extraQty(key, item.slug);
                        const reel = /reel/i.test(g.title) || key === "accessories";
                        return (
                          <div
                            key={item.slug}
                            className={cn(
                              "flex flex-col rounded-xl border-2 p-3 text-center transition-colors",
                              qty ? "border-primary bg-primary/5" : "border-border",
                            )}
                          >
                            <p className="text-xl leading-tight font-bold">{item.label}</p>
                            <p className="text-muted-foreground text-xs">{gbp(withVat(item.price))}</p>
                            <div className="mt-auto pt-2">
                              {qty ? (
                                <div className="flex items-center justify-between gap-1">
                                  <button
                                    type="button"
                                    aria-label={`One less ${item.label}`}
                                    onClick={() => setExtra(key, item, qty - 1)}
                                    className="border-border bg-background flex h-11 w-11 items-center justify-center rounded-lg border"
                                  >
                                    <Minus className="h-4 w-4" aria-hidden="true" />
                                  </button>
                                  <output className="text-base font-bold tabular-nums">{qty}</output>
                                  <button
                                    type="button"
                                    aria-label={`One more ${item.label}`}
                                    onClick={() => setExtra(key, item, qty + 1)}
                                    disabled={qty >= 99}
                                    className="border-border bg-background flex h-11 w-11 items-center justify-center rounded-lg border disabled:opacity-40"
                                  >
                                    <Plus className="h-4 w-4" aria-hidden="true" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  aria-label={`Add ${item.label} ${key === "cables" ? "cable" : g.title.toLowerCase()}`}
                                  onClick={() => setExtra(key, item, reel ? 1 : Math.max(1, camTotal))}
                                  className="border-input bg-background hover:bg-accent hover:text-accent-foreground inline-flex h-11 w-full items-center justify-center gap-1 rounded-lg border px-4 py-2 text-sm font-medium whitespace-nowrap shadow-sm transition-colors"
                                >
                                  <Plus className="h-4 w-4" aria-hidden="true" />
                                  Add
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              {key === "cables" && (
                <p className="text-muted-foreground mt-3 text-xs">You don&apos;t have to add cables — skip this if you don&apos;t need them</p>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground py-8 text-center text-sm">No accessories available</p>
          )}
        </div>
      </div>
    );
  } else if (s.step === "summary") {
    const sectionLines: { line: BuilderLine; change?: StepId; adjustable: boolean }[] = [
      ...s.cameras.map((line) => ({ line, change: "cameras" as StepId, adjustable: true })),
      ...(s.recorder ? [{ line: s.recorder, change: "recorder" as StepId, adjustable: false }] : []),
      ...(s.drive ? [{ line: s.drive, change: "storage" as StepId, adjustable: false }] : []),
      ...(s.psu ? [{ line: s.psu, change: "power" as StepId, adjustable: true }] : []),
      ...s.cables.map((line) => ({ line, change: "cables" as StepId, adjustable: true })),
      ...s.accessories.map((line) => ({ line, change: "extras" as StepId, adjustable: true })),
    ];
    const lastCamera = s.cameras.at(-1)?.part.slug;
    const capped = recorderChannels !== undefined && camTotal >= recorderChannels;
    const issues: string[] = [];
    if (!s.cameras.length) issues.push("There are no cameras in the build yet.");
    if (!s.recorder) issues.push("There's no recorder yet — your cameras need one to record.");
    if (blocked) issues.push(`Your recorder takes ${recorderChannels} cameras, but you've picked ${camTotal}.`);
    if (s.drive === null || s.drive === undefined) issues.push("There's no hard drive, so nothing will be recorded until you fit one.");

    const bump = (line: BuilderLine, d: number) => {
      const qty = line.qty + d;
      if (line.role === "camera") return bumpCamera(line.part.slug, d);
      setS((p) => {
        if (line.role === "psu") return { ...p, psu: qty > 0 ? { ...line, qty } : null };
        const key = line.role === "cable" ? "cables" : "accessories";
        const list = p[key].map((l) => (l.part.slug === line.part.slug ? { ...l, qty } : l)).filter((l) => l.qty > 0);
        return { ...p, [key]: list };
      });
    };
    const remove = (line: BuilderLine) => bump(line, -line.qty);

    body = (
      <div>
        <StepHeader
          title="Here's your system"
          help="We've checked every part against every other part. Nothing here is guesswork."
        />
        {issues.length === 0 ? (
          <div className="mb-5 flex items-start gap-2.5 rounded-2xl border border-brand-300 bg-brand-50 p-4 dark:border-brand-800 dark:bg-brand-950/30">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-brand-700 dark:text-brand-400" aria-hidden="true" />
            <p className="text-sm leading-relaxed text-brand-900 dark:text-brand-200">
              <span className="font-semibold">All checked.</span> The drive fits, the power and cable are right, and your
              cameras plug into this recorder, which records them at the quality you picked.
            </p>
          </div>
        ) : (
          <div className="mb-5 flex items-start gap-2.5 rounded-2xl border border-amber-300 bg-amber-50 p-4">
            <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" aria-hidden="true" />
            <div className="text-sm leading-relaxed text-amber-900">
              <p className="font-semibold">{blocked ? "These parts don't work together yet" : "A couple of things to know"}</p>
              <ul className="mt-1 list-disc pl-5">
                {issues.map((i) => (
                  <li key={i}>{i}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
        {lines.length > 0 && (
          <section className="border-border bg-card mb-4 rounded-2xl border p-4">
            <h3 className="text-foreground text-base font-bold">Everything in your kit</h3>
            <p className="text-muted-foreground mt-1 text-sm">
              Tweak a count or take out anything you don&apos;t want, and the total updates as you go.
            </p>
            <ul className="mt-1">
              {sectionLines.map(({ line, change, adjustable }) => (
                <li key={`${line.role}-${line.part.slug}`} className="border-border/70 border-b py-3 last:border-0">
                  <div className="flex items-start gap-3">
                    <Thumb src={line.part.image} size="h-12 w-12" />
                    <div className="min-w-0 flex-1">
                      <p className="text-foreground text-sm leading-snug font-medium">
                        {!adjustable && <span className="text-foreground mr-1 font-bold tabular-nums">{line.qty} ×</span>}
                        {line.part.name}
                      </p>
                      {line.part.detail && <p className="text-muted-foreground mt-0.5 text-xs">{line.part.detail}</p>}
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-semibold tabular-nums">{gbp(lineTotal(line))}</p>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 pl-15">
                    {adjustable && (
                      <Stepper
                        label={line.part.name}
                        value={line.qty}
                        onLess={() => bump(line, -1)}
                        onMore={() => bump(line, 1)}
                        moreDisabled={line.role === "camera" ? capped : line.qty >= 99}
                      />
                    )}
                    {adjustable && line.role !== "camera" && (
                      <button
                        type="button"
                        onClick={() => remove(line)}
                        className="text-muted-foreground hover:text-foreground inline-flex min-h-11 items-center gap-1 text-xs underline underline-offset-4"
                      >
                        <X className="h-3.5 w-3.5" aria-hidden="true" />
                        Take it out<span className="sr-only">: {line.part.name}</span>
                      </button>
                    )}
                    {change && (
                      <button
                        type="button"
                        onClick={() => go(change)}
                        className="text-primary inline-flex min-h-11 items-center text-xs font-semibold underline underline-offset-4"
                      >
                        Change<span className="sr-only">: {line.part.name}</span>
                      </button>
                    )}
                  </div>
                  {line.role === "camera" && line.part.slug === lastCamera && capped && recorderChannels !== undefined && (
                    <p className="text-muted-foreground mt-1 pl-15 text-xs">
                      Your recorder&apos;s full: it takes {recorderChannels} cameras.{" "}
                      <button
                        type="button"
                        onClick={() => go("channels")}
                        className="text-primary min-h-9 font-semibold underline underline-offset-4"
                      >
                        Pick a bigger recorder
                      </button>
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}
        <section className="border-border bg-card mb-4 rounded-2xl border p-4">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-foreground text-base font-bold">Total</span>
            <span className="text-foreground text-2xl font-bold tabular-nums">{gbp(totalInc)}</span>
          </div>
          <p className="text-muted-foreground mt-1 text-xs">VAT&apos;s included. Delivery is worked out at the checkout.</p>
          {(s.system || maxCamRes > 0) && (
            <p className="text-muted-foreground mt-2 text-xs">
              {[
                s.system === "IP" ? "Network cameras, one cable each" : s.system ? "Cameras on coax cable" : "",
                maxCamRes ? `${resName(maxCamRes)} picture` : "",
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}
        </section>
        <div className="mb-4 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => addToBasket(false)}
            disabled={!lines.length || blocked || busy}
            className="text-muted-foreground hover:text-foreground inline-flex min-h-11 items-center justify-center gap-2 text-sm underline underline-offset-4 disabled:opacity-50"
          >
            <ShoppingCart className="h-4 w-4" aria-hidden="true" />
            Or pop it in your basket and keep shopping
          </button>
        </div>
      </div>
    );
  }

  const seedLoaded = seed?.kitName
    ? joinList(
        [
          seed.lines.some((l) => l.role === "recorder") ? "your recorder" : "",
          (() => {
            const n = camCount(seed.lines.filter((l) => l.role === "camera"));
            return n ? `${n} ${plural(n, "camera", "cameras")}` : "";
          })(),
          (() => {
            const d = seed.lines.find((l) => l.role === "drive");
            return d ? (d.qty > 1 ? `${d.qty} hard drives` : `a ${d.part.detail ?? ""} hard drive`.replace("  ", " ")) : "";
          })(),
          (() => {
            const n = seed.lines.filter((l) => l.role === "cable").reduce((a, l) => a + l.qty, 0);
            return n ? `${n} ${plural(n, "cable", "cables")}` : "";
          })(),
          seed.lines.some((l) => l.role === "psu") ? "a power supply" : "",
          (() => {
            const n = seed.lines.filter((l) => l.role === "accessory").reduce((a, l) => a + l.qty, 0);
            return n ? `${n} ${plural(n, "accessory", "accessories")}` : "";
          })(),
        ].filter(Boolean),
      )
    : "";

  return (
    <div ref={topRef} className="flex min-h-[80vh] flex-col pb-28 md:pb-8">
      <div className="bg-background/95 sticky top-[65px] z-30 border-b backdrop-blur lg:top-[114px]">
        <div className="mx-auto flex max-w-lg items-center gap-2 px-2 py-2">
          {index > 0 ? (
            <button
              type="button"
              aria-label="Back a step"
              onClick={back}
              className="text-muted-foreground hover:text-foreground flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors"
            >
              <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            </button>
          ) : (
            <div className="h-11 w-11 shrink-0" />
          )}
          <div className="min-w-0 flex-1 px-1">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-foreground truncate text-sm font-semibold">{STEP_TITLES[s.step]}</p>
              <span className="text-muted-foreground shrink-0 font-mono text-[11px] tracking-wide uppercase">
                Step {index + 1} of {total}
              </span>
            </div>
            <div className="mt-1.5 flex gap-1" aria-hidden="true">
              {Array.from({ length: total }, (_, i) => (
                <span key={i} className={cn("h-1 flex-1 rounded-full transition-colors", i <= index ? "bg-primary" : "bg-muted")} />
              ))}
            </div>
          </div>
          {index > 0 || lines.length ? (
            <button
              type="button"
              aria-label="Start over"
              onClick={restart}
              className="text-muted-foreground hover:text-foreground flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : (
            <div className="h-11 w-11 shrink-0" />
          )}
        </div>
        <div className="mx-auto max-w-lg px-4 pb-2">
          <button
            type="button"
            onClick={() => (lines.length ? go("summary") : advance({ system: s.system ?? "IP", step: "resolution" }))}
            className="text-muted-foreground hover:text-foreground flex min-h-9 items-center gap-1.5 text-xs underline underline-offset-4 transition-colors"
          >
            <SlidersHorizontal className="h-3 w-3" aria-hidden="true" />
            Know what you&apos;re after? Choose the parts yourself
          </button>
        </div>
      </div>
      <div className="mx-auto w-full max-w-lg flex-1 px-4 py-6 pb-40 md:pb-28">
        <div key={s.step} className="animate-in fade-in-0 slide-in-from-right-4 duration-300">
          {seed?.kitName && s.step === "summary" && (
            <div className="border-border bg-muted/30 mb-6 rounded-2xl border p-4">
              <p className="text-muted-foreground font-mono text-[11px] font-semibold tracking-wider uppercase">
                Changing a ready-made kit
              </p>
              <p className="text-foreground mt-1 text-sm font-semibold">{seed.kitName}</p>
              <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                We&apos;ve loaded what&apos;s in the box: {seedLoaded}. Swap anything you like — nothing&apos;s ordered until
                it&apos;s in your basket. Every part is priced as it stands today, so this total may not match the
                ready-made kit&apos;s price.
              </p>
              {seed.missing.length > 0 && (
                <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                  We couldn&apos;t load {joinList(seed.missing)}. It comes in the ready-made kit, but we don&apos;t sell it on
                  its own, so it isn&apos;t in this build.
                </p>
              )}
              {seed.kitHref && (
                <Link href={seed.kitHref} className="text-foreground mt-3 inline-block text-xs font-semibold underline underline-offset-4">
                  Back to the ready-made kit
                </Link>
              )}
            </div>
          )}
          {body}
        </div>
      </div>
      <div className="bg-background/95 fixed inset-x-0 bottom-[calc(4rem+var(--cookie-banner-h,0px))] z-40 border-t backdrop-blur md:bottom-[var(--cookie-banner-h,0px)]">
        <div className="mx-auto w-full max-w-lg px-4 py-3">
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <p className="text-muted-foreground min-w-0 truncate text-xs">{barLeft}</p>
            {lines.length > 0 && <p className="text-foreground shrink-0 text-base font-bold tabular-nums">{gbp(totalInc)}</p>}
          </div>
          <button
            type="button"
            onClick={primary.onClick}
            disabled={primary.disabled}
            className="fc-gold flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-4 text-base font-semibold disabled:opacity-50"
          >
            {primary.label}
            <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </button>
          {note && <p className="text-muted-foreground mt-1.5 text-center text-xs">{note}</p>}
        </div>
      </div>
    </div>
  );
}
