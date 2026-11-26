import { query, mutation, type MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { v } from "convex/values";

const fields = {
  title: v.string(),
  notes: v.optional(v.string()),
  date: v.string(),
  time: v.optional(v.string()),
};

function validate(args: {
  title: string;
  notes?: string;
  date: string;
  time?: string;
}) {
  const title = args.title.trim();

  if (!title || title.length > 200) {
    throw new Error("Enter a title of 1–200 characters");
  }

  const date = new Date(args.date + "T00:00:00Z");

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(args.date) ||
    !Number.isFinite(date.getTime()) ||
    date.toISOString().slice(0, 10) !== args.date
  ) {
    throw new Error("Invalid date");
  }

  if (args.time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(args.time)) {
    throw new Error("Invalid time");
  }

  if ((args.notes?.length ?? 0) > 10000) {
    throw new Error("Notes are too long");
  }

  return {
    title,
    notes: args.notes?.trim() || undefined,
    date: args.date,
    time: args.time || undefined,
  };
}

async function owned(ctx: MutationCtx, id: Id<"reminders">) {
  const identity = await ctx.auth.getUserIdentity();

  if (!identity) {
    throw new Error("Not authenticated");
  }

  const reminder = await ctx.db.get(id);

  if (!reminder || reminder.userId !== identity.subject) {
    throw new Error("Reminder not found");
  }

  return reminder;
}

// GET REMINDERS

export const getReminders = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) return [];

    return ctx.db
      .query("reminders")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();
  },
});

// CREATE REMINDER

export const createReminder = mutation({
  args: fields,
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Not authenticated");
    }

    return ctx.db.insert("reminders", {
      ...validate(args),
      userId: identity.subject,
      dismissed: false,
      createdAt: Date.now(),
    });
  },
});

// UPDATE REMINDER

export const updateReminder = mutation({
  args: {
    id: v.id("reminders"),
    ...fields,
  },
  handler: async (ctx, args) => {
    await owned(ctx, args.id);

    await ctx.db.patch(args.id, validate(args));
  },
});

// DISMISS OR RESTORE REMINDER

export const setDismissed = mutation({
  args: {
    id: v.id("reminders"),
    dismissed: v.boolean(),
  },
  handler: async (ctx, args) => {
    await owned(ctx, args.id);

    await ctx.db.patch(args.id, {
      dismissed: args.dismissed,
    });
  },
});

// DELETE REMINDER

export const deleteReminder = mutation({
  args: {
    id: v.id("reminders"),
  },
  handler: async (ctx, args) => {
    await owned(ctx, args.id);

    await ctx.db.delete(args.id);
  },
});

// MOVE REMINDER TO ANOTHER DATE

export const moveReminder = mutation({
  args: {
    id: v.id("reminders"),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    const reminder = await owned(ctx, args.id);

    validate({
      ...reminder,
      date: args.date,
    });

    await ctx.db.patch(args.id, {
      date: args.date,
    });
  },
});

// CONVERT REMINDER INTO INBOX TASK

export const convertToInboxTask = mutation({
  args: {
    id: v.id("reminders"),
  },
  handler: async (ctx, args) => {
    const reminder = await owned(ctx, args.id);

    const taskId = await ctx.db.insert("tasks", {
      userId: reminder.userId,
      title: reminder.title,
      notes: reminder.notes,
      status: "inbox",
      completed: false,
      createdAt: Date.now(),
    });

    await ctx.db.delete(args.id);

    return taskId;
  },
});
