"use client";

import { useEffect, useId, useRef } from "react";
import type { Dispatch, SetStateAction, ReactNode } from "react";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

import { Textarea } from "@/components/ui/textarea";
import type { Id } from "../convex/_generated/dataModel";

type Props = {
  selectedTask: {
    _id: Id<"tasks">;
    status: string;
    completed?: boolean;
    date?: string;
  };

  projects: {
    _id: Id<"projects">;
    name: string;
  }[];

  allContexts: string[];

  recurrenceWeekdays: {
    value: string;
    label: string;
  }[];

  isBusy: (key: string) => boolean;

  saveTaskDetails: () => void | Promise<void>;

  deleteItem: (id: Id<"tasks">) => void | Promise<void>;

  onClose: () => void;

  detailsTitle: string;
  setDetailsTitle: Dispatch<SetStateAction<string>>;

  detailsNotes: string;
  setDetailsNotes: Dispatch<SetStateAction<string>>;

  detailsPriority: "low" | "medium" | "high";

  setDetailsPriority: Dispatch<SetStateAction<"low" | "medium" | "high">>;

  detailsContexts: string[];

  setDetailsContexts: Dispatch<SetStateAction<string[]>>;

  newContext: string;
  setNewContext: Dispatch<SetStateAction<string>>;

  detailsProjectId: Id<"projects"> | undefined;

  setDetailsProjectId: Dispatch<SetStateAction<Id<"projects"> | undefined>>;

  detailsRecurring: boolean;

  setDetailsRecurring: Dispatch<SetStateAction<boolean>>;

  detailsRecurrenceType: "daily" | "weekly" | "monthly" | "yearly";

  setDetailsRecurrenceType: Dispatch<
    SetStateAction<"daily" | "weekly" | "monthly" | "yearly">
  >;

  detailsRecurrenceInterval: number;

  setDetailsRecurrenceInterval: Dispatch<SetStateAction<number>>;

  detailsRecurrenceCount: number | undefined;

  setDetailsRecurrenceCount: Dispatch<SetStateAction<number | undefined>>;

  detailsRecurrenceDays: string[];

  setDetailsRecurrenceDays: Dispatch<SetStateAction<string[]>>;

  detailsRecurrenceEndDate: string;

  setDetailsRecurrenceEndDate: Dispatch<SetStateAction<string>>;

  extraActions?: ReactNode;
  scheduleControl?: ReactNode;
};

