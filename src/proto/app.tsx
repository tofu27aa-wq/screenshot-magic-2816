import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  User, Hash, BadgeCheck, FileSpreadsheet, FileText, DatabaseBackup, Share2, StickyNote, Trash2, Plus,
  AlertTriangle, ChevronLeft, CalendarRange, ArchiveRestore, HardDriveDownload, MessageCircle, Mail,
  Cloud, Folder, Smartphone, Lock, Info, Pencil, Flag, Download, CircleCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ar, clock, dur, durShort, dayLabel, monthLabel, MONTHS, TODAY, HOLIDAYS, RANGE_NOTES, ARCHIVE_STATIC,
  buildMonth, effectiveNote, summarize, isX2, otMin, workMin, attended,
  type DayRec, type Holiday, type NoteScope, type RangeNote,
} from "./data";
import {
  AttendanceRing, AttendancePrimaryButton, MonthKpiCard, MonthlyArchiveCard, DailyRecordCard, DayTypeBadge,
  EmployeeField, validateNum, TimeField, NoteScopeSelector, HolidayCard, ExportAction, BottomNavigation,
  WarningDialog, MonthEndDialog, UndoSnackbar, AppBar, Sheet, TimePickerSheet, SCOPE_LABEL, type Tab,
} from "./components";

export type Screen = "setup" | "home" | "records" | "month" | "day" | "more" | "employee" | "holidays" | "backup" | "export";
export type HomeMode = "idle" | "normal" | "overtime" | "x2" | "done" | "over24";
export type Overlay =
  | null
  | { t: "open" } | { t: "over24" } | { t: "monthEnd"; openSession?: boolean } | { t: "delete" }
  | { t: "share"; file: string } | { t: "restore" } | { t: "restoreConfirm" } | { t: "backupDone" }
  | { t: "time"; field: "in" | "out" } | { t: "note" } | { t: "holiday"; id?: string } | { t: "deleteHoliday"; id: string };

export type ProtoState = { screen: Screen; mode: HomeMode; overlay: Overlay; month: number; day: number };

const HOME_MIN: Record<HomeMode, number> = { idle: 0, normal: 207, overtime: 592, x2: 254, done: 712, over24: 1570 };

