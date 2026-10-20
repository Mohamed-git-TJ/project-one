"use client";

import type { ReactNode } from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

type DraggableTask = { _id: string };

export default function DraggableItem({
  item,
  children,
  completed,
  onComplete,
  dragId,
  disabled = false,
}: {
  item: DraggableTask;
  children: ReactNode;
  completed?: boolean;
  onComplete?: () => void;
  dragId?: string;
  disabled?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: dragId ?? item._id,
      disabled,
      data: { type: "task", taskId: item._id, item },
    });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.3 : 1,
      }}
      className={`flex w-full min-w-0 max-w-full items-center gap-2 overflow-hidden transition-all duration-150 ${
        isDragging ? "scale-95" : "scale-100"
      }`}
    >
      <button
        {...(disabled ? {} : listeners)}
        {...(disabled ? {} : attributes)}
        onClick={(e) => e.stopPropagation()}
        style={{ touchAction: "none" }}
        className={`shrink-0 text-xs transition ${
          disabled
            ? "cursor-not-allowed opacity-20"
            : "cursor-grab opacity-40 hover:opacity-100 active:cursor-grabbing"
        }`}
        aria-label={disabled ? "Reordering disabled" : "Drag task"}
        aria-disabled={disabled}
        type="button"
        disabled={disabled}
      >
        ⋮⋮
      </button>
      {onComplete && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onComplete();
          }}
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all ${
            completed
              ? "border-zinc-300 bg-zinc-100 text-zinc-950"
              : "border-zinc-500 bg-transparent text-transparent hover:border-zinc-200"
          }`}
          title={completed ? "Mark incomplete" : "Mark complete"}
          aria-label={completed ? "Mark incomplete" : "Mark complete"}
        >
          {completed && (
            <span className="text-[11px] font-bold leading-none">✓</span>
          )}
        </button>
      )}
      <div className="min-w-0 flex-1 overflow-hidden">{children}</div>
    </div>
  );
}
