import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  CalendarCheck2, ChevronLeft, Home, CalendarDays, LayoutGrid, LogIn, LogOut, Timer, StickyNote,
  Sparkles, Flag, MoonStar, ArrowRight, Clock3, Keyboard, AlertTriangle, CircleCheck, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ar, clock, dur, durShort, dayLabel, monthLabel, MONTHS, WEEKDAYS, attended, isX2, otMin, workMin,
  type DayRec, type NoteScope,
} from "./data";

/* ---------- motion helper ---------- */
export function useTween(target: number, ms = 900) {
  const [v, setV] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    const start = performance.now();
    const f = from.current;
    let raf = 0;
    const step = (t: number) => {
      const k = Math.min((t - start) / ms, 1);
      const e = 1 - Math.pow(1 - k, 3);
      const val = f + (target - f) * e;
      from.current = val;
      setV(val);
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}

/* ---------- AttendanceRing ---------- */
const FULL = 720; // ring = 12 hours
const SEGS = 240;
function ringColor(min: number, x2: boolean, warning: boolean) {
  if (warning) return "var(--warning)";
  if (x2) {
    const t = Math.min(min / 240, 1);
    return `color-mix(in oklch, var(--overtime) ${Math.round(55 + 45 * t)}%, var(--overtime-soft))`;
  }
  const t = Math.min(Math.max((min - 480) / 120, 0), 1);
  const s = t * t * (3 - 2 * t);
  if (s > 0) return `color-mix(in oklch, var(--overtime) ${Math.round(s * 100)}%, var(--normal-work))`;
  const early = Math.min(min / 180, 1);
  return `color-mix(in oklch, var(--normal-work) ${Math.round(55 + 45 * early)}%, var(--normal-work-soft))`;
}

export function AttendanceRing({
  minutes, x2 = false, warning = false, active = false, size = 252,
}: { minutes: number; x2?: boolean; warning?: boolean; active?: boolean; size?: number }) {
  const shown = useTween(minutes);
  const stroke = 20;
  const c = size / 2;
  const r = c - stroke / 2 - 8;
  const p = Math.min(shown / FULL, 1);
  const pt = (a: number) => {
    const rad = ((a - 90) * Math.PI) / 180;
    return [c + r * Math.cos(rad), c + r * Math.sin(rad)] as const;
  };
  const endA = p * 360;
  const segs: ReactNode[] = [];
  for (let i = 0; i < SEGS; i++) {
    const a0 = (i * 360) / SEGS;
    if (a0 >= endA) break;
    const a1 = Math.min(((i + 1) * 360) / SEGS + 0.5, endA);
    const [x0, y0] = pt(a0);
    const [x1, y1] = pt(a1);
    segs.push(
      <path key={i} d={`M${x0} ${y0} A${r} ${r} 0 0 1 ${x1} ${y1}`} fill="none" strokeWidth={stroke}
        style={{ stroke: ringColor((((a0 + a1) / 2) / 360) * FULL, x2, warning) }} />,
    );
  }
  const [sx, sy] = pt(0);
  const [ex, ey] = pt(endA);
  const [mx, my] = pt((540 / FULL) * 360);
  const endColor = ringColor(Math.min(shown, FULL), x2, warning);
  const m = Math.floor(shown);

  return (
    <div className="relative" style={{ width: size, height: size }} role="img"
      aria-label={`Work duration ${dur(minutes)}`}>
      <svg width={size} height={size} className="absolute inset-0">
        <circle cx={c} cy={c} r={r} fill="none" strokeWidth={stroke} style={{ stroke: "var(--ring-track)" }} />
        {!x2 && !warning && <circle cx={mx} cy={my} r={2.5} style={{ fill: "var(--ring-marker)" }} />}
        {p > 0 && (
          <g style={{ filter: `drop-shadow(0 6px 10px color-mix(in oklab, ${endColor} 30%, transparent))` }}>
            <circle cx={sx} cy={sy} r={stroke / 2} style={{ fill: ringColor(0, x2, warning) }} />
            {segs}
            <circle cx={ex} cy={ey} r={stroke / 2} style={{ fill: endColor }} />
            <circle cx={ex} cy={ey} r={4} style={{ fill: "var(--surface)", opacity: 0.9 }} />
          </g>
        )}
      </svg>
      <div className="absolute inset-[36px] flex flex-col items-center justify-center rounded-full border border-border bg-background shadow-card">
        <div className="mb-1 h-2.5">
          {active && <span className="pulse-dot block size-2 rounded-full bg-success" aria-label="Attendance active" />}
        </div>
        <div dir="ltr" className={cn("tabular font-display text-[48px] font-semibold leading-none",
          warning ? "text-warning-ink" : "text-ink")}>
          {dur(m)}
        </div>
        <div dir="ltr" className="mt-2 flex w-[128px] justify-between px-2 text-[12px] font-medium text-faint">
          <span>Hours</span>
          <span>Minutes</span>
        </div>
      </div>
    </div>
  );
}

/* ---------- AttendancePrimaryButton ---------- */
export function AttendancePrimaryButton({ state, onClick }: { state: "in" | "out" | "done"; onClick: () => void }) {
  if (state === "done")
    return (
      <button onClick={onClick} className="press flex h-14 w-full items-center justify-center gap-2 rounded-[14px] border border-border bg-surface text-[16px] font-semibold text-ink">
        <CircleCheck className="size-5 text-success" /> View day details
      </button>
    );
  const out = state === "out";
  return (
    <button onClick={onClick}
      className={cn("press flex h-[58px] w-full items-center justify-center gap-2.5 rounded-[14px] text-[17px] font-semibold",
        out ? "bg-ink text-primary-foreground shadow-card" : "bg-primary text-primary-foreground shadow-button")}>
      {out ? <LogOut className="size-5 -scale-x-100" /> : <LogIn className="size-5 -scale-x-100" />}
      {out ? "Check out" : "Check in"}
    </button>
  );
}

/* ---------- MonthKpiCard ---------- */
export function MonthKpiCard({ kind, value }: { kind: "days" | "ot"; value: string }) {
  const ot = kind === "ot";
  return (
    <div className="flex flex-1 flex-col rounded-[18px] border border-border bg-surface/70 p-4 shadow-card backdrop-blur-xl">
      <div className={cn("flex size-9 items-center justify-center rounded-[10px]",
        ot ? "bg-overtime-container text-overtime-ink" : "bg-primary-container text-on-primary-container")}>
        {ot ? <Timer className="size-[18px]" /> : <CalendarCheck2 className="size-[18px]" />}
      </div>
      <div dir="ltr" className={cn("tabular font-display mt-4 text-end text-[28px] font-semibold leading-none", ot ? "text-overtime-ink" : "text-ink")}> 
        {value}
      </div>
      <div className="mt-2 text-[13px] font-medium leading-snug text-muted-foreground">
        {ot ? "Total overtime" : "Workdays this month"}
      </div>
    </div>
  );
}

/* ---------- MonthlyArchiveCard ---------- */
export function MonthlyArchiveCard({ m, workDays, ot, current, onClick }: { m: number; workDays: number; ot: number; current?: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={cn("press w-full rounded-[20px] border bg-surface/80 p-4 backdrop-blur-xl text-start shadow-card",
      current ? "border-primary/25" : "border-border")}>
      <div className="flex items-center gap-3">
        <div className={cn("flex size-12 flex-col items-center justify-center rounded-2xl",
          current ? "bg-primary text-primary-foreground" : "bg-surface-variant text-ink")}>
          <span className="text-[17px] font-semibold leading-none">{ar(m + 1)}</span>
          <span className="mt-0.5 text-[10.5px] opacity-80">{ar(2026)}</span>
        </div>
        <div className="flex-1">
          <div className="text-[17px] font-semibold text-ink">{monthLabel(m)}</div>
          <div className="text-[12.5px] text-faint">{current ? "Current month" : "Archived · Editable"}</div>
        </div>
        <ChevronLeft className="size-5 text-faint" />
      </div>
      <div className="mt-4 flex rounded-2xl bg-surface-variant/70 px-1 py-3">
        <Stat label="Workdays" value={ar(workDays)} />
        <div className="w-px bg-border" />
        <Stat label="Total overtime" value={durShort(ot)} accent />
      </div>
    </button>
  );
}
function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex flex-1 flex-col items-center gap-1">
      <span className="text-[12px] text-muted-foreground">{label}</span>
      <span dir="ltr" className={cn("tabular text-[20px] font-semibold", accent ? "text-overtime-ink" : "text-ink")}>{value}</span>
    </div>
  );
}

