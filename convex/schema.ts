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
    contexts: v.optional(v.array(v.string())),

    // ⭐ RECURRING TASKS
    recurring: v.optional(v.boolean()),
    recurrenceType: v.optional(v.string()),
    recurrenceInterval: v.optional(v.number()),
    recurrenceDays: v.optional(v.array(v.string())),
    recurrenceCount: v.optional(v.number()),
    recurrenceEndDate: v.optional(v.string()),

    projectId: v.optional(v.id("projects")),

    createdAt: v.number(),
  }).index("by_user", ["userId"]),

  projects: defineTable({
    userId: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),
});
