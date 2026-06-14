"use client";

import React, { useState } from "react";
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

    // ✅ NEW
    completed?: boolean;
    completedAt?: number;
    notes?: string;
    priority?: string;
  };

  const items = (useQuery(api.tasks.getTasks) as Item[]) || [];
  const createTask = useMutation(api.tasks.createTask);
  const updateTask = useMutation(api.tasks.updateTask);
  const deleteTaskMutation = useMutation(api.tasks.deleteTask);
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

  const deleteItem = async (id: Id<"tasks">) => {
    try {
      await deleteTaskMutation({ id });
    } catch (error) {
      console.error("Delete failed:", error);
    }
  };
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
  };

  const saveTaskDetails = async () => {
    if (!selectedTask) return;
    if (!detailsTitle.trim()) return;

    await updateTaskDetails({
      id: selectedTask._id,
      title: detailsTitle,
      notes: detailsNotes,
      priority: detailsPriority,
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
  const [detailsTitle, setDetailsTitle] = useState("");
  const [detailsNotes, setDetailsNotes] = useState("");
  const [detailsPriority, setDetailsPriority] = useState("medium");

  const inboxItems = items.filter((item) => item.status === "inbox");

  const incubatorItems = items.filter((item) => item.status === "incubator");

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
              <CardTitle>INBOX</CardTitle>

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

                    <p className="text-sm font-medium">Nothing in inbox</p>

                    <p className="text-xs opacity-70 mt-1">
                      Capture something above
                    </p>
                  </div>
                )}

                {inboxItems.map((item) => (
                  <div
                    key={item._id}
                    className={`group flex justify-between items-center border border-zinc-800 bg-zinc-900/70 p-2 rounded-lg transition-all hover:bg-zinc-800/80 ${
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
                            <div>
                              <DraggableItem item={item}>
                                <div
                                  onDoubleClick={() => {
                                    setEditingId(item._id);
                                    setEditingText(item.title);
                                  }}
                                  className="w-full truncate"
                                >
                                  {item.title}
                                </div>
                              </DraggableItem>
                            </div>
                          </TooltipTrigger>

                          <TooltipContent
                            side="top"
                            className="max-w-[260px] text-sm leading-relaxed animate-in fade-in zoom-in-95"
                          >
                            {item.title}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}

                    <div className="flex gap-2 opacity-70 md:opacity-0 translate-x-0 md:translate-x-2 md:group-hover:translate-x-0 md:group-hover:opacity-100 transition-all duration-200">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openTaskDetails(item);
                        }}
                      >
                        ⓘ
                      </button>
                      <button onClick={() => completeItem(item._id)}>
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
              <CardTitle>INCUBATOR</CardTitle>

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
                  expanded === "inbox" ? "max-h-[70vh]" : "max-h-[200px]"
                }`}
              >
                {incubatorItems.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                    <div className="text-3xl mb-2">🧪</div>

                    <p className="text-sm font-medium">No incubator ideas</p>

                    <p className="text-xs opacity-70 mt-1">
                      Store long-term concepts here
                    </p>
                  </div>
                )}

                {incubatorItems.map((item) => (
                  <div
                    key={item._id}
                    className={`group flex justify-between items-center border border-zinc-800 bg-zinc-900/70 p-2 rounded-lg transition-all hover:bg-zinc-800/80 ${
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
                            <div>
                              <DraggableItem item={item}>
                                <div
                                  onDoubleClick={() => {
                                    setEditingId(item._id);
                                    setEditingText(item.title);
                                  }}
                                  className="w-full truncate"
                                >
                                  {item.title}
                                </div>
                              </DraggableItem>
                            </div>
                          </TooltipTrigger>

                          <TooltipContent
                            side="top"
                            className="max-w-[260px] text-sm leading-relaxed animate-in fade-in zoom-in-95"
                          >
                            {item.title}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}

                    <div className="flex gap-2 opacity-70 md:opacity-0 translate-x-0 md:translate-x-2 md:group-hover:translate-x-0 md:group-hover:opacity-100 transition-all duration-200">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openTaskDetails(item);
                        }}
                      >
                        ⓘ
                      </button>
                      <button onClick={() => completeItem(item._id)}>
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
        <div className="mt-10">
          <WeeklyCalendar
            items={items}
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
            <Card className="bg-background border shadow-2xl">
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