/* ---------- DayTypeBadge ---------- */
export function DayTypeBadge({ type }: { type: "work" | "holiday" | "x2" | "weekend" | "today" | "future" }) {
  const map = {
    work: { t: "Workday", c: "bg-surface-variant text-muted-foreground", i: null },
    holiday: { t: "Public holiday", c: "bg-overtime-container text-overtime-ink", i: <Flag className="size-3" /> },
    weekend: { t: "Weekend", c: "bg-overtime-container text-overtime-ink", i: <MoonStar className="size-3" /> },
    x2: { t: "×2", c: "bg-overtime text-primary-foreground", i: null },
    today: { t: "Today", c: "bg-primary-container text-on-primary-container", i: null },
    future: { t: "Future day", c: "bg-surface-variant text-faint", i: null },
  }[type];
  return (
    <span className={cn("inline-flex h-6 items-center gap-1 rounded-full px-2.5 text-[11.5px] font-semibold", map.c)}>
      {map.i}{map.t}
    </span>
  );
}

/* ---------- DailyRecordCard ---------- */
export function DailyRecordCard({ day, note, onClick }: { day: DayRec; note: { text: string; scope: NoteScope } | null; onClick: () => void }) {
  const tinted = day.kind !== "work";
  const has = attended(day);
  const x2 = isX2(day);
  const dateTile = (
    <div className={cn("flex w-12 shrink-0 flex-col items-center justify-center rounded-2xl py-2",
      day.today ? "bg-primary text-primary-foreground" : tinted ? "bg-overtime-container text-overtime-ink" : "bg-surface-variant text-ink")}>
      <span className="tabular text-[19px] font-semibold leading-none">{ar(day.d)}</span>
      <span className="mt-1 text-[10.5px] font-medium opacity-80">{WEEKDAYS[day.weekday].slice(0, 3)}</span>
    </div>
  );
  const badges = (
    <div className="flex flex-wrap gap-1.5">
      {day.today && <DayTypeBadge type="today" />}
      {day.kind === "holiday" && <DayTypeBadge type="holiday" />}
      {day.kind === "weekend" && <DayTypeBadge type="weekend" />}
      {x2 && has && <DayTypeBadge type="x2" />}
      {day.future && <DayTypeBadge type="future" />}
    </div>
  );

  if (!has) {
    return (
      <button onClick={onClick} className={cn("press flex w-full items-center gap-3 rounded-[20px] border border-dashed border-border p-3 text-start",
        day.future ? "bg-surface/60 opacity-80" : tinted ? "bg-overtime-container/40" : "bg-transparent")}>
        {dateTile}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[14px] font-medium text-muted-foreground">
              {day.kind === "holiday" ? day.holidayName : day.future ? dayLabel(day.m, day.d) : "No attendance"}
            </span>
          </div>
          <div className="mt-1.5">{badges}</div>
          {note && <NoteLine note={note} />}
        </div>
      </button>
    );
  }
  const open = day.outMin == null;
  return (
    <button onClick={onClick} className={cn("press w-full rounded-[18px] border bg-surface/80 p-3.5 backdrop-blur-xl text-start shadow-card",
      day.today ? "border-primary/30" : "border-border")}>
      <div className="flex gap-3">
        {dateTile}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="text-[15px] font-semibold text-ink">{dayLabel(day.m, day.d)}</div>
            <ChevronLeft className="mt-0.5 size-4 shrink-0 text-faint" />
          </div>
          <div className="mt-1.5">{badges}</div>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-4 gap-1 rounded-2xl bg-surface-variant/60 px-2 py-2.5">
        <Metric label="Check in" value={day.inMin == null ? "—" : clock(day.inMin)} />
        <Metric label="Check out" value={open ? "—" : day.outMin == null ? "—" : clock(day.outMin)} sub={!open && day.outMin != null && day.outMin >= 1440 ? `${ar(day.d + 1)} ${MONTHS[day.m]}` : undefined} />
        <Metric label="Shift time" value={open ? "Active" : durShort(workMin(day))} />
        <Metric label="Overtime" value={open ? "—" : otMin(day) ? durShort(otMin(day)) : "—"} accent={!open && otMin(day) > 0} />
      </div>
      {note && <NoteLine note={note} />}
    </button>
  );
}
function Metric({ label, value, accent, sub }: { label: string; value: string; accent?: boolean; sub?: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 text-center">
      <span className="text-[11px] text-faint">{label}</span>
      <span className={cn("tabular text-[14px] font-semibold", accent ? "text-overtime-ink" : "text-ink")}>{value}</span>
      {sub && <span className="text-[10.5px] text-warning-ink">{sub}</span>}
    </div>
  );
}
export const SCOPE_LABEL: Record<NoteScope, string> = { day: "This day only", month: "Rest of month", range: "Date range" };
function NoteLine({ note }: { note: { text: string; scope: NoteScope } }) {
  return (
    <div className="mt-2.5 flex items-center gap-2 text-[12.5px] text-muted-foreground">
      <StickyNote className="size-3.5 shrink-0 text-primary" />
      <span className="truncate">{note.text}</span>
      {note.scope !== "day" && <span className="shrink-0 text-faint">· {SCOPE_LABEL[note.scope]}</span>}
    </div>
  );
}

