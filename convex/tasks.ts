import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// ✅ GET TASKS
export const getTasks = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    return await ctx.db
      .query("tasks")
      .filter((q) => q.eq(q.field("userId"), identity.subject))
      .collect();
  },
});

// ✅ CREATE TASK
export const createTask = mutation({
  args: {
    title: v.string(),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    return await ctx.db.insert("tasks", {
      userId: identity.subject,
      title: args.title,
      status: args.status,
      createdAt: Date.now(),
    });
  },
});

// ✅ UPDATE TASK
export const updateTask = mutation({
  args: {
    id: v.id("tasks"),
    status: v.string(),
    date: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      status: args.status,
      date: args.date,
    });
  },
});

// ✅ DELETE TASK
export const deleteTask = mutation({
  args: { id: v.id("tasks") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
