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
      disabled: item.completed,
      data: {
        item, // ✅ THIS MUST EXIST
      },
    });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.15 : 1,
        touchAction: "none",
      }}
      className={`w-full ${
        item.completed ? "cursor-default" : "cursor-grab active:cursor-grabbing"
      }`}
    >
      {children}
    </div>
  );
}
