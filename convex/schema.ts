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


  // ⭐ RECURRING TASKS

  recurring: v.optional(v.boolean()),

  recurrenceType: v.optional(v.string()),
  // daily
  // weekly
  // monthly
  // yearly

  recurrenceInterval: v.optional(v.number()),
  // every 1 week
  // every 2 weeks
  // every 3 months


  recurrenceDays: v.optional(v.array(v.string())),
  // ["monday","wednesday"]

  recurrenceCount: v.optional(v.number()),
  // repeat 10 times

  recurrenceEndDate: v.optional(v.string()),


  createdAt: v.number(),
}).index("by_user", ["userId"]),
});