export function Prototype({ state, setState }: { state: ProtoState; setState: (s: Partial<ProtoState>) => void }) {
  const { screen, mode, overlay, month, day } = state;
  const [months, setMonths] = useState<Record<number, DayRec[]>>(() => ({ 8: buildMonth(8), 9: buildMonth(9) }));
  const [ranges, setRanges] = useState<RangeNote[]>(RANGE_NOTES);
  const [holidays, setHolidays] = useState<Holiday[]>(HOLIDAYS);
  const [profile, setProfile] = useState({ name: "أحمد محمود", group: "12", id: "348" });
  const [snack, setSnack] = useState<{ text: string; undo: () => void } | null>(null);
  const [tick, setTick] = useState(0);

  const active = mode === "normal" || mode === "overtime" || mode === "x2";
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setTick((v) => v + 1), 60000);
    return () => clearInterval(t);
  }, [active]);
  useEffect(() => setTick(0), [mode]);

  const go = (s: Partial<ProtoState>) => setState({ overlay: null, ...s });
  const closeOverlay = () => setState({ overlay: null });
  const tab: Tab = screen === "home" ? "home" : screen === "records" || screen === "month" ? "records" : "more";
  const showNav = ["home", "records", "month", "more"].includes(screen);
  const currentDays = months[9];
  const curSum = summarize(currentDays);
  const firstName = profile.name.split(" ")[0];

  const updateDay = (m: number, d: number, patch: Partial<DayRec> | null) =>
    setMonths((prev) => ({
      ...prev,
      [m]: prev[m].map((x) => (x.d !== d ? x : patch === null ? { ...x, inMin: undefined, outMin: undefined, note: undefined, override: undefined } : { ...x, ...patch })),
    }));

  const content: ReactNode = (() => {
    switch (screen) {
      case "setup": return <SetupScreen onSave={(p) => { setProfile(p); go({ screen: "home", mode: "idle" }); }} />;
      case "home": return (
        <HomeScreen mode={mode} minutes={HOME_MIN[mode] + (active ? tick : 0)} name={firstName} sum={curSum}
          onAction={() => {
            if (mode === "idle") {
              go({ mode: "normal" });
              setSnack({ text: "تم تسجيل الحضور", undo: () => setState({ mode: "idle" }) });
            } else if (mode === "done") {
              go({ screen: "day", month: 9, day: TODAY.d });
            } else {
              const prev = mode;
              go({ mode: "done" });
              setSnack({ text: "تم تسجيل الانصراف", undo: () => setState({ mode: prev }) });
            }
          }}
          onFix={() => go({ screen: "day", month: 9, day: 14 })} />
      );
      case "records": return (
        <RecordsScreen cur={curSum} sep={summarize(months[8])} onOpen={(m) => go({ screen: "month", month: m })}
          onExport={(f) => setState({ overlay: { t: "share", file: `سجل_${MONTHS[9]}_٢٠٢٦.${f}` } })}
          onBackup={() => go({ screen: "backup" })} />
      );
      case "month": {
        const days = months[month] ?? buildMonth(month);
        return <MonthScreen m={month} days={days} ranges={ranges} onBack={() => go({ screen: "records" })}
          onDay={(d) => go({ screen: "day", day: d })}
          onExport={() => setState({ overlay: { t: "share", file: `سجل_${MONTHS[month]}_٢٠٢٦.pdf` } })} />;
      }
      case "day": {
        const days = months[month] ?? buildMonth(month);
        const rec = days[day - 1];
        return <DayScreen key={`${month}-${day}`} rec={rec} ranges={ranges} overlay={overlay} setOverlay={(o) => setState({ overlay: o })}
          onBack={() => go({ screen: "month" })}
          onSave={(patch, note) => {
            updateDay(month, day, patch);
            if (note && note.scope !== "day") {
              setRanges((r) => [...r.filter((x) => !(x.m === month && x.from === note.from)), { id: String(Date.now()), m: month, from: note.from, to: note.to, text: note.text, scope: note.scope as "month" | "range" }]);
            }
            go({ screen: "month" });
            setSnack({ text: "تم حفظ التغييرات", undo: () => {} });
          }}
          onDelete={() => { updateDay(month, day, null); go({ screen: "month" }); setSnack({ text: "تم حذف تسجيل اليوم", undo: () => setMonths((p) => ({ ...p, [month]: p[month].map((x) => (x.d === day ? rec : x)) })) }); }} />;
      }
      case "more": return <MoreScreen profile={profile} go={(s) => go({ screen: s })} />;
      case "employee": return <EmployeeScreen profile={profile} onBack={() => go({ screen: "more" })}
        onSave={(p) => { setProfile(p); go({ screen: "more" }); setSnack({ text: "تم حفظ بيانات الموظف", undo: () => {} }); }} />;
      case "holidays": return <HolidaysScreen list={holidays} onBack={() => go({ screen: "more" })} onEdit={(id) => setState({ overlay: { t: "holiday", id } })} />;
      case "backup": return <BackupScreen onBack={() => go({ screen: "more" })} onCreate={() => setState({ overlay: { t: "backupDone" } })} onRestore={() => setState({ overlay: { t: "restore" } })} />;
      case "export": return <ExportScreen onBack={() => go({ screen: "more" })} onShare={(f) => setState({ overlay: { t: "share", file: f } })} />;
    }
  })();

  const holidayEditing = overlay?.t === "holiday" ? holidays.find((h) => h.id === overlay.id) : undefined;
  const sep = summarize(months[8]);
  const dismissSnack = useCallback(() => setSnack(null), []);

  return (
    <div className="relative flex h-full flex-col bg-background">
      <div className="flex-1 overflow-y-auto no-scrollbar" key={screen}>
        <div className="min-h-full animate-in fade-in duration-300">{content}</div>
      </div>
      {showNav && <BottomNavigation tab={tab} onChange={(t) => go({ screen: t })} />}
      {snack && <UndoSnackbar text={snack.text} onUndo={() => { snack.undo(); setSnack(null); }} onClose={dismissSnack} />}

      {overlay?.t === "open" && (
        <Sheet onClose={closeOverlay}>
          <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-warning-container text-warning-ink"><AlertTriangle className="size-6" /></div>
          <h3 className="text-[20px] font-semibold text-ink">لديك حضور مفتوح</h3>
          <p className="mt-2 text-[14.5px] leading-relaxed text-muted-foreground">
            تم تسجيل الحضور يوم <b className="font-semibold text-ink">{dayLabel(9, 14)}</b> الساعة <b className="font-semibold text-ink">{clock(443)}</b> ولم يتم تسجيل الانصراف
          </p>
          <div className="mt-6 space-y-2">
            <button onClick={() => { go({ mode: "done" }); setSnack({ text: "تم تسجيل الانصراف", undo: () => {} }); }} className="press h-14 w-full rounded-[18px] bg-ink text-[16px] font-semibold text-primary-foreground">تسجيل الانصراف الآن</button>
            <button onClick={() => go({ screen: "day", month: 9, day: 14 })} className="press h-12 w-full rounded-[16px] text-[15px] font-semibold text-on-primary-container">فتح تفاصيل اليوم</button>
          </div>
        </Sheet>
      )}
      {overlay?.t === "over24" && (
        <WarningDialog tone="warning" title="تجاوزت مدة الحضور ٢٤ ساعة"
          body={<>تم تسجيل الحضور يوم {dayLabel(9, 14)} الساعة {clock(443)}. الحد الأقصى للوردية ٢٤ ساعة، لذلك يجب تعديل وقت الانصراف يدوياً.</>}
          primary="تعديل وقت الانصراف" secondary="لاحقاً" onClose={closeOverlay} onSecondary={closeOverlay}
          onPrimary={() => go({ screen: "day", month: 9, day: 14 })} />
      )}
      {overlay?.t === "monthEnd" && (
        <MonthEndDialog m={8} workDays={sep.workDays} ot={sep.ot} openSession={overlay.openSession}
          onExcel={() => setState({ overlay: { t: "share", file: "سجل_سبتمبر_٢٠٢٦.xlsx" } })}
          onPdf={() => setState({ overlay: { t: "share", file: "سجل_سبتمبر_٢٠٢٦.pdf" } })}
          onShare={() => setState({ overlay: { t: "share", file: "سجل_سبتمبر_٢٠٢٦.pdf" } })}
          onLater={closeOverlay} />
      )}
      {overlay?.t === "share" && <ShareSheet file={overlay.file} onClose={closeOverlay} />}
      {overlay?.t === "backupDone" && (
        <Sheet onClose={closeOverlay}>
          <div className="flex flex-col items-center text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-success-container text-success"><CircleCheck className="size-7" /></div>
            <h3 className="mt-4 text-[19px] font-semibold text-ink">تم إنشاء النسخة الاحتياطية</h3>
            <p className="mt-1 text-[13.5px] text-muted-foreground">daftar_backup_2026-10-15.bak · ٢٤٨ ك.ب</p>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-2">
            <button onClick={() => setState({ overlay: { t: "share", file: "daftar_backup_2026-10-15.bak" } })} className="press h-12 rounded-[16px] bg-primary text-[15px] font-semibold text-primary-foreground">حفظ أو مشاركة</button>
            <button onClick={closeOverlay} className="press h-12 rounded-[16px] bg-surface-variant text-[15px] font-semibold text-ink">تم</button>
          </div>
        </Sheet>
      )}
      {overlay?.t === "restore" && (
        <Sheet onClose={closeOverlay} title="اختر ملف النسخة الاحتياطية">
          <div className="space-y-2">
            {[["daftar_backup_2026-10-12.bak", "١٢ أكتوبر ٢٠٢٦ · ٨:٠٥ م"], ["daftar_backup_2026-09-30.bak", "٣٠ سبتمبر ٢٠٢٦ · ٦:٤٠ م"]].map(([f, d]) => (
              <button key={f} onClick={() => setState({ overlay: { t: "restoreConfirm" } })} className="press flex w-full items-center gap-3 rounded-[18px] border border-border bg-surface p-3 text-start">
                <span className="flex size-11 items-center justify-center rounded-xl bg-primary-container text-on-primary-container"><DatabaseBackup className="size-5" /></span>
                <span className="min-w-0 flex-1"><span dir="ltr" className="block truncate text-start text-[14px] font-semibold text-ink">{f}</span><span className="block text-[12px] text-muted-foreground">{d}</span></span>
                <ChevronLeft className="size-4 text-faint" />
              </button>
            ))}
            <button className="press flex h-12 w-full items-center justify-center gap-2 rounded-[16px] text-[14.5px] font-semibold text-on-primary-container"><Folder className="size-4" />تصفح ملفات الجهاز</button>
          </div>
        </Sheet>
      )}
      {overlay?.t === "restoreConfirm" && (
        <WarningDialog tone="warning" icon={<ArchiveRestore className="size-6" />} title="استعادة النسخة الاحتياطية؟"
          body="سيتم استبدال جميع البيانات الحالية على هذا الجهاز ببيانات النسخة المختارة (١٢ أكتوبر ٢٠٢٦)."
          primary="استعادة" secondary="إلغاء" onClose={closeOverlay} onSecondary={closeOverlay}
          onPrimary={() => { closeOverlay(); setSnack({ text: "تمت استعادة البيانات", undo: () => {} }); }} />
      )}
      {overlay?.t === "holiday" && (
        <HolidaySheet h={holidayEditing} onClose={closeOverlay}
          onDelete={holidayEditing ? () => setState({ overlay: { t: "deleteHoliday", id: holidayEditing.id } }) : undefined}
          onSave={(h) => { setHolidays((l) => (holidayEditing ? l.map((x) => (x.id === h.id ? h : x)) : [...l, h]).sort((a, b) => a.m - b.m || a.d - b.d)); closeOverlay(); }} />
      )}
      {overlay?.t === "deleteHoliday" && (
        <WarningDialog tone="danger" icon={<Trash2 className="size-6" />} title="حذف الإجازة؟"
          body={`سيتم حذف «${holidays.find((h) => h.id === overlay.id)?.name}» وستعود أيامها لنوعها العادي.`}
          primary="حذف الإجازة" secondary="إلغاء" onClose={closeOverlay} onSecondary={closeOverlay}
          onPrimary={() => { setHolidays((l) => l.filter((h) => h.id !== overlay.id)); closeOverlay(); }} />
      )}
    </div>
  );
}

