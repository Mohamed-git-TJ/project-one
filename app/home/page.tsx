import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { AspectRatio } from "@/components/ui/aspect-ratio"

export default function InboxCard() {
  const [message, setMessage] = useState("");

  return (
        <div className="w-full max-w-sm items-start pt-10">
       <AspectRatio ratio={16 / 9} className="bg-muted rounded-lg">
        <Card className="rounded shadow-lg">
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
        </AspectRatio>
  </div>
  );
}
