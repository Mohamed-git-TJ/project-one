import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// ✅ GET TASKS
export const getTasks = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    return await ctx.db
      .query("tasks")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
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

      // ✅ NEW
      completed: false,

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
    completed: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Not authenticated");
    }

    const task = await ctx.db.get(args.id);

    if (!task) {
      throw new Error("Task not found");
    }

    // ✅ OWNER CHECK
    if (task.userId !== identity.subject) {
      throw new Error("Unauthorized");
    }
    await ctx.db.patch(args.id, {
      status: args.status,
      date: args.date,
      completed: args.completed,
    });
  },
});

// ✅ TOGGLE COMPLETE
export const toggleComplete = mutation({
  args: {
    id: v.id("tasks"),
  },

  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Not authenticated");
    }

    const task = await ctx.db.get(args.id);

    if (!task) {
      throw new Error("Task not found");
    }

    // ✅ OWNER CHECK
    if (task.userId !== identity.subject) {
      throw new Error("Unauthorized");
    }

    await ctx.db.patch(args.id, {
      completed: !task.completed,
      completedAt: !task.completed ? Date.now() : undefined,
    });
  },
});

// ✅ DELETE TASK
export const deleteTask = mutation({
  args: { id: v.id("tasks") },

  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Not authenticated");
    }

    const task = await ctx.db.get(args.id);

    if (!task) {
      throw new Error("Task not found");
    }

    // ✅ OWNER CHECK
    if (task.userId !== identity.subject) {
      throw new Error("Unauthorized");
    }

    await ctx.db.delete(args.id);
  },
});