/* ================= Screens ================= */

function SetupScreen({ onSave }: { onSave: (p: { name: string; group: string; id: string }) => void }) {
  const [name, setName] = useState("");
  const [group, setGroup] = useState("");
  const [id, setId] = useState("");
  const [tried, setTried] = useState(false);
  const errs = { name: !name.trim() ? "هذا الحقل مطلوب" : undefined, group: validateNum(group, true), id: validateNum(id, false) };
  const ok = !errs.name && !errs.group && !errs.id;
  return (
    <div className="flex min-h-full flex-col px-6 pb-8 pt-14">
      <div className="mx-auto flex size-28 items-center justify-center rounded-full bg-primary-container/60">
        <div className="flex size-20 items-center justify-center rounded-full bg-surface shadow-card">
          <User className="size-9 text-primary" strokeWidth={1.6} />
        </div>
      </div>
      <h1 className="mt-7 text-center text-[24px] font-bold text-ink">إعداد بيانات الموظف</h1>
      <div className="mt-9 space-y-5">
        <EmployeeField label="الاسم" value={name} onChange={setName} icon={<User className="size-5" />} error={tried ? errs.name : undefined} />
        <EmployeeField label="رقم المجموعة" value={group} onChange={setGroup} numeric icon={<Hash className="size-5" />} error={tried ? errs.group : undefined} />
        <EmployeeField label="الرقم الوظيفي" value={id} onChange={setId} numeric optional icon={<BadgeCheck className="size-5" />} error={tried ? errs.id : undefined} />
      </div>
      <div className="flex-1" />
      <button onClick={() => { setTried(true); if (ok) onSave({ name, group, id }); }}
        className="press mt-10 h-[58px] w-full rounded-[20px] bg-primary text-[17px] font-semibold text-primary-foreground shadow-button">حفظ البيانات</button>
    </div>
  );
}

function HomeScreen({ mode, minutes, name, sum, onAction, onFix }: { mode: HomeMode; minutes: number; name: string; sum: { workDays: number; ot: number }; onAction: () => void; onFix: () => void }) {
  const x2 = mode === "x2";
  const warn = mode === "over24";
  const active = mode === "normal" || mode === "overtime" || x2;
  const dateM = 9, dateD = x2 ? 16 : warn ? 14 : 15;
  const ot = x2 ? minutes : Math.max(0, minutes - 540);
  return (
    <div className="instrument-grid min-h-full px-5 pb-5">
      <header className="flex items-center gap-3 pb-5 pt-4">
        <div className="relative flex size-12 items-center justify-center rounded-2xl border border-primary/30 bg-primary-container text-on-primary-container shadow-card">
          <User className="size-5" />
          <span className="absolute -bottom-0.5 -end-0.5 size-3.5 rounded-full border-2 border-background bg-success" />
        </div>
        <div className="flex-1">
          <div className="text-[12px] font-medium text-faint">مساء الخير،</div>
          <div className="mt-0.5 text-[19px] font-bold text-ink">{name}</div>
        </div>
        <div dir="ltr" className="rounded-lg border border-border bg-surface/70 px-2.5 py-1.5 font-display text-[10px] font-semibold text-faint">OFFLINE · 01</div>
      </header>

      <section className={cn("relative overflow-hidden rounded-[28px] border border-border px-5 pb-5 pt-4 shadow-hero transition-colors duration-500",
        warn ? "bg-hero-warning" : x2 ? "bg-hero-x2" : "bg-hero")}>
        <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-primary/70" />
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-medium text-muted-foreground">{dayLabel(dateM, dateD)}</span>
          {x2 ? <DayTypeBadge type="x2" /> : warn ? (
            <span className="inline-flex h-6 items-center gap-1 rounded-full bg-warning-container px-2.5 text-[11.5px] font-semibold text-warning-ink"><AlertTriangle className="size-3" />يتطلب تصحيح</span>
          ) : mode === "done" ? (
            <span className="inline-flex h-6 items-center gap-1 rounded-full bg-success-container px-2.5 text-[11.5px] font-semibold text-success"><CircleCheck className="size-3" />اكتمل اليوم</span>
          ) : null}
        </div>
        <div className="flex justify-center py-4">
          <AttendanceRing minutes={minutes} x2={x2} warning={warn} active={active} size={238} />
        </div>
        <div className="flex min-h-7 items-center justify-center gap-2 text-[13.5px]">
          {mode === "idle" && <span className="text-faint">لم يتم تسجيل الحضور اليوم</span>}
          {(mode === "normal" || mode === "done") && (
            <span className="tabular text-muted-foreground">الحضور <b className="font-semibold text-ink">{clock(443)}</b>{mode === "done" && <> · الانصراف <b className="font-semibold text-ink">{clock(443 + minutes)}</b></>}</span>
          )}
          {(mode === "overtime" || x2 || (mode === "done" && ot > 0)) && (
            <span className="tabular inline-flex items-center gap-1.5 rounded-full bg-overtime-container px-3 py-1 font-semibold text-overtime-ink">
              <span className="size-1.5 rounded-full bg-overtime" />أوفر تايم {durShort(ot)}
            </span>
          )}
        </div>
        {warn && (
          <div className="mt-3 flex gap-2.5 rounded-2xl bg-warning-container p-3 text-[13px] leading-relaxed text-warning-ink">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <div className="flex-1">مرّ أكثر من ٢٤ ساعة على الحضور. يجب تعديل وقت الانصراف يدوياً.
              <button onClick={onFix} className="mt-1 block font-semibold underline underline-offset-4">تعديل وقت الانصراف</button>
            </div>
          </div>
        )}
        <div className="mt-3">
          <AttendancePrimaryButton state={mode === "idle" ? "in" : mode === "done" ? "done" : "out"} onClick={onAction} />
        </div>
      </section>

      <div className="mt-4 flex gap-3">
        <MonthKpiCard kind="days" value={ar(sum.workDays + (mode === "done" ? 1 : 0))} />
        <MonthKpiCard kind="ot" value={durShort(sum.ot + (mode === "done" ? ot : 0))} />
      </div>
    </div>
  );
}

