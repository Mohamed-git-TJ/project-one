import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import WeeklyCalendar from "@/components/WeeklyCalendar";

export default function InboxCard() {
  type Status = "inbox" | "incubator" | "scheduled";

  type Item = {
    id: string;
    title: string;
    status: Status;
    date?: string; // for calendar
  };

  const [items, setItems] = useState<Item[]>([]);
  const [inboxInput, setInboxInput] = useState("");
  const [incubatorInput, setIncubatorInput] = useState("");

  const addItem = (title: string, status: Status) => {
    if (!title.trim()) return;

    const newItem: Item = {
      id: Date.now().toString(),
      title,
      status,
    };

    setItems((prev) => [...prev, newItem]);
  };

  const moveItem = (id: string, status: Status, date?: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, status, date: status === "scheduled" ? date : undefined }
          : item,
      ),
    );
  };

  const deleteItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-6 pt-10">
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="rounded shadow-lg flex-1 h-65">
          <CardHeader>
            <CardTitle className="text-xl font-semibold tracking-tight">
              INBOX
            </CardTitle>
          </CardHeader>
          <CardContent>
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
            <div className="mt-4 space-y-2">
              {items
                .filter((item) => item.status === "inbox")
                .map((item) => (
                  <div
                    key={item.id}
                    className="flex justify-between items-center border p-2 rounded"
                  >
                    <span>{item.title}</span>

                    <div className="flex gap-2">
                      <button onClick={() => moveItem(item.id, "incubator")}>
                        → Incubator
                      </button>

                      <button
                        onClick={() =>
                          moveItem(
                            item.id,
                            "scheduled",
                            new Date().toISOString(),
                          )
                        }
                      >
                        → Calendar
                      </button>

                      <button onClick={() => deleteItem(item.id)}>✕</button>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded shadow-lg flex-1 h-65">
          <CardHeader>
            <CardTitle className="text-xl font-semibold tracking-tight">
              INCUBATOR
            </CardTitle>
          </CardHeader>
          <CardContent>
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
            <div className="mt-4 space-y-2">
              {items
                .filter((item) => item.status === "incubator")
                .map((item) => (
                  <div
                    key={item.id}
                    className="flex justify-between border p-2 rounded"
                  >
                    <span>{item.title}</span>

                    <div className="flex gap-2">
                      <button onClick={() => moveItem(item.id, "inbox")}>
                        → Inbox
                      </button>

                      <button
                        onClick={() =>
                          moveItem(
                            item.id,
                            "scheduled",
                            new Date().toISOString(),
                          )
                        }
                      >
                        → Calendar
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>
      <WeeklyCalendar items={items} moveItem={moveItem} />
    </div>
  );
}
