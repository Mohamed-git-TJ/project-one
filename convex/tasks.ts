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

recurrenceType:
v.optional(v.string()),

recurrenceInterval:
v.optional(v.number()),

recurrenceCount:
v.optional(v.number()),

recurrenceCreated: v.optional(v.number()),

recurrenceDays:
v.optional(v.array(v.string())),

recurrenceEndDate:
v.optional(v.string()),
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

    await ctx.db.patch(args.id,{
 title: args.title,
 notes: args.notes,
 priority: args.priority,


 recurring: args.recurring,

 recurrenceType:
 args.recurrenceType,

 recurrenceInterval:
 args.recurrenceInterval,

 recurrenceCount:
 args.recurrenceCount,

 recurrenceDays:
 args.recurrenceDays,

 recurrenceEndDate:
 args.recurrenceEndDate,

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


    if (task.userId !== identity.subject) {
      throw new Error("Unauthorized");
    }


    const completing = !task.completed;


    await ctx.db.patch(args.id,{
      completed: completing,
      completedAt: completing
        ? Date.now()
        : undefined,
    });



    // ==========================
    // CREATE NEXT RECURRING TASK
    // ==========================

    if (
      completing &&
      task.recurring &&
      task.recurrenceType
    ) {


      const nextDate = calculateNextOccurrence(
        task.date ?? new Date().toISOString(),
        task.recurrenceType,
        task.recurrenceInterval ?? 1
      );


      await ctx.db.insert("tasks",{

        userId: task.userId,

        title: task.title,

        status: "scheduled",

        date: nextDate,

        completed:false,

        notes:task.notes,

        priority:task.priority,


        recurring:true,

        recurrenceType:
          task.recurrenceType,

        recurrenceInterval:
          task.recurrenceInterval,


        recurrenceCount:
          task.recurrenceCount,


        recurrenceDays:
          task.recurrenceDays,


        recurrenceEndDate:
          task.recurrenceEndDate,


        createdAt:Date.now(),
      });

    }

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
