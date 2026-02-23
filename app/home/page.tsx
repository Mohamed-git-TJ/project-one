import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import WeeklyCalendar from "@/components/WeeklyCalendar";

export default function InboxCard() {
  const [message, setMessage] = useState("");
  const [message1, setMessage1] = useState("");

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
              placeholder="Type your message here..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="min-h-[120px] resize-none"
            />
            <p className="text-sm text-muted-foreground mt-3">
              {message.length} characters
            </p>
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
              placeholder="Type your message here..."
              value={message1}
              onChange={(e) => setMessage1(e.target.value)}
              className="min-h-[120px] resize-none"
            />
            <p className="text-sm text-muted-foreground mt-3">
              {message1.length} characters
            </p>
          </CardContent>
        </Card>
      </div>
      <WeeklyCalendar />
    </div>
  );
}