function RecordsScreen({ cur, sep, onOpen, onExport, onBackup }: { cur: { workDays: number; ot: number }; sep: { workDays: number; ot: number }; onOpen: (m: number) => void; onExport: (f: string) => void; onBackup: () => void }) {
  return (
    <div className="pb-6">
      <AppBar title="سجلات العمل الشهرية" />
      <div className="flex gap-2 overflow-x-auto no-scrollbar px-5 pb-1">
        <ExportAction compact icon={<FileSpreadsheet className="size-[18px]" />} label="تصدير Excel" onClick={() => onExport("xlsx")} />
        <ExportAction compact icon={<FileText className="size-[18px]" />} label="تصدير PDF" onClick={() => onExport("pdf")} />
        <ExportAction compact icon={<DatabaseBackup className="size-[18px]" />} label="نسخ احتياطي" onClick={onBackup} />
      </div>
      <div className="space-y-3 px-5 pt-5">
        <MonthlyArchiveCard m={9} current workDays={cur.workDays} ot={cur.ot} onClick={() => onOpen(9)} />
        <div className="px-1 pb-1 pt-3 text-[13px] font-semibold text-faint">الأرشيف</div>
        <MonthlyArchiveCard m={8} workDays={sep.workDays} ot={sep.ot} onClick={() => onOpen(8)} />
        {ARCHIVE_STATIC.map((a) => <MonthlyArchiveCard key={a.m} {...a} onClick={() => onOpen(a.m)} />)}
      </div>
    </div>
  );
}

function MonthScreen({ m, days, ranges, onBack, onDay, onExport }: { m: number; days: DayRec[]; ranges: RangeNote[]; onBack: () => void; onDay: (d: number) => void; onExport: () => void }) {
  const s = summarize(days);
  return (
    <div className="pb-6">
      <AppBar title={monthLabel(m)} onBack={onBack}
        action={<button onClick={onExport} className="flex size-12 items-center justify-center rounded-full text-ink" aria-label="تصدير"><Share2 className="size-5" /></button>} />
      <div className="px-5">
        <div className="flex items-center gap-4 rounded-[22px] border border-border bg-surface px-4 py-3 shadow-card">
          <div className="flex-1"><div className="text-[12px] text-muted-foreground">أيام العمل</div><div className="tabular text-[22px] font-semibold text-ink">{ar(s.workDays)}</div></div>
          <div className="h-10 w-px bg-border" />
          <div className="flex-1"><div className="text-[12px] text-muted-foreground">إجمالي الأوفر تايم</div><div dir="ltr" className="tabular text-end text-[22px] font-semibold text-overtime-ink">{durShort(s.ot)}</div></div>
        </div>
        {m < TODAY.m && (
          <div className="mt-3 flex items-center gap-2 px-1 text-[12.5px] text-muted-foreground"><Pencil className="size-3.5" />شهر مؤرشف — يمكنك تعديل أي يوم</div>
        )}
        <div className="mt-4 space-y-2.5">
          {days.map((d) => <DailyRecordCard key={d.d} day={d} note={effectiveNote(d, ranges)} onClick={() => onDay(d.d)} />)}
        </div>
      </div>
    </div>
  );
}

