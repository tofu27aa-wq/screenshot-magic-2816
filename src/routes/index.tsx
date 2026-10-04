import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Signal, Wifi, BatteryFull } from "lucide-react";
import { cn } from "@/lib/utils";
import { Prototype, type ProtoState } from "@/proto/app";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "دفتر الحضور — نموذج تصميم تطبيق الحضور والأوفر تايم" },
      { name: "description", content: "نموذج واجهة عربية لتطبيق Android لتسجيل الحضور والانصراف وحساب ساعات الأوفر تايم بدون إنترنت." },
      { property: "og:title", content: "دفتر الحضور — نموذج تصميم" },
      { property: "og:description", content: "واجهة عربية أنيقة لتسجيل الحضور والأوفر تايم لموظف واحد، بدون إنترنت." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const STATES: { n: string; s: Partial<ProtoState> }[] = [
  { n: "الإعداد الأول", s: { screen: "setup" } },
  { n: "لم يتم تسجيل الحضور", s: { screen: "home", mode: "idle" } },
  { n: "حضور — وقت عادي", s: { screen: "home", mode: "normal" } },
  { n: "حضور — بدأ الأوفر تايم", s: { screen: "home", mode: "overtime" } },
  { n: "يوم ×٢", s: { screen: "home", mode: "x2" } },
  { n: "تنبيه حضور مفتوح", s: { screen: "home", mode: "normal", overlay: { t: "open" } } },
  { n: "تجاوز ٢٤ ساعة", s: { screen: "home", mode: "over24", overlay: { t: "over24" } } },
  { n: "يوم عمل مكتمل", s: { screen: "home", mode: "done" } },
  { n: "يوم بدون حضور", s: { screen: "day", month: 8, day: 17 } },
  { n: "إجازة رسمية", s: { screen: "month", month: 9 } },
  { n: "الجمعة / السبت", s: { screen: "day", month: 9, day: 10 } },
  { n: "يوم قادم", s: { screen: "day", month: 9, day: 20 } },
  { n: "ملاحظة يوم", s: { screen: "day", month: 9, day: 8, overlay: { t: "note" } } },
  { n: "أرشيف الأشهر", s: { screen: "records" } },
  { n: "تعديل شهر سابق", s: { screen: "day", month: 8, day: 24 } },
  { n: "تأكيد الحذف", s: { screen: "day", month: 8, day: 13, overlay: { t: "delete" } } },
  { n: "نسخة احتياطية", s: { screen: "backup", overlay: { t: "backupDone" } } },
  { n: "استعادة", s: { screen: "backup", overlay: { t: "restore" } } },
  { n: "نهاية الشهر", s: { screen: "home", mode: "idle", overlay: { t: "monthEnd", openSession: true } } },
  { n: "تصدير ومشاركة", s: { screen: "export", overlay: { t: "share", file: "سجل_أكتوبر_٢٠٢٦.pdf" } } },
];

function Index() {
  const [state, setRaw] = useState<ProtoState>({ screen: "home", mode: "idle", overlay: null, month: 9, day: 15 });
  const [cur, setCur] = useState(1);
  const setState = (s: Partial<ProtoState>) => setRaw((p) => ({ ...p, ...s }));

  return (
    <div dir="rtl" className="min-h-screen bg-stage">
      {/* Mobile: the app fills the screen */}
      <div className="h-[100dvh] sm:hidden">
        <Prototype state={state} setState={setState} />
      </div>

      {/* Desktop: device frame + state index */}
      <div className="mx-auto hidden min-h-screen max-w-[1080px] items-start justify-center gap-16 px-8 py-10 sm:flex">
        <div className="shrink-0 rounded-[54px] border border-border/60 bg-device p-[10px] shadow-device">
          <div className="relative flex h-[844px] w-[390px] flex-col overflow-hidden rounded-[44px] bg-background">
            <div dir="ltr" className="flex h-9 shrink-0 items-center justify-between bg-background px-7 text-[13px] font-semibold text-ink">
              <span>١٢:٣٠</span>
              <span className="absolute left-1/2 top-2.5 size-[18px] -translate-x-1/2 rounded-full bg-device" />
              <span className="flex items-center gap-1.5"><Signal className="size-3.5" /><Wifi className="size-3.5" /><BatteryFull className="size-4" /></span>
            </div>
            <div className="relative min-h-0 flex-1">
              <Prototype state={state} setState={setState} />
            </div>
            <div className="flex h-5 shrink-0 items-center justify-center bg-surface"><span className="h-1 w-28 rounded-full bg-ink/80" /></div>
          </div>
        </div>

        <aside className="sticky top-10 w-[320px] pt-3">
          <div className="mb-6 flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-[12px] border border-primary/30 bg-primary-container font-display text-sm font-bold text-primary">د</span>
            <div><div className="font-display text-[11px] font-semibold text-primary">DAFTAR / 2026</div><h1 className="text-[25px] font-bold leading-tight text-ink">دفتر الحضور</h1></div>
          </div>
          <div className="border-y border-border py-3 text-[12px] font-medium text-faint">حالات النظام · {STATES.length.toLocaleString("ar-EG")}</div>
          <ol className="mt-3 max-h-[680px] space-y-1 overflow-y-auto no-scrollbar">
            {STATES.map((x, i) => (
              <li key={x.n}>
                <button onClick={() => { setCur(i); setRaw((p) => ({ ...p, overlay: null, ...x.s })); }}
                  className={cn("flex w-full items-center gap-3 rounded-[10px] border px-3 py-2 text-start text-[13.5px] transition-colors",
                    cur === i ? "border-primary/30 bg-primary-container font-semibold text-primary shadow-card" : "border-transparent text-muted-foreground hover:bg-surface/60")}> 
                  <span className={cn("tabular flex size-6 items-center justify-center rounded-[7px] font-display text-[10px]",
                    cur === i ? "bg-primary text-primary-foreground" : "bg-surface-variant text-faint")}>{(i + 1).toLocaleString("ar-EG")}</span>
                  {x.n}
                </button>
              </li>
            ))}
          </ol>
        </aside>
      </div>
    </div>
  );
}
