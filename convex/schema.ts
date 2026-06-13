import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  tasks: defineTable({
    userId: v.string(),
    title: v.string(),
    status: v.string(),
    date: v.optional(v.string()),
    completed: v.optional(v.boolean()),
    completedAt: v.optional(v.number()),
    notes: v.optional(v.string()),
    priority: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),
});