function DayScreen({ rec, ranges, overlay, setOverlay, onBack, onSave, onDelete }: {
  rec: DayRec; ranges: RangeNote[]; overlay: Overlay; setOverlay: (o: Overlay) => void; onBack: () => void;
  onSave: (p: Partial<DayRec>, note?: { text: string; scope: NoteScope; from: number; to: number }) => void; onDelete: () => void;
}) {
  const [inMin, setIn] = useState(rec.inMin);
  const [outMin, setOut] = useState(rec.outMin);
  const [type, setType] = useState<"normal" | "x2">(isX2(rec) ? "x2" : "normal");
  const eff = effectiveNote(rec, ranges);
  const [note, setNote] = useState(eff ? { text: eff.text, scope: eff.scope, from: rec.d, to: rec.d } : null);
  const draft: DayRec = { ...rec, inMin, outMin, override: type };
  const has = inMin != null;
  const canNote = has || rec.future;
  const auto = rec.kind === "holiday" ? `إجازة رسمية: ${rec.holidayName}` : rec.kind === "weekend" ? "عطلة أسبوعية" : "يوم عمل";
  const over = inMin != null && outMin != null && outMin - inMin > 1440;
  const lastDay = new Date(2026, rec.m + 1, 0).getDate();

  return (
    <div className="pb-8">
      <AppBar title="تفاصيل اليوم" onBack={onBack} />
      <div className="space-y-4 px-5">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <div className="text-[20px] font-semibold text-ink">{dayLabel(rec.m, rec.d)}</div>
            <div className="mt-1.5 flex gap-1.5">
              {rec.kind === "holiday" && <DayTypeBadge type="holiday" />}
              {rec.kind === "weekend" && <DayTypeBadge type="weekend" />}
              {type === "x2" && <DayTypeBadge type="x2" />}
              {rec.future && <DayTypeBadge type="future" />}
            </div>
          </div>
        </div>

        <Group title="أوقات الحضور">
          {rec.future ? (
            <div className="flex items-center gap-2.5 rounded-2xl bg-surface-variant p-3 text-[13.5px] text-muted-foreground"><Lock className="size-4" />لا يمكن تسجيل الحضور لأيام قادمة</div>
          ) : (
            <>
              <div className="flex gap-2.5">
                <TimeField label="وقت الحضور" value={inMin} onClick={() => setOverlay({ t: "time", field: "in" })} />
                <TimeField label="وقت الانصراف" value={outMin} disabled={!has} onClick={() => setOverlay({ t: "time", field: "out" })}
                  sub={outMin != null && outMin >= 1440 ? `${dayLabel(rec.m, rec.d + 1)}` : undefined} />
              </div>
              {over && <div className="mt-2.5 flex gap-2 rounded-2xl bg-warning-container p-3 text-[12.5px] text-warning-ink"><AlertTriangle className="size-4 shrink-0" />المدة تتجاوز ٢٤ ساعة — عدّل وقت الانصراف.</div>}
              {has && outMin != null && !over && (
                <div className="mt-3 flex rounded-2xl bg-surface-variant/70 py-2.5">
                  <div className="flex flex-1 flex-col items-center"><span className="text-[11.5px] text-faint">ساعات العمل</span><span className="tabular text-[16px] font-semibold text-ink">{durShort(workMin(draft))}</span></div>
                  <div className="w-px bg-border" />
                  <div className="flex flex-1 flex-col items-center"><span className="text-[11.5px] text-faint">الأوفر تايم</span><span className="tabular text-[16px] font-semibold text-overtime-ink">{durShort(otMin(draft))}</span></div>
                </div>
              )}
            </>
          )}
        </Group>

        <Group title="نوع اليوم">
          <div className="grid grid-cols-2 gap-1 rounded-[16px] bg-surface-variant p-1">
            {(["normal", "x2"] as const).map((t) => (
              <button key={t} onClick={() => setType(t)} className={cn("h-11 rounded-[12px] text-[14.5px] font-semibold transition-all",
                type === t ? (t === "x2" ? "bg-overtime text-primary-foreground shadow-card" : "bg-surface text-ink shadow-card") : "text-muted-foreground")}>
                {t === "normal" ? "يوم عادي" : "يوم ×٢"}
              </button>
            ))}
          </div>
          <div className="mt-2 flex items-center gap-1.5 px-1 text-[12px] text-faint"><Info className="size-3.5" />التلقائي: {auto}</div>
        </Group>

        <Group title="الملاحظات">
          {!canNote ? (
            <div className="text-[13px] text-faint">تظهر الملاحظات في الأيام المسجلة فقط</div>
          ) : note ? (
            <button onClick={() => setOverlay({ t: "note" })} className="press flex w-full items-start gap-3 rounded-2xl bg-primary-container/50 p-3 text-start">
              <StickyNote className="mt-0.5 size-4 shrink-0 text-primary" />
              <span className="flex-1"><span className="block text-[14.5px] text-ink">{note.text}</span><span className="mt-1 block text-[12px] text-muted-foreground">{SCOPE_LABEL[note.scope]}</span></span>
              <Pencil className="size-4 text-faint" />
            </button>
          ) : (
            <button onClick={() => setOverlay({ t: "note" })} className="press flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-outline text-[14.5px] font-semibold text-on-primary-container"><Plus className="size-4" />إضافة ملاحظة</button>
          )}
        </Group>

        <button onClick={() => onSave({ inMin, outMin, override: type, note: note?.scope === "day" ? note.text : undefined }, note ?? undefined)}
          className="press h-14 w-full rounded-[18px] bg-primary text-[16px] font-semibold text-primary-foreground shadow-button">حفظ التغييرات</button>

        {attended(rec) && (
          <div className="border-t border-border pt-5">
            <button onClick={() => setOverlay({ t: "delete" })} className="press flex h-12 w-full items-center justify-center gap-2 rounded-[16px] border border-destructive/30 text-[15px] font-semibold text-destructive">
              <Trash2 className="size-4" />حذف تسجيل اليوم
            </button>
          </div>
        )}
      </div>

      {overlay?.t === "time" && (
        <TimePickerSheet title={overlay.field === "in" ? "وقت الحضور" : "وقت الانصراف"}
          value={(overlay.field === "in" ? inMin : outMin) ?? (overlay.field === "in" ? 450 : 1020)}
          onClose={() => setOverlay(null)}
          onSave={(v) => {
            if (overlay.field === "in") setIn(v);
            else setOut(inMin != null && v <= inMin ? v + 1440 : v);
            setOverlay(null);
          }} />
      )}
      {overlay?.t === "note" && (
        <NoteSheet initial={note} d={rec.d} last={lastDay} m={rec.m} onClose={() => setOverlay(null)}
          onRemove={() => { setNote(null); setOverlay(null); }}
          onSave={(n) => { setNote(n); setOverlay(null); }} />
      )}
      {overlay?.t === "delete" && (
        <WarningDialog tone="danger" icon={<Trash2 className="size-6" />} title="حذف تسجيل اليوم؟"
          body={<>سيتم حذف تسجيل يوم <b className="font-semibold text-ink">{dayLabel(rec.m, rec.d)} {ar(2026)}</b>: الحضور {rec.inMin != null ? clock(rec.inMin) : ""}{rec.outMin != null ? ` والانصراف ${clock(rec.outMin)}` : ""}، وملاحظة هذا اليوم إن وجدت.</>}
          primary="حذف التسجيل" secondary="إلغاء" onClose={() => setOverlay(null)} onSecondary={() => setOverlay(null)} onPrimary={onDelete} />
      )}
    </div>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-[22px] border border-border bg-surface p-4 shadow-card">
      <h2 className="mb-3 text-[13.5px] font-semibold text-muted-foreground">{title}</h2>
      {children}
    </section>
  );
}

