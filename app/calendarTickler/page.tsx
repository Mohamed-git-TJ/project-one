"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Authenticated,
  Unauthenticated,
  AuthLoading,
  useQuery,
  useMutation,
} from "convex/react";
import { SignInButton } from "@clerk/nextjs";
import {
  Bell,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  CheckCircle2,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import {
  addDays,
  addMonths,
  format,
  startOfMonth,
  startOfWeek,
  isSameMonth,
} from "date-fns";
import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";

type Reminder = Doc<"reminders">;
type Task = Doc<"tasks">;
type Draft = {
  id?: Id<"reminders">;
  title: string;
  notes: string;
  date: string;
  time: string;
};
const key = (d: Date) => format(d, "yyyy-MM-dd");
const localDate = (s: string) => new Date(s + "T00:00:00");
const button =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-700 bg-[#222426] px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed";
const primary =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed";
const field =
  "w-full rounded-lg border border-zinc-700 bg-[#111214] px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-zinc-400 [color-scheme:dark]";
const blank = (date: string): Draft => ({
  title: "",
  notes: "",
  date,
  time: "",
});

export default function CalendarTickler() {
  return (
    <>
      <AuthLoading>
        <div className="p-8 text-zinc-400">Loading calendar…</div>
      </AuthLoading>
      <Unauthenticated>
        <div className="p-8 space-y-4">
          <h1 className="text-2xl font-semibold">Calendar / Tickler File</h1>
          <p className="text-zinc-400">
            Sign in to access your personal calendar.
          </p>
          <SignInButton>
            <button className={primary}>Sign in</button>
          </SignInButton>
        </div>
      </Unauthenticated>
      <Authenticated>
        <MonthlyCalendar />
      </Authenticated>
    </>
  );
}
function MonthlyCalendar() {
  const tasks = useQuery(api.tasks.getTasks);
  const reminders = useQuery(api.reminders.getReminders);
  const create = useMutation(api.reminders.createReminder);
  const update = useMutation(api.reminders.updateReminder);
  const dismiss = useMutation(api.reminders.setDismissed);
  const remove = useMutation(api.reminders.deleteReminder);
  const [today, setToday] = useState(() => key(new Date()));
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selected, setSelected] = useState(() => key(new Date()));
  const [showTasks, setShowTasks] = useState(true);
  const [showReminders, setShowReminders] = useState(true);
  const [showDismissed, setShowDismissed] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const refresh = () => setToday(key(new Date()));
    const timer = window.setInterval(refresh, 30000);
    window.addEventListener("focus", refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, []);
  useEffect(() => {
    if (draft && !dialog.current?.open) dialog.current?.showModal();
    else if (!draft && dialog.current?.open) dialog.current.close();
  }, [draft]);
  const days = useMemo(() => {
    const first = startOfWeek(month, { weekStartsOn: 1 });
    return Array.from({ length: 42 }, (_, i) => addDays(first, i));
  }, [month]);
  const grouped = useMemo(() => {
    const map = new Map<string, { tasks: Task[]; reminders: Reminder[] }>();
    const get = (date: string) => {
      if (!map.has(date)) map.set(date, { tasks: [], reminders: [] });
      return map.get(date)!;
    };
    if (showTasks)
      for (const t of tasks ?? []) {
        if (t.status !== "scheduled" || !t.date) continue;
        const d = new Date(t.date);
        if (Number.isFinite(d.getTime())) get(key(d)).tasks.push(t);
      }
    if (showReminders)
      for (const r of reminders ?? [])
        if (showDismissed || !r.dismissed) get(r.date).reminders.push(r);
    for (const group of map.values()) {
      group.tasks.sort(
        (a, b) => (a.order ?? a.createdAt) - (b.order ?? b.createdAt),
      );
      group.reminders.sort(
        (a, b) =>
          (a.time ?? "").localeCompare(b.time ?? "") ||
          a.createdAt - b.createdAt,
      );
    }
    return map;
  }, [tasks, reminders, showTasks, showReminders, showDismissed]);
  const active = grouped.get(selected) ?? { tasks: [], reminders: [] };
  const due = (reminders ?? [])
    .filter((r) => !r.dismissed && r.date <= today)
    .sort((a, b) => a.date.localeCompare(b.date));
  function select(date: string) {
    setSelected(date);
    setMonth(startOfMonth(localDate(date)));
  }
  function navigate(n: number) {
    const next = addMonths(month, n);
    setMonth(next);
    setSelected(key(next));
  }
  function open(date: string, r?: Reminder) {
    setError("");
    setDraft(
      r
        ? {
            id: r._id,
            title: r.title,
            notes: r.notes ?? "",
            date: r.date,
            time: r.time ?? "",
          }
        : blank(date),
    );
  }
  async function run(action: () => Promise<unknown>, message: string) {
    if (lock.current) return false;
    lock.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
      setNotice(message);
      return true;
    } catch (e) {
      console.error(e);
      setError("Could not save the change. Please try again.");
      return false;
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function save() {
    if (!draft || !draft.title.trim() || !draft.date) return;
    const { id, title, notes, date, time } = draft;
    const args = {
      title: title.trim(),
      notes: notes.trim() || undefined,
      date,
      time: time || undefined,
    };
    if (
      await run(
        () => (id ? update({ id, ...args }) : create(args)),
        id ? "Reminder updated" : "Reminder created",
      )
    ) {
      setDraft(null);
      setShowReminders(true);
      select(date);
    }
  }
  return (
    <main className="min-h-svh min-w-0 bg-[#111214] p-4 text-zinc-100 sm:p-7">
      <div className="mx-auto max-w-[1720px] space-y-5">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Calendar / Tickler File
            </h1>
            <p className="mt-1 text-sm text-zinc-400">
              Plan ahead. Remember what matters.
            </p>
          </div>
          <button
            className={primary}
            onClick={() => open(selected)}
            disabled={busy || reminders === undefined}
          >
            <Plus size={16} /> Reminder
          </button>
        </header>
        {notice && (
          <p role="status" className="text-sm text-zinc-300">
            {notice}
          </p>
        )}
        {error && !draft && (
          <p role="alert" className="text-sm text-red-400">
            {error}
          </p>
        )}
        <section className="rounded-2xl border border-zinc-700/60 bg-[#191a1c] p-3 sm:p-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-700/55 bg-[#242628] px-4 py-3">
            <div className="flex items-center gap-2">
              <button
                className={button}
                aria-label="Previous month"
                onClick={() => navigate(-1)}
              >
                <ChevronLeft size={16} />
              </button>
              <button className={button} onClick={() => select(today)}>
                Today
              </button>
              <button
                className={button}
                aria-label="Next month"
                onClick={() => navigate(1)}
              >
                <ChevronRight size={16} />
              </button>
            </div>
            <h2 className="text-lg font-semibold">
              {format(month, "MMMM yyyy")}
            </h2>
            <div className="flex flex-wrap gap-3 text-xs text-zinc-300">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={showTasks}
                  onChange={(e) => setShowTasks(e.target.checked)}
                  className="accent-zinc-200"
                />
                Tasks
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={showReminders}
                  onChange={(e) => setShowReminders(e.target.checked)}
                  className="accent-zinc-200"
                />
                Reminders
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={showDismissed}
                  onChange={(e) => setShowDismissed(e.target.checked)}
                  className="accent-zinc-200"
                />
                Dismissed
              </label>
            </div>
          </div>
          {(tasks === undefined || reminders === undefined) && (
            <p role="status" className="p-3 text-sm text-zinc-400">
              Loading entries…
            </p>
          )}
          <div className="mt-4 overflow-x-auto">
            <div className="min-w-[700px]">
              <div className="grid grid-cols-7 gap-1.5">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                  <div
                    key={d}
                    className="py-2 text-center text-xs font-medium uppercase tracking-wide text-zinc-500"
                  >
                    {d}
                  </div>
                ))}
                {days.map((day) => {
                  const date = key(day);
                  const g = grouped.get(date);
                  const entries = [
                    ...(g?.reminders ?? []).map((r) => ({
                      id: r._id,
                      title: (r.time ? r.time + " " : "") + r.title,
                      reminder: true,
                      done: r.dismissed,
                    })),
                    ...(g?.tasks ?? []).map((t) => ({
                      id: t._id,
                      title: t.title,
                      reminder: false,
                      done: !!t.completed,
                    })),
                  ];
                  return (
                    <button
                      type="button"
                      key={date}
                      onClick={() => select(date)}
                      aria-label={`${format(day, "EEEE d MMMM yyyy")}, ${entries.length} entries`}
                      aria-pressed={selected === date}
                      className={`min-h-[112px] min-w-0 rounded-xl border p-2 text-left align-top flex flex-col gap-1 transition hover:border-zinc-500 ${selected === date ? "border-zinc-300 bg-[#303236]" : date === today ? "border-zinc-400 bg-[#282a2c]" : isSameMonth(day, month) ? "border-zinc-700/60 bg-[#222426]" : "border-zinc-800 bg-[#151618] text-zinc-500"}`}
                    >
                      <span
                        className={`mb-1 flex size-6 items-center justify-center rounded-full text-xs font-medium ${date === today ? "bg-zinc-100 text-zinc-950" : ""}`}
                      >
                        {format(day, "d")}
                      </span>
                      {entries.slice(0, 3).map((e) => (
                        <span
                          key={e.id}
                          title={e.title}
                          className={`block w-full truncate rounded-md px-1.5 py-1 text-[11px] ${e.reminder ? "bg-amber-400/10 text-amber-200" : "bg-zinc-700/60 text-zinc-200"} ${e.done ? "line-through opacity-50" : ""}`}
                        >
                          {e.title}
                        </span>
                      ))}
                      {entries.length > 3 && (
                        <span className="text-[11px] text-zinc-400">
                          +{entries.length - 3} more
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="mt-3 flex gap-4 text-xs text-zinc-400">
            <span className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-zinc-400" />
              Scheduled task
            </span>
            <span className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-amber-300" />
              Tickler reminder
            </span>
          </div>
        </section>
        <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
          <section className="rounded-2xl border border-zinc-700/60 bg-[#191a1c] p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold">
                {format(localDate(selected), "EEEE, d MMMM yyyy")}
              </h2>
              <button
                className={button}
                disabled={busy || reminders === undefined}
                onClick={() => open(selected)}
              >
                <Plus size={15} /> Add reminder
              </button>
            </div>
            {!active.tasks.length && !active.reminders.length && (
              <p className="rounded-xl border border-dashed border-zinc-700 p-6 text-center text-sm text-zinc-500">
                No visible entries for this day.
              </p>
            )}
            {active.reminders.map((r) => (
              <div
                key={r._id}
                className="flex items-start gap-3 rounded-xl border border-zinc-700/60 bg-[#282a2c] p-3"
              >
                <Bell size={16} className="mt-1 shrink-0 text-amber-300" />
                <div className="min-w-0 flex-1">
                  <p
                    className={`break-words text-sm ${r.dismissed ? "line-through text-zinc-500" : ""}`}
                  >
                    {r.title}
                  </p>
                  {r.time && <p className="text-xs text-zinc-400">{r.time}</p>}
                  {r.notes && (
                    <p className="mt-1 whitespace-pre-wrap break-words text-xs text-zinc-400">
                      {r.notes}
                    </p>
                  )}
                </div>
                <button
                  className={button}
                  disabled={busy}
                  onClick={() =>
                    void run(
                      () => dismiss({ id: r._id, dismissed: !r.dismissed }),
                      r.dismissed ? "Reminder restored" : "Reminder dismissed",
                    )
                  }
                  aria-label={
                    r.dismissed ? "Restore reminder" : "Dismiss reminder"
                  }
                >
                  <CheckCircle2 size={15} />
                </button>
                <button
                  className={button}
                  disabled={busy}
                  aria-label="Edit reminder"
                  onClick={() => open(r.date, r)}
                >
                  <Pencil size={15} />
                </button>
                <button
                  className={button}
                  disabled={busy}
                  aria-label="Delete reminder"
                  onClick={() => {
                    if (window.confirm(`Delete reminder “${r.title}”?`))
                      void run(() => remove({ id: r._id }), "Reminder deleted");
                  }}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
            {active.tasks.map((t) => (
              <div
                key={t._id}
                className="flex items-start gap-3 rounded-xl border border-zinc-700/60 bg-[#222426] p-3"
              >
                <CalendarDays
                  size={16}
                  className="mt-1 shrink-0 text-zinc-400"
                />
                <div className="min-w-0">
                  <p
                    className={`break-words text-sm ${t.completed ? "line-through text-zinc-500" : ""}`}
                  >
                    {t.title}
                  </p>
                  <p className="text-xs text-zinc-500">
                    Scheduled task · {t.completed ? "Completed" : "Pending"}
                  </p>
                  {t.notes && (
                    <p className="mt-1 whitespace-pre-wrap break-words text-xs text-zinc-400">
                      {t.notes}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </section>
          <section className="rounded-2xl border border-zinc-700/60 bg-[#191a1c] p-5 space-y-3">
            <h2 className="flex items-center gap-2 font-semibold">
              <Bell size={16} className="text-amber-300" /> Due & overdue{" "}
              <span className="text-xs text-zinc-400">{due.length}</span>
            </h2>
            <p className="text-xs text-zinc-500">
              Undismissed reminders through today, regardless of calendar
              filters.
            </p>
            {!due.length && (
              <p className="text-sm text-zinc-400">You're all caught up.</p>
            )}
            {due.map((r) => (
              <div
                key={r._id}
                className="flex items-center gap-2 rounded-lg border border-zinc-700/60 p-3"
              >
                <button
                  className="min-w-0 flex-1 text-left"
                  onClick={() => {
                    setShowReminders(true);
                    select(r.date);
                  }}
                >
                  <span className="block break-words text-sm">{r.title}</span>
                  <span className="text-xs text-zinc-400">
                    {format(localDate(r.date), "d MMM yyyy")}
                    {r.time ? ` · ${r.time}` : ""}
                  </span>
                </button>
                <button
                  className={button}
                  disabled={busy}
                  aria-label="Dismiss reminder"
                  onClick={() =>
                    void run(
                      () => dismiss({ id: r._id, dismissed: true }),
                      "Reminder dismissed",
                    )
                  }
                >
                  <CheckCircle2 size={15} />
                </button>
              </div>
            ))}
          </section>
        </div>
        <dialog
          ref={dialog}
          onCancel={(e) => {
            e.preventDefault();
            if (!lock.current) setDraft(null);
          }}
          className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-2xl border border-zinc-600 bg-[#191a1c] p-0 text-zinc-100 shadow-2xl backdrop:bg-black/75"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void save();
            }}
          >
            {draft && (
              <>
                <header className="flex items-center justify-between border-b border-zinc-700 bg-[#242628] p-5">
                  <h2 className="font-semibold">
                    {draft.id ? "Edit reminder" : "New reminder"}
                  </h2>
                  <button
                    type="button"
                    className={button}
                    disabled={busy}
                    aria-label="Close"
                    onClick={() => setDraft(null)}
                  >
                    <X size={16} />
                  </button>
                </header>
                <fieldset disabled={busy} className="space-y-4 p-5">
                  <label className="block space-y-1 text-sm">
                    Title
                    <input
                      autoFocus
                      required
                      maxLength={200}
                      className={field}
                      value={draft.title}
                      onChange={(e) =>
                        setDraft({ ...draft, title: e.target.value })
                      }
                    />
                  </label>
                  <label className="block space-y-1 text-sm">
                    Notes
                    <textarea
                      rows={4}
                      maxLength={10000}
                      className={field}
                      value={draft.notes}
                      onChange={(e) =>
                        setDraft({ ...draft, notes: e.target.value })
                      }
                    />
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block space-y-1 text-sm">
                      Date
                      <input
                        type="date"
                        required
                        className={field}
                        value={draft.date}
                        onChange={(e) =>
                          setDraft({ ...draft, date: e.target.value })
                        }
                      />
                    </label>
                    <label className="block space-y-1 text-sm">
                      Time (optional)
                      <input
                        type="time"
                        className={field}
                        value={draft.time}
                        onChange={(e) =>
                          setDraft({ ...draft, time: e.target.value })
                        }
                      />
                    </label>
                  </div>
                  {error && (
                    <p role="alert" className="text-sm text-red-400">
                      {error}
                    </p>
                  )}
                </fieldset>
                <footer className="flex justify-end gap-2 border-t border-zinc-700 p-4">
                  <button
                    type="button"
                    className={button}
                    disabled={busy}
                    onClick={() => setDraft(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={primary}
                    disabled={busy || !draft.title.trim() || !draft.date}
                  >
                    {busy ? "Saving…" : "Save reminder"}
                  </button>
                </footer>
              </>
            )}
          </form>
        </dialog>
      </div>
    </main>
  );
}
