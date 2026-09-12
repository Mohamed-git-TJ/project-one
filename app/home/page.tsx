"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import WeeklyCalendar from "@/components/WeeklyCalendar";
import { useDroppable } from "@dnd-kit/core";
import DraggableItem from "@/components/DraggableItem";
import { DndContext, DragOverlay } from "@dnd-kit/core";
import { pointerWithin, rectIntersection } from "@dnd-kit/core";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function InboxCard() {
  type Status = "inbox" | "incubator" | "scheduled";

  type Item = {
    _id: Id<"tasks">;
    title: string;
    status: Status;
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

  const items = (useQuery(api.tasks.getTasks) as Item[]) || [];
  const projects = useQuery(api.projects.getProjects) || [];
  const createTask = useMutation(api.tasks.createTask);
  const updateTask = useMutation(api.tasks.updateTask);
  const deleteTaskMutation = useMutation(api.tasks.deleteTask);
  const createProject = useMutation(api.projects.createProject);
  const toggleComplete = useMutation(api.tasks.toggleComplete);
  const editTask = useMutation(api.tasks.editTask);
  const updateTaskDetails = useMutation(api.tasks.updateTaskDetails);

  const [projectInput, setProjectInput] = useState("");
  const [inboxInput, setInboxInput] = useState("");
  const [incubatorInput, setIncubatorInput] = useState("");
  const [expanded, setExpanded] = useState<"inbox" | "incubator" | null>(null);
  const [activeItem, setActiveItem] = useState<Item | null>(null);
  const [editingId, setEditingId] = useState<Id<"tasks"> | null>(null);
  const [editingText, setEditingText] = useState("");
  const [selectedTask, setSelectedTask] = useState<Item | null>(null);
  const [highlightedTask, setHighlightedTask] = useState<Id<"tasks"> | null>(
    null,
  );
  const [detailsTitle, setDetailsTitle] = useState("");
  const [detailsNotes, setDetailsNotes] = useState("");
  const [detailsPriority, setDetailsPriority] = useState<"low" | "medium" | "high">("medium");
  const [detailsContexts, setDetailsContexts] = useState<string[]>([]);
  const [newContext, setNewContext] = useState("");
  const [activeContext, setActiveContext] = useState<string | null>(null);
  const [detailsProjectId, setDetailsProjectId] = useState<
    Id<"projects"> | undefined
  >();
  const [detailsRecurring, setDetailsRecurring] = useState(false);
  const [detailsRecurrenceType, setDetailsRecurrenceType] = useState<"daily" | "weekly" | "monthly" | "yearly">("weekly");
  const [detailsRecurrenceInterval, setDetailsRecurrenceInterval] = useState(1);
  const [detailsRecurrenceCount, setDetailsRecurrenceCount] = useState<
    number | undefined
  >();
  const [detailsRecurrenceDays, setDetailsRecurrenceDays] = useState<string[]>(
    [],
  );
  const [detailsRecurrenceEndDate, setDetailsRecurrenceEndDate] = useState("");
  const [focusInboxInput, setFocusInboxInput] = useState(false);

  const defaultContexts = ["@Work", "@Home", "@Computer", "@Phone", "@Errands"];

  const addItem = async (title: string, status: Status) => {
    if (!title.trim()) return;
    await createTask({ title: title.trim(), status });
  };

  const moveItem = async (id: Id<"tasks">, status: Status, date?: string) => {
    await updateTask({ id, status, date });
  };

  const deleteItem = React.useCallback(
    async (id: Id<"tasks">) => {
      try {
        await deleteTaskMutation({ id });
      } catch (error) {
        console.error("Delete failed:", error);
      }
    },
    [deleteTaskMutation],
  );

  const completeItem = async (id: Id<"tasks">) => {
    await toggleComplete({ id });
  };

  const saveEdit = async () => {
    if (!editingId || !editingText.trim()) return;
    await editTask({ id: editingId, title: editingText.trim() });
    setEditingId(null);
    setEditingText("");
  };

  const openTaskDetails = (task: Item) => {
    setSelectedTask(task);
    setDetailsTitle(task.title);
    setDetailsNotes(task.notes || "");
    setDetailsPriority(task.priority || "medium");
    setDetailsContexts(task.contexts || []);
    setDetailsProjectId(task.projectId);
    setDetailsRecurring(task.recurring || false);
    setDetailsRecurrenceType(task.recurrenceType || "weekly");
    setDetailsRecurrenceInterval(task.recurrenceInterval || 1);
    setDetailsRecurrenceCount(task.recurrenceCount);
    setDetailsRecurrenceDays(task.recurrenceDays || []);
    setDetailsRecurrenceEndDate(task.recurrenceEndDate || "");
  };

  const saveTaskDetails = async () => {
    if (!selectedTask || !detailsTitle.trim()) return;

    if (
      detailsRecurring &&
      detailsRecurrenceCount !== undefined &&
      detailsRecurrenceCount < 1
    ) {
      return;
    }

    await updateTaskDetails({
      id: selectedTask._id,
      title: detailsTitle.trim(),
      notes: detailsNotes,
      priority: detailsPriority,
      contexts: detailsContexts,
      projectId: detailsProjectId,
      recurring: detailsRecurring,
      recurrenceType: detailsRecurring ? detailsRecurrenceType : undefined,
      recurrenceInterval: detailsRecurring
        ? detailsRecurrenceInterval
        : undefined,
      recurrenceCount: detailsRecurring ? detailsRecurrenceCount : undefined,
      recurrenceDays: detailsRecurring ? detailsRecurrenceDays : undefined,
      recurrenceEndDate: detailsRecurring
        ? detailsRecurrenceEndDate
        : undefined,
    });

    setSelectedTask(null);
    setHighlightedTask(null);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        setExpanded("inbox");
        setFocusInboxInput(true);
      }

      if (e.key === "Escape") {
        setExpanded(null);
        setSelectedTask(null);
        setHighlightedTask(null);
        setEditingId(null);
      }

      if (e.key === "Delete" && selectedTask) {
        deleteItem(selectedTask._id);
        setSelectedTask(null);
        setHighlightedTask(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedTask, deleteItem]);

  const allContexts = Array.from(
    new Set([
      ...defaultContexts,
      ...items.flatMap((item) => item.contexts || []),
    ]),
  );

  const filteredItems = activeContext
    ? items.filter((item) => item.contexts?.includes(activeContext))
    : items;

  const inboxItems = filteredItems.filter((item) => item.status === "inbox");
  const incubatorItems = filteredItems.filter(
    (item) => item.status === "incubator",
  );

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const today = new Date();
  const todayItems = filteredItems.filter(
    (item) =>
      item.status === "scheduled" &&
      item.date &&
      isSameDay(new Date(item.date), today),
  );

  const todayCompleted = todayItems.filter((item) => item.completed).length;
  const todayPending = todayItems.length - todayCompleted;

  const { setNodeRef: setInboxRef, isOver: isInboxOver } = useDroppable({
    id: "inbox",
  });
  const { setNodeRef: setIncubatorRef, isOver: isIncubatorOver } = useDroppable(
    {
      id: "incubator",
    },
  );
  const { setNodeRef: setTodayHomeRef, isOver: isTodayHomeOver } = useDroppable(
    {
      id: "today-home",
    },
  );

  const renderCompactTask = (
    item: Item,
    type: "today" | "inbox" | "incubator",
  ) => (
    <div
      key={item._id}
      onClick={() => {
        setSelectedTask(item);
        setHighlightedTask(item._id);
      }}
      className={`group flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 transition hover:border-zinc-600 hover:bg-zinc-800 ${
        highlightedTask === item._id ? "ring-1 ring-zinc-300/60" : ""
      } ${item.completed ? "opacity-55" : ""}`}
    >
      {editingId === item._id ? (
        <input
          autoFocus
          value={editingText}
          onChange={(e) => setEditingText(e.target.value)}
          onBlur={saveEdit}
          onKeyDown={(e) => {
            if (e.key === "Enter") saveEdit();
            if (e.key === "Escape") {
              setEditingId(null);
              setEditingText("");
            }
          }}
          className="min-w-0 flex-1 rounded border px-2 py-1 text-sm outline-none"
        />
      ) : (
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="min-w-0 flex-1">
                <DraggableItem item={item}>
                  <div
                    onDoubleClick={() => {
                      setEditingId(item._id);
                      setEditingText(item.title);
                    }}
                    className="min-w-0"
                  >
                    <div
                      className={`truncate text-sm ${
                        item.completed
                          ? "line-through text-zinc-400"
                          : "text-zinc-100"
                      }`}
                    >
                      {item.title}
                    </div>
                    {item.contexts && item.contexts.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {item.contexts.map((context) => (
                          <span
                            key={context}
                            className="rounded-full bg-zinc-900 px-1.5 py-0.5 text-[9px] text-zinc-400"
                          >
                            {context}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </DraggableItem>
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[260px] text-sm">
              {item.title}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {type === "today" && item.date && (
        <span className="hidden shrink-0 text-[11px] text-zinc-400 sm:block">
          {new Date(item.date).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      )}

      <div className="flex shrink-0 items-center gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
        <button
          onClick={(e) => {
            e.stopPropagation();
            openTaskDetails(item);
          }}
          className="rounded p-1 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
          title="Details"
        >
          ⓘ
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            completeItem(item._id);
          }}
          className="rounded p-1 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
          title={item.completed ? "Mark incomplete" : "Complete"}
        >
          {item.completed ? "↺" : "✓"}
        </button>
        {type === "today" && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              moveItem(item._id, "inbox");
            }}
            className="rounded p-1 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
            title="Move to Inbox"
          >
            ↩
          </button>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            deleteItem(item._id);
          }}
          className="rounded p-1 text-xs text-zinc-400 hover:bg-red-50 hover:text-red-500"
          title="Delete"
        >
          ✕
        </button>
      </div>
    </div>
  );

  return (
    <DndContext
      collisionDetection={(args) => {
        const pointerCollisions = pointerWithin(args);
        return pointerCollisions.length > 0
          ? pointerCollisions
          : rectIntersection(args);
      }}
      onDragStart={(event) => {
        const dragged = items.find((item) => item._id === event.active.id);
        if (dragged) setActiveItem(dragged);
      }}
      onDragEnd={(event) => {
        const { active, over } = event;
        setActiveItem(null);
        if (!over) return;

        const itemId = active.id as Id<"tasks">;
        const overId = over.id.toString();
        const draggedItem = items.find((item) => item._id === itemId);
        const isDate = !isNaN(Date.parse(overId));

        if (overId === "next-week") {
          if (!draggedItem?.date) return;
          const nextWeekDate = new Date(draggedItem.date);
          nextWeekDate.setDate(nextWeekDate.getDate() + 7);
          moveItem(itemId, "scheduled", nextWeekDate.toISOString());
          return;
        }
        if (overId === "previous-week") {
          if (!draggedItem?.date) return;
          const previousWeekDate = new Date(draggedItem.date);
          previousWeekDate.setDate(previousWeekDate.getDate() - 7);
          moveItem(itemId, "scheduled", previousWeekDate.toISOString());
          return;
        }
        if (overId === "today" || overId === "today-home") {
          moveItem(itemId, "scheduled", new Date().toISOString());
          return;
        }
        if (isDate) {
          moveItem(itemId, "scheduled", overId);
          return;
        }
        if (overId === "inbox") {
          moveItem(itemId, "inbox");
          return;
        }
        if (overId === "incubator") {
          moveItem(itemId, "incubator");
        }
      }}
    >
      {(expanded || selectedTask) && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
          onClick={() => {
            setExpanded(null);
            setSelectedTask(null);
            setHighlightedTask(null);
          }}
        />
      )}

      <div className="min-h-screen w-full bg-zinc-950 text-zinc-100">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          {/* ==================== HEADER ==================== */}
          <header className="mb-6 flex items-center justify-between">
            <div>
              <div className="text-xl font-semibold tracking-tight">MoGTD</div>
              <div className="mt-0.5 text-xs text-zinc-400">
                Your personal system for getting things done.
              </div>
            </div>
            <button
              onClick={() => {
                setExpanded("inbox");
                setFocusInboxInput(true);
              }}
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm font-medium text-zinc-100 shadow-sm transition hover:border-zinc-600 hover:bg-zinc-800"
            >
              + Capture
            </button>
          </header>

          {/* ==================== TOP ROW ==================== */}
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(320px,1fr)]">
            {/* ==================== TODAY ==================== */}
            <Card
              ref={setTodayHomeRef}
              className={`border-zinc-800 bg-zinc-950/80 shadow-2xl transition-all ${
                isTodayHomeOver ? "ring-2 ring-zinc-300/60 bg-zinc-900/90" : ""
              }`}
            >
              <CardHeader className="border-b border-zinc-800 pb-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg font-semibold">
                      Today
                    </CardTitle>
                    <p className="mt-1 text-xs text-zinc-400">
                      {today.toLocaleDateString(undefined, {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                    <p className="mt-1 text-xs text-zinc-400">
                      Make today count.
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-zinc-500">
                      {todayItems.length} tasks
                    </div>
                    <div className="mt-1 text-[11px] text-zinc-400">
                      {todayCompleted} done · {todayPending} remaining
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                {todayItems.length === 0 ? (
                  <div className="flex min-h-[230px] flex-col items-center justify-center text-center">
                    <div className="mb-3 text-2xl text-zinc-500">○</div>
                    <p className="text-sm font-medium text-zinc-500">
                      Nothing scheduled for today
                    </p>
                    <p className="mt-1 max-w-xs text-xs leading-5 text-zinc-400">
                      Drag a task to today from the calendar, or capture
                      something new.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {todayItems.map((item) => renderCompactTask(item, "today"))}
                  </div>
                )}

                <div className="mt-4 flex items-center justify-between border-t border-zinc-800 pt-3">
                  <span className="text-[11px] text-zinc-400">
                    Focus on what matters today.
                  </span>
                  <button
                    onClick={() => {
                      const todayTask = todayItems.find(
                        (item) => !item.completed,
                      );
                      if (todayTask) openTaskDetails(todayTask);
                    }}
                    disabled={todayPending === 0}
                    className="text-xs font-medium text-zinc-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Review today →
                  </button>
                </div>
              </CardContent>
            </Card>

            {/* ==================== SIDE STACK ==================== */}
            <div className="grid gap-4">
              {/* INBOX */}
              <Card
                ref={setInboxRef}
                className={`border-zinc-800 bg-zinc-950/80 shadow-2xl transition ${
                  isInboxOver ? "ring-2 ring-zinc-300/60" : ""
                } ${expanded === "inbox" ? "fixed inset-8 z-50 overflow-hidden shadow-2xl" : ""}`}
                onClick={(e) => {
                  if ((e.target as HTMLElement).closest("button")) return;
                  if (!expanded) setExpanded("inbox");
                }}
              >
                <CardHeader className="relative pb-2">
                  {expanded === "inbox" && (
                    <button
                      className="absolute right-4 top-4 text-sm text-zinc-400 hover:text-zinc-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpanded(null);
                      }}
                    >
                      ✕
                    </button>
                  )}
                  <div className="flex items-center justify-between pr-8">
                    <div>
                      <CardTitle className="text-sm font-semibold">
                        Inbox
                      </CardTitle>
                      <p className="mt-1 text-[11px] text-zinc-400">
                        Quick capture & loose tasks
                      </p>
                    </div>
                    <span className="rounded-full bg-zinc-900 px-2 py-0.5 text-[10px] text-zinc-400">
                      {inboxItems.length}
                    </span>
                  </div>
                </CardHeader>
                <CardContent
                  className="pt-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Textarea
                    autoFocus={focusInboxInput && expanded === "inbox"}
                    className="min-h-16 resize-none border-zinc-700 bg-zinc-900 text-sm shadow-none focus-visible:ring-zinc-300/60"
                    placeholder="Capture something..."
                    value={inboxInput}
                    onChange={(e) => setInboxInput(e.target.value)}
                    onKeyDown={async (e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();

                        await addItem(inboxInput, "inbox");
                        setInboxInput("");
                      }
                    }}
                  />
                  <div
                    className={`${expanded === "inbox" ? "mt-4 max-h-[70vh]" : "mt-3 max-h-28"} space-y-2 overflow-y-auto pr-1`}
                  >
                    {inboxItems.length === 0 ? (
                      <p className="py-2 text-xs text-zinc-400">
                        Your inbox is clear.
                      </p>
                    ) : (
                      inboxItems.map((item) => renderCompactTask(item, "inbox"))
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setExpanded(expanded === "inbox" ? null : "inbox");
                      setFocusInboxInput(true);
                    }}
                    className="mt-3 text-xs font-medium text-zinc-400 hover:text-zinc-100"
                  >
                    {expanded === "inbox" ? "Close" : "View all →"}
                  </button>
                </CardContent>
              </Card>

              {/* INCUBATOR */}
              <Card
                ref={setIncubatorRef}
                className={`border-zinc-800 bg-zinc-950/80 shadow-2xl transition ${
                  isIncubatorOver ? "ring-2 ring-zinc-300/60" : ""
                } ${expanded === "incubator" ? "fixed inset-8 z-50 overflow-hidden shadow-2xl" : ""}`}
                onClick={(e) => {
                  if ((e.target as HTMLElement).closest("button")) return;
                  if (!expanded) setExpanded("incubator");
                }}
              >
                <CardHeader className="relative pb-2">
                  {expanded === "incubator" && (
                    <button
                      className="absolute right-4 top-4 text-sm text-zinc-400 hover:text-zinc-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpanded(null);
                      }}
                    >
                      ✕
                    </button>
                  )}
                  <div className="flex items-center justify-between pr-8">
                    <div>
                      <CardTitle className="text-sm font-semibold">
                        Incubator
                      </CardTitle>
                      <p className="mt-1 text-[11px] text-zinc-400">
                        Ideas for later
                      </p>
                    </div>
                    <span className="rounded-full bg-zinc-900 px-2 py-0.5 text-[10px] text-zinc-400">
                      {incubatorItems.length}
                    </span>
                  </div>
                </CardHeader>
                <CardContent
                  className="pt-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Textarea
                    className="min-h-16 resize-none border-zinc-700 bg-zinc-900 text-sm shadow-none focus-visible:ring-zinc-300/60"
                    placeholder="Add long-term idea..."
                    value={incubatorInput}
                    onChange={(e) => setIncubatorInput(e.target.value)}
                    onKeyDown={async (e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();

                        await addItem(incubatorInput, "incubator");
                        setIncubatorInput("");
                      }
                    }}
                  />
                  <div
                    className={`${expanded === "incubator" ? "mt-4 max-h-[70vh]" : "mt-3 max-h-28"} space-y-2 overflow-y-auto pr-1`}
                  >
                    {incubatorItems.length === 0 ? (
                      <p className="py-2 text-xs text-zinc-400">
                        Nothing incubating yet.
                      </p>
                    ) : (
                      incubatorItems.map((item) =>
                        renderCompactTask(item, "incubator"),
                      )
                    )}
                  </div>
                  <button
                    onClick={() =>
                      setExpanded(expanded === "incubator" ? null : "incubator")
                    }
                    className="mt-3 text-xs font-medium text-zinc-400 hover:text-zinc-100"
                  >
                    {expanded === "incubator" ? "Close" : "View all →"}
                  </button>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* ==================== PROJECTS + CONTEXTS ==================== */}
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Card className="border-zinc-800 bg-zinc-950/80 shadow-2xl">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold">
                    Projects
                  </CardTitle>
                  <span className="text-[11px] text-zinc-400">
                    {projects.length} active
                  </span>
                </div>
              </CardHeader>
              <CardContent className="pt-1">
                <div className="flex gap-2">
                  <input
                    value={projectInput}
                    onChange={(e) => setProjectInput(e.target.value)}
                    onKeyDown={async (e) => {
                      if (e.key === "Enter" && projectInput.trim()) {
                        await createProject({ name: projectInput.trim() });
                        setProjectInput("");
                      }
                    }}
                    placeholder="Create a project..."
                    className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs outline-none transition focus:border-zinc-600 focus:bg-zinc-900"
                  />
                  <button
                    onClick={async () => {
                      if (!projectInput.trim()) return;
                      await createProject({ name: projectInput.trim() });
                      setProjectInput("");
                    }}
                    className="rounded-lg bg-zinc-100 px-3 py-2 text-xs font-medium text-zinc-950 transition hover:bg-zinc-200"
                  >
                    Add
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {projects.map((project) => (
                    <span
                      key={project._id}
                      className="rounded-full border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-[10px] text-zinc-400"
                    >
                      {project.name}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-zinc-800 bg-zinc-950/80 shadow-2xl">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold">
                    Contexts
                  </CardTitle>
                  {activeContext && (
                    <button
                      onClick={() => setActiveContext(null)}
                      className="text-[10px] text-zinc-400 hover:text-zinc-100"
                    >
                      Clear filter
                    </button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-1">
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => setActiveContext(null)}
                    className={`rounded-full border px-2.5 py-1 text-[10px] transition ${
                      activeContext === null
                        ? "border-zinc-200 bg-zinc-100 text-zinc-950"
                        : "border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-600"
                    }`}
                  >
                    All
                  </button>
                  {allContexts.map((context) => (
                    <button
                      key={context}
                      onClick={() => setActiveContext(context)}
                      className={`rounded-full border px-2.5 py-1 text-[10px] transition ${
                        activeContext === context
                          ? "border-zinc-200 bg-zinc-100 text-zinc-950"
                          : "border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-600"
                      }`}
                    >
                      {context}
                    </button>
                  ))}
                </div>
                <p className="mt-3 text-[10px] text-zinc-400">
                  {activeContext
                    ? `Showing tasks in ${activeContext}.`
                    : "Filter your system by where or how you can act."}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* ==================== CALENDAR ==================== */}
          <div className="mt-4">
            <WeeklyCalendar
              items={filteredItems}
              moveItem={moveItem}
              completeItem={completeItem}
              editingId={editingId}
              editingText={editingText}
              setEditingId={setEditingId}
              setEditingText={setEditingText}
              saveEdit={saveEdit}
              openTaskDetails={openTaskDetails}
            />
          </div>
        </div>
      </div>

      {/* ==================== TASK DETAILS MODAL ==================== */}
      {selectedTask && (
        <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-xl -translate-x-1/2 -translate-y-1/2 px-4">
          <Card className="flex max-h-[90vh] flex-col border-zinc-800 bg-zinc-950/80 shadow-2xl">
            <CardHeader className="relative border-b border-zinc-800">
              <CardTitle>Task Details</CardTitle>
              <button
                className="absolute right-4 top-4 text-sm text-zinc-400 hover:text-zinc-100"
                onClick={() => {
                  setSelectedTask(null);
                  setHighlightedTask(null);
                }}
              >
                ✕
              </button>
            </CardHeader>

            <CardContent className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
              <div>
                <label className="text-sm text-zinc-400">Title</label>
                <input
                  value={detailsTitle}
                  onChange={(e) => setDetailsTitle(e.target.value)}
                  className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 outline-none focus:border-zinc-600"
                />
              </div>

              <div>
                <label className="text-sm text-zinc-400">Notes</label>
                <Textarea
                  value={detailsNotes}
                  onChange={(e) => setDetailsNotes(e.target.value)}
                  placeholder="Add notes..."
                  className="mt-1 min-h-[140px] border-zinc-700 bg-zinc-900"
                  onKeyDown={(e) => {
                    if (e.ctrlKey && e.key === "Enter") saveTaskDetails();
                  }}
                />
              </div>

              <div>
                <label className="text-sm text-zinc-400">Priority</label>
                <select
                  value={detailsPriority}
                  onChange={(e) => setDetailsPriority(e.target.value as "low" | "medium" | "high")}
                  className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>

              <div>
                <label className="text-sm text-zinc-400">Project</label>
                <select
                  value={detailsProjectId ?? ""}
                  onChange={(e) =>
                    setDetailsProjectId(
                      e.target.value
                        ? (e.target.value as Id<"projects">)
                        : undefined,
                    )
                  }
                  className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2"
                >
                  <option value="">No project</option>
                  {projects.map((project) => (
                    <option key={project._id} value={project._id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* ==================== CONTEXTS ==================== */}
              <div className="space-y-2">
                <label className="text-sm text-zinc-400">Contexts</label>
                <div className="flex flex-wrap gap-2">
                  {allContexts.map((context) => {
                    const selected = detailsContexts.includes(context);
                    return (
                      <button
                        key={context}
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
                  })}
                </div>

                <div className="flex gap-2">
                  <input
                    value={newContext}
                    onChange={(e) => setNewContext(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key !== "Enter") return;
                      e.preventDefault();
                      const value = newContext.trim();
                      if (!value) return;
                      const context = value.startsWith("@")
                        ? value
                        : `@${value}`;
                      setDetailsContexts((current) =>
                        current.includes(context)
                          ? current
                          : [...current, context],
                      );
                      setNewContext("");
                    }}
                    placeholder="Add custom context..."
                    className="flex-1 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const value = newContext.trim();
                      if (!value) return;
                      const context = value.startsWith("@")
                        ? value
                        : `@${value}`;
                      setDetailsContexts((current) =>
                        current.includes(context)
                          ? current
                          : [...current, context],
                      );
                      setNewContext("");
                    }}
                    className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm hover:bg-zinc-800"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* ==================== REPEAT ==================== */}
              <div className="space-y-3">
                <label className="text-sm text-zinc-400">Repeat</label>
                <select
                  value={detailsRecurring ? detailsRecurrenceType : "none"}
                  onChange={(e) => {
                    if (e.target.value === "none") {
                      setDetailsRecurring(false);
                    } else {
                      setDetailsRecurring(true);
                      setDetailsRecurrenceType(e.target.value as "daily" | "weekly" | "monthly" | "yearly");
                    }
                  }}
                  className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2"
                >
                  <option value="none">Does not repeat</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>

                {detailsRecurring && (
                  <>
                    <div>
                      <label className="text-sm text-zinc-400">Every</label>
                      <input
                        type="number"
                        min="1"
                        value={detailsRecurrenceInterval}
                        onChange={(e) =>
                          setDetailsRecurrenceInterval(
                            Math.max(1, Number(e.target.value)),
                          )
                        }
                        className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2"
                      />
                      <span className="text-xs text-zinc-400">
                        Example: every 2 weeks
                      </span>
                    </div>

                    <div>
                      <label className="text-sm text-zinc-400">
                        Number of repeats
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={detailsRecurrenceCount ?? ""}
                        onChange={(e) => {
                          const value = e.target.value;
                          setDetailsRecurrenceCount(
                            value === ""
                              ? undefined
                              : Math.max(1, Number(value)),
                          );
                        }}
                        className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2"
                      />
                    </div>

                    <div>
                      <label className="text-sm text-zinc-400">
                        End date (optional)
                      </label>
                      <input
                        type="date"
                        value={detailsRecurrenceEndDate}
                        onChange={(e) =>
                          setDetailsRecurrenceEndDate(e.target.value)
                        }
                        className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2"
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="text-sm text-zinc-400">
                Status:{" "}
                <span className="capitalize text-zinc-500">
                  {selectedTask.status}
                </span>
              </div>

              <div className="sticky bottom-0 flex justify-between border-t border-zinc-800 bg-zinc-950 pt-4">
                <button
                  onClick={async () => {
                    const taskId = selectedTask._id;
                    setSelectedTask(null);
                    setHighlightedTask(null);
                    await deleteItem(taskId);
                  }}
                  className="text-sm text-red-500 hover:text-red-600"
                >
                  Delete
                </button>
                <button
                  onClick={saveTaskDetails}
                  className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
                >
                  Save
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ==================== DRAG OVERLAY ==================== */}
      <DragOverlay>
        {activeItem ? (
          <div className="min-w-[220px] rounded-xl border border-zinc-800 bg-zinc-950/80 px-4 py-3 shadow-2xl opacity-95">
            <div className="text-sm font-medium text-zinc-100">
              {activeItem.title}
            </div>
            <div className="mt-1 text-xs capitalize text-zinc-400">
              {activeItem.status}
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