function NoteSheet({ initial, d, m, last, onClose, onSave, onRemove }: {
  initial: { text: string; scope: NoteScope; from: number; to: number } | null; d: number; m: number; last: number;
  onClose: () => void; onSave: (n: { text: string; scope: NoteScope; from: number; to: number }) => void; onRemove: () => void;
}) {
  const [text, setText] = useState(initial?.text ?? "");
  const [scope, setScope] = useState<NoteScope>(initial?.scope ?? "day");
  const [from, setFrom] = useState(initial?.from ?? d);
  const [to, setTo] = useState(Math.min((initial?.to ?? d) + 2, last));
  return (
    <Sheet onClose={onClose} title={initial ? "تعديل الملاحظة" : "إضافة ملاحظة"}>
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} placeholder="اكتب ملاحظتك"
        className="w-full resize-none rounded-[16px] border border-input bg-surface p-4 text-[15px] text-ink outline-none placeholder:text-faint focus:border-primary" />
      <div className="mb-2 mt-4 text-[13px] font-semibold text-muted-foreground">تطبيق الملاحظة على</div>
      <NoteScopeSelector value={scope} onChange={setScope} />
      {scope === "range" && (
        <div className="mt-3 grid grid-cols-2 gap-2.5">
          <DateStepper label="من" value={from} m={m} min={1} max={to} onChange={setFrom} />
          <DateStepper label="إلى" value={to} m={m} min={from} max={last} onChange={setTo} />
        </div>
      )}
      <div className="mt-6 flex gap-2">
        {initial && <button onClick={onRemove} className="h-12 rounded-[16px] px-4 text-[14.5px] font-semibold text-destructive">حذف</button>}
        <div className="flex-1" />
        <button onClick={onClose} className="h-12 rounded-[16px] px-4 text-[14.5px] font-semibold text-on-primary-container">إلغاء</button>
        <button disabled={!text.trim()} onClick={() => onSave({ text, scope, from: scope === "range" ? from : d, to: scope === "range" ? to : scope === "month" ? last : d })}
          className="h-12 rounded-[16px] bg-primary px-6 text-[14.5px] font-semibold text-primary-foreground disabled:opacity-40">حفظ</button>
      </div>
    </Sheet>
  );
}

function DateStepper({ label, value, m, min, max, onChange }: { label: string; value: number; m: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <div className="rounded-[16px] border border-input p-3">
      <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground"><CalendarRange className="size-3.5" />{label}</div>
      <div className="mt-1 flex items-center justify-between">
        <button onClick={() => onChange(Math.min(max, value + 1))} className="flex size-8 items-center justify-center rounded-full bg-surface-variant text-ink">+</button>
        <span className="text-[15px] font-semibold text-ink">{ar(value)} {MONTHS[m]}</span>
        <button onClick={() => onChange(Math.max(min, value - 1))} className="flex size-8 items-center justify-center rounded-full bg-surface-variant text-ink">−</button>
      </div>
    </div>
  );
}

function MoreScreen({ profile, go }: { profile: { name: string; group: string; id: string }; go: (s: Screen) => void }) {
  const Row = ({ icon, t, sub, s, tone }: { icon: ReactNode; t: string; sub?: string; s: Screen; tone: string }) => (
    <button onClick={() => go(s)} className="press flex w-full items-center gap-3.5 px-4 py-3.5 text-start">
      <span className={cn("flex size-11 items-center justify-center rounded-[14px]", tone)}>{icon}</span>
      <span className="flex-1"><span className="block text-[15.5px] font-semibold text-ink">{t}</span>{sub && <span className="block text-[12.5px] text-muted-foreground">{sub}</span>}</span>
      <ChevronLeft className="size-5 text-faint" />
    </button>
  );
  return (
    <div className="pb-6">
      <AppBar title="المزيد" />
      <div className="space-y-4 px-5">
        <div className="overflow-hidden rounded-[24px] border border-border bg-surface shadow-card">
          <Row s="employee" t="بيانات الموظف" sub={`${profile.name} · مجموعة ${ar(profile.group)}`} icon={<User className="size-5" />} tone="bg-primary-container text-on-primary-container" />
        </div>
        <div className="divide-y divide-border overflow-hidden rounded-[24px] border border-border bg-surface shadow-card">
          <Row s="holidays" t="الإجازات الرسمية" sub="إجازات مصر لعام ٢٠٢٦" icon={<Flag className="size-5" />} tone="bg-overtime-container text-overtime-ink" />
          <Row s="backup" t="النسخ الاحتياطي والاستعادة" sub="نسخة محلية على جهازك" icon={<DatabaseBackup className="size-5" />} tone="bg-success-container text-success" />
          <Row s="export" t="تصدير البيانات" sub="Excel أو PDF" icon={<Download className="size-5" />} tone="bg-surface-variant text-ink" />
        </div>
        <p className="flex items-center justify-center gap-1.5 pt-2 text-[12px] text-faint"><Smartphone className="size-3.5" />جميع البيانات محفوظة على هذا الجهاز فقط</p>
      </div>
    </div>
  );
}

function EmployeeScreen({ profile, onBack, onSave }: { profile: { name: string; group: string; id: string }; onBack: () => void; onSave: (p: { name: string; group: string; id: string }) => void }) {
  const [p, setP] = useState(profile);
  const errs = { name: !p.name.trim() ? "هذا الحقل مطلوب" : undefined, group: validateNum(p.group, true), id: validateNum(p.id, false) };
  const ok = !errs.name && !errs.group && !errs.id;
  return (
    <div className="flex min-h-full flex-col pb-8">
      <AppBar title="بيانات الموظف" onBack={onBack} />
      <div className="flex-1 space-y-5 px-5 pt-2">
        <EmployeeField label="الاسم" value={p.name} onChange={(v) => setP({ ...p, name: v })} icon={<User className="size-5" />} error={errs.name} />
        <EmployeeField label="رقم المجموعة" value={p.group} numeric onChange={(v) => setP({ ...p, group: v })} icon={<Hash className="size-5" />} error={errs.group} />
        <EmployeeField label="الرقم الوظيفي" value={p.id} numeric optional onChange={(v) => setP({ ...p, id: v })} icon={<BadgeCheck className="size-5" />} error={errs.id} />
        <div className="flex gap-2 rounded-2xl bg-primary-container/50 p-3 text-[12.5px] leading-relaxed text-on-primary-container"><Info className="mt-0.5 size-4 shrink-0" />تنعكس التغييرات على جميع السجلات الشهرية السابقة والقادمة.</div>
      </div>
      <div className="px-5 pt-8">
        <button disabled={!ok} onClick={() => onSave(p)} className="press h-14 w-full rounded-[18px] bg-primary text-[16px] font-semibold text-primary-foreground shadow-button disabled:opacity-40">حفظ البيانات</button>
      </div>
    </div>
  );
}

