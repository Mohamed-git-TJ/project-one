"use client";

import React, { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import TaskDetailsModal from "@/components/TaskDetailsModal";
import WeeklyCalendar from "@/components/WeeklyCalendar";
import DraggableItem from "@/components/DraggableItem";
import {
  DndContext,
  DragOverlay,
  useDroppable,
  pointerWithin,
  closestCorners,
} from "@dnd-kit/core";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { Pencil } from "lucide-react";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type Status = "inbox" | "incubator" | "scheduled";

type Item = {
  _id: Id<"tasks">;
  order?: number;
  createdAt?: number;
  _creationTime?: number;
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

function DropZoneOverlay({
  label,
  isOver,
}: {
  label: string;
  isOver: boolean;
}) {
  return (
    <div
      className={`pointer-events-none absolute inset-0 z-20 flex items-center justify-center rounded-xl border-2 border-dashed transition-all duration-150 ${
        isOver
          ? "border-zinc-200 bg-zinc-100/10 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
          : "border-zinc-700/70 bg-zinc-950/25"
      }`}
    >
      <span
        className={`rounded-full border px-3 py-1.5 text-xs font-medium backdrop-blur-sm transition-all ${
          isOver
            ? "border-zinc-200 bg-zinc-100 text-zinc-950"
            : "border-zinc-700 bg-zinc-900/90 text-zinc-300"
        }`}
      >
        {isOver ? label : `Drop ${label.toLowerCase()}`}
      </span>
    </div>
  );
}

function TodayDropZone({
  children,
  isDragging,
}: {
  children: React.ReactNode;
  isDragging: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: "today-home",
  });

  return (
    <div
      ref={setNodeRef}
      className={`relative rounded-xl transition-all ${
        isOver ? "ring-2 ring-zinc-300/60 bg-zinc-900/90" : ""
      }`}
    >
      {children}
      {isDragging && <DropZoneOverlay label="Today" isOver={isOver} />}
    </div>
  );
}

function InboxDropZone({
  children,
  isDragging,
}: {
  children: React.ReactNode;
  isDragging: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: "inbox",
  });

  return (
    <div
      ref={setNodeRef}
      className={`relative rounded-xl transition-all ${
        isOver ? "ring-2 ring-zinc-300/60 bg-zinc-900/90" : ""
      }`}
    >
      {children}
      {isDragging && <DropZoneOverlay label="Inbox" isOver={isOver} />}
    </div>
  );
}

function IncubatorDropZone({
  children,
  isDragging,
}: {
  children: React.ReactNode;
  isDragging: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: "incubator",
  });

  return (
    <div
      ref={setNodeRef}
      className={`relative rounded-xl transition-all ${
        isOver ? "ring-2 ring-zinc-300/60 bg-zinc-900/90" : ""
      }`}
    >
      {children}
      {isDragging && <DropZoneOverlay label="Incubator" isOver={isOver} />}
    </div>
  );
}

function TaskReorderDropZone({
  id,
  enabled,
  children,
}: {
  id: string;
  enabled: boolean;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id, disabled: !enabled });

  return (
    <div
      ref={setNodeRef}
      className={`rounded-lg transition ${enabled && isOver ? "ring-2 ring-zinc-300/70" : ""}`}
    >
      {children}
    </div>
  );
}

