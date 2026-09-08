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
  const [activeDay, setActiveDay] = useState<string | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [calendarSearch, setCalendarSearch] = useState("");
  const [searchIndex, setSearchIndex] = useState(0);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [expandedDay, setExpandedDay] = useState<string | null>(null);

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));

  const todayIso = new Date().toDateString();

  const searchMatches = calendarSearch.trim()
    ? items.filter(
        (item: any) =>
          item.status === "scheduled" &&
          item.date &&
          item.title
            .toLowerCase()
            .includes(calendarSearch.trim().toLowerCase()),
      )
    : [];

  const goToMatch = (index: number) => {
    const match = searchMatches[index];
    if (!match?.date) return;

    const matchDate = new Date(match.date);
    setCurrentDate(matchDate);
    setSelectedDate(matchDate);
    setActiveDay(matchDate.toDateString());
    setExpandedDay(null);
  };

  const { setNodeRef: setNextWeekRef, isOver: isNextWeekOver } = useDroppable({
    id: "next-week",
  });

  const { setNodeRef: setPreviousWeekRef, isOver: isPreviousWeekOver } =
    useDroppable({
      id: "previous-week",
    });

  const { setNodeRef: setTodayRef, isOver: isTodayOver } = useDroppable({
    id: "today",
  });

  return (
    <Card className="relative mt-4 border-zinc-800 bg-zinc-950/80 p-5 shadow-sm sm:p-6">
      {expandedDay && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
          onClick={() => setExpandedDay(null)}
        />
      )}

      {/* ==================== HEADER ==================== */}
      <div className="relative mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <Button
            ref={setPreviousWeekRef}
            variant="outline"
            className={`h-8 border-zinc-700 bg-zinc-900 px-2.5 text-xs text-zinc-500 shadow-none hover:bg-zinc-800 hover:text-zinc-100 ${
              isPreviousWeekOver ? "ring-2 ring-zinc-300/60" : ""
            }`}
            onClick={() => setCurrentDate(subWeeks(currentDate, 1))}
          >
            ←
          </Button>

          <Button
            ref={setTodayRef}
            variant="outline"
            className={`h-8 border-zinc-800 bg-zinc-950/80 px-3 text-xs font-medium text-zinc-500 shadow-none hover:bg-zinc-800 ${
              isTodayOver ? "ring-2 ring-zinc-300/60" : ""
            }`}
            onClick={() => {
              const today = new Date();
              setCurrentDate(today);
              setSelectedDate(today);
              setActiveDay(today.toDateString());
            }}
          >
            Today
          </Button>

          <Button
            variant="outline"
            className="h-8 border-zinc-700 bg-zinc-900 px-2.5 text-xs text-zinc-500 shadow-none hover:bg-zinc-800 hover:text-zinc-100"
            onClick={() => setShowSearch((prev) => !prev)}
            title="Search calendar"
          >
            🔍
          </Button>
        </div>

        <div className="pointer-events-none absolute left-1/2 hidden -translate-x-1/2 text-center sm:block">
          <h2 className="text-sm font-semibold text-zinc-100 sm:text-base">
            Week of {format(weekStart, "MMM d, yyyy")}
          </h2>
        </div>

        <Button
          ref={setNextWeekRef}
          variant="outline"
          className={`h-8 border-zinc-700 bg-zinc-900 px-2.5 text-xs text-zinc-500 shadow-none hover:bg-zinc-800 hover:text-zinc-100 ${
            isNextWeekOver ? "ring-2 ring-zinc-300/60" : ""
          }`}
          onClick={() => setCurrentDate(addWeeks(currentDate, 1))}
        >
          →
        </Button>
      </div>

      <div className="mb-4 text-sm font-semibold text-zinc-100 sm:hidden">
        Week of {format(weekStart, "MMM d, yyyy")}
      </div>

      {/* ==================== SEARCH ==================== */}
      {showSearch && (
        <div className="mb-5 flex flex-wrap items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/70 p-2">
          <input
            value={calendarSearch}
            onChange={(e) => {
              setCalendarSearch(e.target.value);
              setSearchIndex(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && searchMatches.length > 0) {
                goToMatch(0);
              }
            }}
            placeholder="Find scheduled task..."
            className="min-w-[180px] flex-1 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs outline-none focus:border-zinc-600"
          />

          <Button
            variant="outline"
            className="h-8 border-zinc-800 bg-zinc-950/80 px-2 text-xs"
            disabled={searchMatches.length === 0}
            onClick={() => {
              const nextIndex =
                searchIndex === 0 ? searchMatches.length - 1 : searchIndex - 1;
              setSearchIndex(nextIndex);
              goToMatch(nextIndex);
            }}
          >
            ←
          </Button>

          <Button
            variant="outline"
            className="h-8 border-zinc-800 bg-zinc-950/80 px-2 text-xs"
            disabled={searchMatches.length === 0}
            onClick={() => {
              const nextIndex =
                searchIndex === searchMatches.length - 1 ? 0 : searchIndex + 1;
              setSearchIndex(nextIndex);
              goToMatch(nextIndex);
            }}
          >
            →
          </Button>

          <div className="text-[11px] text-zinc-400">
            {calendarSearch
              ? searchMatches.length > 0
                ? `${searchIndex + 1} / ${searchMatches.length}`
                : "No matches"
              : ""}
          </div>
        </div>
      )}

      {/* ==================== DAYS ==================== */}
      <div className="grid grid-cols-7 gap-1.5 overflow-x-auto text-center sm:gap-2 lg:gap-3">
        {days.map((day) => {
          const isToday = isSameDay(day, new Date());
          const isSelected = isSameDay(day, selectedDate);
          const { setNodeRef, isOver } = useDroppable({
            id: day.toISOString(),
          });

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
                if (!expandedDay) setExpandedDay(day.toISOString());
              }}
              style={{
                pointerEvents: expandedDay && !isExpanded ? "none" : "auto",
              }}
              className={`relative min-w-0 rounded-xl border p-1.5 transition-all duration-200 sm:p-2.5 ${
                isExpanded
                  ? "fixed bottom-8 left-1/2 top-8 z-50 w-[calc(100%-2rem)] max-w-4xl -translate-x-1/2 overflow-hidden rounded-2xl border-zinc-800 bg-zinc-950/80 p-5 shadow-2xl sm:p-6"
                  : isActive
                    ? "min-h-[240px] border-zinc-700 bg-zinc-900/70 shadow-sm ring-1 ring-zinc-100 sm:min-h-[270px]"
                    : "min-h-[210px] border-zinc-800 bg-zinc-950/80 sm:min-h-[240px]"
              } ${isOver ? "bg-zinc-900/70 ring-2 ring-zinc-300/60" : ""}`}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedDate(day);
                  setActiveDay(dayId);
                }}
                className={`w-full rounded-lg border p-2 transition hover:bg-zinc-800 sm:p-2.5 ${
                  isSelected
                    ? "border-zinc-700 bg-zinc-900/70"
                    : "border-transparent"
                }`}
              >
                <div
                  className={`text-[10px] font-medium uppercase tracking-wide sm:text-xs ${
                    isToday ? "text-zinc-100" : "text-zinc-400"
                  }`}
                >
                  {format(day, "EEE")}
                </div>
                <div
                  className={`mt-0.5 text-base font-semibold sm:text-lg ${
                    isToday ? "text-zinc-100" : "text-zinc-500"
                  }`}
                >
                  {format(day, "d")}
                </div>
                <div className="mt-0.5 text-[9px] text-zinc-400 sm:text-[10px]">
                  {dayItems.length} {dayItems.length === 1 ? "task" : "tasks"}
                </div>
              </button>

              {isExpanded && (
                <button
                  className="absolute right-4 top-4 z-50 rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-400 hover:text-zinc-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpandedDay(null);
                  }}
                >
                  ✕
                </button>
              )}

              <div
                className={`mt-2 space-y-1.5 text-left ${
                  isExpanded
                    ? "max-h-[calc(100vh-180px)] overflow-y-auto pr-1"
                    : ""
                }`}
                onClick={(e) => e.stopPropagation()}
              >
                {dayItems.length === 0 && (
                  <div className="py-2 text-center text-[9px] text-zinc-400 sm:text-[10px]">
                    Nothing scheduled
                  </div>
                )}

                {visibleItems.map((item: any) => (
                  <div
                    key={item._id}
                    className={`group relative flex items-center gap-1.5 overflow-hidden rounded-md border border-zinc-800 bg-zinc-900/70 px-1.5 py-1 text-[10px] transition hover:border-zinc-600 hover:bg-zinc-950 sm:gap-2 sm:px-2 sm:py-1.5 sm:text-xs ${
                      item.completed ? "opacity-55" : ""
                    }`}
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
                        className="min-w-0 flex-1 rounded border border-zinc-700 bg-zinc-900 px-1 py-0.5 text-xs outline-none"
                      />
                    ) : (
                      <div className="relative min-w-0 flex-1">
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
                                    className={`block min-w-0 text-left leading-4 ${
                                      item.completed
                                        ? "text-zinc-400 line-through"
                                        : "text-zinc-500"
                                    }`}
                                  >
                                    <span
                                      className={`block truncate ${
                                        isExpanded
                                          ? "whitespace-normal"
                                          : "whitespace-nowrap"
                                      }`}
                                    >
                                      {item.title}
                                    </span>
                                    {item.contexts &&
                                      item.contexts.length > 0 && (
                                        <span className="mt-0.5 flex flex-wrap gap-1">
                                          {item.contexts.map(
                                            (context: string) => (
                                              <span
                                                key={context}
                                                className="rounded-full bg-zinc-950 px-1 py-0.5 text-[8px] text-zinc-400"
                                              >
                                                {context}
                                              </span>
                                            ),
                                          )}
                                        </span>
                                      )}
                                  </span>
                                </DraggableItem>
                              </div>
                            </TooltipTrigger>
                            {!isExpanded && (
                              <TooltipContent
                                side="top"
                                className="max-w-[260px] text-sm"
                              >
                                {item.title}
                              </TooltipContent>
                            )}
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    )}

                    <div className="absolute right-1 top-1 flex gap-0.5 rounded bg-zinc-950/95 px-0.5 shadow-sm opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openTaskDetails(item);
                        }}
                        className="rounded p-0.5 text-[10px] text-zinc-400 hover:text-zinc-100"
                      >
                        ⓘ
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          completeItem(item._id);
                        }}
                        className="rounded p-0.5 text-[10px] text-zinc-400 hover:text-zinc-100"
                      >
                        {item.completed ? "↺" : "✓"}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          moveItem(item._id, "inbox");
                        }}
                        className="rounded p-0.5 text-[10px] text-zinc-400 hover:text-zinc-100"
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
                    className="px-1 text-[9px] font-medium text-zinc-400 hover:text-zinc-100 sm:text-[10px]"
                  >
                    +{dayItems.length - 3} more
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-800 pt-3 text-[11px] text-zinc-400">
        <span>Selected: {format(selectedDate, "EEEE, MMMM d, yyyy")}</span>
        <span>Drag tasks between days, Inbox and Incubator.</span>
      </div>
    </Card>
  );
}