export default function TaskDetailsModal({
  selectedTask,
  projects,
  allContexts,
  recurrenceWeekdays,
  isBusy,
  saveTaskDetails,
  deleteItem,
  onClose,

  detailsTitle,
  setDetailsTitle,

  detailsNotes,
  setDetailsNotes,

  detailsPriority,
  setDetailsPriority,

  detailsContexts,
  setDetailsContexts,

  newContext,
  setNewContext,

  detailsProjectId,
  setDetailsProjectId,

  detailsRecurring,
  setDetailsRecurring,

  detailsRecurrenceType,
  setDetailsRecurrenceType,

  detailsRecurrenceInterval,
  setDetailsRecurrenceInterval,

  detailsRecurrenceCount,
  setDetailsRecurrenceCount,

  detailsRecurrenceDays,
  setDetailsRecurrenceDays,

  detailsRecurrenceEndDate,
  setDetailsRecurrenceEndDate,

  extraActions,
  scheduleControl,
}: Props) {
  const uid = useId();
  const panel = useRef<HTMLDivElement>(null);
  const saving = isBusy(`details:${selectedTask._id}`);
  const submitting = useRef(false);
  const validation = !detailsTitle.trim()
    ? "Enter a task title."
    : detailsRecurring &&
        (!Number.isSafeInteger(detailsRecurrenceInterval) ||
          detailsRecurrenceInterval < 1)
      ? "Enter a positive whole-number repeat interval."
      : detailsRecurring &&
          detailsRecurrenceCount !== undefined &&
          (!Number.isSafeInteger(detailsRecurrenceCount) ||
            detailsRecurrenceCount < 0)
        ? "Enter a nonnegative whole number of repeats."
        : detailsRecurring &&
            detailsRecurrenceType === "weekly" &&
            !detailsRecurrenceDays.length
          ? "Choose at least one weekday."
          : "";
  const unit = {
    daily: "day",
    weekly: "week",
    monthly: "month",
    yearly: "year",
  }[detailsRecurrenceType];

  async function submit() {
    if (validation || saving || submitting.current) return;
    submitting.current = true;
    try {
      await saveTaskDetails();
    } finally {
      submitting.current = false;
    }
  }

  useEffect(() => {
    const previous = document.activeElement;
    panel.current?.querySelector<HTMLInputElement>("input")?.focus();
    return () => {
      if (previous instanceof HTMLElement && previous.isConnected)
        previous.focus();
    };
  }, [selectedTask._id]);

  return (
    <div
      ref={panel}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          if (!saving && !submitting.current) onClose();
        } else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          e.stopPropagation();
          void submit();
        } else if (e.key === "Tab") {
          const controls = Array.from(
            panel.current?.querySelectorAll<HTMLElement>(
              'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]',
            ) ?? [],
          ).filter((el) => el.getClientRects().length > 0);
          const first = controls[0],
            last = controls[controls.length - 1];
          if (e.shiftKey && document.activeElement === first && last) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last && first) {
            e.preventDefault();
            first.focus();
          }
        }
      }}
      className="fixed left-1/2 top-1/2 z-[70] w-full max-w-3xl -translate-x-1/2 -translate-y-1/2 px-4"
    >
      <Card
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${uid}-heading`}
        aria-busy={saving}
        className="flex max-h-[94dvh] sm:max-h-[90dvh] flex-col gap-0 overflow-hidden rounded-2xl border-zinc-700 bg-[#191a1c] text-zinc-100 shadow-[0_35px_110px_rgba(0,0,0,0.75)]"
      >
        {/* ==================== HEADER ==================== */}

        <CardHeader className="relative border-b border-zinc-800 bg-gradient-to-br from-[#282a2c] to-[#202123] px-4 py-4 sm:px-6 sm:py-5">
          <CardTitle
            id={`${uid}-heading`}
            className="text-xl font-semibold tracking-tight text-white"
          >
            Task Details
          </CardTitle>

          <p className="mt-1 text-xs text-zinc-400">
            Organise the details that keep your day moving.
          </p>

          <button
            className="absolute right-4 top-4 rounded-lg border border-zinc-700 p-2 text-sm text-zinc-400 hover:bg-zinc-700 hover:text-zinc-100"
            type="button"
            disabled={saving}
            aria-label="Close task details"
            onClick={() => {
              if (!submitting.current) onClose();
            }}
          >
            ✕
          </button>
        </CardHeader>

        {/* ==================== CONTENT ==================== */}

        <CardContent className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain p-4 sm:p-6">
          {/* ==================== GENERAL ==================== */}

          <div className="rounded-lg border border-zinc-700/70 bg-[#222426] px-4 py-3">
            <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-300">
              General
            </h3>

            <p className="mt-1 text-xs text-zinc-400">What needs to be done</p>
          </div>

          {/* TITLE */}

          <div>
            <label
              htmlFor={`${uid}-title`}
              className="text-sm font-medium text-zinc-300"
            >
              Title
            </label>

            <input
              id={`${uid}-title`}
              value={detailsTitle}
              onChange={(e) => setDetailsTitle(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-[#111214] px-3 py-2.5 text-sm text-zinc-100 focus:border-zinc-400 focus:outline-none outline-none focus:border-zinc-600"
            />
          </div>

          {/* NOTES */}

          <div>
            <label
              htmlFor={`${uid}-notes`}
              className="text-sm font-medium text-zinc-300"
            >
              Notes
            </label>

            <Textarea
              id={`${uid}-notes`}
              value={detailsNotes}
              onChange={(e) => setDetailsNotes(e.target.value)}
              placeholder="Add notes..."
              className="mt-1 min-h-[110px] rounded-lg border-zinc-700 bg-[#111214] text-zinc-100"
            />
          </div>

          {/* ==================== ORGANISATION ==================== */}

          <div className="rounded-lg border border-zinc-700/70 bg-[#222426] px-4 py-3 pt-2">
            <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-300">
              Organisation
            </h3>

            <p className="mt-1 text-xs text-zinc-400">
              Priority, project and contexts
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* PRIORITY */}

            <div>
              <label
                htmlFor={`${uid}-priority`}
                className="text-sm font-medium text-zinc-300"
              >
                Priority
              </label>

              <select
                id={`${uid}-priority`}
                value={detailsPriority}
                onChange={(e) =>
                  setDetailsPriority(
                    e.target.value as "low" | "medium" | "high",
                  )
                }
                className="mt-1 w-full rounded-lg border border-zinc-700 bg-[#111214] px-3 py-2.5 text-sm text-zinc-100 focus:border-zinc-400 focus:outline-none"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            {/* PROJECT */}

            <div>
              <label
                htmlFor={`${uid}-project`}
                className="text-sm font-medium text-zinc-300"
              >
                Project
              </label>

              <select
                id={`${uid}-project`}
                value={detailsProjectId ?? ""}
                onChange={(e) =>
                  setDetailsProjectId(
                    e.target.value
                      ? (e.target.value as Id<"projects">)
                      : undefined,
                  )
                }
                className="mt-1 w-full rounded-lg border border-zinc-700 bg-[#111214] px-3 py-2.5 text-sm text-zinc-100 focus:border-zinc-400 focus:outline-none"
              >
                <option value="">No project</option>

                {projects.map((project) => (
                  <option key={project._id} value={project._id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* ==================== CONTEXTS ==================== */}

          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">
              Contexts
            </label>

            <div className="flex flex-wrap gap-2">
              {Array.from(new Set([...allContexts, ...detailsContexts])).map(
                (context) => {
                  const selected = detailsContexts.includes(context);

                  return (
                    <button
                      key={context}
                      aria-pressed={selected}
                      type="button"
                      onClick={() =>
                        setDetailsContexts((current) =>
                          selected
                            ? current.filter((value) => value !== context)
                            : [...current, context],
                        )
                      }
                      className={`rounded-full border px-3 py-1 text-xs transition ${
                        selected
                          ? "border-zinc-200 bg-zinc-100 text-zinc-950"
                          : "border-zinc-700 bg-zinc-900 text-zinc-400 hover:bg-zinc-800"
                      }`}
                    >
                      {context}
                    </button>
                  );
                },
              )}
            </div>

            {/* CUSTOM CONTEXT */}

            <div className="flex gap-2">
              <input
                aria-label="Custom context"
                value={newContext}
                onChange={(e) => setNewContext(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== "Enter" || e.ctrlKey || e.metaKey) return;

                  e.preventDefault();

                  const value = newContext.trim();

                  if (!value || value === "@") return;

                  const context = value.startsWith("@") ? value : `@${value}`;

                  setDetailsContexts((current) =>
                    current.includes(context) ? current : [...current, context],
                  );

                  setNewContext("");
                }}
                placeholder="Add custom context..."
                className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-[#111214] px-3 py-2.5 text-sm text-zinc-100 focus:border-zinc-400 focus:outline-none text-sm text-zinc-100 outline-none"
              />

              <button
                type="button"
                onClick={() => {
                  const value = newContext.trim();

                  if (!value || value === "@") return;

                  const context = value.startsWith("@") ? value : `@${value}`;

                  setDetailsContexts((current) =>
                    current.includes(context) ? current : [...current, context],
                  );

                  setNewContext("");
                }}
                className="rounded-lg border border-zinc-700 bg-[#111214] px-3 py-2.5 text-sm text-zinc-100 focus:border-zinc-400 focus:outline-none text-sm hover:bg-zinc-800"
              >
                Add
              </button>
            </div>
          </div>

          {/* ==================== RECURRENCE ==================== */}

          <div className="rounded-lg border border-zinc-700/70 bg-[#222426] px-4 py-3 pt-2">
            <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-300">
              Recurrence
            </h3>

            <p className="mt-1 text-xs text-zinc-400">
              Set a repeating rhythm for this task
            </p>
          </div>

          <div className="space-y-3">
            <label
              htmlFor={`${uid}-repeat`}
              className="text-sm font-medium text-zinc-300"
            >
              Repeat
            </label>

            <select
              id={`${uid}-repeat`}
              value={detailsRecurring ? detailsRecurrenceType : "none"}
              onChange={(e) => {
                if (e.target.value === "none") {
                  setDetailsRecurring(false);
                } else {
                  setDetailsRecurring(true);

                  setDetailsRecurrenceType(
                    e.target.value as "daily" | "weekly" | "monthly" | "yearly",
                  );
                }
              }}
              className="w-full rounded-lg border border-zinc-700 bg-[#111214] px-3 py-2.5 text-sm text-zinc-100 focus:border-zinc-400 focus:outline-none"
            >
              <option value="none">Does not repeat</option>

              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>

            {detailsRecurring && (
              <>
                {/* RECURRENCE INTERVAL */}

                <div>
                  <label
                    htmlFor={`${uid}-interval`}
                    className="text-sm font-medium text-zinc-300"
                  >
                    Every
                  </label>

                  <input
                    type="number"
                    min="1"
                    step="1"
                    id={`${uid}-interval`}
                    value={detailsRecurrenceInterval}
                    onChange={(e) =>
                      setDetailsRecurrenceInterval(
                        Math.max(1, Number(e.target.value)),
                      )
                    }
                    className="w-full rounded-lg border border-zinc-700 bg-[#111214] px-3 py-2.5 text-sm text-zinc-100 focus:border-zinc-400 focus:outline-none"
                  />

                  <span className="text-xs text-zinc-400">
                    Every {detailsRecurrenceInterval} {unit}
                    {detailsRecurrenceInterval === 1 ? "" : "s"}
                  </span>
                </div>

                {/* WEEKLY RECURRENCE DAYS */}

                {detailsRecurrenceType === "weekly" && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-300">
                      Repeat on
                    </label>

                    <div className="grid grid-cols-4 gap-1 sm:grid-cols-7">
                      {recurrenceWeekdays.map((day) => {
                        const selected = detailsRecurrenceDays.includes(
                          day.value,
                        );

                        return (
                          <button
                            key={day.value}
                            type="button"
                            aria-pressed={selected}
                            onClick={() =>
                              setDetailsRecurrenceDays((current) =>
                                current.includes(day.value)
                                  ? current.filter(
                                      (value) => value !== day.value,
                                    )
                                  : [...current, day.value],
                              )
                            }
                            className={`rounded-md border px-1 py-2 text-xs transition-colors ${
                              selected
                                ? "border-zinc-300 bg-zinc-200 text-zinc-950"
                                : "border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
                            }`}
                          >
                            {day.label}
                          </button>
                        );
                      })}
                    </div>

                    <p className="text-xs text-zinc-400">
                      Choose one or more weekdays.
                    </p>
                  </div>
                )}

                {/* NUMBER OF REPEATS */}

                <div>
                  <label
                    htmlFor={`${uid}-count`}
                    className="text-sm font-medium text-zinc-300"
                  >
                    Remaining repeats
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="1"
                    id={`${uid}-count`}
                    placeholder="Unlimited"
                    value={detailsRecurrenceCount ?? ""}
                    onChange={(e) => {
                      const value = e.target.value;

                      setDetailsRecurrenceCount(
                        value === "" ? undefined : Math.max(0, Number(value)),
                      );
                    }}
                    className="w-full rounded-lg border border-zinc-700 bg-[#111214] px-3 py-2.5 text-sm text-zinc-100 focus:border-zinc-400 focus:outline-none"
                  />
                </div>

                <p className="text-xs text-zinc-400">
                  Leave repeats blank for no count limit. Zero means no further
                  occurrences. If both limits are set, the first reached ends
                  the recurrence.
                </p>

                {/* RECURRENCE END DATE */}

                <div>
                  <label
                    htmlFor={`${uid}-end`}
                    className="text-sm font-medium text-zinc-300"
                  >
                    End date (optional)
                  </label>

                  <input
                    type="date"
                    id={`${uid}-end`}
                    value={detailsRecurrenceEndDate}
                    onChange={(e) =>
                      setDetailsRecurrenceEndDate(e.target.value)
                    }
                    className="w-full rounded-lg border border-zinc-700 bg-[#111214] px-3 py-2.5 text-sm text-zinc-100 focus:border-zinc-400 focus:outline-none"
                  />
                </div>
              </>
            )}
          </div>

          {/* ==================== STATUS ==================== */}

          <div className="text-sm font-medium text-zinc-300">
            Status:{" "}
            <span className="capitalize text-zinc-500">
              {selectedTask.status}
            </span>
          </div>

          {/* OPTIONAL SCHEDULE CONTROL */}

          {scheduleControl}
          {validation && (
            <p role="alert" className="text-sm text-amber-300">
              {validation}
            </p>
          )}
        </CardContent>

        {/* ==================== FOOTER ==================== */}

        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-zinc-700/70 bg-[#202123] px-4 py-3 sm:px-6">
          {/* DELETE TASK */}

          <button
            type="button"
            disabled={saving}
            onClick={() => {
              if (!submitting.current) void deleteItem(selectedTask._id);
            }}
            className="rounded-lg px-3 py-2 text-sm text-red-400 hover:bg-red-500/10"
          >
            Delete task
          </button>

          <div className="flex flex-wrap items-center gap-2">
            {/* OPTIONAL EXTRA ACTIONS */}

            {extraActions}

            {/* CANCEL */}

            <button
              type="button"
              disabled={saving}
              onClick={() => {
                if (!submitting.current) onClose();
              }}
              className="rounded-lg border border-zinc-600 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700"
            >
              Cancel
            </button>

            {/* SAVE CHANGES */}

            <button
              type="button"
              onClick={() => void submit()}
              disabled={!!validation || saving}
              className="rounded-lg bg-zinc-100 px-5 py-2 text-sm font-semibold text-zinc-950 hover:bg-white disabled:opacity-50"
            >
              {isBusy(`details:${selectedTask._id}`)
                ? "Saving..."
                : "Save changes"}
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}
