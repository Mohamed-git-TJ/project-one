"use client";

import { Authenticated } from "convex/react";
import InboxCard from "./home/page";

export default function Home() {
  return (
    <Authenticated>
      <InboxCard />
    </Authenticated>
  );
}
