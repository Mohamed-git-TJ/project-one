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

export default function WeeklyCalendar({
  items,
  moveItem,
  completeItem,
  editingId,
  editingText,
  setEditingId,
  setEditingText,
  saveEdit,
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

  return (
    <Card className="p-6 mt-8 relative">
      {expandedDay && (
        <div
          className="fixed inset-0 bg-black/40 z-40 pointer-events-auto"
          onClick={() => setExpandedDay(null)}
        />
      )}
      {/* Header */}
      <div className="relative flex items-center justify-between mb-6">
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setCurrentDate(subWeeks(currentDate, 1))}
          >
            Previous
          </Button>

          {/* ✅ NEW TODAY BUTTON */}
          <Button
            variant={isCurrentWeek ? "secondary" : "default"}
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
          onClick={() => setCurrentDate(addWeeks(currentDate, 1))}
        >
          Next
        </Button>
      </div>

      {/* Days */}
      <div className="grid grid-cols-7 gap-4 text-center">
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
          const isExpanded = expandedDay === day.toISOString();
          const visibleItems = isExpanded ? dayItems : dayItems.slice(0, 3);
          return (
            <div
              ref={setNodeRef}
              key={day.toString()}
              onClick={(e) => {
                e.stopPropagation();
                if (!expandedDay) {
                  setExpandedDay(day.toISOString());
                }
              }}
              style={{
                pointerEvents: expandedDay && !isExpanded ? "none" : "auto",
              }}
              className={`border rounded-lg p-2 flex flex-col gap-2 transition-all relative ${
                isExpanded
                  ? "fixed top-10 bottom-10 left-1/2 -translate-x-1/2 w-full max-w-2xl z-50 bg-background shadow-2xl"
                  : "min-h-[170px]"
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
            hover:bg-muted
            ${
              isSelected
                ? "bg-primary text-primary-foreground border-primary"
                : "border"
            }
            ${isToday && !isSelected ? "border-primary" : ""}
          `}
              >
                <div className="text-sm font-medium">{format(day, "EEE")}</div>
                <div className="text-lg">{format(day, "d")}</div>
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
                className={`space-y-2 text-left ${
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
                    className={`group flex items-start justify-between gap-2 text-xs border rounded-lg px-2 py-2 transition-all hover:bg-muted/50 overflow-hidden ${
                      item.completed
                        ? "opacity-50 bg-muted"
                        : "bg-background/80 backdrop-blur"
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
                        <DraggableItem item={item}>
                          <span
                            onDoubleClick={() => {
                              setEditingId(item._id);
                              setEditingText(item.title);
                            }}
                            className={`block text-left leading-snug ${
                              isExpanded
                                ? "whitespace-pre-wrap break-words"
                                : "h-[2.5rem] overflow-hidden break-words pr-4"
                            } ${
                              item.completed
                                ? "line-through text-muted-foreground"
                                : ""
                            }`}
                          >
                            {item.title}
                            {!isExpanded && item.title.length > 45 && (
                              <span className="absolute bottom-0 right-0 bg-background pl-1">
                                ...
                              </span>
                            )}
                          </span>
                        </DraggableItem>
                      </div>
                    )}

                    <div className="flex flex-col gap-1 shrink-0 opacity-70 md:opacity-0 translate-x-0 md:translate-x-2 md:group-hover:translate-x-0 md:group-hover:opacity-100 transition-all duration-200">
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
