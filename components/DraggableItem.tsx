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
        item,
      },
    });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.15 : 1,
      }}
      className="flex items-center gap-2 w-full"
    >
      {/* DRAG HANDLE */}
      <button
        {...listeners}
        {...attributes}
        className="cursor-grab active:cursor-grabbing opacity-40 hover:opacity-100 transition text-xs"
      >
        ⋮⋮
      </button>

      {/* CONTENT */}
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
