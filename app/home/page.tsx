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

export default function InboxCard() {
  type Status = "inbox" | "incubator" | "scheduled";

  type Item = {
    _id: Id<"tasks">;
    title: string;
    status: Status;
    date?: string;
  };

  const items = (useQuery(api.tasks.getTasks) as Item[]) || [];
  const createTask = useMutation(api.tasks.createTask);
  const updateTask = useMutation(api.tasks.updateTask);
  const deleteTaskMutation = useMutation(api.tasks.deleteTask);

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
    await deleteTaskMutation({ id });
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

        // 📅 calendar
        const isDate = !isNaN(Date.parse(overId));

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
          className="fixed inset-0 bg-black/40 z-40 pointer-events-auto"
          onClick={() => setExpanded(null)}
        />
      )}
      {/* ✅ YOUR UI GOES HERE */}
      <div className="w-full max-w-6xl mx-auto px-6 pt-10">
        <div className="grid md:grid-cols-2 gap-6 items-stretch">
          <Card
            className={`flex flex-col transition-all ${
              expanded === "inbox"
                ? "fixed inset-10 z-50 bg-white shadow-2xl"
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
                    className="group flex justify-between items-center border rounded-xl px-3 py-2 bg-background hover:bg-muted/40 transition-all"
                  >
                    <DraggableItem item={item}>{item.title}</DraggableItem>

                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
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
            className={`flex flex-col transition-all ${
              expanded === "incubator"
                ? "fixed inset-10 z-50 bg-white shadow-2xl"
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
                    className="group flex justify-between items-center border rounded-xl px-3 py-2 bg-background hover:bg-muted/40 transition-all"
                  >
                    <DraggableItem item={item}>{item.title}</DraggableItem>

                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
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
          <WeeklyCalendar items={items} moveItem={moveItem} />
        </div>
      </div>
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
