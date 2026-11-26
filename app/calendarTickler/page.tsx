"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  Authenticated,
  Unauthenticated,
  AuthLoading,
  useQuery,
  useMutation,
} from "convex/react";

import TaskDetailsModal from "@/components/TaskDetailsModal";

import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  PointerSensor,
  useSensor,
  useSensors,
  pointerWithin,
  type DragEndEvent,
} from "@dnd-kit/core";

import type { ReactNode } from "react";

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

// ==================== TYPES ====================

type Reminder = Doc<"reminders">;
type Task = Doc<"tasks">;

type Draft = {
  id?: Id<"reminders">;
  title: string;
  notes: string;
  date: string;
  time: string;
};

type Entry = {
  id: string;
  title: string;
  reminder: boolean;
  done: boolean;
};

// ==================== HELPERS ====================

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

// ==================== AUTHENTICATION ====================

export default function CalendarTickler() {
  return (
    <>
      <AuthLoading>
        <div className="p-8 text-zinc-400">Loading calendar…</div>
      </AuthLoading>

      <Unauthenticated>
        <div className="space-y-4 p-8">
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

// ==================== DRAGGABLE ENTRY ====================

function Chip({
  entry,
  onOpen,
  disabled,
}: {
  entry: Entry;
  onOpen: () => void;
  disabled: boolean;
}) {
  const { setNodeRef, attributes, listeners, isDragging } = useDraggable({
    id: entry.id,
    disabled,
  });

  return (
    <div
      ref={setNodeRef}
      className={`flex w-full min-w-0 rounded-md text-[11px] ${
        entry.reminder
          ? "bg-amber-400/10 text-amber-200"
          : "bg-zinc-700/60 text-zinc-200"
      } ${entry.done ? "line-through opacity-50" : ""} ${
        isDragging ? "opacity-30" : ""
      }`}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        style={{ touchAction: "none" }}
        className="shrink-0 cursor-grab px-1 active:cursor-grabbing"
        aria-label={`Drag ${entry.title}`}
      >
        ⋮⋮
      </button>

      <button
        type="button"
        onClick={onOpen}
        disabled={disabled}
        title={entry.title}
        className="min-w-0 flex-1 truncate py-1 text-left"
      >
        {entry.title}
      </button>
    </div>
  );
}

// ==================== DROPPABLE DAY ====================

function DayCell({
  date,
  children,
  className,
}: {
  date: string;
  children: ReactNode;
  className: string;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: date,
  });

  return (
    <div
      ref={setNodeRef}
      className={`${className} ${
        isOver ? "ring-2 ring-inset ring-zinc-100" : ""
      }`}
    >
      {children}
    </div>
  );
}

// ==================== MONTHLY CALENDAR ====================

function MonthlyCalendar() {
  // DRAG AND DROP

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
  );

  const [dragTitle, setDragTitle] = useState("");

  // TASK MODALS

  const [taskId, setTaskId] = useState<Id<"tasks"> | null>(null);

  const [newTask, setNewTask] = useState<string | null>(null);

  // TASK MUTATIONS

  const createTask = useMutation(api.tasks.createTask);

  const moveTask = useMutation(api.tasks.updateTask);

  // REMINDER MUTATIONS

  const moveReminder = useMutation(api.reminders.moveReminder);

  const convert = useMutation(api.reminders.convertToInboxTask);

  const create = useMutation(api.reminders.createReminder);

  const update = useMutation(api.reminders.updateReminder);

  const dismiss = useMutation(api.reminders.setDismissed);

  const remove = useMutation(api.reminders.deleteReminder);

  // DATABASE QUERIES

  const tasks = useQuery(api.tasks.getTasks);

  const reminders = useQuery(api.reminders.getReminders);

  // CALENDAR STATE

  const [today, setToday] = useState(() => key(new Date()));

  const [month, setMonth] = useState(() => startOfMonth(new Date()));

  const [selected, setSelected] = useState(() => key(new Date()));

  // FILTERS

  const [showTasks, setShowTasks] = useState(true);

  const [showReminders, setShowReminders] = useState(true);

  const [showDismissed, setShowDismissed] = useState(false);

  // REMINDER MODAL

  const [draft, setDraft] = useState<Draft | null>(null);

  // ACTION STATE

  const [busy, setBusy] = useState(false);

  const lock = useRef(false);

  const [error, setError] = useState("");

  const [notice, setNotice] = useState("");

  const dialog = useRef<HTMLDialogElement>(null);

  // ==================== REFRESH TODAY ====================

  useEffect(() => {
    const refresh = () => setToday(key(new Date()));

    const timer = window.setInterval(refresh, 30000);

    window.addEventListener("focus", refresh);

    return () => {
      window.clearInterval(timer);

      window.removeEventListener("focus", refresh);
    };
  }, []);

  // ==================== REMINDER DIALOG ====================

  useEffect(() => {
    if (draft && !dialog.current?.open) {
      dialog.current?.showModal();
    } else if (!draft && dialog.current?.open) {
      dialog.current.close();
    }
  }, [draft]);

  // ==================== CALENDAR DAYS ====================

  const days = useMemo(() => {
    const first = startOfWeek(month, {
      weekStartsOn: 1,
    });

    return Array.from({ length: 42 }, (_, i) => addDays(first, i));
  }, [month]);

  // ==================== GROUP TASKS AND REMINDERS ====================

  const grouped = useMemo(() => {
    const map = new Map<
      string,
      {
        tasks: Task[];
        reminders: Reminder[];
      }
    >();

    const get = (date: string) => {
      if (!map.has(date)) {
        map.set(date, {
          tasks: [],
          reminders: [],
        });
      }

      return map.get(date)!;
    };

    if (showTasks) {
      for (const task of tasks ?? []) {
        if (task.status !== "scheduled" || !task.date) {
          continue;
        }

        const date = new Date(task.date);

        if (Number.isFinite(date.getTime())) {
          get(key(date)).tasks.push(task);
        }
      }
    }

    if (showReminders) {
      for (const reminder of reminders ?? []) {
        if (showDismissed || !reminder.dismissed) {
          get(reminder.date).reminders.push(reminder);
        }
      }
    }

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

  // SELECTED DAY

  const active = grouped.get(selected) ?? {
    tasks: [],
    reminders: [],
  };

  // DUE AND OVERDUE REMINDERS

  const due = (reminders ?? [])
    .filter((reminder) => !reminder.dismissed && reminder.date <= today)
    .sort((a, b) => a.date.localeCompare(b.date));

  // ==================== NAVIGATION ====================

  function select(date: string) {
    setSelected(date);

    setMonth(startOfMonth(localDate(date)));
  }

  function navigate(amount: number) {
    const next = addMonths(month, amount);

    setMonth(next);
    setSelected(key(next));
  }

  // ==================== OPEN REMINDER ====================

  function open(date: string, reminder?: Reminder) {
    setError("");

    setDraft(
      reminder
        ? {
            id: reminder._id,
            title: reminder.title,
            notes: reminder.notes ?? "",
            date: reminder.date,
            time: reminder.time ?? "",
          }
        : blank(date),
    );
  }

  // ==================== OPEN NEW TASK ====================

  function openNewTask(date: string) {
    setError("");
    select(date);
    setNewTask("");
  }

  // ==================== SAFE DATABASE ACTION ====================

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

  // ==================== SAVE REMINDER ====================

  async function save() {
    if (!draft || !draft.title.trim() || !draft.date) {
      return;
    }

    const { id, title, notes, date, time } = draft;

    const args = {
      title: title.trim(),
      notes: notes.trim() || undefined,
      date,
      time: time || undefined,
    };

    const success = await run(
      () =>
        id
          ? update({
              id,
              ...args,
            })
          : create(args),

      id ? "Reminder updated" : "Reminder created",
    );

    if (success) {
      setDraft(null);
      setShowReminders(true);

      select(date);
    }
  }

  // ==================== DRAG AND DROP ====================

  async function drop({ active, over }: DragEndEvent) {
    setDragTitle("");

    if (!over || lock.current) {
      return;
    }

    const date = String(over.id);

    if (!days.some((day) => key(day) === date)) {
      return;
    }

    const reminder = reminders?.find((reminder) => reminder._id === active.id);

    const task = tasks?.find((task) => task._id === active.id);

    // MOVE REMINDER

    if (reminder && reminder.date !== date) {
      const success = await run(
        () =>
          moveReminder({
            id: reminder._id,
            date,
          }),

        "Reminder moved",
      );

      if (success) {
        select(date);
      }

      return;
    }

    // MOVE SCHEDULED TASK

    if (task && task.date && key(new Date(task.date)) !== date) {
      const old = new Date(task.date);

      const next = localDate(date);

      // Preserve the task's existing time.

      next.setHours(
        old.getHours(),
        old.getMinutes(),
        old.getSeconds(),
        old.getMilliseconds(),
      );

      const success = await run(
        () =>
          moveTask({
            id: task._id,
            status: "scheduled",
            date: next.toISOString(),
          }),

        "Task moved",
      );

      if (success) {
        select(date);
      }
    }
  }

  // ==================== CONVERT REMINDER ====================

  function convertReminder(reminder: Reminder) {
    const confirmed = window.confirm(
      `Move “${reminder.title}” to Inbox? Its reminder date and time will be removed.`,
    );

    if (!confirmed) return;

    void run(
      () =>
        convert({
          id: reminder._id,
        }),

      "Moved to Inbox",
    );
  }

  // CURRENTLY SELECTED TASK

  const task = tasks?.find((task) => task._id === taskId);

  // ==================== RENDER ====================

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={({ active }) => {
        setDragTitle(
          tasks?.find((task) => task._id === active.id)?.title ??
            reminders?.find((reminder) => reminder._id === active.id)?.title ??
            "",
        );
      }}
      onDragCancel={() => setDragTitle("")}
      onDragEnd={drop}
    >
      <main className="min-h-svh min-w-0 bg-[#111214] p-4 text-zinc-100 sm:p-7">
        <div className="mx-auto max-w-[1720px] space-y-5">
          {/* ==================== HEADER ==================== */}

          <header className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Calendar / Tickler File
              </h1>

              <p className="mt-1 text-sm text-zinc-400">
                Plan ahead. Remember what matters.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                className={button}
                onClick={() => openNewTask(selected)}
                disabled={busy || tasks === undefined}
              >
                <Plus size={16} />
                Task
              </button>

              <button
                className={primary}
                onClick={() => open(selected)}
                disabled={busy || reminders === undefined}
              >
                <Plus size={16} />
                Reminder
              </button>
            </div>
          </header>

          {/* ==================== NOTIFICATIONS ==================== */}

          {notice && (
            <p role="status" className="text-sm text-zinc-300">
              {notice}
            </p>
          )}

          {error && !draft && newTask === null && (
            <p role="alert" className="text-sm text-red-400">
              {error}
            </p>
          )}

          {/* ==================== CALENDAR ==================== */}

          <section className="rounded-2xl border border-zinc-700/60 bg-[#191a1c] p-3 sm:p-4">
            {/* CALENDAR TOOLBAR */}

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-700/60 bg-[#242628] p-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  className={button}
                  aria-label="Previous month"
                  onClick={() => navigate(-1)}
                >
                  <ChevronLeft size={16} />
                </button>

                <button
                  className={button}
                  aria-label="Next month"
                  onClick={() => navigate(1)}
                >
                  <ChevronRight size={16} />
                </button>

                <button className={button} onClick={() => select(today)}>
                  Today
                </button>

                <h2 className="ml-2 text-base font-semibold sm:text-lg">
                  {format(month, "MMMM yyyy")}
                </h2>
              </div>

              {/* FILTERS */}

              <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-300">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={showTasks}
                    onChange={(e) => setShowTasks(e.target.checked)}
                    className="accent-zinc-300"
                  />
                  Tasks
                </label>

                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={showReminders}
                    onChange={(e) => setShowReminders(e.target.checked)}
                    className="accent-amber-400"
                  />
                  Reminders
                </label>

                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={showDismissed}
                    onChange={(e) => setShowDismissed(e.target.checked)}
                    className="accent-zinc-300"
                  />
                  Dismissed
                </label>
              </div>
            </div>

            {/* CALENDAR GRID */}

            <div className="mt-4 overflow-x-auto">
              <div className="min-w-[700px]">
                {/* WEEKDAY HEADINGS */}

                <div className="grid grid-cols-7 gap-1">
                  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(
                    (day) => (
                      <div
                        key={day}
                        className="py-2 text-center text-xs font-medium uppercase tracking-wider text-zinc-500"
                      >
                        {day}
                      </div>
                    ),
                  )}
                </div>

                {/* MONTH DAYS */}

                <div className="grid grid-cols-7 gap-1">
                  {days.map((day) => {
                    const date = key(day);

                    const group = grouped.get(date) ?? {
                      tasks: [],
                      reminders: [],
                    };

                    const isToday = date === today;

                    const isSelected = date === selected;

                    const inMonth = isSameMonth(day, month);

                    const entries: Entry[] = [
                      ...group.reminders.map((reminder) => ({
                        id: reminder._id,
                        title: reminder.time
                          ? `${reminder.time} ${reminder.title}`
                          : reminder.title,
                        reminder: true,
                        done: reminder.dismissed,
                      })),

                      ...group.tasks.map((task) => ({
                        id: task._id,
                        title: task.title,
                        reminder: false,
                        done: !!task.completed,
                      })),
                    ];

                    return (
                      <DayCell
                        key={date}
                        date={date}
                        className={`group min-h-[120px] min-w-0 rounded-lg border p-2 transition-colors ${
                          isSelected
                            ? "border-zinc-400 bg-[#292b2d]"
                            : "border-zinc-800 bg-[#202123] hover:border-zinc-600"
                        } ${!inMonth ? "opacity-50" : ""}`}
                      >
                        {/* DAY HEADER */}

                        <div className="mb-2 flex items-center justify-between gap-1">
                          <button
                            type="button"
                            aria-pressed={isSelected}
                            onClick={() => select(date)}
                            className={`flex h-7 min-w-7 items-center justify-center rounded-md text-xs font-medium ${
                              isToday
                                ? "bg-zinc-100 text-zinc-950"
                                : "text-zinc-300 hover:bg-zinc-700"
                            }`}
                          >
                            {format(day, "d")}
                          </button>

                          <button
                            type="button"
                            title="Add scheduled task"
                            aria-label={`Add task on ${date}`}
                            disabled={busy || tasks === undefined}
                            onClick={() => openNewTask(date)}
                            className="rounded-md p-1 text-zinc-500 opacity-60 hover:bg-zinc-700 hover:text-white group-hover:opacity-100"
                          >
                            <Plus size={13} />
                          </button>
                        </div>

                        {/* DRAGGABLE ENTRIES */}

                        <div className="space-y-1">
                          {entries.slice(0, 3).map((entry) => (
                            <Chip
                              key={entry.id}
                              entry={entry}
                              disabled={busy}
                              onOpen={() => {
                                if (entry.reminder) {
                                  const reminder = group.reminders.find(
                                    (r) => r._id === entry.id,
                                  );

                                  if (reminder) {
                                    open(date, reminder);
                                  }
                                } else {
                                  setTaskId(entry.id as Id<"tasks">);
                                }
                              }}
                            />
                          ))}

                          {entries.length > 3 && (
                            <button
                              type="button"
                              onClick={() => select(date)}
                              className="w-full px-1 text-left text-[11px] text-zinc-400 hover:text-zinc-100"
                            >
                              +{entries.length - 3} more
                            </button>
                          )}
                        </div>
                      </DayCell>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* CALENDAR LEGEND */}

            <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-zinc-500">
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-zinc-400" />
                Scheduled task
              </span>

              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-amber-400" />
                Reminder
              </span>

              <span>Drag entries using their handles to move them.</span>
            </div>
          </section>

          {/* ==================== LOWER PANELS ==================== */}

          <div className="grid gap-5 xl:grid-cols-2">
            {/* SELECTED DAY */}

            <section className="space-y-3 rounded-2xl border border-zinc-700/60 bg-[#191a1c] p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="flex items-center gap-2 font-semibold">
                    <CalendarDays size={17} />

                    {format(localDate(selected), "EEEE, d MMMM yyyy")}
                  </h2>

                  <p className="mt-1 text-xs text-zinc-500">
                    {active.tasks.length} tasks · {active.reminders.length}{" "}
                    reminders
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    className={button}
                    disabled={busy || tasks === undefined}
                    onClick={() => openNewTask(selected)}
                  >
                    <Plus size={14} />
                    Task
                  </button>

                  <button
                    className={button}
                    disabled={busy || reminders === undefined}
                    onClick={() => open(selected)}
                  >
                    <Plus size={14} />
                    Reminder
                  </button>
                </div>
              </div>

              {/* EMPTY DAY */}

              {!active.tasks.length && !active.reminders.length && (
                <p className="py-4 text-sm text-zinc-400">
                  Nothing scheduled for this day.
                </p>
              )}

              {/* SELECTED DAY REMINDERS */}

              {active.reminders.map((reminder) => (
                <div
                  key={reminder._id}
                  className={`rounded-lg border border-amber-400/15 bg-amber-400/5 p-3 ${
                    reminder.dismissed ? "opacity-50" : ""
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => open(reminder.date, reminder)}
                        className={`break-words text-left text-sm font-medium text-amber-200 hover:text-amber-100 ${
                          reminder.dismissed ? "line-through" : ""
                        }`}
                      >
                        {reminder.title}
                      </button>

                      <p className="mt-1 text-xs text-zinc-500">
                        Reminder
                        {reminder.time ? ` · ${reminder.time}` : ""}
                        {reminder.dismissed ? " · Dismissed" : ""}
                      </p>

                      {reminder.notes && (
                        <p className="mt-2 whitespace-pre-wrap break-words text-xs text-zinc-400">
                          {reminder.notes}
                        </p>
                      )}
                    </div>

                    {/* REMINDER ACTIONS */}

                    <div className="flex flex-wrap items-center gap-1">
                      <button
                        type="button"
                        className={button}
                        disabled={busy}
                        title="Convert to Inbox task"
                        onClick={() => convertReminder(reminder)}
                      >
                        To Inbox
                      </button>

                      <button
                        type="button"
                        className={button}
                        disabled={busy}
                        aria-label={
                          reminder.dismissed
                            ? "Restore reminder"
                            : "Dismiss reminder"
                        }
                        title={
                          reminder.dismissed
                            ? "Restore reminder"
                            : "Dismiss reminder"
                        }
                        onClick={() =>
                          void run(
                            () =>
                              dismiss({
                                id: reminder._id,
                                dismissed: !reminder.dismissed,
                              }),

                            reminder.dismissed
                              ? "Reminder restored"
                              : "Reminder dismissed",
                          )
                        }
                      >
                        <CheckCircle2 size={15} />
                      </button>

                      <button
                        type="button"
                        className={button}
                        disabled={busy}
                        aria-label="Edit reminder"
                        onClick={() => open(reminder.date, reminder)}
                      >
                        <Pencil size={14} />
                      </button>

                      <button
                        type="button"
                        className={`${button} hover:text-red-400`}
                        disabled={busy}
                        aria-label="Delete reminder"
                        onClick={() => {
                          if (window.confirm("Delete this reminder?")) {
                            void run(
                              () =>
                                remove({
                                  id: reminder._id,
                                }),

                              "Reminder deleted",
                            );
                          }
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {/* SELECTED DAY TASKS */}

              {active.tasks.map((task) => (
                <div
                  key={task._id}
                  className="flex items-start gap-3 rounded-lg border border-zinc-700/60 bg-[#222426] p-3"
                >
                  <button
                    type="button"
                    aria-label="Open task details"
                    onClick={() => setTaskId(task._id)}
                    className={`mt-0.5 shrink-0 ${
                      task.completed ? "text-zinc-300" : "text-zinc-600"
                    }`}
                  >
                    <CheckCircle2 size={17} />
                  </button>

                  <div className="min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => setTaskId(task._id)}
                      className={`break-words text-left text-sm font-medium hover:text-white ${
                        task.completed
                          ? "text-zinc-500 line-through"
                          : "text-zinc-200"
                      }`}
                    >
                      {task.title}
                    </button>

                    <p className="text-xs text-zinc-500">
                      Scheduled task ·{" "}
                      {task.completed ? "Completed" : "Pending"}
                    </p>

                    {task.notes && (
                      <p className="mt-1 whitespace-pre-wrap break-words text-xs text-zinc-400">
                        {task.notes}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    className={button}
                    aria-label="Edit task details"
                    onClick={() => setTaskId(task._id)}
                  >
                    <Pencil size={14} />
                  </button>
                </div>
              ))}
            </section>

            {/* ==================== DUE AND OVERDUE ==================== */}

            <section className="space-y-3 rounded-2xl border border-zinc-700/60 bg-[#191a1c] p-5">
              <h2 className="flex items-center gap-2 font-semibold">
                <Bell size={16} className="text-amber-300" />
                Due & overdue
                <span className="text-xs text-zinc-400">{due.length}</span>
              </h2>

              <p className="text-xs text-zinc-500">
                Undismissed reminders through today, regardless of calendar
                filters.
              </p>

              {!due.length && (
                <p className="text-sm text-zinc-400">You're all caught up.</p>
              )}

              {due.map((reminder) => (
                <div
                  key={reminder._id}
                  className="flex flex-wrap items-center gap-2 rounded-lg border border-zinc-700/60 p-3"
                >
                  <button
                    className="min-w-0 flex-1 text-left"
                    onClick={() => {
                      setShowReminders(true);

                      select(reminder.date);
                    }}
                  >
                    <span className="block break-words text-sm">
                      {reminder.title}
                    </span>

                    <span className="text-xs text-zinc-400">
                      {format(localDate(reminder.date), "d MMM yyyy")}

                      {reminder.time ? ` · ${reminder.time}` : ""}
                    </span>
                  </button>

                  <button
                    type="button"
                    className={button}
                    disabled={busy}
                    onClick={() => convertReminder(reminder)}
                  >
                    To Inbox
                  </button>

                  <button
                    className={button}
                    disabled={busy}
                    aria-label="Dismiss reminder"
                    onClick={() =>
                      void run(
                        () =>
                          dismiss({
                            id: reminder._id,
                            dismissed: true,
                          }),

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

          {/* ==================== REMINDER MODAL ==================== */}

          <dialog
            ref={dialog}
            onCancel={(e) => {
              e.preventDefault();

              if (!lock.current) {
                setDraft(null);
              }
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
                  {/* REMINDER HEADER */}

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

                  {/* REMINDER FIELDS */}

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
                          setDraft({
                            ...draft,
                            title: e.target.value,
                          })
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
                          setDraft({
                            ...draft,
                            notes: e.target.value,
                          })
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
                            setDraft({
                              ...draft,
                              date: e.target.value,
                            })
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
                            setDraft({
                              ...draft,
                              time: e.target.value,
                            })
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

                  {/* REMINDER FOOTER */}

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

          {/* ==================== CREATE SCHEDULED TASK MODAL ==================== */}

          {newTask !== null && (
            <div className="fixed inset-0 z-[70] grid place-items-center bg-black/75 p-4">
              <form
                role="dialog"
                aria-modal="true"
                aria-label="Create scheduled task"
                className="w-full max-w-md space-y-4 rounded-xl border border-zinc-700 bg-[#191a1c] p-5"
                onSubmit={async (e) => {
                  e.preventDefault();

                  if (!newTask.trim()) {
                    return;
                  }

                  const success = await run(
                    () =>
                      createTask({
                        title: newTask.trim(),

                        status: "scheduled",

                        date: localDate(selected).toISOString(),
                      }),

                    "Task created",
                  );

                  if (success) {
                    setNewTask(null);

                    setShowTasks(true);
                  }
                }}
              >
                <div>
                  <h2 className="text-lg font-semibold">Add scheduled task</h2>

                  <p className="mt-1 text-xs text-zinc-400">
                    {format(localDate(selected), "EEEE, d MMMM yyyy")}
                  </p>
                </div>

                <label className="block space-y-2 text-sm">
                  Task title
                  <input
                    autoFocus
                    className={field}
                    value={newTask}
                    placeholder="What needs to be done?"
                    disabled={busy}
                    onChange={(e) => setNewTask(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Escape" && !lock.current) {
                        setNewTask(null);
                      }
                    }}
                    required
                  />
                </label>

                {error && (
                  <p role="alert" className="text-sm text-red-400">
                    {error}
                  </p>
                )}

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    className={button}
                    disabled={busy}
                    onClick={() => setNewTask(null)}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className={primary}
                    disabled={busy || !newTask.trim()}
                  >
                    {busy ? "Creating…" : "Create task"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ==================== SHARED TASK DETAILS MODAL ==================== */}

          {task && (
            <MonthlyTaskDetails
              key={task._id}
              task={task}
              contexts={Array.from(
                new Set([
                  "@Work",
                  "@Home",
                  "@Computer",
                  "@Phone",
                  "@Errands",

                  ...(tasks ?? []).flatMap((task) => task.contexts ?? []),
                ]),
              )}
              onClose={() => setTaskId(null)}
              onSaved={(date) => {
                select(date);

                setTaskId(null);

                setNotice("Task updated");
              }}
            />
          )}
        </div>
      </main>

      {/* ==================== DRAG OVERLAY ==================== */}

      <DragOverlay>
        {dragTitle ? (
          <div className="rounded-lg border border-zinc-500 bg-zinc-800 p-2 text-sm text-white shadow-xl">
            {dragTitle}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

// ==================== MONTHLY TASK DETAILS ====================

function MonthlyTaskDetails({
  task: selectedTask,
  contexts: allContexts,
  onClose,
  onSaved,
}: {
  task: Task;
  contexts: string[];
  onClose: () => void;
  onSaved: (date: string) => void;
}) {
  // DATABASE

  const projects = useQuery(api.projects.getProjects) ?? [];

  const update = useMutation(api.tasks.updateTaskDetails);

  const complete = useMutation(api.tasks.toggleComplete);

  const remove = useMutation(api.tasks.deleteTask);

  // ACTION STATE

  const [busy, setBusy] = useState(false);

  const [error, setError] = useState("");

  const lock = useRef(false);

  // SCHEDULED DATE

  const [date, setDate] = useState(() => key(new Date(selectedTask.date!)));

  // RECURRENCE WEEKDAYS

  const recurrenceWeekdays = [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
  ].map((value) => ({
    value,
    label: value.slice(0, 3),
  }));

  // ==================== TASK DETAILS STATE ====================

  const [detailsTitle, setDetailsTitle] = useState(selectedTask.title);

  const [detailsNotes, setDetailsNotes] = useState(selectedTask.notes ?? "");

  const [detailsPriority, setDetailsPriority] = useState<
    "low" | "medium" | "high"
  >(
    selectedTask.priority === "high" || selectedTask.priority === "low"
      ? selectedTask.priority
      : "medium",
  );

  const [detailsContexts, setDetailsContexts] = useState(
    selectedTask.contexts ?? [],
  );

  const [newContext, setNewContext] = useState("");

  const [detailsProjectId, setDetailsProjectId] = useState(
    selectedTask.projectId,
  );

  const [detailsRecurring, setDetailsRecurring] = useState(
    !!selectedTask.recurring,
  );

  const [detailsRecurrenceType, setDetailsRecurrenceType] = useState<
    "daily" | "weekly" | "monthly" | "yearly"
  >(
    selectedTask.recurrenceType === "daily" ||
      selectedTask.recurrenceType === "monthly" ||
      selectedTask.recurrenceType === "yearly"
      ? selectedTask.recurrenceType
      : "weekly",
  );

  const [detailsRecurrenceInterval, setDetailsRecurrenceInterval] = useState(
    selectedTask.recurrenceInterval ?? 1,
  );

  const [detailsRecurrenceCount, setDetailsRecurrenceCount] = useState(
    selectedTask.recurrenceCount,
  );

  const [detailsRecurrenceDays, setDetailsRecurrenceDays] = useState(
    selectedTask.recurrenceDays?.length
      ? selectedTask.recurrenceDays
      : [
          recurrenceWeekdays[(new Date(selectedTask.date!).getUTCDay() + 6) % 7]
            .value,
        ],
  );

  const [detailsRecurrenceEndDate, setDetailsRecurrenceEndDate] = useState(
    selectedTask.recurrenceEndDate ?? "",
  );

  const isBusy = () => busy;

  // ==================== SAFE ACTION ====================

  async function run(action: () => Promise<unknown>, done: () => void) {
    if (lock.current) return;

    lock.current = true;

    setBusy(true);
    setError("");

    try {
      await action();

      done();
    } catch (e) {
      console.error(e);

      setError("Could not update task. Check your entries and retry.");
    } finally {
      lock.current = false;

      setBusy(false);
    }
  }

  // ==================== SAVE TASK DETAILS ====================

  async function saveTaskDetails() {
    if (!date || !detailsTitle.trim()) {
      setError("A title and scheduled date are required.");

      return;
    }

    if (
      detailsRecurring &&
      (!Number.isInteger(detailsRecurrenceInterval) ||
        detailsRecurrenceInterval < 1)
    ) {
      setError("Enter a valid recurrence interval.");

      return;
    }

    if (
      detailsRecurring &&
      detailsRecurrenceCount !== undefined &&
      (!Number.isInteger(detailsRecurrenceCount) || detailsRecurrenceCount < 0)
    ) {
      setError("Enter a valid number of repeats.");

      return;
    }

    if (
      detailsRecurring &&
      detailsRecurrenceType === "weekly" &&
      detailsRecurrenceDays.length === 0
    ) {
      setError("Select at least one recurrence weekday.");

      return;
    }

    const next = localDate(date);

    const old = new Date(selectedTask.date!);

    // Preserve the original task time.

    next.setHours(
      old.getHours(),
      old.getMinutes(),
      old.getSeconds(),
      old.getMilliseconds(),
    );

    await run(
      () =>
        update({
          id: selectedTask._id,

          title: detailsTitle.trim(),

          notes: detailsNotes,

          priority: detailsPriority,

          contexts: detailsContexts,

          projectId: detailsProjectId,

          date: date === key(old) ? undefined : next.toISOString(),

          recurring: detailsRecurring,

          recurrenceType: detailsRecurring ? detailsRecurrenceType : undefined,

          recurrenceInterval: detailsRecurring
            ? detailsRecurrenceInterval
            : undefined,

          recurrenceCount: detailsRecurring
            ? detailsRecurrenceCount
            : undefined,

          recurrenceDays:
            detailsRecurring && detailsRecurrenceType === "weekly"
              ? detailsRecurrenceDays
              : undefined,

          recurrenceEndDate: detailsRecurring
            ? detailsRecurrenceEndDate || undefined
            : undefined,
        }),

      () => onSaved(date),
    );
  }

  // ==================== DELETE TASK ====================

  async function deleteItem(id: Id<"tasks">) {
    if (window.confirm("Delete this task?")) {
      await run(
        () => remove({ id }),

        onClose,
      );
    }
  }

  // ==================== ESCAPE TO CLOSE ====================

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !lock.current) {
        onClose();
      }
    };

    window.addEventListener("keydown", handler);

    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // ==================== SHARED MODAL ====================

  return (
    <>
      {/* BACKDROP */}

      <div
        className="fixed inset-0 z-[65] bg-black/75"
        onClick={() => {
          if (!lock.current) {
            onClose();
          }
        }}
      />

      <TaskDetailsModal
        selectedTask={selectedTask}
        projects={projects}
        allContexts={allContexts}
        recurrenceWeekdays={recurrenceWeekdays}
        isBusy={isBusy}
        saveTaskDetails={saveTaskDetails}
        deleteItem={deleteItem}
        onClose={() => {
          if (!lock.current) {
            onClose();
          }
        }}
        detailsTitle={detailsTitle}
        setDetailsTitle={setDetailsTitle}
        detailsNotes={detailsNotes}
        setDetailsNotes={setDetailsNotes}
        detailsPriority={detailsPriority}
        setDetailsPriority={setDetailsPriority}
        detailsContexts={detailsContexts}
        setDetailsContexts={setDetailsContexts}
        newContext={newContext}
        setNewContext={setNewContext}
        detailsProjectId={detailsProjectId}
        setDetailsProjectId={setDetailsProjectId}
        detailsRecurring={detailsRecurring}
        setDetailsRecurring={setDetailsRecurring}
        detailsRecurrenceType={detailsRecurrenceType}
        setDetailsRecurrenceType={setDetailsRecurrenceType}
        detailsRecurrenceInterval={detailsRecurrenceInterval}
        setDetailsRecurrenceInterval={setDetailsRecurrenceInterval}
        detailsRecurrenceCount={detailsRecurrenceCount}
        setDetailsRecurrenceCount={setDetailsRecurrenceCount}
        detailsRecurrenceDays={detailsRecurrenceDays}
        setDetailsRecurrenceDays={setDetailsRecurrenceDays}
        detailsRecurrenceEndDate={detailsRecurrenceEndDate}
        setDetailsRecurrenceEndDate={setDetailsRecurrenceEndDate}
        // SCHEDULED DATE EDITOR

        scheduleControl={
          <div className="space-y-2">
            <label className="block space-y-1 text-sm">
              Scheduled date
              <input
                type="date"
                className={field}
                value={date}
                disabled={busy}
                onChange={(e) => setDate(e.target.value)}
              />
            </label>

            {error && (
              <p role="alert" className="text-sm text-red-400">
                {error}
              </p>
            )}
          </div>
        }
        // COMPLETE / UNCOMPLETE TASK

        extraActions={
          <button
            type="button"
            className={button}
            disabled={busy}
            onClick={() => {
              if (
                window.confirm(
                  "Change completion status? Unsaved edits will not be saved.",
                )
              ) {
                void run(
                  () =>
                    complete({
                      id: selectedTask._id,
                    }),

                  onClose,
                );
              }
            }}
          >
            {selectedTask.completed ? "Mark incomplete" : "Complete"}
          </button>
        }
      />
    </>
  );
}
