"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

export default function DraggableItem({
  item,
  children,
}: {
  item: any;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: item._id,
      data: {
        type: "task",
        item,
      },
    });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.3 : 1,
      }}
      className={`flex items-center gap-2 w-full min-w-0 max-w-full overflow-hidden transition-all duration-150 ${
        isDragging ? "scale-95" : "scale-100"
      }`}
    >
      <button
        {...listeners}
        {...attributes}
        onClick={(e) => e.stopPropagation()}
        className="shrink-0 cursor-grab active:cursor-grabbing opacity-40 hover:opacity-100 transition text-xs"
        aria-label="Drag task"
      >
        ⋮⋮
      </button>

      <div className="flex-1 min-w-0 overflow-hidden">{children}</div>
    </div>
  );
}