export default function InboxCard() {
  const items = (useQuery(api.tasks.getTasks) as Item[]) || [];
  const projects = useQuery(api.projects.getProjects) || [];

  const createTask = useMutation(api.tasks.createTask);
  const updateTask = useMutation(api.tasks.updateTask);
  const deleteTaskMutation = useMutation(api.tasks.deleteTask);
  const createProject = useMutation(api.projects.createProject);
  const updateProjectMutation = useMutation(api.projects.updateProject);
  const deleteProjectMutation = useMutation(api.projects.deleteProject);
  const toggleComplete = useMutation(api.tasks.toggleComplete);
  const editTask = useMutation(api.tasks.editTask);
  const updateTaskDetails = useMutation(api.tasks.updateTaskDetails);
  const reorderTasksMutation = useMutation(api.tasks.reorderDayTasks);
  const reorderTasksInListMutation = useMutation(api.tasks.reorderTasksInList);

  const [projectInput, setProjectInput] = useState("");
  const [activeProjectId, setActiveProjectId] = useState<Id<"projects"> | null>(
    null,
  );
  const [renamingProjectId, setRenamingProjectId] =
    useState<Id<"projects"> | null>(null);
  const [renamingProjectName, setRenamingProjectName] = useState("");
  const [pendingProjectDeleteId, setPendingProjectDeleteId] =
    useState<Id<"projects"> | null>(null);
  const [projectBusy, setProjectBusy] = useState(false);
  const [projectError, setProjectError] = useState("");
  const [inboxInput, setInboxInput] = useState("");
  const [incubatorInput, setIncubatorInput] = useState("");
  const [expanded, setExpanded] = useState<
    "today" | "inbox" | "incubator" | null
  >(null);
  const [activeItem, setActiveItem] = useState<Item | null>(null);
  const [editingId, setEditingId] = useState<Id<"tasks"> | null>(null);
  const [editingText, setEditingText] = useState("");
  // Compact cards edit independently from WeeklyCalendar.
  const [compactEditingId, setCompactEditingId] = useState<Id<"tasks"> | null>(
    null,
  );
  const [compactEditingText, setCompactEditingText] = useState("");
  const [selectedTask, setSelectedTask] = useState<Item | null>(null);
  const [highlightedTask, setHighlightedTask] = useState<Id<"tasks"> | null>(
    null,
  );

  const [detailsTitle, setDetailsTitle] = useState("");
  const [detailsNotes, setDetailsNotes] = useState("");
  const [detailsPriority, setDetailsPriority] = useState<
    "low" | "medium" | "high"
  >("medium");
  const [detailsContexts, setDetailsContexts] = useState<string[]>([]);
  const [newContext, setNewContext] = useState("");
  const [activeContext, setActiveContext] = useState<string | null>(null);

  const [detailsProjectId, setDetailsProjectId] = useState<
    Id<"projects"> | undefined
  >();

  const [detailsRecurring, setDetailsRecurring] = useState(false);
  const [detailsRecurrenceType, setDetailsRecurrenceType] = useState<
    "daily" | "weekly" | "monthly" | "yearly"
  >("weekly");

  const [detailsRecurrenceInterval, setDetailsRecurrenceInterval] = useState(1);

  const [detailsRecurrenceCount, setDetailsRecurrenceCount] = useState<
    number | undefined
  >();

  const [detailsRecurrenceDays, setDetailsRecurrenceDays] = useState<string[]>(
    [],
  );

  const [detailsRecurrenceEndDate, setDetailsRecurrenceEndDate] = useState("");
  const [focusInboxInput, setFocusInboxInput] = useState(false);

  // Stage F: centralized mutation feedback and synchronous duplicate protection.
  const pendingActions = useRef(new Set<string>());
  const [busyActions, setBusyActions] = useState<string[]>([]);
  const [notice, setNotice] = useState<{
    id: number;
    kind: "success" | "error";
    message: string;
  } | null>(null);
  const noticeCounter = useRef(0);
  const notify = (kind: "success" | "error", message: string) => {
    setNotice({ id: ++noticeCounter.current, kind, message });
  };
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(
      () =>
        setNotice((current) => (current?.id === notice.id ? null : current)),
      4000,
    );
    return () => window.clearTimeout(timer);
  }, [notice]);

  const runAction = async <T,>(
    key: string,
    success: string | null,
    failure: string,
    action: () => Promise<T>,
  ): Promise<{ ok: true; value: T } | { ok: false }> => {
    if (pendingActions.current.has(key)) return { ok: false };
    pendingActions.current.add(key);
    setBusyActions((current) => [...current, key]);
    try {
      const value = await action();
      if (success) notify("success", success);
      return { ok: true, value };
    } catch (error) {
      console.error(failure, error);
      notify("error", failure);
      return { ok: false };
    } finally {
      pendingActions.current.delete(key);
      setBusyActions((current) => current.filter((item) => item !== key));
    }
  };
  const isBusy = (key: string) => busyActions.includes(key);

  const defaultContexts = ["@Work", "@Home", "@Computer", "@Phone", "@Errands"];

  const addItem = async (title: string, status: Status): Promise<boolean> => {
    if (!title.trim()) return false;
    const result = await runAction(
      `create:${status}`,
      "Task created",
      "Could not create task. Please retry.",
      () => createTask({ title: title.trim(), status }),
    );
    return result.ok;
  };

  const moveItem = async (
    id: Id<"tasks">,
    status: Status,
    date?: string,
  ): Promise<void> => {
    await runAction(
      `move:${id}`,
      "Task moved",
      "Could not move task. Please retry.",
      () => updateTask({ id, status, date }),
    );
  };

  const [pendingDeleteId, setPendingDeleteId] = useState<Id<"tasks"> | null>(
    null,
  );
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Every task deletion entry point requests confirmation first.
  const deleteItem = React.useCallback(
    async (id: Id<"tasks">): Promise<void> => {
      setDeleteError("");
      setPendingDeleteId(id);
    },
    [],
  );

  const confirmDelete = async () => {
    if (!pendingDeleteId || isDeleting) return;
    setIsDeleting(true);
    setDeleteError("");
    try {
      await deleteTaskMutation({ id: pendingDeleteId });
      if (selectedTask?._id === pendingDeleteId) setSelectedTask(null);
      if (highlightedTask === pendingDeleteId) setHighlightedTask(null);
      if (editingId === pendingDeleteId) {
        setEditingId(null);
        setEditingText("");
      }
      if (compactEditingId === pendingDeleteId) {
        setCompactEditingId(null);
        setCompactEditingText("");
      }
      setPendingDeleteId(null);
      notify("success", "Task deleted");
    } catch (error) {
      console.error("Delete failed:", error);
      setDeleteError("Unable to delete this task. Please try again.");
      notify("error", "Unable to delete this task. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  const completeItem = async (id: Id<"tasks">): Promise<void> => {
    await runAction(
      `complete:${id}`,
      "Task updated",
      "Could not update task completion.",
      () => toggleComplete({ id }),
    );
  };

  const saveEdit = async (): Promise<void> => {
    if (!editingId || !editingText.trim()) return;
    const id = editingId;
    const result = await runAction(
      `edit:${id}`,
      "Task title saved",
      "Could not save task title.",
      () => editTask({ id, title: editingText.trim() }),
    );
    if (result.ok) {
      setEditingId(null);
      setEditingText("");
    }
  };

  const saveCompactEdit = async (): Promise<void> => {
    if (!compactEditingId || !compactEditingText.trim()) return;
    const id = compactEditingId;
    const result = await runAction(
      `edit:${id}`,
      "Task title saved",
      "Could not save task title.",
      () => editTask({ id, title: compactEditingText.trim() }),
    );
    if (result.ok) {
      setCompactEditingId(null);
      setCompactEditingText("");
    }
  };

  const recurrenceWeekdays = [
    { value: "monday", label: "Mon" },
    { value: "tuesday", label: "Tue" },
    { value: "wednesday", label: "Wed" },
    { value: "thursday", label: "Thu" },
    { value: "friday", label: "Fri" },
    { value: "saturday", label: "Sat" },
    { value: "sunday", label: "Sun" },
  ];

  const defaultRecurrenceDay = (date?: string) => {
    const parsed = date ? new Date(date) : new Date();
    return recurrenceWeekdays[
      parsed.getUTCDay() === 0 ? 6 : parsed.getUTCDay() - 1
    ].value;
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
    setDetailsRecurrenceDays(
      task.recurrenceDays?.length
        ? task.recurrenceDays
        : [defaultRecurrenceDay(task.date)],
    );
    setDetailsRecurrenceEndDate(task.recurrenceEndDate || "");
  };

  const saveTaskDetails = async () => {
    if (!selectedTask || !detailsTitle.trim()) return;

    if (
      detailsRecurring &&
      detailsRecurrenceCount !== undefined &&
      detailsRecurrenceCount < 0
    ) {
      return;
    }

    if (
      detailsRecurring &&
      detailsRecurrenceType === "weekly" &&
      detailsRecurrenceDays.length === 0
    ) {
      window.alert("Select at least one weekday for weekly recurrence.");
      return;
    }

    const result = await runAction(
      `details:${selectedTask._id}`,
      "Task details saved",
      "Could not save task details.",
      () =>
        updateTaskDetails({
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
          recurrenceCount: detailsRecurring
            ? detailsRecurrenceCount
            : undefined,
          recurrenceDays:
            detailsRecurring && detailsRecurrenceType === "weekly"
              ? detailsRecurrenceDays
              : undefined,
          recurrenceEndDate: detailsRecurring
            ? detailsRecurrenceEndDate
            : undefined,
        }),
    );
    if (!result.ok) return;

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

      if (pendingDeleteId) {
        if (e.key === "Escape" && !isDeleting) {
          e.preventDefault();
          setPendingDeleteId(null);
          setDeleteError("");
        }
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
        e.preventDefault();
        void deleteItem(selectedTask._id);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedTask, deleteItem, pendingDeleteId, isDeleting]);

  const allContexts = Array.from(
    new Set([
      ...defaultContexts,
      ...items.flatMap((item) => item.contexts || []),
    ]),
  );

  const filteredItems = items.filter(
    (item) =>
      (!activeContext || item.contexts?.includes(activeContext)) &&
      (!activeProjectId || item.projectId === activeProjectId),
  );

  const saveProjectName = async () => {
    if (!renamingProjectId || !renamingProjectName.trim() || projectBusy)
      return;
    setProjectBusy(true);
    setProjectError("");
    try {
      await updateProjectMutation({
        id: renamingProjectId,
        name: renamingProjectName.trim(),
      });
      setRenamingProjectId(null);
      setRenamingProjectName("");
      notify("success", "Project renamed");
    } catch (error) {
      console.error("Rename project failed:", error);
      setProjectError("Could not rename project. Please try again.");
      notify("error", "Could not rename project.");
    } finally {
      setProjectBusy(false);
    }
  };

  const confirmProjectDelete = async () => {
    if (!pendingProjectDeleteId || projectBusy) return;
    setProjectBusy(true);
    setProjectError("");
    try {
      await deleteProjectMutation({ id: pendingProjectDeleteId });
      if (activeProjectId === pendingProjectDeleteId) setActiveProjectId(null);
      if (detailsProjectId === pendingProjectDeleteId)
        setDetailsProjectId(undefined);
      if (renamingProjectId === pendingProjectDeleteId)
        setRenamingProjectId(null);
      setPendingProjectDeleteId(null);
      notify("success", "Project deleted");
    } catch (error) {
      console.error("Delete project failed:", error);
      setProjectError("Could not delete project. Please try again.");
      notify("error", "Could not delete project.");
    } finally {
      setProjectBusy(false);
    }
  };

  const sortTasksByOrder = (a: Item, b: Item) => {
    if (a.order !== undefined && b.order !== undefined)
      return a.order - b.order;
    if (a.order !== undefined) return -1;
    if (b.order !== undefined) return 1;
    return (
      (a.createdAt ?? a._creationTime ?? 0) -
      (b.createdAt ?? b._creationTime ?? 0)
    );
  };

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  // Keep the app's notion of "today" in state so it updates at local midnight,
  // even when MoGTD stays open without any other interaction.
  const [today, setToday] = useState(() => new Date());

  useEffect(() => {
    let midnightTimeout: ReturnType<typeof setTimeout> | null = null;

    const updateTodayAndScheduleNext = () => {
      const now = new Date();
      setToday(now);

      const nextLocalMidnight = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1,
        0,
        0,
        0,
        50,
      );

      midnightTimeout = setTimeout(
        updateTodayAndScheduleNext,
        Math.max(1, nextLocalMidnight.getTime() - now.getTime()),
      );
    };

    const refreshWhenActive = () => {
      if (document.visibilityState === "visible") {
        if (midnightTimeout) clearTimeout(midnightTimeout);
        updateTodayAndScheduleNext();
      }
    };

    // Schedule the first boundary update without changing the initial date.
    const now = new Date();
    const nextLocalMidnight = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
      0,
      0,
      0,
      50,
    );

    midnightTimeout = setTimeout(
      updateTodayAndScheduleNext,
      Math.max(1, nextLocalMidnight.getTime() - now.getTime()),
    );

    window.addEventListener("focus", refreshWhenActive);
    document.addEventListener("visibilitychange", refreshWhenActive);

    return () => {
      if (midnightTimeout) clearTimeout(midnightTimeout);
      window.removeEventListener("focus", refreshWhenActive);
      document.removeEventListener("visibilitychange", refreshWhenActive);
    };
  }, []);

  const inboxItems = filteredItems
    .filter((item) => item.status === "inbox")
    .sort(sortTasksByOrder);

  const incubatorItems = filteredItems
    .filter((item) => item.status === "incubator")
    .sort(sortTasksByOrder);

  const todayItems = filteredItems
    .filter(
      (item) =>
        item.status === "scheduled" &&
        item.date &&
        isSameDay(new Date(item.date), today),
    )
    .sort(sortTasksByOrder);

  const reorderExpandedList = async (
    taskId: Id<"tasks">,
    targetTaskId: Id<"tasks">,
    listType: "inbox" | "incubator" | "today",
  ) => {
    // Reorder the full list, including tasks hidden by an active context filter.
    const listTasks = items
      .filter((item) => {
        if (listType === "inbox") return item.status === "inbox";
        if (listType === "incubator") return item.status === "incubator";
        return (
          item.status === "scheduled" &&
          Boolean(item.date) &&
          isSameDay(new Date(item.date!), today)
        );
      })
      .sort(sortTasksByOrder);

    const fromIndex = listTasks.findIndex((item) => item._id === taskId);
    const toIndex = listTasks.findIndex((item) => item._id === targetTaskId);
    if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return;

    const reordered = [...listTasks];
    const [movedTask] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, movedTask);

    if (listType === "today") {
      const dayStart = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
      ).getTime();
      const dayEnd =
        new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate() + 1,
        ).getTime() - 1;
      await runAction(
        `reorder:${listType}`,
        null,
        "Could not reorder tasks.",
        () =>
          reorderTasksInListMutation({
            taskIds: reordered.map((item) => item._id),
            listType,
            dayStart,
            dayEnd,
          }),
      );
    } else {
      await runAction(
        `reorder:${listType}`,
        null,
        "Could not reorder tasks.",
        () =>
          reorderTasksInListMutation({
            taskIds: reordered.map((item) => item._id),
            listType,
          }),
      );
    }
  };

  const todayCompleted = todayItems.filter((item) => item.completed).length;

  const todayPending = todayItems.length - todayCompleted;

  const renderCompactTask = (
    item: Item,
    type: "today" | "inbox" | "incubator",
  ) => (
    <div
      key={item._id}
      onClick={() => {
        // Clicking the inline editor must never open Task Details.
        if (compactEditingId === item._id) return;
        openTaskDetails(item);
        setHighlightedTask(item._id);
      }}
      className={`group flex items-center gap-3.5 rounded-xl border border-zinc-700/65 bg-[#282a2c]/90 px-4 py-4 shadow-[0_2px_10px_rgba(0,0,0,0.12)] transition-[background-color,border-color,box-shadow] duration-200 hover:border-zinc-500/80 hover:bg-zinc-800/90 hover:shadow-md ${
        highlightedTask === item._id ? "ring-1 ring-zinc-300/60" : ""
      } ${item.completed ? "opacity-55" : ""}`}
    >
      {compactEditingId === item._id ? (
        <div
          className="flex min-w-0 flex-1 items-center gap-2"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <input
            autoFocus
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            value={compactEditingText}
            onChange={(e) => setCompactEditingText(e.target.value)}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === "Enter") {
                e.preventDefault();
                void saveCompactEdit();
              }
              if (e.key === "Escape") {
                e.preventDefault();
                setCompactEditingId(null);
                setCompactEditingText("");
              }
            }}
            className="min-w-0 flex-1 rounded border border-zinc-600 bg-zinc-950 px-2 py-1 text-sm text-zinc-100 outline-none focus:border-zinc-300"
            aria-label="Edit task title"
          />
          <button
            type="button"
            onClick={() => void saveCompactEdit()}
            disabled={!compactEditingText.trim() || isBusy(`edit:${item._id}`)}
            className="rounded px-2 py-1 text-xs text-zinc-100 hover:bg-zinc-700 disabled:opacity-40"
            aria-label="Save task title"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => {
              setCompactEditingId(null);
              setCompactEditingText("");
            }}
            className="rounded px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-700"
            aria-label="Cancel editing task title"
          >
            Cancel
          </button>
        </div>
      ) : (
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="min-w-0 flex-1">
                <DraggableItem
                  item={item}
                  dragId={`${type}-${item._id}`}
                  disabled={Boolean(expanded) && expanded !== type}
                  completed={item.completed}
                  onComplete={() => completeItem(item._id)}
                >
                  <div className="min-w-0">
                    <div className="flex min-w-0 items-start gap-2">
                      <PriorityIndicator priority={item.priority} />
                      <div
                        className={`min-w-0 flex-1 truncate text-sm ${
                          item.completed
                            ? "line-through text-zinc-400"
                            : "text-zinc-100"
                        }`}
                      >
                        {item.title}
                      </div>
                    </div>

                    {item.contexts && item.contexts.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {item.contexts.map((context) => (
                          <span
                            key={context}
                            className="rounded-md border border-zinc-700/60 bg-zinc-800/75 px-2 py-0.5 text-[10px] font-medium text-zinc-300"
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
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setCompactEditingId(item._id);
            setCompactEditingText(item.title);
          }}
          className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
          title="Rename task"
          aria-label={`Rename ${item.title}`}
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            openTaskDetails(item);
          }}
          className="rounded p-1 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
          title="Details"
          aria-label={`Open details for ${item.title}`}
        >
          ⓘ
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

        // While a card is expanded, ONLY its own task reorder targets are valid.
        // No fallback collision detection: empty space and background cards are inert.
        if (expanded) {
          return pointerCollisions.filter((collision) =>
            collision.id.toString().startsWith(`reorder-${expanded}-`),
          );
        }

        return pointerCollisions.length > 0
          ? pointerCollisions
          : closestCorners(args);
      }}
      onDragStart={(event) => {
        const itemId = event.active.data.current?.taskId as
          | Id<"tasks">
          | undefined;
        const dragId = event.active.id.toString();

        // A drag can only begin from the list currently shown in the modal.
        if (expanded && !dragId.startsWith(`${expanded}-`)) return;

        const dragged = itemId
          ? items.find((item) => item._id === itemId)
          : undefined;

        if (dragged) {
          setActiveItem(dragged);
        }
      }}
      onDragCancel={() => {
        setActiveItem(null);
      }}
      onDragEnd={async (event) => {
        const { active, over } = event;

        setActiveItem(null);

        if (!over) return;

        const itemId = active.data.current?.taskId as Id<"tasks"> | undefined;
        const overId = over.id.toString();

        if (!itemId) return;

        const draggedItem = items.find((item) => item._id === itemId);

        if (!draggedItem) return;

        // In an expanded card, dragging is strictly for reordering that same list.
        // Dropping anywhere else must never move a task to another card or calendar date.
        if (expanded) {
          const draggedType = active.id.toString().split("-")[0];
          const targetMatch = /^reorder-(today|inbox|incubator)-(.+)$/.exec(
            overId,
          );
          if (!targetMatch) return;
          const targetType = targetMatch[1] as "today" | "inbox" | "incubator";
          const targetTaskId = targetMatch[2] as Id<"tasks">;
          if (draggedType !== expanded || targetType !== expanded) return;
          await reorderExpandedList(itemId, targetTaskId, expanded);
          return;
        }

        // =========================
        // MOVE TO INBOX
        // =========================
        if (overId === "inbox") {
          await moveItem(itemId, "inbox");
          return;
        }

        // =========================
        // MOVE TO INCUBATOR
        // =========================
        if (overId === "incubator") {
          await moveItem(itemId, "incubator");
          return;
        }

        // =========================
        // MOVE TO TODAY
        // =========================
        if (overId === "today" || overId === "today-home") {
          await moveItem(itemId, "scheduled", new Date().toISOString());
          return;
        }

        // =========================
        // MOVE ONE WEEK FORWARD
        // =========================
        if (overId === "next-week") {
          if (!draggedItem.date) return;

          const nextWeekDate = new Date(draggedItem.date);

          nextWeekDate.setDate(nextWeekDate.getDate() + 7);

          await moveItem(itemId, "scheduled", nextWeekDate.toISOString());

          return;
        }

        // =========================
        // MOVE ONE WEEK BACK
        // =========================
        if (overId === "previous-week") {
          if (!draggedItem.date) return;

          const previousWeekDate = new Date(draggedItem.date);

          previousWeekDate.setDate(previousWeekDate.getDate() - 7);

          await moveItem(itemId, "scheduled", previousWeekDate.toISOString());

          return;
        }

        // =========================
        // MOVE TO CALENDAR DATE
        // =========================
        const parsedDate = new Date(overId);

        if (!Number.isNaN(parsedDate.getTime())) {
          await moveItem(itemId, "scheduled", parsedDate.toISOString());
        }
      }}
    >
      <style>{`
        @keyframes mogtd-modal-in {
          from { opacity: 0; scale: 0.975; }
          to { opacity: 1; scale: 1; }
        }
        @keyframes mogtd-backdrop-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .mogtd-no-motion { animation: none !important; transition: none !important; }
        }
      `}</style>

      {(expanded || selectedTask) && (
        <div
          className={`fixed inset-0 ${
            selectedTask ? "z-[65]" : "z-40"
          } bg-black/70 backdrop-blur-sm motion-safe:animate-[mogtd-backdrop-in_180ms_ease-out]`}
          onClick={() => {
            setExpanded(null);
            setSelectedTask(null);
            setHighlightedTask(null);
          }}
        />
      )}

      {notice && (
        <div
          role={notice.kind === "error" ? "alert" : "status"}
          aria-live={notice.kind === "error" ? "assertive" : "polite"}
          className={`fixed bottom-5 right-5 z-[100] flex max-w-sm items-center gap-3 rounded-xl border px-4 py-3 text-sm shadow-2xl ${notice.kind === "error" ? "border-red-500/50 bg-zinc-900 text-red-200" : "border-zinc-600 bg-zinc-900 text-zinc-100"}`}
        >
          <span>{notice.message}</span>
          <button
            type="button"
            onClick={() => setNotice(null)}
            aria-label="Dismiss notification"
            className="ml-auto text-zinc-400 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}
      <div className="min-h-screen w-full bg-[#111214] text-zinc-100">
        <div className="mx-auto max-w-[1720px] px-4 py-7 sm:px-7 lg:px-9 xl:px-12">
          {/* ==================== HEADER ==================== */}
          <header className="mb-8 flex flex-wrap items-center justify-between gap-4 pb-2">
            <div>
              <div className="text-3xl font-bold tracking-[-0.055em] text-white sm:text-[34px]">
                MoGTD
              </div>

              <div className="mt-1 text-sm text-zinc-400">
                Your personal system for getting things done.
              </div>
            </div>

            <button
              onClick={() => {
                setExpanded("inbox");
                setFocusInboxInput(true);
              }}
              className="rounded-xl border border-zinc-600/70 bg-gradient-to-b from-zinc-700 to-zinc-800 px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(0,0,0,0.24)] transition hover:border-zinc-400 hover:from-zinc-600 hover:to-zinc-700"
            >
              + Capture
            </button>
          </header>

          {/* ==================== TOP ROW ==================== */}
          <div className="grid items-stretch gap-4 lg:grid-cols-[minmax(0,1.75fr)_minmax(320px,1fr)] xl:grid-cols-[minmax(0,1.9fr)_minmax(340px,1fr)]">
            {/* ==================== TODAY ==================== */}
            <TodayDropZone isDragging={Boolean(activeItem)}>
              <Card
                className={`border-zinc-500/75 bg-gradient-to-br from-[#282a2c] via-[#202123] to-[#191a1c] shadow-[0_12px_36px_rgba(0,0,0,0.3)] ring-1 ring-white/[0.045] transition-[box-shadow,border-color] duration-200 ease-out motion-reduce:transition-none ${
                  expanded === "today"
                    ? "fixed left-1/2 top-1/2 z-50 flex max-h-[85vh] w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.65)] ring-1 ring-zinc-600/80 motion-safe:animate-[mogtd-modal-in_260ms_cubic-bezier(0.16,1,0.3,1)]"
                    : "overflow-hidden"
                }`}
              >
                <CardHeader
                  tabIndex={0}
                  aria-label="Expand or collapse Today"
                  onClick={() =>
                    setExpanded(expanded === "today" ? null : "today")
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setExpanded(expanded === "today" ? null : "today");
                    }
                  }}
                  className="group cursor-pointer border-b border-zinc-700/65 px-5 pb-5 pt-5 transition-colors duration-200 hover:bg-white/[0.025] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zinc-400/60"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-2xl font-semibold tracking-tight text-zinc-50">
                          Today
                        </CardTitle>
                        <span className="text-xs text-zinc-500 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-zinc-200">
                          ↗
                        </span>
                      </div>

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

                    <div className="flex items-start gap-3 text-right">
                      {expanded === "today" && (
                        <button
                          className="text-sm text-zinc-400 hover:text-zinc-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpanded(null);
                          }}
                          aria-label="Close Today expanded view"
                        >
                          ✕
                        </button>
                      )}
                      <div>
                        <div className="text-sm font-medium text-zinc-500">
                          {todayItems.length} tasks
                        </div>

                        <div className="mt-1 text-[11px] text-zinc-400">
                          {todayCompleted} done · {todayPending} remaining
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent
                  className={`min-h-0 flex-1 overflow-y-auto p-5 sm:p-6 ${
                    expanded === "today" ? "overscroll-contain" : ""
                  }`}
                >
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
                    <div className="space-y-2.5 pr-1">
                      {todayItems.map((item) => (
                        <TaskReorderDropZone
                          key={item._id}
                          id={`reorder-today-${item._id}`}
                          enabled={expanded === "today"}
                        >
                          {renderCompactTask(item, "today")}
                        </TaskReorderDropZone>
                      ))}
                    </div>
                  )}

                  <div className="mt-5 flex items-center justify-between border-t border-zinc-700/65 pt-4">
                    <span className="text-[11px] text-zinc-400">
                      Focus on what matters today.
                    </span>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() =>
                          setExpanded(expanded === "today" ? null : "today")
                        }
                        className="text-xs font-medium text-zinc-400 hover:text-zinc-100"
                      >
                        {expanded === "today" ? "Close" : "View all →"}
                      </button>
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
                  </div>
                </CardContent>
              </Card>
            </TodayDropZone>

            {/* ==================== SIDE STACK ==================== */}
            <div className="grid gap-4">
              {/* INBOX */}
              <InboxDropZone isDragging={Boolean(activeItem)}>
                <Card
                  className={`border-zinc-700/75 bg-gradient-to-br from-[#222426] to-[#191a1c] shadow-[0_10px_30px_rgba(0,0,0,0.24)] transition-[box-shadow,border-color] duration-200 ease-out motion-reduce:transition-none ${
                    expanded === "inbox"
                      ? "fixed left-1/2 top-1/2 z-50 flex max-h-[85vh] w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.65)] ring-1 ring-zinc-600/80 motion-safe:animate-[mogtd-modal-in_260ms_cubic-bezier(0.16,1,0.3,1)]"
                      : "overflow-hidden"
                  }`}
                >
                  <CardHeader
                    tabIndex={0}
                    aria-label="Expand or collapse Inbox"
                    onClick={() =>
                      setExpanded(expanded === "inbox" ? null : "inbox")
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setExpanded(expanded === "inbox" ? null : "inbox");
                      }
                    }}
                    className="group relative cursor-pointer pb-2 transition-colors duration-200 hover:bg-zinc-900/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zinc-400/60"
                  >
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

                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-zinc-900 px-2 py-0.5 text-[10px] text-zinc-400">
                          {inboxItems.length}
                        </span>
                        <span className="text-xs text-zinc-500 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-zinc-200">
                          ↗
                        </span>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent
                    className={`min-h-0 flex-1 overflow-y-auto pt-2 ${
                      expanded === "inbox" ? "overscroll-contain" : ""
                    }`}
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

                          if (await addItem(inboxInput, "inbox"))
                            setInboxInput("");
                        }
                      }}
                    />

                    <div
                      className={`${
                        expanded === "inbox"
                          ? "mt-4"
                          : "mt-3 max-h-28 overflow-y-auto"
                      } space-y-2.5 pr-1`}
                    >
                      {inboxItems.length === 0 ? (
                        <p className="py-2 text-xs text-zinc-400">
                          Your inbox is clear.
                        </p>
                      ) : (
                        inboxItems.map((item) => (
                          <TaskReorderDropZone
                            key={item._id}
                            id={`reorder-inbox-${item._id}`}
                            enabled={expanded === "inbox"}
                          >
                            {renderCompactTask(item, "inbox")}
                          </TaskReorderDropZone>
                        ))
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
              </InboxDropZone>

              {/* INCUBATOR */}
              <IncubatorDropZone isDragging={Boolean(activeItem)}>
                <Card
                  className={`border-zinc-700/75 bg-gradient-to-br from-[#222426] to-[#191a1c] shadow-[0_10px_30px_rgba(0,0,0,0.24)] transition-[box-shadow,border-color] duration-200 ease-out motion-reduce:transition-none ${
                    expanded === "incubator"
                      ? "fixed left-1/2 top-1/2 z-50 flex max-h-[85vh] w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.65)] ring-1 ring-zinc-600/80 motion-safe:animate-[mogtd-modal-in_260ms_cubic-bezier(0.16,1,0.3,1)]"
                      : "overflow-hidden"
                  }`}
                >
                  <CardHeader
                    tabIndex={0}
                    aria-label="Expand or collapse Incubator"
                    onClick={() =>
                      setExpanded(expanded === "incubator" ? null : "incubator")
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setExpanded(
                          expanded === "incubator" ? null : "incubator",
                        );
                      }
                    }}
                    className="group relative cursor-pointer pb-2 transition-colors duration-200 hover:bg-zinc-900/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zinc-400/60"
                  >
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

                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-zinc-900 px-2 py-0.5 text-[10px] text-zinc-400">
                          {incubatorItems.length}
                        </span>
                        <span className="text-xs text-zinc-500 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-zinc-200">
                          ↗
                        </span>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent
                    className={`min-h-0 flex-1 overflow-y-auto pt-2 ${
                      expanded === "incubator" ? "overscroll-contain" : ""
                    }`}
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

                          if (await addItem(incubatorInput, "incubator"))
                            setIncubatorInput("");
                        }
                      }}
                    />

                    <div
                      className={`${
                        expanded === "incubator"
                          ? "mt-4"
                          : "mt-3 max-h-28 overflow-y-auto"
                      } space-y-2.5 pr-1`}
                    >
                      {incubatorItems.length === 0 ? (
                        <p className="py-2 text-xs text-zinc-400">
                          Nothing incubating yet.
                        </p>
                      ) : (
                        incubatorItems.map((item) => (
                          <TaskReorderDropZone
                            key={item._id}
                            id={`reorder-incubator-${item._id}`}
                            enabled={expanded === "incubator"}
                          >
                            {renderCompactTask(item, "incubator")}
                          </TaskReorderDropZone>
                        ))
                      )}
                    </div>

                    <button
                      onClick={() =>
                        setExpanded(
                          expanded === "incubator" ? null : "incubator",
                        )
                      }
                      className="mt-3 text-xs font-medium text-zinc-400 hover:text-zinc-100"
                    >
                      {expanded === "incubator" ? "Close" : "View all →"}
                    </button>
                  </CardContent>
                </Card>
              </IncubatorDropZone>
            </div>
          </div>

          {/* ==================== CALENDAR ==================== */}
          <div className="mt-6">
            <WeeklyCalendar
              items={filteredItems}
              moveItem={moveItem}
              completeItem={completeItem}
              deleteItem={deleteItem}
              addTask={async (title, status, date) => {
                const result = await runAction(
                  `calendar-create:${date ?? status}`,
                  "Task created",
                  "Could not create calendar task.",
                  async () => {
                    const id = await createTask({ title, status });
                    if (date)
                      await updateTask({ id, status: "scheduled", date });
                  },
                );
                if (!result.ok)
                  throw new Error(
                    "Calendar task creation failed; see notification",
                  );
              }}
              editingId={editingId}
              editingText={editingText}
              setEditingId={setEditingId}
              setEditingText={setEditingText}
              saveEdit={saveEdit}
              openTaskDetails={openTaskDetails}
              isDragging={Boolean(activeItem)}
              projectControls={
                <>
                  <Card className="border-zinc-700/70 bg-gradient-to-br from-[#222426] to-[#191a1c] shadow-lg">
                    <CardHeader className="px-4 pb-2 pt-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-xs font-medium text-zinc-300">
                          Projects
                        </CardTitle>

                        <span className="text-[10px] text-zinc-500">
                          {projects.length} active
                        </span>
                      </div>
                    </CardHeader>

                    <CardContent className="px-4 pb-3 pt-0">
                      <div className="flex gap-2">
                        <input
                          value={projectInput}
                          onChange={(e) => setProjectInput(e.target.value)}
                          onKeyDown={async (e) => {
                            if (e.key === "Enter" && projectInput.trim()) {
                              const result = await runAction(
                                "project-create",
                                "Project created",
                                "Could not create project.",
                                () =>
                                  createProject({ name: projectInput.trim() }),
                              );
                              if (result.ok) setProjectInput("");
                            }
                          }}
                          placeholder="Create a project..."
                          className="min-w-0 flex-1 rounded-md border border-zinc-800 bg-zinc-900/80 px-2.5 py-1.5 text-[11px] text-zinc-200 outline-none transition placeholder:text-zinc-500 focus:border-zinc-700"
                        />

                        <button
                          onClick={async () => {
                            if (!projectInput.trim()) return;

                            const result = await runAction(
                              "project-create",
                              "Project created",
                              "Could not create project.",
                              () =>
                                createProject({ name: projectInput.trim() }),
                            );
                            if (result.ok) setProjectInput("");
                          }}
                          className="rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-[11px] font-medium text-zinc-300 transition hover:border-zinc-600 hover:bg-zinc-800 hover:text-zinc-100"
                        >
                          Add
                        </button>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setActiveProjectId(null)}
                          className={`rounded-full border px-2.5 py-1 text-[11px] transition ${activeProjectId === null ? "border-zinc-200 bg-zinc-100 text-zinc-950" : "border-zinc-700 text-zinc-400 hover:text-white"}`}
                        >
                          All projects
                        </button>
                        {projects.map((project) => {
                          const count = items.filter(
                            (item) => item.projectId === project._id,
                          ).length;
                          return (
                            <div
                              key={project._id}
                              className={`flex items-center gap-1 rounded-full border px-1.5 py-0.5 ${activeProjectId === project._id ? "border-zinc-300 bg-zinc-800" : "border-zinc-800 bg-zinc-900/70"}`}
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  setActiveProjectId(
                                    activeProjectId === project._id
                                      ? null
                                      : project._id,
                                  )
                                }
                                className="px-1 text-[11px] text-zinc-200"
                                title={`Show tasks in ${project.name}`}
                              >
                                {project.name}{" "}
                                <span className="text-zinc-500">({count})</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setRenamingProjectId(project._id);
                                  setRenamingProjectName(project.name);
                                  setProjectError("");
                                }}
                                aria-label={`Rename ${project.name}`}
                                title="Rename project"
                                className="rounded p-1 text-zinc-500 hover:text-white"
                              >
                                <Pencil className="h-3 w-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setPendingProjectDeleteId(project._id);
                                  setProjectError("");
                                }}
                                aria-label={`Delete ${project.name}`}
                                title="Delete project"
                                className="rounded px-1 text-xs text-zinc-500 hover:text-red-400"
                              >
                                ✕
                              </button>
                            </div>
                          );
                        })}
                      </div>
                      {activeProjectId && (
                        <div className="mt-3 border-t border-zinc-800 pt-3">
                          <div className="mb-2 flex items-center justify-between text-xs text-zinc-400">
                            <span>
                              Tasks in{" "}
                              {projects.find(
                                (project) => project._id === activeProjectId,
                              )?.name ?? "project"}
                            </span>
                            <button
                              type="button"
                              onClick={() => setActiveProjectId(null)}
                              className="hover:text-white"
                            >
                              Clear filter
                            </button>
                          </div>
                          <div className="max-h-48 space-y-1 overflow-y-auto">
                            {items.filter(
                              (item) => item.projectId === activeProjectId,
                            ).length === 0 ? (
                              <p className="text-xs text-zinc-500">
                                No tasks assigned yet. Open a task's details to
                                assign it.
                              </p>
                            ) : (
                              items
                                .filter(
                                  (item) => item.projectId === activeProjectId,
                                )
                                .map((item) => (
                                  <button
                                    key={item._id}
                                    type="button"
                                    onClick={() => openTaskDetails(item)}
                                    className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-xs text-zinc-300 hover:bg-zinc-900"
                                  >
                                    <span
                                      className={`truncate ${item.completed ? "text-zinc-500 line-through" : ""}`}
                                    >
                                      {item.title}
                                    </span>
                                    <span className="shrink-0 text-[10px] text-zinc-500">
                                      {item.status}
                                    </span>
                                  </button>
                                ))
                            )}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </>
              }
              contextControls={
                <>
                  <Card className="border-zinc-700/70 bg-gradient-to-br from-[#222426] to-[#191a1c] shadow-lg">
                    <CardHeader className="px-4 pb-2 pt-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-xs font-medium text-zinc-300">
                          Contexts
                        </CardTitle>

                        {activeContext && (
                          <button
                            onClick={() => setActiveContext(null)}
                            className="text-[10px] text-zinc-500 transition hover:text-zinc-200"
                          >
                            Clear filter
                          </button>
                        )}
                      </div>
                    </CardHeader>

                    <CardContent className="px-4 pb-3 pt-0">
                      <div className="flex flex-wrap gap-1">
                        <button
                          onClick={() => setActiveContext(null)}
                          className={`rounded-full border px-2 py-0.5 text-[9px] transition ${
                            activeContext === null
                              ? "border-zinc-200 bg-zinc-100 text-zinc-950"
                              : "border-zinc-800 bg-zinc-900/70 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300"
                          }`}
                        >
                          All
                        </button>

                        {allContexts.map((context) => (
                          <button
                            key={context}
                            onClick={() => setActiveContext(context)}
                            className={`rounded-full border px-2 py-0.5 text-[9px] transition ${
                              activeContext === context
                                ? "border-zinc-200 bg-zinc-100 text-zinc-950"
                                : "border-zinc-800 bg-zinc-900/70 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300"
                            }`}
                          >
                            {context}
                          </button>
                        ))}
                      </div>

                      {activeContext && (
                        <p className="mt-2 text-[9px] text-zinc-500">
                          Showing tasks in {activeContext}.
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </>
              }
              reorderDayTasks={async (taskIds, dayStart, dayEnd) => {
                await runAction(
                  `calendar-reorder:${dayStart}`,
                  null,
                  "Could not reorder calendar tasks.",
                  () =>
                    reorderTasksMutation({
                      taskIds,
                      dayStart,
                      dayEnd,
                    }),
                );
              }}
            />
          </div>
        </div>
      </div>

      {selectedTask && (
        <TaskDetailsModal
          allContexts={allContexts}
          deleteItem={deleteItem}
          detailsContexts={detailsContexts}
          detailsNotes={detailsNotes}
          detailsPriority={detailsPriority}
          detailsProjectId={detailsProjectId}
          detailsRecurrenceCount={detailsRecurrenceCount}
          detailsRecurrenceDays={detailsRecurrenceDays}
          detailsRecurrenceEndDate={detailsRecurrenceEndDate}
          detailsRecurrenceInterval={detailsRecurrenceInterval}
          detailsRecurrenceType={detailsRecurrenceType}
          detailsRecurring={detailsRecurring}
          detailsTitle={detailsTitle}
          isBusy={isBusy}
          newContext={newContext}
          projects={projects}
          recurrenceWeekdays={recurrenceWeekdays}
          saveTaskDetails={saveTaskDetails}
          selectedTask={selectedTask}
          setDetailsContexts={setDetailsContexts}
          setDetailsNotes={setDetailsNotes}
          setDetailsPriority={setDetailsPriority}
          setDetailsProjectId={setDetailsProjectId}
          setDetailsRecurrenceCount={setDetailsRecurrenceCount}
          setDetailsRecurrenceDays={setDetailsRecurrenceDays}
          setDetailsRecurrenceEndDate={setDetailsRecurrenceEndDate}
          setDetailsRecurrenceInterval={setDetailsRecurrenceInterval}
          setDetailsRecurrenceType={setDetailsRecurrenceType}
          setDetailsRecurring={setDetailsRecurring}
          setDetailsTitle={setDetailsTitle}
          setNewContext={setNewContext}
          onClose={() => {
            setSelectedTask(null);
            setHighlightedTask(null);
          }}
        />
      )}

      {/* ==================== PROJECT RENAME ==================== */}
      {renamingProjectId && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Rename project"
            className="w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-950 p-6 shadow-2xl"
          >
            <h2 className="text-lg font-semibold">Rename project</h2>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void saveProjectName();
              }}
            >
              <input
                autoFocus
                value={renamingProjectName}
                onChange={(event) => setRenamingProjectName(event.target.value)}
                className="mt-4 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-zinc-400"
              />
              {projectError && (
                <p role="alert" className="mt-2 text-sm text-red-400">
                  {projectError}
                </p>
              )}
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  disabled={projectBusy}
                  onClick={() => {
                    setRenamingProjectId(null);
                    setProjectError("");
                  }}
                  className="rounded-lg border border-zinc-700 px-4 py-2 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={projectBusy || !renamingProjectName.trim()}
                  className="rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-950 disabled:opacity-50"
                >
                  Save name
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ==================== PROJECT DELETE CONFIRMATION ==================== */}
      {pendingProjectDeleteId && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm">
          <div
            role="alertdialog"
            aria-modal="true"
            aria-label="Delete project"
            className="w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-950 p-6 shadow-2xl"
          >
            <h2 className="text-lg font-semibold">Delete project?</h2>
            <p className="mt-3 text-sm leading-6 text-zinc-400">
              Delete{" "}
              <strong className="text-zinc-100">
                {projects.find(
                  (project) => project._id === pendingProjectDeleteId,
                )?.name ?? "this project"}
              </strong>
              ? Its tasks will be kept, but they will no longer belong to this
              project. This cannot be undone.
            </p>
            {projectError && (
              <p role="alert" className="mt-2 text-sm text-red-400">
                {projectError}
              </p>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                autoFocus
                disabled={projectBusy}
                onClick={() => {
                  setPendingProjectDeleteId(null);
                  setProjectError("");
                }}
                className="rounded-lg border border-zinc-700 px-4 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={projectBusy}
                onClick={() => void confirmProjectDelete()}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {projectBusy ? "Deleting..." : "Delete project"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== DELETE CONFIRMATION ==================== */}
      {pendingDeleteId && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm"
          role="presentation"
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="mogtd-delete-title"
            aria-describedby="mogtd-delete-description"
            className="w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-950 p-6 shadow-2xl"
          >
            <h2
              id="mogtd-delete-title"
              className="text-lg font-semibold text-zinc-100"
            >
              Delete task?
            </h2>
            <p
              id="mogtd-delete-description"
              className="mt-3 break-words text-sm leading-6 text-zinc-400"
            >
              Are you sure you want to permanently delete{" "}
              <span className="font-medium text-zinc-100">
                {items.find((item) => item._id === pendingDeleteId)?.title ??
                  "this task"}
              </span>
              ? This action cannot be undone.
            </p>
            {deleteError && (
              <p role="alert" className="mt-3 text-sm text-red-400">
                {deleteError}
              </p>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                autoFocus
                disabled={isDeleting}
                onClick={() => {
                  setPendingDeleteId(null);
                  setDeleteError("");
                }}
                className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-900 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => void confirmDelete()}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Delete task"}
              </button>
            </div>
          </div>
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