function HolidaysScreen({ list, onBack, onEdit }: { list: Holiday[]; onBack: () => void; onEdit: (id?: string) => void }) {
  const byMonth = useMemo(() => {
    const g: Record<number, Holiday[]> = {};
    list.forEach((h) => (g[h.m] ??= []).push(h));
    return g;
  }, [list]);
  return (
    <div className="pb-24">
      <AppBar title="الإجازات الرسمية" onBack={onBack}
        action={<span className="me-3 rounded-full bg-surface-variant px-3 py-1 text-[13px] font-semibold text-ink">{ar(2026)}</span>} />
      <div className="px-5">
        <div className="flex gap-2 rounded-2xl bg-overtime-container/60 p-3 text-[12.5px] leading-relaxed text-overtime-ink"><Info className="mt-0.5 size-4 shrink-0" />الجمعة والسبت والإجازات الرسمية تُحتسب تلقائياً يوم ×٢، ويمكن تغيير نوع أي يوم يدوياً.</div>
        {Object.entries(byMonth).map(([m, hs]) => (
          <div key={m} className="mt-5">
            <div className="mb-2 px-1 text-[13px] font-semibold text-faint">{MONTHS[+m]}</div>
            <div className="space-y-2">{hs.map((h) => <HolidayCard key={h.id} {...h} onEdit={() => onEdit(h.id)} />)}</div>
          </div>
        ))}
      </div>
      <div className="sticky bottom-5 flex justify-start px-5 pt-4">
        <button onClick={() => onEdit(undefined)} className="press flex h-14 items-center gap-2 rounded-[18px] bg-primary px-5 text-[15px] font-semibold text-primary-foreground shadow-button"><Plus className="size-5" />إضافة إجازة</button>
      </div>
    </div>
  );
}

