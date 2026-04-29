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

export default function WeeklyCalendar({ items, moveItem }: any) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });

  const days = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));

  const isCurrentWeek = isSameDay(
    startOfWeek(new Date(), { weekStartsOn: 1 }),
    weekStart,
  );

  return (
    <Card className="p-6 mt-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
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

          return (
            <div
              ref={setNodeRef}
              key={day.toString()}
              className={`border rounded-lg p-2 flex flex-col gap-2 min-h-[120px] ${
                isOver ? "bg-muted" : ""
              }`}
            >
              {/* Day button (UNCHANGED behavior) */}
              <button
                onClick={() => setSelectedDate(day)}
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

              {/* 🔥 TASK LIST */}
              <div className="space-y-1 text-left">
                {dayItems.map((item: any) => (
                  <div
                    key={item.id}
                    className="text-xs border rounded px-2 py-1 flex justify-between items-center"
                  >
                    {/* ✅ DRAGGABLE TITLE */}
                    <DraggableItem item={item}>
                      <span className="truncate">{item.title}</span>
                    </DraggableItem>

                    {/* KEEP BUTTON (optional fallback) */}
                    <button
                      onClick={() => moveItem(item.id, "inbox")}
                      className="text-xs opacity-70 hover:opacity-100"
                    >
                      ↩
                    </button>
                  </div>
                ))}
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