/* ---------- EmployeeField ---------- */
export function EmployeeField({ label, value, onChange, numeric, optional, error, icon }: {
  label: string; value: string; onChange: (v: string) => void; numeric?: boolean; optional?: boolean; error?: string; icon?: ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-1.5 flex items-center justify-between px-1">
        <span className="text-[13.5px] font-medium text-ink">{label}</span>
        {optional && <span className="text-[12px] text-faint">Optional</span>}
      </div>
      <div className={cn("flex h-14 items-center gap-3 rounded-[16px] border bg-surface px-4 transition-colors focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10",
        error ? "border-destructive" : "border-input")}>
        {icon && <span className="text-faint">{icon}</span>}
        <input value={numeric ? ar(value) : value} inputMode={numeric ? "numeric" : "text"}
          onChange={(e) => {
            const raw = e.target.value.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
            onChange(numeric ? raw.replace(/\D/g, "").slice(0, 4) : raw);
          }}
          className="h-full flex-1 bg-transparent text-[16px] text-ink outline-none placeholder:text-faint" />
      </div>
      {error && <div className="mt-1.5 px-1 text-[12.5px] text-destructive">{error}</div>}
    </label>
  );
}
export function validateNum(v: string, required: boolean) {
  if (!v) return required ? "This field is required" : undefined;
  if (v.startsWith("0")) return "Cannot start with zero";
  if (v.length > 4) return "Use 1 to 4 digits";
}

