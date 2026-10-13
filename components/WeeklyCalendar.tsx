"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Search, X } from "lucide-react";
import {
  addDays,
  addWeeks,
  format,
  isSameDay,
  isToday,
  startOfWeek,
  subWeeks,
} from "date-fns";
import { useDroppable } from "@dnd-kit/core";
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
};

type WeeklyCalendarProps = {
  items: CalendarTask[];

  moveItem: (
    id: Id<"tasks">,
    status: "inbox" | "incubator" | "scheduled",
    date?: string,
  ) => Promise<void>;

  completeItem: (id: Id<"tasks">) => Promise<void>;

  deleteItem: (id: Id<"tasks">) => Promise<void>;

  addTask: (
    title: string,
    status: "inbox" | "incubator" | "scheduled",
    date?: string,
  ) => Promise<void>;

  editingId: Id<"tasks"> | null;
  editingText: string;
  setEditingId: (id: Id<"tasks"> | null) => void;
  setEditingText: (value: string) => void;
  saveEdit: () => Promise<void>;

  openTaskDetails: (task: CalendarTask) => void;

  isDragging: boolean;
};

type CalendarDayProps = {
  day: Date;
  items: CalendarTask[];

  addTask: (
    title: string,
    status: "inbox" | "incubator" | "scheduled",
    date?: string,
  ) => Promise<void>;

  editingId: Id<"tasks"> | null;
  editingText: string;
  setEditingId: (id: Id<"tasks"> | null) => void;
  setEditingText: (value: string) => void;
  saveEdit: () => Promise<void>;

  completeItem: (id: Id<"tasks">) => Promise<void>;
  deleteItem: (id: Id<"tasks">) => Promise<void>;

  openTaskDetails: (task: CalendarTask) => void;

  selectedDate: Date | null;
  setSelectedDate: (date: Date | null) => void;

  expandedDay: Date | null;
  setExpandedDay: (date: Date | null) => void;

  isDragging: boolean;
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
  expandedDay,
  setExpandedDay,
  isDragging,
}: CalendarDayProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: day.toISOString(),
  });

  const [adding, setAdding] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");

  const isSelected = selectedDate ? isSameDay(selectedDate, day) : false;

  const dayItems = items.filter(
    (item) => item.date && isSameDay(new Date(item.date), day),
  );

  const visibleItems = dayItems.slice(0, 3);
  const remainingCount = Math.max(dayItems.length - visibleItems.length, 0);

  const submitNewTask = async () => {
    const title = newTaskTitle.trim();

    if (!title) {
      setAdding(false);
      return;
    }

    await addTask(title, "scheduled", day.toISOString());

    setNewTaskTitle("");
    setAdding(false);
  };

  return (
    <div
      ref={setNodeRef}
      className={`relative min-w-0 overflow-hidden rounded-xl border p-1.5 transition-all duration-200 sm:p-2.5 ${
        isToday(day)
          ? "min-h-[280px] border-zinc-700 bg-zinc-900/70 shadow-sm ring-1 ring-zinc-100 sm:min-h-[300px]"
          : "min-h-[250px] border-zinc-800 bg-zinc-950/80 sm:min-h-[270px]"
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
        onClick={() => setSelectedDate(day)}
        className={`mb-2 flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left transition ${
          isSelected
            ? "bg-zinc-100 text-zinc-950"
            : "text-zinc-300 hover:bg-zinc-900 hover:text-zinc-100"
        }`}
      >
        <div>
          <div className="text-xs font-medium uppercase tracking-wide">
            {format(day, "EEE")}
          </div>

          <div className="text-sm font-semibold">{format(day, "d")}</div>
        </div>

        {isToday(day) && (
          <span className="rounded-full border border-zinc-600 px-2 py-0.5 text-[10px] font-medium text-zinc-300">
            Today
          </span>
        )}
      </button>

      <div className="space-y-1.5">
        {visibleItems.map((item) => (
          <DraggableItem
            key={item._id}
            item={item}
            dragId={`calendar-${item._id}`}
            completed={item.completed}
            onComplete={() => completeItem(item._id)}
          >
            {editingId === item._id ? (
              <input
                autoFocus
                value={editingText}
                onChange={(e) => setEditingText(e.target.value)}
                onBlur={() => {
                  void saveEdit();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    void saveEdit();
                  }

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
                onDoubleClick={() => {
                  setEditingId(item._id);
                  setEditingText(item.title);
                }}
                className={`block w-full min-w-0 truncate rounded-md px-1.5 py-1 text-left text-xs transition hover:bg-zinc-900 ${
                  item.completed
                    ? "text-zinc-500 line-through"
                    : "text-zinc-200"
                }`}
              >
                {item.title}
              </button>
            )}
          </DraggableItem>
        ))}

        {remainingCount > 0 && (
          <button
            type="button"
            onClick={() => setExpandedDay(day)}
            className="w-full rounded-md px-2 py-1 text-left text-[11px] text-zinc-500 transition hover:bg-zinc-900 hover:text-zinc-300"
          >
            +{remainingCount} more
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
              if (e.key === "Enter") {
                void submitNewTask();
              }

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
          className="mt-2 flex w-full items-center gap-1 rounded-md px-2 py-1 text-left text-[11px] text-zinc-600 transition hover:bg-zinc-900 hover:text-zinc-300"
        >
          <Plus className="h-3 w-3" />
          Add task
        </button>
      )}
    </div>
  );
}

function DayDetailModal({
  day,
  items,
  onClose,
  openTaskDetails,
  completeItem,
  deleteItem,
}: {
  day: Date;
  items: CalendarTask[];
  onClose: () => void;
  openTaskDetails: (task: CalendarTask) => void;
  completeItem: (id: Id<"tasks">) => Promise<void>;
  deleteItem: (id: Id<"tasks">) => Promise<void>;
}) {
  const dayItems = items.filter(
    (item) => item.date && isSameDay(new Date(item.date), day),
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-zinc-100">
              {format(day, "EEEE, d MMMM")}
            </h3>

            <p className="text-xs text-zinc-500">
              {dayItems.length} {dayItems.length === 1 ? "task" : "tasks"}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-zinc-500 transition hover:bg-zinc-900 hover:text-zinc-200"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[60vh] space-y-2 overflow-y-auto">
          {dayItems.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-800 px-4 py-8 text-center text-sm text-zinc-600">
              No tasks scheduled for this day.
            </div>
          ) : (
            dayItems.map((item) => (
              <DraggableItem
                key={item._id}
                item={item}
                dragId={`calendar-modal-${item._id}`}
                completed={item.completed}
                onComplete={() => completeItem(item._id)}
              >
                <div className="flex min-w-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openTaskDetails(item)}
                    className={`min-w-0 flex-1 truncate rounded-md px-2 py-1.5 text-left text-sm transition hover:bg-zinc-900 ${
                      item.completed
                        ? "text-zinc-500 line-through"
                        : "text-zinc-200"
                    }`}
                  >
                    {item.title}
                  </button>

                  <button
                    type="button"
                    onClick={() => void deleteItem(item._id)}
                    className="shrink-0 rounded-md p-1.5 text-zinc-600 transition hover:bg-zinc-900 hover:text-zinc-300"
                    aria-label="Delete task"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </DraggableItem>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default function WeeklyCalendar({
  items,
  moveItem,
  completeItem,
  deleteItem,
  addTask,
  editingId,
  editingText,
  setEditingId,
  setEditingText,
  saveEdit,
  openTaskDetails,
  isDragging,
}: WeeklyCalendarProps) {
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date(), {
      weekStartsOn: 1,
    }),
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [expandedDay, setExpandedDay] = useState<Date | null>(null);

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)),
    [weekStart],
  );

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      return items;
    }

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

    setWeekStart(
      startOfWeek(today, {
        weekStartsOn: 1,
      }),
    );

    setSelectedDate(today);
  };

  return (
    <div className="space-y-3">
      {/* ==================== TOOLBAR ==================== */}
      <div className="flex flex-wrap items-center justify-between gap-2">
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

        <div className="relative w-full sm:w-56">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-600" />

          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tasks..."
            className="w-full rounded-lg border border-zinc-800 bg-zinc-950 py-2 pl-8 pr-3 text-xs text-zinc-200 outline-none placeholder:text-zinc-600 focus:border-zinc-600"
          />
        </div>
      </div>

      {/* ==================== WEEK ==================== */}
      <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
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
            expandedDay={expandedDay}
            setExpandedDay={setExpandedDay}
            isDragging={isDragging}
          />
        ))}
      </div>

      {/* ==================== EXPANDED DAY ==================== */}
      {expandedDay && (
        <DayDetailModal
          day={expandedDay}
          items={filteredItems}
          onClose={() => setExpandedDay(null)}
          openTaskDetails={openTaskDetails}
          completeItem={completeItem}
          deleteItem={deleteItem}
        />
      )}

      {/* ==================== FOOTER ==================== */}
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
