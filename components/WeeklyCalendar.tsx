"use client";

import { useState } from "react";
import {
  addWeeks,
  subWeeks,
  startOfWeek,
  addDays,
  format,
  isSameDay,
} from "date-fns";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useDroppable } from "@dnd-kit/core";
import DraggableItem from "@/components/DraggableItem";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function WeeklyCalendar({
  items,
  moveItem,
  completeItem,
  editingId,
  editingText,
  setEditingId,
  setEditingText,
  saveEdit,
  openTaskDetails,
}: any) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });

  const days = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));

  const isCurrentWeek = isSameDay(
    startOfWeek(new Date(), { weekStartsOn: 1 }),
    weekStart,
  );
  const [expandedDay, setExpandedDay] = useState<string | null>(null);

  const todayIso = new Date().toDateString();

  const [activeDay, setActiveDay] = useState<string | null>(null);

  return (
    <Card className="p-6 mt-8 relative border border-zinc-800 bg-zinc-950/80 shadow-2xl">
      {expandedDay && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 pointer-events-auto"
          onClick={() => setExpandedDay(null)}
        />
      )}
      {/* Header */}
      <div className="relative flex items-center justify-between mb-6">
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="bg-zinc-900 border-zinc-700 text-zinc-100 hover:bg-zinc-800"
            onClick={() => setCurrentDate(subWeeks(currentDate, 1))}
          >
            Previous
          </Button>

          {/* ✅ NEW TODAY BUTTON */}
          <Button
            variant="outline"
            className="bg-zinc-100 text-zinc-950 border-zinc-300 hover:bg-zinc-200"
            onClick={() => {
              const today = new Date();
              setCurrentDate(today);
              setSelectedDate(today);
            }}
          >
            Today
          </Button>
        </div>

        <h2 className="absolute left-1/2 -translate-x-1/2 text-lg font-semibold">
          Week of {format(weekStart, "MMM d, yyyy")}
        </h2>
        <Button
          variant="outline"
          className="bg-zinc-900 border-zinc-700 text-zinc-100 hover:bg-zinc-800"
          onClick={() => setCurrentDate(addWeeks(currentDate, 1))}
        >
          Next
        </Button>
      </div>

      {/* Days */}
      <div className="grid grid-cols-7 gap-3 text-center items-start">
        {days.map((day) => {
          const isToday = isSameDay(day, new Date());
          const isSelected = isSameDay(day, selectedDate);
          const { setNodeRef, isOver } = useDroppable({
            id: day.toISOString(),
          });

          // 🔥 Get items for this specific day
          const dayItems = items.filter(
            (item: any) =>
              item.status === "scheduled" &&
              item.date &&
              isSameDay(new Date(item.date), day),
          );
          const dayId = day.toDateString();

          const isExpanded = expandedDay === day.toISOString();

          const isActive =
            activeDay === dayId ||
            (!activeDay && day.toDateString() === todayIso);
          const visibleItems = isExpanded ? dayItems : dayItems.slice(0, 3);
          return (
            <div
              ref={setNodeRef}
              key={day.toString()}
              onClick={(e) => {
                e.stopPropagation();

                setActiveDay(dayId);
              }}
              onDoubleClick={(e) => {
                e.stopPropagation();

                if (!expandedDay) {
                  setExpandedDay(day.toISOString());
                }
              }}
              style={{
                pointerEvents: expandedDay && !isExpanded ? "none" : "auto",
              }}
              className={`border border-zinc-800 rounded-xl p-3 flex flex-col gap-2 transition-all transition-all duration-200 ease-out relative ${
                isExpanded
                  ? "fixed top-10 bottom-10 left-1/2 -translate-x-1/2 w-full max-w-3xl rounded-2xl border z-50 bg-background shadow-2xl"
                  : isActive
                    ? "min-h-[280px] bg-zinc-900 border-zinc-300/30 shadow-lg ring-1 ring-white/10"
                    : "min-h-[220px] bg-zinc-950/70"
              } ${isOver ? "bg-muted" : ""}`}
            >
              {/* Day button (UNCHANGED behavior) */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedDate(day);
                }}
                className={`
            p-3 rounded-lg transition
            hover:bg-muted transition-all
            ${
              isSelected
                ? "bg-zinc-100/10 text-zinc-100 border-zinc-300/30"
                : "border border-zinc-800"
            }
            ${
              isActive
                ? "border-zinc-300/30 bg-zinc-100/5"
                : isToday && !isSelected
                  ? "border-zinc-300/30"
                  : ""
            }
          `}
              >
                <div className="text-sm font-medium">{format(day, "EEE")}</div>
                <div className="text-lg">{format(day, "d")}</div>

                <div className="text-[11px] italic text-muted-foreground mt-1">
                  {dayItems.length} {dayItems.length === 1 ? "task" : "tasks"}
                </div>
              </button>
              {isExpanded && (
                <button
                  className="absolute top-2 right-2 text-sm z-50"
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpandedDay(null);
                  }}
                >
                  ✕
                </button>
              )}
              {/* 🔥 TASK LIST */}
              <div
                className={`space-y-1.5 text-left ${
                  isExpanded ? "max-h-[70vh] overflow-y-auto pr-1" : ""
                }`}
                onClick={(e) => e.stopPropagation()}
              >
                {dayItems.length === 0 && (
                  <div className="text-[10px] text-muted-foreground text-center py-2">
                    Nothing scheduled
                  </div>
                )}

                {visibleItems.map((item: any) => (
                  <div
                    key={item._id}
                    className={`group relative flex items-center gap-2 text-xs border border-border/50 border-l-2 border-l-zinc-300/20 rounded-md px-2 py-1 transition-all hover:bg-muted/40 hover:border-zinc-300/30 cursor-pointer overflow-hidden ${
                      item.completed
                        ? "bg-zinc-800/60 text-zinc-400"
                        : "bg-zinc-900/80 text-zinc-100"
                    }`}
                  >
                    {/* ✅ DRAGGABLE TITLE */}
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
                        className="flex-1 min-w-0 bg-background outline-none border rounded px-1 py-0.5 text-xs"
                      />
                    ) : (
                      <div className="flex-1 min-w-0 relative">
                        <TooltipProvider delayDuration={200}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div>
                                <DraggableItem item={item}>
                                  <span
                                    onDoubleClick={() => {
                                      setEditingId(item._id);
                                      setEditingText(item.title);
                                    }}
                                    className={`block text-left leading-5 ${
                                      isExpanded
                                        ? "whitespace-pre-wrap break-words"
                                        : "truncate whitespace-nowrap pr-6"
                                    } ${
                                      item.completed
                                        ? "line-through text-muted-foreground"
                                        : ""
                                    }`}
                                  >
                                    {item.title}
                                  </span>
                                </DraggableItem>
                              </div>
                            </TooltipTrigger>

                            {!isExpanded && (
                              <TooltipContent
                                side="top"
                                className="max-w-[260px] text-sm leading-relaxed animate-in fade-in zoom-in-95"
                              >
                                {item.title}
                              </TooltipContent>
                            )}
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    )}

                    <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-background/90 rounded-md px-1 py-0.5 shadow-sm">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openTaskDetails(item);
                        }}
                        className="text-xs"
                      >
                        ⓘ
                      </button>
                      {/* ✅ COMPLETE BUTTON */}
                      <button
                        onClick={() => completeItem(item._id)}
                        className="text-xs"
                      >
                        {item.completed ? "↺" : "✓"}
                      </button>

                      {/* ✅ MOVE BACK */}
                      <button
                        onClick={() => moveItem(item._id, "inbox")}
                        className="text-xs opacity-70 hover:opacity-100"
                      >
                        ↩
                      </button>
                    </div>
                  </div>
                ))}
                {!isExpanded && dayItems.length > 2 && (
                  <div className="absolute bottom-3 left-3 right-3 h-10 bg-gradient-to-t from-background to-transparent pointer-events-none rounded-b-xl" />
                )}
                {!isExpanded && dayItems.length > 3 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedDay(day.toISOString());
                    }}
                    className="text-[11px] text-muted-foreground hover:text-foreground text-left px-1"
                  >
                    +{dayItems.length - 3} more
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Optional: Selected Date Display */}
      <div className="mt-6 text-sm text-muted-foreground">
        Selected: {format(selectedDate, "EEEE, MMMM d, yyyy")}
      </div>
    </Card>
  );
}
