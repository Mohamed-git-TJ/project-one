import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
function calculateNextOccurrence(
  currentDate: string,
  type: string,
  interval: number,
) {
  const next = new Date(currentDate);

  switch (type) {
    case "daily":
      next.setDate(next.getDate() + interval);
      break;

    case "weekly":
      next.setDate(next.getDate() + interval * 7);
      break;

    case "monthly":
      next.setMonth(next.getMonth() + interval);
      break;

    case "yearly":
      next.setFullYear(next.getFullYear() + interval);
      break;
  }

  return next.toISOString();
}
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
    projectId: v.optional(v.id("projects")),
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

    if (args.projectId) {
      const project = await ctx.db.get(args.projectId);

      if (!project) {
        throw new Error("Project not found");
      }

      if (project.userId !== identity.subject) {
        throw new Error("Unauthorized project");
      }
    }

    await ctx.db.patch(args.id, {
      status: args.status,
      date: args.date,
    });
  },
});

export const editTask = mutation({
  args: {
    id: v.id("tasks"),
    title: v.string(),
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
      title: args.title,
    });
  },
});

export const updateTaskDetails = mutation({
  args: {
    id: v.id("tasks"),
    title: v.string(),
    notes: v.optional(v.string()),
    priority: v.optional(v.string()),
    recurring: v.optional(v.boolean()),

    recurrenceType: v.optional(v.string()),

    recurrenceInterval: v.optional(v.number()),

    recurrenceCount: v.optional(v.number()),

    recurrenceDays: v.optional(v.array(v.string())),

    recurrenceEndDate: v.optional(v.string()),

    projectId: v.optional(v.id("projects")),
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

    if (task.userId !== identity.subject) {
      throw new Error("Unauthorized");
    }

    if (args.projectId) {
      const project = await ctx.db.get(args.projectId);

      if (!project) {
        throw new Error("Project not found");
      }

      if (project.userId !== identity.subject) {
        throw new Error("Unauthorized project");
      }
    }

    await ctx.db.patch(args.id, {
      title: args.title,
      notes: args.notes,
      priority: args.priority,

      recurring: args.recurring,

      recurrenceType: args.recurrenceType,

      recurrenceInterval: args.recurrenceInterval,

      recurrenceCount: args.recurrenceCount,

      recurrenceDays: args.recurrenceDays,

      recurrenceEndDate: args.recurrenceEndDate,
      projectId: args.projectId,
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

    // Make sure the user owns this task
    if (task.userId !== identity.subject) {
      throw new Error("Unauthorized");
    }

    const completing = !task.completed;

    // ------------------------------------------------
    // UNCOMPLETE TASK
    // ------------------------------------------------

    if (!completing) {
      await ctx.db.patch(args.id, {
        completed: false,
        completedAt: undefined,
      });

      return;
    }

    // ------------------------------------------------
    // NORMAL / NON-RECURRING TASK
    // ------------------------------------------------

    if (!task.recurring || !task.recurrenceType) {
      await ctx.db.patch(args.id, {
        completed: true,
        completedAt: Date.now(),
      });

      return;
    }

    // ------------------------------------------------
    // CHECK REPEAT COUNT
    // ------------------------------------------------

    // recurrenceCount = number of future occurrences remaining
    //
    // Example:
    // recurrenceCount = 3
    //
    // Complete current task
    // → create next task (2 remaining)
    // → complete next task
    // → create next task (1 remaining)
    // → complete next task
    // → create next task (0 remaining)
    // → complete final task
    // → stop

    if (task.recurrenceCount !== undefined && task.recurrenceCount <= 0) {
      await ctx.db.patch(args.id, {
        completed: true,
        completedAt: Date.now(),
      });

      return;
    }

    // ------------------------------------------------
    // CALCULATE NEXT OCCURRENCE
    // ------------------------------------------------

    const nextDate = calculateNextOccurrence(
      task.date ?? new Date().toISOString(),
      task.recurrenceType,
      task.recurrenceInterval ?? 1,
    );

    // ------------------------------------------------
    // CHECK END DATE
    // ------------------------------------------------

    if (
      task.recurrenceEndDate &&
      new Date(nextDate) > new Date(`${task.recurrenceEndDate}T23:59:59.999Z`)
    ) {
      await ctx.db.patch(args.id, {
        completed: true,
        completedAt: Date.now(),
      });

      return;
    }

    // ------------------------------------------------
    // CALCULATE REMAINING REPEATS
    // ------------------------------------------------

    const remainingRepeats =
      task.recurrenceCount !== undefined ? task.recurrenceCount - 1 : undefined;

    // ------------------------------------------------
    // CREATE NEXT OCCURRENCE
    // ------------------------------------------------

    await ctx.db.insert("tasks", {
      userId: task.userId,

      title: task.title,

      status: "scheduled",

      date: nextDate,

      completed: false,

      notes: task.notes,

      priority: task.priority,

      recurring: true,

      recurrenceType: task.recurrenceType,

      recurrenceInterval: task.recurrenceInterval,

      recurrenceCount: remainingRepeats,

      recurrenceDays: task.recurrenceDays,

      recurrenceEndDate: task.recurrenceEndDate,

      projectId: task.projectId,

      createdAt: Date.now(),
    });

    // ------------------------------------------------
    // MARK CURRENT TASK AS COMPLETED
    // ------------------------------------------------

    await ctx.db.patch(args.id, {
      completed: true,
      completedAt: Date.now(),
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
      return;
    }

    // ✅ OWNER CHECK
    if (task.userId !== identity.subject) {
      throw new Error("Unauthorized");
    }

    await ctx.db.delete(args.id);
  },
});
