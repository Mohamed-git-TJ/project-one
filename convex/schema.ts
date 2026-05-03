import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  tasks: defineTable({
    userId: v.string(),
    title: v.string(),
    status: v.string(),
    date: v.optional(v.string()),
    createdAt: v.number(),
  }),
});