/* ---------- TimeField ---------- */
export function TimeField({ label, value, sub, disabled, onClick }: { label: string; value?: number; sub?: string; disabled?: boolean; onClick: () => void }) {
  return (
    <button disabled={disabled} onClick={onClick}
      className="press flex flex-1 flex-col items-start rounded-[16px] border border-input bg-surface px-4 py-3 text-start disabled:opacity-50">
      <span className="flex items-center gap-1.5 text-[12.5px] text-muted-foreground"><Clock3 className="size-3.5" />{label}</span>
      <span className="tabular mt-1 text-[20px] font-semibold text-ink">{value == null ? "—" : clock(value)}</span>
      {sub && <span className="mt-0.5 text-[11.5px] font-medium text-warning-ink">{sub}</span>}
    </button>
  );
}

/* ---------- NoteScopeSelector ---------- */
export function NoteScopeSelector({ value, onChange }: { value: NoteScope; onChange: (s: NoteScope) => void }) {
  const items: { k: NoteScope; hint: string }[] = [
    { k: "day", hint: "Overrides any general note" },
    { k: "month", hint: "From this day to month end" },
    { k: "range", hint: "Choose start and end dates" },
  ];
  return (
    <div className="space-y-2" role="radiogroup">
      {items.map((it) => {
        const on = value === it.k;
        return (
          <button key={it.k} role="radio" aria-checked={on} onClick={() => onChange(it.k)}
            className={cn("press flex w-full items-center gap-3 rounded-[16px] border px-4 py-3 text-start",
              on ? "border-primary bg-primary-container/60" : "border-border bg-surface")}>
            <span className={cn("flex size-5 items-center justify-center rounded-full border-2", on ? "border-primary" : "border-outline")}>
              {on && <span className="size-2.5 rounded-full bg-primary" />}
            </span>
            <span className="flex-1">
              <span className="block text-[14.5px] font-semibold text-ink">{SCOPE_LABEL[it.k]}</span>
              <span className="block text-[12px] text-muted-foreground">{it.hint}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ---------- HolidayCard ---------- */
export function HolidayCard({ name, m, d, days, onEdit }: { name: string; m: number; d: number; days: number; onEdit: () => void }) {
  return (
    <button onClick={onEdit} className="press flex w-full items-center gap-3 rounded-[20px] border border-border bg-surface p-3 text-start shadow-card">
      <div className="flex w-12 flex-col items-center rounded-2xl bg-overtime-container py-2 text-overtime-ink">
        <span className="tabular text-[18px] font-semibold leading-none">{ar(d)}</span>
        <span className="mt-1 text-[10.5px] font-medium">{MONTHS[m]}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[15px] font-semibold text-ink">{name}</div>
        <div className="mt-1 flex items-center gap-1.5 text-[12px] text-muted-foreground">
          <span>{WEEKDAYS[new Date(2026, m, d).getDay()]}</span>
          {days > 1 && <span>· {ar(days)} days</span>}
          <span>· Counted as double time</span>
        </div>
      </div>
      <ChevronLeft className="size-4 text-faint" />
    </button>
  );
}

/* ---------- ExportAction ---------- */
export function ExportAction({ icon, label, sub, onClick, selected, compact }: { icon: ReactNode; label: string; sub?: string; onClick: () => void; selected?: boolean; compact?: boolean }) {
  if (compact)
    return (
      <button onClick={onClick} className="press flex h-11 items-center gap-2 rounded-full border border-border bg-surface px-3.5 text-[13.5px] font-semibold text-ink shadow-card">
        <span className="text-primary">{icon}</span>{label}
      </button>
    );
  return (
    <button onClick={onClick} className={cn("press flex flex-1 flex-col items-start gap-3 rounded-[20px] border p-4 text-start",
      selected ? "border-primary bg-primary-container/50" : "border-border bg-surface shadow-card")}>
      <span className={cn("flex size-10 items-center justify-center rounded-xl", selected ? "bg-primary text-primary-foreground" : "bg-surface-variant text-ink")}>{icon}</span>
      <span>
        <span className="block text-[15px] font-semibold text-ink">{label}</span>
        {sub && <span className="block text-[12px] text-muted-foreground">{sub}</span>}
      </span>
    </button>
  );
}

/* ---------- BottomNavigation ---------- */
export type Tab = "home" | "records" | "more";
export function BottomNavigation({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  const items: { k: Tab; t: string; i: typeof Home }[] = [
    { k: "home", t: "Home", i: Home },
    { k: "records", t: "Records", i: CalendarDays },
    { k: "more", t: "More", i: LayoutGrid },
  ];
  return (
    <nav className="mx-5 mb-3 flex h-[68px] shrink-0 items-start justify-around rounded-[20px] border border-border bg-surface/75 px-4 pt-2 backdrop-blur-xl shadow-card">
      {items.map(({ k, t, i: Icon }) => {
        const on = tab === k;
        return (
          <button key={k} onClick={() => onChange(k)} className="flex w-20 flex-col items-center gap-1" aria-current={on}>
            <span className={cn("flex h-8 w-16 items-center justify-center rounded-[10px] transition-all duration-300",
              on ? "bg-primary-container text-primary" : "text-faint")}> 
              <Icon className="size-[21px]" strokeWidth={on ? 2.2 : 1.8} />
            </span>
            <span className={cn("text-[12px]", on ? "font-semibold text-ink" : "font-medium text-faint")}>{t}</span>
          </button>
        );
      })}
    </nav>
  );
}

/* ---------- Sheets & dialogs ---------- */
export function Scrim({ onClose, children, align = "bottom" }: { onClose: () => void; children: ReactNode; align?: "bottom" | "center" }) {
  return (
    <div className={cn("absolute inset-0 z-40 flex bg-ink/35 animate-in fade-in duration-200",
      align === "bottom" ? "items-end" : "items-center justify-center p-6")} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className={align === "bottom" ? "w-full" : "w-full"}>{children}</div>
    </div>
  );
}
export function Sheet({ children, onClose, title }: { children: ReactNode; onClose: () => void; title?: string }) {
  return (
    <Scrim onClose={onClose}>
      <div className="max-h-[720px] overflow-y-auto no-scrollbar rounded-t-[30px] bg-surface px-5 pb-7 pt-3 shadow-sheet animate-in slide-in-from-bottom duration-300">
        <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-outline" />
        {title && <h3 className="mb-4 text-[18px] font-semibold text-ink">{title}</h3>}
        {children}
      </div>
    </Scrim>
  );
}

export function WarningDialog({ tone, icon, title, body, primary, secondary, onPrimary, onSecondary, onClose }: {
  tone: "warning" | "danger" | "info"; icon?: ReactNode; title: string; body: ReactNode; primary: string; secondary: string;
  onPrimary: () => void; onSecondary: () => void; onClose: () => void;
}) {
  const toneC = { warning: "bg-warning-container text-warning-ink", danger: "bg-error-container text-destructive", info: "bg-primary-container text-on-primary-container" }[tone];
  return (
    <Scrim onClose={onClose} align="center">
      <div className="rounded-[28px] bg-surface p-6 shadow-sheet animate-in zoom-in-95 fade-in duration-200">
        <div className={cn("mb-4 flex size-12 items-center justify-center rounded-2xl", toneC)}>{icon ?? <AlertTriangle className="size-6" />}</div>
        <h3 className="text-[19px] font-semibold text-ink">{title}</h3>
        <div className="mt-2 text-[14.5px] leading-relaxed text-muted-foreground">{body}</div>
        <div className="mt-6 flex flex-col gap-2">
          <button onClick={onPrimary} className={cn("press h-12 rounded-[16px] text-[15px] font-semibold text-primary-foreground",
            tone === "danger" ? "bg-destructive" : tone === "warning" ? "bg-ink" : "bg-primary")}>{primary}</button>
          <button onClick={onSecondary} className="press h-12 rounded-[16px] text-[15px] font-semibold text-on-primary-container">{secondary}</button>
        </div>
      </div>
    </Scrim>
  );
}

export function MonthEndDialog({ m, workDays, ot, openSession, onExcel, onPdf, onShare, onLater }: {
  m: number; workDays: number; ot: number; openSession?: boolean; onExcel: () => void; onPdf: () => void; onShare: () => void; onLater: () => void;
}) {
  return (
    <Scrim onClose={onLater} align="center">
      <div className="overflow-hidden rounded-[30px] bg-surface shadow-sheet animate-in zoom-in-95 fade-in duration-200">
        <div className="bg-hero px-6 pb-5 pt-6 text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-[18px] bg-primary text-primary-foreground shadow-button">
            <Sparkles className="size-6" />
          </div>
          <h3 className="mt-4 text-[20px] font-semibold text-ink">Completed {monthLabel(m)}</h3>
          <div className="mt-4 flex rounded-2xl border border-border bg-surface py-3">
            <Stat label="Workdays" value={ar(workDays)} />
            <div className="w-px bg-border" />
            <Stat label="Total overtime" value={durShort(ot)} accent />
          </div>
        </div>
        <div className="px-6 pb-5 pt-4">
          {openSession && (
            <div className="mb-4 flex gap-2.5 rounded-2xl bg-warning-container p-3 text-[13px] leading-relaxed text-warning-ink">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <span>The September 30 shift is still open. You can complete it later.</span>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <button onClick={onExcel} className="press h-12 rounded-[16px] bg-primary text-[15px] font-semibold text-primary-foreground shadow-button">Save Excel</button>
            <button onClick={onPdf} className="press h-12 rounded-[16px] bg-primary-container text-[15px] font-semibold text-on-primary-container">Save PDF</button>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button onClick={onShare} className="press h-11 rounded-[14px] text-[14.5px] font-semibold text-ink">Share</button>
            <button onClick={onLater} className="press h-11 rounded-[14px] text-[14.5px] font-medium text-faint">Later</button>
          </div>
        </div>
      </div>
    </Scrim>
  );
}

export function UndoSnackbar({ text, onUndo, onClose }: { text: string; onUndo: () => void; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4500);
    return () => clearTimeout(t);
  }, [text, onClose]);
  return (
    <div className="absolute inset-x-4 bottom-[92px] z-30 flex h-12 items-center justify-between rounded-[14px] bg-inverse pe-2 ps-4 text-inverse-foreground shadow-sheet animate-in slide-in-from-bottom-4 fade-in duration-300">
      <span className="flex items-center gap-2 text-[14px]"><CircleCheck className="size-4 text-success" />{text}</span>
      <button onClick={onUndo} className="h-9 rounded-lg px-3 text-[14px] font-semibold text-primary-container">Undo</button>
    </div>
  );
}

/* ---------- AppBar ---------- */
export function AppBar({ title, onBack, action }: { title: string; onBack?: () => void; action?: ReactNode }) {
  return (
    <div className="flex h-14 shrink-0 items-center gap-1 px-2">
      {onBack && (
        <button onClick={onBack} className="flex size-12 items-center justify-center rounded-full text-ink hover:bg-surface-variant" aria-label="Back">
          <ArrowRight className="size-[22px]" />
        </button>
      )}
      <h1 className={cn("flex-1 text-[19px] font-semibold text-ink", !onBack && "px-3")}>{title}</h1>
      {action}
    </div>
  );
}

/* ---------- Time picker ---------- */
export function TimePickerSheet({ title, value, onClose, onSave }: { title: string; value: number; onClose: () => void; onSave: (v: number) => void }) {
  const base = ((value % 1440) + 1440) % 1440;
  const [h24, setH] = useState(Math.floor(base / 60));
  const [mi, setMi] = useState(base % 60);
  const [mode, setMode] = useState<"dial" | "input">("dial");
  const [pick, setPick] = useState<"h" | "m">("h");
  const pm = h24 >= 12;
  const h12 = h24 % 12 || 12;
  const setH12 = (h: number) => setH((h % 12) + (pm ? 12 : 0));
  const R = 96;
  return (
    <Sheet onClose={onClose}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-[16px] font-semibold text-muted-foreground">{title}</h3>
        <button onClick={() => setMode(mode === "dial" ? "input" : "dial")} className="flex size-10 items-center justify-center rounded-full bg-surface-variant text-ink" aria-label="Switch input method">
          {mode === "dial" ? <Keyboard className="size-5" /> : <Clock3 className="size-5" />}
        </button>
      </div>
      <div className="flex items-center justify-center gap-3" dir="ltr">
        {mode === "dial" ? (
          <>
            <button onClick={() => setPick("h")} className={cn("tabular h-[72px] w-24 rounded-2xl text-[44px] font-semibold", pick === "h" ? "bg-primary-container text-on-primary-container" : "bg-surface-variant text-ink")}>{ar(h12)}</button>
            <span className="text-[40px] font-semibold text-ink">:</span>
            <button onClick={() => setPick("m")} className={cn("tabular h-[72px] w-24 rounded-2xl text-[44px] font-semibold", pick === "m" ? "bg-primary-container text-on-primary-container" : "bg-surface-variant text-ink")}>{ar(String(mi).padStart(2, "0"))}</button>
          </>
        ) : (
          <>
            <input value={ar(h12)} onChange={(e) => { const n = +e.target.value.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d))).replace(/\D/g, ""); if (n >= 1 && n <= 12) setH12(n); }}
              className="tabular h-[72px] w-24 rounded-2xl border-2 border-primary bg-primary-container/50 text-center text-[44px] font-semibold text-ink outline-none" />
            <span className="text-[40px] font-semibold text-ink">:</span>
            <input value={ar(String(mi).padStart(2, "0"))} onChange={(e) => { const n = +e.target.value.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d))).replace(/\D/g, "").slice(-2); if (n >= 0 && n < 60) setMi(n); }}
              className="tabular h-[72px] w-24 rounded-2xl border border-input bg-surface-variant text-center text-[44px] font-semibold text-ink outline-none" />
          </>
        )}
        <div className="flex flex-col overflow-hidden rounded-xl border border-outline">
          {(["AM", "PM"] as const).map((s, i) => {
            const on = (i === 1) === pm;
            return (
              <button key={s} onClick={() => setH(i === 1 ? (h24 % 12) + 12 : h24 % 12)}
                className={cn("h-9 w-12 text-[15px] font-semibold", on ? "bg-overtime-container text-overtime-ink" : "text-muted-foreground")}>{s}</button>
            );
          })}
        </div>
      </div>
      {mode === "dial" && (
        <div className="relative mx-auto mt-6 size-[236px] rounded-full bg-surface-variant">
          <span className="absolute left-1/2 top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary" />
          {Array.from({ length: 12 }, (_, i) => {
            const val = pick === "h" ? i + 1 : i * 5;
            const a = ((pick === "h" ? i + 1 : i) * 30 - 90) * (Math.PI / 180);
            const on = pick === "h" ? val === h12 : val === Math.round(mi / 5) * 5 % 60;
            return (
              <button key={i} onClick={() => (pick === "h" ? (setH12(val), setPick("m")) : setMi(val))}
                style={{ left: 118 + R * Math.cos(a) - 20, top: 118 + R * Math.sin(a) - 20 }}
                className={cn("tabular absolute flex size-10 items-center justify-center rounded-full text-[15px] font-medium",
                  on ? "bg-primary text-primary-foreground" : "text-ink")}>
                {ar(pick === "h" ? val : String(val).padStart(2, "0"))}
              </button>
            );
          })}
        </div>
      )}
      <div className="mt-6 flex justify-end gap-2">
        <button onClick={onClose} className="h-11 rounded-full px-5 text-[15px] font-semibold text-on-primary-container">Cancel</button>
        <button onClick={() => onSave(h24 * 60 + mi)} className="h-11 rounded-full bg-primary px-6 text-[15px] font-semibold text-primary-foreground">Done</button>
      </div>
    </Sheet>
  );
}

export function CloseBtn({ onClick }: { onClick: () => void }) {
  return <button onClick={onClick} className="flex size-10 items-center justify-center rounded-full bg-surface-variant" aria-label="Close"><X className="size-5" /></button>;
}
