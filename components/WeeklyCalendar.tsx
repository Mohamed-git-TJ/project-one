"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  FolderKanban,
  Tags,
  Pencil,
  Plus,
  Search,
  X,
} from "lucide-react";
import {
  addDays,
  addWeeks,
  format,
  isSameDay,
  isToday,
  startOfWeek,
  subWeeks,
} from "date-fns";
import {
  DndContext,
  closestCenter,
  useDroppable,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Id } from "../convex/_generated/dataModel";
import DraggableItem from "./DraggableItem";

type CalendarTask = {
  _id: Id<"tasks">;
  title: string;
  status: "inbox" | "incubator" | "scheduled";
  date?: string;
  completed?: boolean;
  completedAt?: number;
  notes?: string;
  priority?: "low" | "medium" | "high";
  contexts?: string[];
  recurring?: boolean;
  recurrenceType?: "daily" | "weekly" | "monthly" | "yearly";
  recurrenceInterval?: number;
  recurrenceCount?: number;
  recurrenceDays?: string[];
  recurrenceEndDate?: string;
  projectId?: Id<"projects">;
  order?: number;
  createdAt?: number;
};

function PriorityIndicator({
  priority,
}: {
  priority?: "low" | "medium" | "high";
}) {
  const level = priority ?? "medium";

  const styles = {
    high: "bg-red-400",
    medium: "bg-amber-400",
    low: "bg-zinc-500",
  };

  const labels = {
    high: "High priority",
    medium: "Medium priority",
    low: "Low priority",
  };

  return (
    <span
      className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${styles[level]}`}
      title={labels[level]}
      role="img"
      aria-label={labels[level]}
    />
  );
}

type TaskStatus = "inbox" | "incubator" | "scheduled";

type WeeklyCalendarProps = {
  items: CalendarTask[];
  moveItem: (
    id: Id<"tasks">,
    status: TaskStatus,
    date?: string,
  ) => Promise<void>;
  completeItem: (id: Id<"tasks">) => Promise<void>;
  deleteItem: (id: Id<"tasks">) => Promise<void>;
  reorderDayTasks: (
    taskIds: Id<"tasks">[],
    dayStart: number,
    dayEnd: number,
  ) => Promise<void>;
  addTask: (title: string, status: TaskStatus, date?: string) => Promise<void>;
  editingId: Id<"tasks"> | null;
  editingText: string;
  setEditingId: (id: Id<"tasks"> | null) => void;
  setEditingText: (value: string) => void;
  saveEdit: () => Promise<void>;
  openTaskDetails: (task: CalendarTask) => void;
  isDragging: boolean;
  projectControls?: ReactNode;
  contextControls?: ReactNode;
};

type CalendarDayProps = {
  day: Date;
  items: CalendarTask[];
  addTask: WeeklyCalendarProps["addTask"];
  editingId: Id<"tasks"> | null;
  editingText: string;
  setEditingId: WeeklyCalendarProps["setEditingId"];
  setEditingText: WeeklyCalendarProps["setEditingText"];
  saveEdit: () => Promise<void>;
  completeItem: WeeklyCalendarProps["completeItem"];
  deleteItem: WeeklyCalendarProps["deleteItem"];
  openTaskDetails: WeeklyCalendarProps["openTaskDetails"];
  selectedDate: Date | null;
  setSelectedDate: (date: Date | null) => void;
  setExpandedDay: (date: Date | null) => void;
  isDragging: boolean;
  isDayModalOpen: boolean;
};

function CalendarDay({
  day,
  items,
  addTask,
  editingId,
  editingText,
  setEditingId,
  setEditingText,
  saveEdit,
  completeItem,
  deleteItem,
  openTaskDetails,
  selectedDate,
  setSelectedDate,
  setExpandedDay,
  isDragging,
  isDayModalOpen,
}: CalendarDayProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: day.toISOString(),
  });

  const [adding, setAdding] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");

  const isSelected = selectedDate ? isSameDay(selectedDate, day) : false;

  const dayItems = items
    .filter((item) => item.date && isSameDay(new Date(item.date), day))
    .sort(
      (a, b) => (a.order ?? a.createdAt ?? 0) - (b.order ?? b.createdAt ?? 0),
    );

  const visibleItems = dayItems.slice(0, 3);
  const remainingCount = Math.max(dayItems.length - visibleItems.length, 0);

  const submitNewTask = async () => {
    const title = newTaskTitle.trim();
    if (!title) return;

    try {
      await addTask(title, "scheduled", day.toISOString());
      setNewTaskTitle("");
      setAdding(false);
    } catch {
      // Parent displays the failure toast; preserve the draft for retry.
    }
  };

  return (
    <div
      ref={setNodeRef}
      className={`relative min-w-0 overflow-hidden rounded-2xl border p-2.5 transition-all duration-200 sm:p-3 ${
        isToday(day)
          ? "min-h-[290px] border-zinc-200 bg-gradient-to-b from-[#343638] to-[#252729] shadow-[0_14px_42px_rgba(0,0,0,0.4)] ring-1 ring-zinc-200/60 sm:min-h-[320px]"
          : "min-h-[260px] border-zinc-700/50 bg-gradient-to-b from-[#222426] to-[#191a1c] hover:border-zinc-500 sm:min-h-[290px]"
      } ${isDragging ? "border-dashed border-zinc-600/80" : ""} ${
        isOver ? "bg-zinc-900/90 ring-2 ring-zinc-200" : ""
      }`}
    >
      {isDragging && isOver && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center rounded-xl border-2 border-dashed border-zinc-200 bg-zinc-950/35">
          <span className="rounded-full border border-zinc-200 bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-950 shadow-lg">
            Drop here
          </span>
        </div>
      )}

      <button
        type="button"
        onClick={() => {
          setSelectedDate(day);
          setExpandedDay(day);
        }}
        className={`mb-3 flex w-full items-center justify-between rounded-lg px-2 py-2 text-left transition ${
          isSelected
            ? "bg-zinc-100 text-zinc-950"
            : "text-zinc-300 hover:bg-zinc-900 hover:text-zinc-100"
        }`}
        title="Open all tasks for this day"
      >
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide">
            {format(day, "EEE")}
          </div>
          <div className="text-base font-semibold">{format(day, "d")}</div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] text-zinc-500">{dayItems.length}</span>

          {isToday(day) && (
            <span className="rounded-full border border-zinc-600 px-2 py-0.5 text-[10px] font-medium text-zinc-300">
              Today
            </span>
          )}
        </div>
      </button>

      <div className="space-y-2">
        {visibleItems.map((item) => (
          <DraggableItem
            key={item._id}
            item={item}
            dragId={`calendar-${item._id}`}
            completed={item.completed}
            onComplete={() => completeItem(item._id)}
          >
            <div className="flex min-w-0 items-center gap-1">
              {editingId === item._id && !isDayModalOpen ? (
                <input
                  autoFocus
                  value={editingText}
                  onChange={(e) => setEditingText(e.target.value)}
                  onBlur={() => void saveEdit()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void saveEdit();

                    if (e.key === "Escape") {
                      setEditingId(null);
                      setEditingText("");
                    }
                  }}
                  className="w-full min-w-0 rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-100 outline-none focus:border-zinc-400"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => openTaskDetails(item)}
                  className={`flex min-w-0 flex-1 items-center gap-2 truncate rounded-md px-1.5 py-1 text-left text-xs transition hover:bg-zinc-900 ${
                    item.completed
                      ? "text-zinc-500 line-through"
                      : "text-zinc-200"
                  }`}
                >
                  <PriorityIndicator priority={item.priority} />
                  <span className="min-w-0 truncate">{item.title}</span>
                </button>
              )}

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  void deleteItem(item._id);
                }}
                className="shrink-0 rounded p-1 text-zinc-600 transition hover:bg-red-500/10 hover:text-red-400"
                aria-label={`Delete ${item.title}`}
                title="Delete task"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </DraggableItem>
        ))}

        {remainingCount > 0 && (
          <button
            type="button"
            onClick={() => {
              setSelectedDate(day);
              setExpandedDay(day);
            }}
            className="w-full rounded-md px-2 py-1 text-left text-[11px] text-zinc-400 transition hover:bg-zinc-900 hover:text-zinc-200"
          >
            +{remainingCount} more — view all
          </button>
        )}
      </div>

      {adding ? (
        <div className="mt-2 flex items-center gap-1">
          <input
            autoFocus
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void submitNewTask();

              if (e.key === "Escape") {
                setNewTaskTitle("");
                setAdding(false);
              }
            }}
            placeholder="Task..."
            className="min-w-0 flex-1 rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-zinc-400"
          />

          <button
            type="button"
            onClick={() => {
              setNewTaskTitle("");
              setAdding(false);
            }}
            className="shrink-0 rounded-md p-1 text-zinc-500 transition hover:bg-zinc-900 hover:text-zinc-300"
            aria-label="Cancel adding task"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="mt-2 flex w-full items-center gap-1 rounded-md px-2 py-1 text-left text-[11px] text-zinc-500 transition hover:bg-zinc-900 hover:text-zinc-200"
        >
          <Plus className="h-3 w-3" />
          Add task
        </button>
      )}
    </div>
  );
}

function SortableDayTask({
  item,
  openTaskDetails,
  completeItem,
  deleteItem,
  editingId,
  editingText,
  setEditingId,
  setEditingText,
  saveEdit,
}: {
  item: CalendarTask;
  openTaskDetails: WeeklyCalendarProps["openTaskDetails"];
  completeItem: WeeklyCalendarProps["completeItem"];
  deleteItem: WeeklyCalendarProps["deleteItem"];
  editingId: WeeklyCalendarProps["editingId"];
  editingText: WeeklyCalendarProps["editingText"];
  setEditingId: WeeklyCalendarProps["setEditingId"];
  setEditingText: WeeklyCalendarProps["setEditingText"];
  saveEdit: WeeklyCalendarProps["saveEdit"];
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item._id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={`flex min-w-0 items-center gap-3 rounded-xl border border-zinc-700/65 bg-[#292b2d] p-3.5 shadow-sm transition-colors hover:border-zinc-500 hover:bg-zinc-800/70 ${
        isDragging ? "z-10 opacity-50" : ""
      }`}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        onClick={(event) => event.stopPropagation()}
        style={{ touchAction: "none" }}
        className="shrink-0 cursor-grab px-2 text-sm text-zinc-500 hover:text-zinc-200 active:cursor-grabbing"
        aria-label={`Reorder ${item.title}`}
        title="Drag to reorder"
      >
        ⋮⋮
      </button>

      <button
        type="button"
        onClick={() => void completeItem(item._id)}
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition ${
          item.completed
            ? "border-zinc-300 bg-zinc-100 text-zinc-950"
            : "border-zinc-600 text-transparent hover:border-zinc-300"
        }`}
        aria-label={item.completed ? "Mark incomplete" : "Mark complete"}
        title={item.completed ? "Mark incomplete" : "Mark complete"}
      >
        {item.completed ? (
          <span className="text-[11px] font-bold leading-none">✓</span>
        ) : null}
      </button>

      {editingId === item._id ? (
        <div
          className="flex min-w-0 flex-1 items-center gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          <input
            autoFocus
            value={editingText}
            onChange={(e) => setEditingText(e.target.value)}
            onPointerDown={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === "Enter") {
                e.preventDefault();
                if (editingText.trim()) void saveEdit();
              } else if (e.key === "Escape") {
                e.preventDefault();
                setEditingId(null);
                setEditingText("");
              }
            }}
            aria-label={`Edit ${item.title}`}
            className="min-w-0 flex-1 rounded-md border border-zinc-600 bg-zinc-950 px-2 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-300"
          />
          <button
            type="button"
            onClick={() => void saveEdit()}
            disabled={!editingText.trim()}
            className="shrink-0 rounded-md px-2 py-1 text-xs text-zinc-100 hover:bg-zinc-800 disabled:opacity-40"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => {
              setEditingId(null);
              setEditingText("");
            }}
            className="shrink-0 rounded-md px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-800"
          >
            Cancel
          </button>
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={() => openTaskDetails(item)}
            className={`flex min-w-0 flex-1 items-start gap-2 rounded-md px-2 py-2 text-left text-sm transition hover:bg-zinc-800 ${
              item.completed ? "text-zinc-500 line-through" : "text-zinc-200"
            }`}
          >
            <PriorityIndicator priority={item.priority} />
            <span className="min-w-0 flex-1">
              <span className="block break-words">{item.title}</span>
              {item.notes ? (
                <span className="mt-1 block truncate text-xs text-zinc-500">
                  {item.notes}
                </span>
              ) : null}
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              setEditingId(item._id);
              setEditingText(item.title);
            }}
            className="shrink-0 rounded-md p-1.5 text-zinc-500 transition hover:bg-zinc-800 hover:text-zinc-100"
            aria-label={`Rename ${item.title}`}
            title="Rename task"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        </>
      )}

      <button
        type="button"
        onClick={() => void deleteItem(item._id)}
        className="shrink-0 rounded-md p-1.5 text-zinc-600 transition hover:bg-zinc-800 hover:text-red-400"
        aria-label={`Delete ${item.title}`}
        title="Delete task"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function DayDetailModal({
  day,
  items,
  onClose,
  addTask,
  openTaskDetails,
  completeItem,
  deleteItem,
  reorderDayTasks,
  editingId,
  editingText,
  setEditingId,
  setEditingText,
  saveEdit,
}: {
  day: Date;
  items: CalendarTask[];
  onClose: () => void;
  addTask: WeeklyCalendarProps["addTask"];
  openTaskDetails: WeeklyCalendarProps["openTaskDetails"];
  completeItem: WeeklyCalendarProps["completeItem"];
  deleteItem: WeeklyCalendarProps["deleteItem"];
  reorderDayTasks: WeeklyCalendarProps["reorderDayTasks"];
  editingId: WeeklyCalendarProps["editingId"];
  editingText: WeeklyCalendarProps["editingText"];
  setEditingId: WeeklyCalendarProps["setEditingId"];
  setEditingText: WeeklyCalendarProps["setEditingText"];
  saveEdit: WeeklyCalendarProps["saveEdit"];
}) {
  const [adding, setAdding] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [saving, setSaving] = useState(false);

  const dayItems = items
    .filter((item) => item.date && isSameDay(new Date(item.date), day))
    .sort(
      (a, b) => (a.order ?? a.createdAt ?? 0) - (b.order ?? b.createdAt ?? 0),
    );

  const submitNewTask = async () => {
    const title = newTaskTitle.trim();
    if (!title || saving) return;

    setSaving(true);

    try {
      await addTask(title, "scheduled", day.toISOString());
      setNewTaskTitle("");
      setAdding(false);
    } catch {
      // Parent displays the failure toast; preserve the draft for retry.
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-zinc-600/70 bg-[#191a1c] shadow-[0_35px_110px_rgba(0,0,0,0.8)]">
        <div className="flex items-center justify-between border-b border-zinc-800 bg-gradient-to-r from-zinc-900 to-zinc-950 px-5 py-6 sm:px-7">
          <div>
            <h3 className="text-lg font-semibold text-zinc-100">
              {format(day, "EEEE, d MMMM yyyy")}
            </h3>

            <p className="mt-1 text-xs text-zinc-500">
              {dayItems.length} {dayItems.length === 1 ? "task" : "tasks"}{" "}
              scheduled
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-zinc-500 transition hover:bg-zinc-900 hover:text-zinc-200"
            aria-label="Close expanded day"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5 sm:p-8">
          {dayItems.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-800 px-4 py-10 text-center">
              <p className="text-sm text-zinc-400">
                No tasks scheduled for this day.
              </p>

              <p className="mt-1 text-xs text-zinc-600">
                Add a task below to get started.
              </p>
            </div>
          ) : (
            <DndContext
              collisionDetection={closestCenter}
              onDragEnd={(event: DragEndEvent) => {
                const { active, over } = event;

                if (!over || active.id === over.id) return;

                const oldIndex = dayItems.findIndex(
                  (task: CalendarTask) => task._id === active.id,
                );

                const newIndex = dayItems.findIndex(
                  (task: CalendarTask) => task._id === over.id,
                );

                if (oldIndex < 0 || newIndex < 0) return;

                const reordered = arrayMove(dayItems, oldIndex, newIndex);

                const dayStart = new Date(day);
                dayStart.setHours(0, 0, 0, 0);

                const dayEnd = new Date(day);
                dayEnd.setHours(23, 59, 59, 999);

                void reorderDayTasks(
                  reordered.map((task: CalendarTask) => task._id),
                  dayStart.getTime(),
                  dayEnd.getTime(),
                );
              }}
            >
              <SortableContext
                items={dayItems.map((task) => task._id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {dayItems.map((item) => (
                    <SortableDayTask
                      key={item._id}
                      item={item}
                      openTaskDetails={openTaskDetails}
                      completeItem={completeItem}
                      deleteItem={deleteItem}
                      editingId={editingId}
                      editingText={editingText}
                      setEditingId={setEditingId}
                      setEditingText={setEditingText}
                      saveEdit={saveEdit}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>

        <div className="border-t border-zinc-800 bg-zinc-900/35 p-4 sm:px-7 sm:py-5">
          {adding ? (
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                void submitNewTask();
              }}
            >
              <input
                autoFocus
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setNewTaskTitle("");
                    setAdding(false);
                  }
                }}
                placeholder="What needs to get done?"
                className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-zinc-400"
              />

              <button
                type="submit"
                disabled={!newTaskTitle.trim() || saving}
                className="rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                {saving ? "Adding..." : "Add"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setNewTaskTitle("");
                  setAdding(false);
                }}
                className="rounded-lg border border-zinc-800 px-3 py-2 text-sm text-zinc-400 transition hover:bg-zinc-900"
              >
                Cancel
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-zinc-700 px-3 py-2.5 text-sm text-zinc-400 transition hover:border-zinc-500 hover:bg-zinc-900 hover:text-zinc-100"
            >
              <Plus className="h-4 w-4" />
              Add task to this day
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function WeeklyCalendar({
  items,
  completeItem,
  deleteItem,
  reorderDayTasks,
  addTask,
  editingId,
  editingText,
  setEditingId,
  setEditingText,
  saveEdit,
  openTaskDetails,
  isDragging,
  projectControls,
  contextControls,
}: WeeklyCalendarProps) {
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 }),
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [expandedDay, setExpandedDay] = useState<Date | null>(null);
  const [openOrganizer, setOpenOrganizer] = useState<
    "projects" | "contexts" | null
  >(null);
  const organizerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openOrganizer) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!organizerRef.current?.contains(event.target as Node)) {
        setOpenOrganizer(null);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenOrganizer(null);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [openOrganizer]);

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)),
    [weekStart],
  );

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) return items;

    return items.filter((item) => item.title.toLowerCase().includes(query));
  }, [items, searchQuery]);

  const goPreviousWeek = () => {
    setWeekStart((current) => subWeeks(current, 1));
  };

  const goNextWeek = () => {
    setWeekStart((current) => addWeeks(current, 1));
  };

  const goToday = () => {
    const today = new Date();

    setWeekStart(startOfWeek(today, { weekStartsOn: 1 }));
    setSelectedDate(today);
    setExpandedDay(today);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-700/55 bg-[#242628] px-4 py-3">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={goPreviousWeek}
            className="rounded-lg border border-zinc-800 bg-zinc-950 p-2 text-zinc-500 transition hover:bg-zinc-900 hover:text-zinc-200"
            aria-label="Previous week"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={goToday}
            className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs font-medium text-zinc-300 transition hover:bg-zinc-900 hover:text-zinc-100"
          >
            Today
          </button>

          <button
            type="button"
            onClick={goNextWeek}
            className="rounded-lg border border-zinc-800 bg-zinc-950 p-2 text-zinc-500 transition hover:bg-zinc-900 hover:text-zinc-200"
            aria-label="Next week"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="text-sm font-medium text-zinc-300">
          {format(weekStart, "d MMM")} – {format(weekDays[6], "d MMM yyyy")}
        </div>

        <div className="ml-auto flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
          <div
            ref={organizerRef}
            className="relative z-30 flex flex-wrap items-center gap-2"
          >
            {projectControls && (
              <button
                type="button"
                aria-expanded={openOrganizer === "projects"}
                aria-controls="mogtd-projects-panel"
                onClick={() =>
                  setOpenOrganizer((current) =>
                    current === "projects" ? null : "projects",
                  )
                }
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition ${openOrganizer === "projects" ? "border-zinc-400 bg-zinc-700 text-white" : "border-zinc-700 bg-zinc-950 text-zinc-300 hover:border-zinc-500 hover:text-white"}`}
              >
                <FolderKanban className="h-3.5 w-3.5" /> Projects{" "}
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            )}
            {contextControls && (
              <button
                type="button"
                aria-expanded={openOrganizer === "contexts"}
                aria-controls="mogtd-contexts-panel"
                onClick={() =>
                  setOpenOrganizer((current) =>
                    current === "contexts" ? null : "contexts",
                  )
                }
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition ${openOrganizer === "contexts" ? "border-zinc-400 bg-zinc-700 text-white" : "border-zinc-700 bg-zinc-950 text-zinc-300 hover:border-zinc-500 hover:text-white"}`}
              >
                <Tags className="h-3.5 w-3.5" /> Contexts{" "}
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            )}
            {openOrganizer === "projects" && projectControls && (
              <div
                id="mogtd-projects-panel"
                className="absolute right-0 top-full z-50 mt-2 max-h-[min(70vh,560px)] w-[min(90vw,440px)] overflow-y-auto rounded-xl border border-zinc-600 bg-[#1b1c1e] shadow-[0_24px_65px_rgba(0,0,0,0.65)]"
              >
                {projectControls}
              </div>
            )}
            {openOrganizer === "contexts" && contextControls && (
              <div
                id="mogtd-contexts-panel"
                className="absolute right-0 top-full z-50 mt-2 max-h-[min(70vh,440px)] w-[min(90vw,360px)] overflow-y-auto rounded-xl border border-zinc-600 bg-[#1b1c1e] shadow-[0_24px_65px_rgba(0,0,0,0.65)]"
              >
                {contextControls}
              </div>
            )}
          </div>

          <div className="relative w-full sm:w-56 sm:shrink-0">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-600" />

            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks..."
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950 py-2 pl-8 pr-3 text-xs text-zinc-200 outline-none placeholder:text-zinc-600 focus:border-zinc-600"
            />
          </div>
        </div>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {weekDays.map((day) => (
          <CalendarDay
            key={day.toISOString()}
            day={day}
            items={filteredItems}
            addTask={addTask}
            editingId={editingId}
            editingText={editingText}
            setEditingId={setEditingId}
            setEditingText={setEditingText}
            saveEdit={saveEdit}
            completeItem={completeItem}
            deleteItem={deleteItem}
            openTaskDetails={openTaskDetails}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            setExpandedDay={setExpandedDay}
            isDragging={isDragging}
            isDayModalOpen={expandedDay !== null}
          />
        ))}
      </div>

      {expandedDay && (
        <DayDetailModal
          day={expandedDay}
          items={items}
          onClose={() => setExpandedDay(null)}
          addTask={addTask}
          openTaskDetails={openTaskDetails}
          completeItem={completeItem}
          deleteItem={deleteItem}
          reorderDayTasks={reorderDayTasks}
          editingId={editingId}
          editingText={editingText}
          setEditingId={setEditingId}
          setEditingText={setEditingText}
          saveEdit={saveEdit}
        />
      )}

      <div className="flex items-center justify-between text-[11px] text-zinc-600">
        <span>
          {filteredItems.length} {filteredItems.length === 1 ? "task" : "tasks"}{" "}
          shown
        </span>

        <span>Week starts Monday</span>
      </div>
    </div>
  );
}
