const DIGITS = "٠١٢٣٤٥٦٧٨٩";
export const ar = (v: string | number) => String(v).replace(/\d/g, (d) => DIGITS[+d]);
const pad = (n: number) => String(n).padStart(2, "0");
/** Duration in minutes -> "٠٣:٢٧" */
export const dur = (min: number) => ar(`${pad(Math.floor(min / 60))}:${pad(Math.floor(min % 60))}`);
/** Duration in minutes -> "١١:٥٢" (no leading zero on hours) */
export const durShort = (min: number) => ar(`${Math.floor(min / 60)}:${pad(min % 60)}`);
/** Minutes from midnight (may exceed 1440) -> "٧:٢٣ ص" */
export const clock = (min: number) => {
  const m = ((min % 1440) + 1440) % 1440;
  const h24 = Math.floor(m / 60);
  const h = h24 % 12 || 12;
  return `${ar(`${h}:${pad(m % 60)}`)} ${h24 >= 12 ? "م" : "ص"}`;
};

export const MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
export const WEEKDAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
export const YEAR = 2026;
/** Prototype "today": Thursday 15 October 2026 */
export const TODAY = { m: 9, d: 15 };

export const dayLabel = (m: number, d: number) => `${WEEKDAYS[new Date(YEAR, m, d).getDay()]}، ${ar(d)} ${MONTHS[m]}`;
export const monthLabel = (m: number) => `${MONTHS[m]} ${ar(YEAR)}`;

export type Holiday = { id: string; name: string; m: number; d: number; days: number };
export const HOLIDAYS: Holiday[] = [
  { id: "h1", name: "عيد الميلاد المجيد", m: 0, d: 7, days: 1 },
  { id: "h2", name: "ثورة ٢٥ يناير وعيد الشرطة", m: 0, d: 25, days: 1 },
  { id: "h3", name: "عيد الفطر", m: 2, d: 20, days: 3 },
  { id: "h4", name: "شم النسيم", m: 3, d: 13, days: 1 },
  { id: "h5", name: "عيد تحرير سيناء", m: 3, d: 25, days: 1 },
  { id: "h6", name: "عيد العمال", m: 4, d: 1, days: 1 },
  { id: "h7", name: "وقفة عرفات وعيد الأضحى", m: 4, d: 26, days: 4 },
  { id: "h8", name: "رأس السنة الهجرية", m: 5, d: 16, days: 1 },
  { id: "h9", name: "ذكرى ثورة ٣٠ يونيو", m: 5, d: 30, days: 1 },
  { id: "h10", name: "ذكرى ثورة ٢٣ يوليو", m: 6, d: 23, days: 1 },
  { id: "h11", name: "المولد النبوي الشريف", m: 7, d: 25, days: 1 },
  { id: "h12", name: "عيد القوات المسلحة", m: 9, d: 6, days: 1 },
];

export type DayKind = "work" | "weekend" | "holiday";
export type NoteScope = "day" | "month" | "range";
export type DayRec = {
  m: number;
  d: number;
  weekday: number;
  kind: DayKind;
  holidayName?: string;
  override?: "normal" | "x2";
  inMin?: number;
  outMin?: number;
  note?: string;
  future: boolean;
  today: boolean;
};
export type RangeNote = { id: string; m: number; from: number; to: number; text: string; scope: "month" | "range" };

const rnd = (seed: number) => {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
};

export function holidayOn(list: Holiday[], m: number, d: number) {
  return list.find((h) => h.m === m && d >= h.d && d < h.d + h.days);
}

export function buildMonth(m: number, holidays: Holiday[] = HOLIDAYS): DayRec[] {
  const n = new Date(YEAR, m + 1, 0).getDate();
  const out: DayRec[] = [];
  for (let d = 1; d <= n; d++) {
    const weekday = new Date(YEAR, m, d).getDay();
    const hol = holidayOn(holidays, m, d);
    const kind: DayKind = hol ? "holiday" : weekday === 5 || weekday === 6 ? "weekend" : "work";
    const future = m > TODAY.m || (m === TODAY.m && d > TODAY.d);
    const today = m === TODAY.m && d === TODAY.d;
    const rec: DayRec = { m, d, weekday, kind, holidayName: hol?.name, future, today };
    if (!future && !today && kind === "work" && !(m === 8 && d === 17)) {
      rec.inMin = 432 + Math.floor(rnd(m * 31 + d) * 26);
      rec.outMin = 975 + Math.floor(rnd(m * 17 + d * 3) * 200);
    }
    out.push(rec);
  }
  const at = (d: number) => out[d - 1];
  if (m === 8) {
    Object.assign(at(12), { inMin: 480, outMin: 870 });
    Object.assign(at(24), { inMin: 600, outMin: 1540 });
    Object.assign(at(13), { inMin: 443, outMin: 1155 });
  }
  if (m === 9) {
    Object.assign(at(10), { inMin: 480, outMin: 900 });
    Object.assign(at(8), { note: "مأمورية في فرع الإسكندرية" });
    Object.assign(at(15), { inMin: 443 });
    Object.assign(at(20), { note: "موعد طبي صباحاً" });
  }
  return out;
}

export const RANGE_NOTES: RangeNote[] = [
  { id: "r1", m: 9, from: 11, to: 13, text: "دورة تدريبية في مركز التدريب", scope: "range" },
  { id: "r2", m: 8, from: 27, to: 30, text: "جرد نهاية الربع", scope: "month" },
];

export const isX2 = (d: DayRec) => (d.override ? d.override === "x2" : d.kind !== "work");
export const workMin = (d: DayRec) => (d.inMin != null && d.outMin != null ? d.outMin - d.inMin : 0);
export const otMin = (d: DayRec) => (isX2(d) ? workMin(d) : Math.max(0, workMin(d) - 540));
export const attended = (d: DayRec) => d.inMin != null;

/** Day note overrides range/month note; notes never show on unrecorded past days. */
export function effectiveNote(d: DayRec, ranges: RangeNote[]): { text: string; scope: NoteScope } | null {
  if (!attended(d) && !d.future) return null;
  if (d.note) return { text: d.note, scope: "day" };
  const r = ranges.find((x) => x.m === d.m && d.d >= x.from && d.d <= x.to);
  return r ? { text: r.text, scope: r.scope } : null;
}

export function summarize(days: DayRec[]) {
  const worked = days.filter(attended);
  return { workDays: worked.length, ot: worked.reduce((s, d) => s + otMin(d), 0) };
}

export const ARCHIVE_STATIC = [
  { m: 7, workDays: 21, ot: 1695 },
  { m: 6, workDays: 22, ot: 1530 },
  { m: 5, workDays: 20, ot: 1260 },
];
