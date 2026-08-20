"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import WeeklyCalendar from "@/components/WeeklyCalendar";
import { useDroppable } from "@dnd-kit/core";
import DraggableItem from "@/components/DraggableItem";
import { DndContext, DragOverlay } from "@dnd-kit/core";
import { closestCenter } from "@dnd-kit/core";
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

    priority?: string;

    // ⭐ Recurring task fields
    recurring?: boolean;

    recurrenceType?: string;

    recurrenceInterval?: number;

    recurrenceCount?: number;

    recurrenceDays?: string[];

    recurrenceEndDate?: string;

    projectId?: Id<"projects">;
  };

  const items = (useQuery(api.tasks.getTasks) as Item[]) || [];
  const projects = useQuery(api.projects.getProjects) || [];
  const [selectedProjectId, setSelectedProjectId] =
    useState<Id<"projects"> | null>(null);
  const createTask = useMutation(api.tasks.createTask);
  const updateTask = useMutation(api.tasks.updateTask);
  const deleteTaskMutation = useMutation(api.tasks.deleteTask);
  const createProject = useMutation(api.projects.createProject);
  const updateProject = useMutation(api.projects.updateProject);
  const deleteProject = useMutation(api.projects.deleteProject);
  const [projectInput, setProjectInput] = useState("");
  const [editingProjectId, setEditingProjectId] =
    useState<Id<"projects"> | null>(null);

  const [editingProjectName, setEditingProjectName] = useState("");
  const toggleComplete = useMutation(api.tasks.toggleComplete);
  const editTask = useMutation(api.tasks.editTask);
  const updateTaskDetails = useMutation(api.tasks.updateTaskDetails);

  const addItem = async (title: string, status: Status) => {
    if (!title.trim()) return;

    await createTask({
      title,
      status,
    });
  };

  const moveItem = async (id: Id<"tasks">, status: Status, date?: string) => {
    await updateTask({
      id,
      status,
      date,
    });
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
    if (!editingId) return;

    if (!editingText.trim()) return;

    await editTask({
      id: editingId,
      title: editingText,
    });

    setEditingId(null);
    setEditingText("");
  };

  const openTaskDetails = (task: Item) => {
    setSelectedTask(task);
    setDetailsTitle(task.title);
    setDetailsNotes(task.notes || "");
    setDetailsPriority(task.priority || "medium");
    setDetailsProjectId(task.projectId);
    setDetailsRecurring(task.recurring || false);

    setDetailsRecurrenceType(task.recurrenceType || "weekly");

    setDetailsRecurrenceInterval(task.recurrenceInterval || 1);

    setDetailsRecurrenceCount(task.recurrenceCount);

    setDetailsRecurrenceDays(task.recurrenceDays || []);

    setDetailsRecurrenceEndDate(task.recurrenceEndDate || "");
  };

  const saveTaskDetails = async () => {
    if (!selectedTask) return;
    if (!detailsTitle.trim()) return;

    if (
      detailsRecurring &&
      detailsRecurrenceCount !== undefined &&
      detailsRecurrenceCount < 1
    ) {
      return;
    }

    await updateTaskDetails({
      id: selectedTask._id,
      title: detailsTitle,
      notes: detailsNotes,
      priority: detailsPriority,
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
  };

  const [inboxInput, setInboxInput] = useState("");
  const [incubatorInput, setIncubatorInput] = useState("");

  const { setNodeRef: setInboxRef, isOver: isInboxOver } = useDroppable({
    id: "inbox",
  });
  const { setNodeRef: setIncubatorRef, isOver: isIncubatorOver } = useDroppable(
    {
      id: "incubator",
    },
  );

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
  const [detailsPriority, setDetailsPriority] = useState("medium");
  const [detailsProjectId, setDetailsProjectId] = useState<
    Id<"projects"> | undefined
  >();
  const [detailsRecurring, setDetailsRecurring] = useState(false);

  const [detailsRecurrenceType, setDetailsRecurrenceType] = useState("weekly");

  const [detailsRecurrenceInterval, setDetailsRecurrenceInterval] = useState(1);

  const [detailsRecurrenceCount, setDetailsRecurrenceCount] = useState<
    number | undefined
  >();

  const [detailsRecurrenceDays, setDetailsRecurrenceDays] = useState<string[]>(
    [],
  );

  const [detailsRecurrenceEndDate, setDetailsRecurrenceEndDate] = useState("");
  const [focusInboxInput, setFocusInboxInput] = useState(false);
  useEffect(() => {
    if (
      selectedProjectId &&
      !projects.some((project) => project._id === selectedProjectId)
    ) {
      setSelectedProjectId(null);
    }
  }, [projects, selectedProjectId]);
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore shortcuts while typing
      const target = e.target as HTMLElement;

      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      // N = New Inbox Task
      if (e.key === "n" || e.key === "N") {
        e.preventDefault();

        setExpanded("inbox");
        setFocusInboxInput(true);
      }

      // ESC = Close windows
      if (e.key === "Escape") {
        setExpanded(null);
        setSelectedTask(null);
        setEditingId(null);
      }
      if (e.key === "Delete") {
        if (selectedTask) {
          deleteItem(selectedTask._id);

          setSelectedTask(null);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedTask]);

  const visibleItems =
    selectedProjectId === null
      ? items
      : items.filter((item) => item.projectId === selectedProjectId);

  const inboxItems = visibleItems.filter((item) => item.status === "inbox");

  const incubatorItems = visibleItems.filter(
    (item) => item.status === "incubator",
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

        if (dragged) {
          setActiveItem(dragged);
        }
      }}
      onDragEnd={(event) => {
        const { active, over } = event;

        setActiveItem(null);

        if (!over) return;

        const itemId = active.id as Id<"tasks">;
        const overId = over.id.toString();
        const draggedItem = items.find((item) => item._id === itemId);

        // 📅 calendar
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

        if (overId === "today") {
          const today = new Date();

          moveItem(itemId, "scheduled", today.toISOString());
          return;
        }

        if (isDate) {
          moveItem(itemId, "scheduled", overId);
          return;
        }

        // 📥 inbox
        if (overId === "inbox") {
          moveItem(itemId, "inbox");
          return;
        }

        // 🧪 incubator
        if (overId === "incubator") {
          moveItem(itemId, "incubator");
          return;
        }
      }}
    >
      {expanded && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 pointer-events-auto"
          onClick={() => setExpanded(null)}
        />
      )}
      {/* ✅ YOUR UI GOES HERE */}
      <div className="min-h-screen w-full max-w-7xl mx-auto px-6 pt-10 text-foreground">
        <div className="grid md:grid-cols-2 gap-6 items-stretch">
          <Card
            className={`flex flex-col border border-zinc-800 bg-zinc-950/80 shadow-2xl transition-all ${
              expanded === "inbox"
                ? "fixed inset-10 z-50 bg-zinc-950 border border-zinc-700 shadow-2xl"
                : "h-[400px]"
            }`}
            onClick={() => {
              if (!expanded) setExpanded("inbox");
            }}
          >
            <CardHeader className="relative">
              <CardTitle className="text-xl tracking-wide">INBOX</CardTitle>

              {expanded === "inbox" && (
                <button
                  className="absolute top-4 right-4 text-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpanded(null);
                  }}
                >
                  ✕
                </button>
              )}
            </CardHeader>

            <CardContent
              ref={setInboxRef} // ✅ THIS is the droppable
              className={`space-y-2 min-h-[200px] ${
                isInboxOver ? "bg-muted/40 rounded-md" : ""
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <Textarea
                autoFocus={focusInboxInput}
                className="min-h-24 resize-none"
                placeholder="Capture something..."
                value={inboxInput}
                onChange={(e) => setInboxInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    addItem(inboxInput, "inbox");
                    setInboxInput("");
                  }
                }}
              />

              <div
                className={`mt-4 space-y-2 overflow-y-auto pr-2 scrollbar-thin ${
                  expanded === "inbox" ? "max-h-[70vh]" : "max-h-[200px]"
                }`}
              >
                {inboxItems.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                    <div className="text-3xl mb-2">📥</div>

                    <p className="text-sm font-medium">Your inbox is empty</p>

                    <p className="text-xs opacity-70 mt-1 text-center">
                      Capture anything that is on your mind.
                      <br />
                      Press <span className="font-semibold">N</span> to create
                      your first task.
                    </p>
                  </div>
                )}

                {inboxItems.map((item) => (
                  <div
                    key={item._id}
                    onClick={() => {
                      setSelectedTask(item);
                      setHighlightedTask(item._id);
                    }}
                    className={`group flex min-w-0 w-full max-w-full items-center justify-between gap-3 overflow-hidden border border-zinc-800 bg-zinc-900/70 p-3 rounded-lg transition-all duration-200 hover:bg-zinc-800/80 hover:border-zinc-600 hover:shadow-lg ${
                      item.completed ? "opacity-50 line-through" : ""
                    }`}
                  >
                    {editingId === item._id ? (
                      <input
                        autoFocus
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        onBlur={saveEdit}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            saveEdit();
                          }

                          if (e.key === "Escape") {
                            setEditingId(null);
                            setEditingText("");
                          }
                        }}
                        className="flex-1 min-w-0 bg-background outline-none border rounded px-2 py-1 text-sm"
                      />
                    ) : (
                      <TooltipProvider delayDuration={200}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="min-w-0 flex-1 w-0 overflow-hidden">
                              <DraggableItem item={item}>
                                <div
                                  onDoubleClick={() => {
                                    setEditingId(item._id);
                                    setEditingText(item.title);
                                  }}
                                  className="block w-full min-w-0 truncate overflow-hidden whitespace-nowrap"
                                >
                                  {item.title}
                                </div>
                              </DraggableItem>
                            </div>
                          </TooltipTrigger>

                          <TooltipContent
                            side="top"
                            className="w-auto max-w-[320px] whitespace-normal break-words text-sm leading-relaxed animate-in fade-in zoom-in-95"
                          >
                            {item.title}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}

                    <div className="flex shrink-0 gap-2 opacity-70 md:opacity-0 translate-x-0 md:translate-x-2 md:group-hover:translate-x-0 md:group-hover:opacity-100 transition-all duration-200 [&_button]:transition-transform [&_button]:duration-150 [&_button]:hover:scale-110 [&_button]:active:scale-95">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openTaskDetails(item);
                        }}
                      >
                        ⓘ
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          completeItem(item._id);
                        }}
                      >
                        {item.completed ? "↺" : "✓"}
                      </button>
                      <button onClick={() => moveItem(item._id, "incubator")}>
                        → Incubator
                      </button>
                      <button
                        onClick={() =>
                          moveItem(
                            item._id,
                            "scheduled",
                            new Date().toISOString(),
                          )
                        }
                      >
                        → Calendar
                      </button>
                      <button onClick={() => deleteItem(item._id)}>✕</button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card
            className={`flex flex-col border border-zinc-800 bg-zinc-950/80 shadow-2xl transition-all ${
              expanded === "incubator"
                ? "fixed inset-10 z-50 bg-zinc-950 border border-zinc-700 shadow-2xl"
                : "h-[400px]"
            }`}
            onClick={() => {
              if (!expanded) setExpanded("incubator");
            }}
          >
            <CardHeader className="relative">
              <CardTitle className="text-xl tracking-wide">INCUBATOR</CardTitle>

              {expanded === "incubator" && (
                <button
                  className="absolute top-4 right-4 text-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpanded(null);
                  }}
                >
                  ✕
                </button>
              )}
            </CardHeader>

            <CardContent
              ref={setIncubatorRef} // ✅ IMPORTANT FIX
              className={`space-y-2 min-h-[200px] ${
                isIncubatorOver ? "bg-muted/40 rounded-md" : ""
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <Textarea
                className="min-h-24 resize-none"
                placeholder="Add long-term idea..."
                value={incubatorInput}
                onChange={(e) => setIncubatorInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    addItem(incubatorInput, "incubator");
                    setIncubatorInput("");
                  }
                }}
              />

              <div
                className={`mt-4 space-y-2 overflow-y-auto pr-2 scrollbar-thin ${
                  expanded === "incubator" ? "max-h-[70vh]" : "max-h-[200px]"
                }`}
              >
                {incubatorItems.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                    <div className="text-3xl mb-2">🧪</div>

                    <p className="text-sm font-medium">
                      Nothing incubating yet
                    </p>

                    <p className="text-xs opacity-70 mt-1 text-center">
                      Ideas without deadlines belong here.
                    </p>
                  </div>
                )}

                {incubatorItems.map((item) => (
                  <div
                    key={item._id}
                    onClick={() => {
                      setSelectedTask(item);
                      setHighlightedTask(item._id);
                    }}
                    className={`group flex min-w-0 w-full max-w-full items-center justify-between gap-3 overflow-hidden border border-zinc-800 bg-zinc-900/70 p-3 rounded-lg transition-all duration-200 hover:bg-zinc-800/80 hover:border-zinc-600 hover:shadow-lg ${
                      item.completed ? "opacity-50 line-through" : ""
                    }`}
                  >
                    {editingId === item._id ? (
                      <input
                        autoFocus
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        onBlur={saveEdit}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            saveEdit();
                          }

                          if (e.key === "Escape") {
                            setEditingId(null);
                            setEditingText("");
                          }
                        }}
                        className="flex-1 min-w-0 bg-background outline-none border rounded px-2 py-1 text-sm"
                      />
                    ) : (
                      <TooltipProvider delayDuration={200}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="min-w-0 flex-1 w-0 overflow-hidden">
                              <DraggableItem item={item}>
                                <div
                                  onDoubleClick={() => {
                                    setEditingId(item._id);
                                    setEditingText(item.title);
                                  }}
                                  className="block w-full min-w-0 truncate overflow-hidden whitespace-nowrap"
                                >
                                  {item.title}
                                </div>
                              </DraggableItem>
                            </div>
                          </TooltipTrigger>

                          <TooltipContent
                            side="top"
                            className="w-auto max-w-[320px] whitespace-normal break-words text-sm leading-relaxed animate-in fade-in zoom-in-95"
                          >
                            {item.title}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}

                    <div className="flex shrink-0 gap-2 opacity-70 md:opacity-0 translate-x-0 md:translate-x-2 md:group-hover:translate-x-0 md:group-hover:opacity-100 transition-all duration-200 [&_button]:transition-transform [&_button]:duration-150 [&_button]:hover:scale-110 [&_button]:active:scale-95">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openTaskDetails(item);
                        }}
                      >
                        ⓘ
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          completeItem(item._id);
                        }}
                      >
                        {item.completed ? "↺" : "✓"}
                      </button>
                      <button onClick={() => moveItem(item._id, "inbox")}>
                        → Inbox
                      </button>
                      <button
                        onClick={() =>
                          moveItem(
                            item._id,
                            "scheduled",
                            new Date().toISOString(),
                          )
                        }
                      >
                        → Calendar
                      </button>
                      <button onClick={() => deleteItem(item._id)}>✕</button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
        <Card className="mt-8 border border-zinc-800 bg-zinc-950/80 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-xl tracking-wide">PROJECTS</CardTitle>

            {selectedProjectId && (
              <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                <span>Showing:</span>

                <span className="font-medium text-foreground">
                  {
                    projects.find(
                      (project) => project._id === selectedProjectId,
                    )?.name
                  }
                </span>

                <button
                  onClick={() => setSelectedProjectId(null)}
                  className="text-xs underline hover:text-foreground"
                >
                  Clear filter
                </button>
              </div>
            )}
          </CardHeader>

          <CardContent>
            <div className="flex gap-2">
              <input
                value={projectInput}
                onChange={(e) => setProjectInput(e.target.value)}
                onKeyDown={async (e) => {
                  if (e.key === "Enter" && projectInput.trim()) {
                    await createProject({
                      name: projectInput.trim(),
                    });

                    setProjectInput("");
                  }
                }}
                placeholder="Create a project..."
                className="flex-1 rounded-md border bg-background px-3 py-2 outline-none"
              />

              <button
                onClick={async () => {
                  if (!projectInput.trim()) return;

                  await createProject({
                    name: projectInput.trim(),
                  });

                  setProjectInput("");
                }}
                className="rounded-md bg-zinc-100 px-4 py-2 text-zinc-950 hover:bg-zinc-200"
              >
                Add
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {/* ALL TASKS BUTTON */}
              <button
                onClick={() => setSelectedProjectId(null)}
                className={`rounded-lg border px-3 py-2 transition ${
                  selectedProjectId === null
                    ? "border-zinc-500 bg-zinc-100 text-zinc-950"
                    : "border-zinc-800 bg-zinc-900 hover:bg-zinc-800"
                }`}
              >
                All Tasks
              </button>

              {/* PROJECT BUTTONS */}
              {projects.map((project) => {
                const projectTaskCount = items.filter(
                  (item) => item.projectId === project._id,
                ).length;

                const isSelected = selectedProjectId === project._id;

                const isEditing = editingProjectId === project._id;

                return (
                  <div
                    key={project._id}
                    className={`flex items-center rounded-lg border transition ${
                      isSelected
                        ? "border-zinc-500 bg-zinc-100 text-zinc-950"
                        : "border-zinc-800 bg-zinc-900"
                    }`}
                  >
                    {isEditing ? (
                      <input
                        autoFocus
                        value={editingProjectName}
                        onChange={(e) => setEditingProjectName(e.target.value)}
                        onKeyDown={async (e) => {
                          if (e.key === "Enter") {
                            if (!editingProjectName.trim()) return;

                            await updateProject({
                              id: project._id,
                              name: editingProjectName.trim(),
                            });

                            setEditingProjectId(null);
                            setEditingProjectName("");
                          }

                          if (e.key === "Escape") {
                            setEditingProjectId(null);
                            setEditingProjectName("");
                          }
                        }}
                        className="w-40 rounded-md border bg-background px-2 py-1 text-sm text-foreground outline-none"
                      />
                    ) : (
                      <button
                        onClick={() => setSelectedProjectId(project._id)}
                        className="px-3 py-2 hover:opacity-80"
                      >
                        {project.name}

                        <span className="ml-2 text-xs opacity-60">
                          {projectTaskCount}
                        </span>
                      </button>
                    )}

                    {!isEditing && (
                      <>
                        <button
                          onClick={() => {
                            setEditingProjectId(project._id);
                            setEditingProjectName(project.name);
                          }}
                          className="px-2 py-2 text-xs opacity-60 hover:opacity-100"
                          title="Rename project"
                        >
                          ✎
                        </button>

                        <button
                          onClick={async () => {
                            const confirmed = window.confirm(
                              `Delete "${project.name}"?\n\nYour tasks will not be deleted. They will simply become unassigned.`,
                            );

                            if (!confirmed) return;

                            await deleteProject({
                              id: project._id,
                            });

                            if (selectedProjectId === project._id) {
                              setSelectedProjectId(null);
                            }
                          }}
                          className="px-2 py-2 text-red-500 hover:text-red-400"
                          title="Delete project"
                        >
                          ✕
                        </button>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
        <div className="mt-8">
          <WeeklyCalendar
            items={visibleItems}
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
      {selectedTask && (
        <>
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
            onClick={() => setSelectedTask(null)}
          />

          <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-xl -translate-x-1/2 -translate-y-1/2 px-4">
            <Card className="bg-background border shadow-2xl animate-in fade-in zoom-in-95 duration-150">
              <CardHeader className="relative">
                <CardTitle>Task Details</CardTitle>

                <button
                  className="absolute right-4 top-4 text-sm"
                  onClick={() => setSelectedTask(null)}
                >
                  ✕
                </button>
              </CardHeader>

              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm text-muted-foreground">Title</label>
                  <input
                    value={detailsTitle}
                    onChange={(e) => setDetailsTitle(e.target.value)}
                    className="mt-1 w-full rounded-md border bg-background px-3 py-2 outline-none"
                  />
                </div>

                <div>
                  <label className="text-sm text-muted-foreground">Notes</label>
                  <Textarea
                    value={detailsNotes}
                    onChange={(e) => setDetailsNotes(e.target.value)}
                    placeholder="Add notes..."
                    className="mt-1 min-h-[140px]"
                    onKeyDown={(e) => {
                      if (e.ctrlKey && e.key === "Enter") {
                        saveTaskDetails();
                      }
                    }}
                  />
                </div>

                <div>
                  <label className="text-sm text-muted-foreground">
                    Priority
                  </label>
                  <select
                    value={detailsPriority}
                    onChange={(e) => setDetailsPriority(e.target.value)}
                    className="mt-1 w-full rounded-md border bg-background px-3 py-2"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">
                    Project
                  </label>

                  <select
                    value={detailsProjectId ?? ""}
                    onChange={(e) => {
                      setDetailsProjectId(
                        e.target.value
                          ? (e.target.value as Id<"projects">)
                          : undefined,
                      );
                    }}
                    className="mt-1 w-full rounded-md border bg-background px-3 py-2"
                  >
                    <option value="">No project</option>

                    {projects.map((project) => (
                      <option key={project._id} value={project._id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-3">
                  <label className="text-sm text-muted-foreground">
                    Repeat
                  </label>

                  <select
                    value={detailsRecurring ? detailsRecurrenceType : "none"}
                    onChange={(e) => {
                      if (e.target.value === "none") {
                        setDetailsRecurring(false);
                      } else {
                        setDetailsRecurring(true);
                        setDetailsRecurrenceType(e.target.value);
                      }
                    }}
                    className="
w-full rounded-md border px-3 py-2
"
                  >
                    <option value="none">Does not repeat</option>

                    <option value="daily">Daily</option>

                    <option value="weekly">Weekly</option>

                    <option value="monthly">Monthly</option>
                  </select>

                  {detailsRecurring && (
                    <>
                      {/* EVERY */}
                      <div>
                        <label className="text-sm text-muted-foreground">
                          Every
                        </label>

                        <input
                          type="number"
                          min="1"
                          value={detailsRecurrenceInterval}
                          onChange={(e) =>
                            setDetailsRecurrenceInterval(
                              Math.max(1, Number(e.target.value)),
                            )
                          }
                          className="w-full rounded-md border px-3 py-2"
                        />

                        <span className="text-xs text-muted-foreground">
                          Example: every 2 weeks
                        </span>
                      </div>

                      {/* NUMBER OF REPEATS */}
                      <div>
                        <label className="text-sm text-muted-foreground">
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
                          className="w-full rounded-md border px-3 py-2"
                        />
                      </div>

                      {/* END DATE */}
                      <div>
                        <label className="text-sm text-muted-foreground">
                          End date (optional)
                        </label>

                        <input
                          type="date"
                          value={detailsRecurrenceEndDate}
                          onChange={(e) =>
                            setDetailsRecurrenceEndDate(e.target.value)
                          }
                          className="w-full rounded-md border px-3 py-2"
                        />
                      </div>
                    </>
                  )}
                </div>

                <div className="text-sm text-muted-foreground">
                  Status:{" "}
                  <span className="capitalize">{selectedTask.status}</span>
                </div>

                <div className="flex justify-between pt-4">
                  <button
                    onClick={async () => {
                      const taskId = selectedTask._id;
                      setSelectedTask(null);
                      await deleteItem(taskId);
                    }}
                    className="text-sm text-red-500"
                  >
                    Delete
                  </button>

                  <button
                    onClick={saveTaskDetails}
                    className="rounded-md bg-zinc-100 px-4 py-2 text-zinc-950 hover:bg-zinc-200"
                  >
                    Save
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
      <DragOverlay>
        {activeItem ? (
          <div className="bg-background border rounded-xl shadow-2xl px-4 py-3 cursor-grabbing min-w-[220px] opacity-95">
            <div className="text-sm font-medium">{activeItem.title}</div>

            <div className="text-xs text-muted-foreground mt-1 capitalize">
              {activeItem.status}
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
