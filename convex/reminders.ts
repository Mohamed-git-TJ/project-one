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
  if (!title || title.length > 200)
    throw new Error("Enter a title of 1–200 characters");
  const date = new Date(args.date + "T00:00:00Z");
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(args.date) ||
    !Number.isFinite(date.getTime()) ||
    date.toISOString().slice(0, 10) !== args.date
  )
    throw new Error("Invalid date");
  if (args.time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(args.time))
    throw new Error("Invalid time");
  if ((args.notes?.length ?? 0) > 10000) throw new Error("Notes are too long");
  return {
    title,
    notes: args.notes?.trim() || undefined,
    date: args.date,
    time: args.time || undefined,
  };
}
async function owned(ctx: MutationCtx, id: Id<"reminders">) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");
  const reminder = await ctx.db.get(id);
  if (!reminder || reminder.userId !== identity.subject)
    throw new Error("Reminder not found");
  return reminder;
}
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
export const createReminder = mutation({
  args: fields,
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    return ctx.db.insert("reminders", {
      ...validate(args),
      userId: identity.subject,
      dismissed: false,
      createdAt: Date.now(),
    });
  },
});
export const updateReminder = mutation({
  args: { id: v.id("reminders"), ...fields },
  handler: async (ctx, args) => {
    await owned(ctx, args.id);
    await ctx.db.patch(args.id, validate(args));
  },
});
export const setDismissed = mutation({
  args: { id: v.id("reminders"), dismissed: v.boolean() },
  handler: async (ctx, args) => {
    await owned(ctx, args.id);
    await ctx.db.patch(args.id, { dismissed: args.dismissed });
  },
});
export const deleteReminder = mutation({
  args: { id: v.id("reminders") },
  handler: async (ctx, args) => {
    await owned(ctx, args.id);
    await ctx.db.delete(args.id);
  },
});