function HolidaySheet({ h, onClose, onSave, onDelete }: { h?: Holiday; onClose: () => void; onSave: (h: Holiday) => void; onDelete?: () => void }) {
  const [name, setName] = useState(h?.name ?? "");
  const [m, setM] = useState(h?.m ?? 9);
  const [d, setD] = useState(h?.d ?? 20);
  const [days, setDays] = useState(h?.days ?? 1);
  const max = new Date(2026, m + 1, 0).getDate();
  return (
    <Sheet onClose={onClose} title={h ? "تعديل الإجازة" : "إضافة إجازة"}>
      <EmployeeField label="اسم الإجازة" value={name} onChange={setName} icon={<Flag className="size-5" />} />
      <div className="mb-1.5 mt-4 px-1 text-[13.5px] font-medium text-ink">التاريخ</div>
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-2">
        {MONTHS.map((mn, i) => (
          <button key={mn} onClick={() => { setM(i); setD(Math.min(d, new Date(2026, i + 1, 0).getDate())); }}
            className={cn("h-9 shrink-0 rounded-full px-3.5 text-[13px] font-semibold", m === i ? "bg-primary text-primary-foreground" : "bg-surface-variant text-muted-foreground")}>{mn}</button>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {Array.from({ length: max }, (_, i) => i + 1).map((n) => {
          const wd = new Date(2026, m, n).getDay();
          const inRange = n >= d && n < d + days;
          return (
            <button key={n} onClick={() => setD(n)} className={cn("tabular h-9 rounded-xl text-[13.5px] font-medium",
              n === d ? "bg-overtime text-primary-foreground" : inRange ? "bg-overtime-container text-overtime-ink" : wd === 5 || wd === 6 ? "text-overtime-ink" : "text-ink")}>{ar(n)}</button>
          );
        })}
      </div>
      <div className="mt-4 flex items-center justify-between rounded-[16px] border border-input px-4 py-2.5">
        <span className="text-[14px] text-ink">عدد الأيام</span>
        <div className="flex items-center gap-3">
          <button onClick={() => setDays(Math.min(7, days + 1))} className="flex size-9 items-center justify-center rounded-full bg-surface-variant">+</button>
          <span className="tabular w-5 text-center text-[16px] font-semibold">{ar(days)}</span>
          <button onClick={() => setDays(Math.max(1, days - 1))} className="flex size-9 items-center justify-center rounded-full bg-surface-variant">−</button>
        </div>
      </div>
      <div className="mt-6 flex gap-2">
        {onDelete && <button onClick={onDelete} className="flex h-12 items-center gap-1.5 rounded-[16px] px-3 text-[14.5px] font-semibold text-destructive"><Trash2 className="size-4" />حذف</button>}
        <div className="flex-1" />
        <button onClick={onClose} className="h-12 rounded-[16px] px-4 text-[14.5px] font-semibold text-on-primary-container">إلغاء</button>
        <button disabled={!name.trim()} onClick={() => onSave({ id: h?.id ?? `n${Date.now()}`, name, m, d, days })}
          className="h-12 rounded-[16px] bg-primary px-6 text-[14.5px] font-semibold text-primary-foreground disabled:opacity-40">حفظ</button>
      </div>
    </Sheet>
  );
}

function BackupScreen({ onBack, onCreate, onRestore }: { onBack: () => void; onCreate: () => void; onRestore: () => void }) {
  const items = ["بيانات الموظف", "سجلات الحضور", "الملاحظات", "تعديلات الإجازات", "الأشهر المؤرشفة", "الإعدادات"];
  return (
    <div className="pb-8">
      <AppBar title="النسخ الاحتياطي والاستعادة" onBack={onBack} />
      <div className="space-y-3 px-5">
        <button onClick={onCreate} className="press w-full rounded-[24px] bg-primary p-5 text-start text-primary-foreground shadow-button">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-primary-foreground/15"><HardDriveDownload className="size-6" /></span>
          <span className="mt-4 block text-[18px] font-semibold">إنشاء نسخة احتياطية</span>
          <span className="mt-1 block text-[13px] opacity-80">آخر نسخة: ١٢ أكتوبر ٢٠٢٦ · ٨:٠٥ م</span>
        </button>
        <button onClick={onRestore} className="press flex w-full items-center gap-3.5 rounded-[24px] border border-border bg-surface p-5 text-start shadow-card">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-surface-variant text-ink"><ArchiveRestore className="size-6" /></span>
          <span className="flex-1"><span className="block text-[16px] font-semibold text-ink">استعادة نسخة احتياطية</span><span className="block text-[12.5px] text-muted-foreground">من ملف محفوظ على الجهاز</span></span>
          <ChevronLeft className="size-5 text-faint" />
        </button>
        <div className="rounded-[22px] border border-border bg-surface p-4">
          <div className="mb-3 text-[13.5px] font-semibold text-muted-foreground">تحتوي النسخة على</div>
          <div className="flex flex-wrap gap-2">
            {items.map((i) => <span key={i} className="inline-flex h-8 items-center gap-1.5 rounded-full bg-surface-variant px-3 text-[12.5px] text-ink"><CircleCheck className="size-3.5 text-success" />{i}</span>)}
          </div>
        </div>
        <p className="flex items-center justify-center gap-1.5 pt-1 text-[12px] text-faint"><Lock className="size-3.5" />النسخة محلية بالكامل ولا تحتاج حساباً</p>
      </div>
    </div>
  );
}

function ExportScreen({ onBack, onShare }: { onBack: () => void; onShare: (f: string) => void }) {
  const [m, setM] = useState(9);
  const [fmt, setFmt] = useState<"xlsx" | "pdf">("pdf");
  return (
    <div className="pb-8">
      <AppBar title="تصدير البيانات" onBack={onBack} />
      <div className="px-5">
        <div className="mb-2 px-1 text-[13px] font-semibold text-muted-foreground">الشهر</div>
        <div className="-mx-5 flex gap-2 overflow-x-auto no-scrollbar px-5 pb-1">
          {[9, 8, 7, 6, 5].map((x) => (
            <button key={x} onClick={() => setM(x)} className={cn("h-10 shrink-0 rounded-full px-4 text-[13.5px] font-semibold",
              m === x ? "bg-ink text-primary-foreground" : "border border-border bg-surface text-muted-foreground")}>{monthLabel(x)}</button>
          ))}
        </div>
        <div className="mb-2 mt-5 px-1 text-[13px] font-semibold text-muted-foreground">الصيغة</div>
        <div className="flex gap-2.5">
          <ExportAction icon={<FileSpreadsheet className="size-5" />} label="Excel" sub="جدول قابل للتعديل" selected={fmt === "xlsx"} onClick={() => setFmt("xlsx")} />
          <ExportAction icon={<FileText className="size-5" />} label="PDF" sub="نسخة للطباعة" selected={fmt === "pdf"} onClick={() => setFmt("pdf")} />
        </div>
        <div className="mt-5 rounded-[22px] border border-border bg-surface-variant/60 p-4">
          <div className="mx-auto w-[220px] rounded-md bg-surface p-3 shadow-card">
            <div className="text-center text-[9px] font-bold text-ink">كشف الأوفر تايم — {monthLabel(m)}</div>
            <div className="mt-1 flex justify-between text-[7px] text-muted-foreground"><span>أحمد محمود</span><span>مجموعة ١٢ · رقم ٣٤٨</span></div>
            <div className="mt-2 space-y-[3px]">
              {Array.from({ length: 9 }, (_, i) => (
                <div key={i} className={cn("grid grid-cols-5 gap-1 text-[6.5px] text-ink", i === 0 && "font-bold")}>
                  {(i === 0 ? ["اليوم", "حضور", "انصراف", "ساعات", "أوفر"] : [ar(i), "٧:٢٣", "٧:١٥", "١١:٥٢", "٢:٥٢"]).map((c, j) => (
                    <span key={j} className={cn("rounded-[2px] px-0.5 py-[1px] text-center", i === 0 ? "bg-primary-container" : "bg-surface-variant")}>{c}</span>
                  ))}
                </div>
              ))}
            </div>
          </div>
          <div className="mt-3 text-center text-[12px] text-muted-foreground">{fmt === "pdf" ? "معاينة نسخة الطباعة" : "نفس البيانات بصيغة جدول"}</div>
        </div>
        <button onClick={() => onShare(`سجل_${MONTHS[m]}_٢٠٢٦.${fmt}`)} className="press mt-5 flex h-14 w-full items-center justify-center gap-2 rounded-[18px] bg-primary text-[16px] font-semibold text-primary-foreground shadow-button">
          <Share2 className="size-5" />إنشاء ومشاركة
        </button>
      </div>
    </div>
  );
}

function ShareSheet({ file, onClose }: { file: string; onClose: () => void }) {
  const apps = [
    { n: "WhatsApp", i: <MessageCircle className="size-6" />, c: "bg-success-container text-success" },
    { n: "البريد", i: <Mail className="size-6" />, c: "bg-error-container text-destructive" },
    { n: "Drive", i: <Cloud className="size-6" />, c: "bg-primary-container text-on-primary-container" },
    { n: "الملفات", i: <Folder className="size-6" />, c: "bg-warning-container text-warning-ink" },
  ];
  const pdf = file.endsWith("pdf");
  return (
    <Sheet onClose={onClose}>
      <div className="flex items-center gap-3 rounded-[18px] bg-surface-variant p-3">
        <span className={cn("flex size-12 items-center justify-center rounded-xl", pdf ? "bg-error-container text-destructive" : "bg-success-container text-success")}>
          {file.endsWith("bak") ? <DatabaseBackup className="size-6" /> : pdf ? <FileText className="size-6" /> : <FileSpreadsheet className="size-6" />}
        </span>
        <div className="min-w-0 flex-1"><div className="truncate text-[14.5px] font-semibold text-ink">{file}</div><div className="text-[12px] text-muted-foreground">جاهز للمشاركة</div></div>
      </div>
      <div className="mt-5 grid grid-cols-4 gap-2">
        {apps.map((a) => (
          <button key={a.n} onClick={onClose} className="flex flex-col items-center gap-2">
            <span className={cn("flex size-14 items-center justify-center rounded-full", a.c)}>{a.i}</span>
            <span className="text-[12px] text-ink">{a.n}</span>
          </button>
        ))}
      </div>
      <button onClick={onClose} className="press mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-[16px] border border-border text-[14.5px] font-semibold text-ink"><Download className="size-4" />حفظ في الجهاز</button>
      <p className="mt-3 text-center text-[11.5px] text-faint">قائمة المشاركة الخاصة بنظام Android</p>
    </Sheet>
  );
}
