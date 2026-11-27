import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

const statusValidator = v.union(
  v.literal("inbox"),
  v.literal("incubator"),
  v.literal("scheduled"),
);

const priorityValidator = v.union(
  v.literal("low"),
  v.literal("medium"),
  v.literal("high"),
);

const recurrenceTypeValidator = v.union(
  v.literal("daily"),
  v.literal("weekly"),
  v.literal("monthly"),
  v.literal("yearly"),
);

function validDateKey(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + "T00:00:00Z");
  return (
    Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

function calculateNextOccurrence(
  currentDate: string,
  type: string,
  interval: number,
  recurrenceDays?: string[],
) {
  const next = new Date(currentDate);

  if (Number.isNaN(next.getTime())) {
    throw new Error("Invalid task date");
  }

  if (!Number.isSafeInteger(interval) || interval < 1) {
    throw new Error("Recurrence interval must be a positive integer");
  }

  switch (type) {
    case "daily":
      next.setUTCDate(next.getUTCDate() + interval);
      break;

    case "weekly": {
      // Use UTC consistently with ISO timestamps stored in Convex.
      // Eligible weeks begin on Monday; interval counts weeks, not individual days.
      const weekdays = [
        "sunday",
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
      ];
      const selected = new Set(
        recurrenceDays?.length ? recurrenceDays : [weekdays[next.getUTCDay()]],
      );
      const currentDay = next.getUTCDay();
      const mondayOffset = (currentDay + 6) % 7;
      const weekStart = new Date(next);
      weekStart.setUTCDate(weekStart.getUTCDate() - mondayOffset);
      let found = false;
      // Search the rest of this week, then eligible weeks at the requested interval.
      for (let week = 0; week < 5200 && !found; week += interval) {
        const start = new Date(weekStart);
        start.setUTCDate(start.getUTCDate() + week * 7);
        for (let day = 0; day < 7; day++) {
          const candidate = new Date(start);
          candidate.setUTCDate(candidate.getUTCDate() + day);
          if (
            candidate.getTime() > next.getTime() &&
            selected.has(weekdays[candidate.getUTCDay()])
          ) {
            next.setTime(candidate.getTime());
            found = true;
            break;
          }
        }
      }
      if (!found) throw new Error("Unable to calculate next weekly occurrence");
      break;
    }

    case "monthly": {
      // Clamp dates such as Jan 31 -> Feb 28/29 instead of rolling into March.
      const originalDay = next.getUTCDate();
      next.setUTCDate(1);
      next.setUTCMonth(next.getUTCMonth() + interval);
      const lastDay = new Date(
        Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0),
      ).getUTCDate();
      next.setUTCDate(Math.min(originalDay, lastDay));
      break;
    }

    case "yearly": {
      const day = next.getUTCDate();
      next.setUTCDate(1);
      next.setUTCFullYear(next.getUTCFullYear() + interval);
      const lastDay = new Date(
        Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0),
      ).getUTCDate();
      next.setUTCDate(Math.min(day, lastDay));
      break;
    }

    default:
      throw new Error("Unsupported recurrence type");
  }

  return next.toISOString();
}

// GET TASKS
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

// CREATE TASK
export const createTask = mutation({
  args: {
    title: v.string(),
    status: statusValidator,
    contexts: v.optional(v.array(v.string())),
    date: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const title = args.title.trim();

    if (!title) {
      throw new Error("Task title cannot be empty");
    }

    if (
      args.date !== undefined &&
      !Number.isFinite(new Date(args.date).getTime())
    )
      throw new Error("Invalid task date");
    return await ctx.db.insert("tasks", {
      userId: identity.subject,
      title,
      status: args.status,
      date: args.status === "scheduled" ? args.date : undefined,
      completed: false,
      contexts: args.contexts,
      createdAt: Date.now(),
    });
  },
});

// UPDATE TASK
export const updateTask = mutation({
  args: {
    id: v.id("tasks"),
    status: statusValidator,
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

    if (
      args.date !== undefined &&
      Number.isNaN(new Date(args.date).getTime())
    ) {
      throw new Error("Invalid task date");
    }

    // Inbox and Incubator tasks are intentionally unscheduled.
    const date = args.status === "scheduled" ? args.date : undefined;

    const patch = {
      status: args.status,
      date,
      order: undefined,
    };

    if (args.projectId !== undefined) {
      await ctx.db.patch(args.id, {
        ...patch,
        projectId: args.projectId,
      });
      return;
    }

    await ctx.db.patch(args.id, patch);
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

    if (task.userId !== identity.subject) {
      throw new Error("Unauthorized");
    }

    const title = args.title.trim();

    if (!title) {
      throw new Error("Task title cannot be empty");
    }

    await ctx.db.patch(args.id, {
      title,
    });
  },
});

export const updateTaskDetails = mutation({
  args: {
    id: v.id("tasks"),
    title: v.string(),
    date: v.optional(v.string()),
    notes: v.optional(v.string()),
    priority: v.optional(priorityValidator),
    contexts: v.optional(v.array(v.string())),
    recurring: v.optional(v.boolean()),
    recurrenceType: v.optional(recurrenceTypeValidator),
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

    const title = args.title.trim();

    if (!title) {
      throw new Error("Task title cannot be empty");
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

    if (
      args.recurrenceInterval !== undefined &&
      (!Number.isSafeInteger(args.recurrenceInterval) ||
        args.recurrenceInterval < 1)
    ) {
      throw new Error("Recurrence interval must be a positive integer");
    }

    if (
      args.recurrenceCount !== undefined &&
      (!Number.isSafeInteger(args.recurrenceCount) || args.recurrenceCount < 0)
    ) {
      throw new Error("Recurrence count must be a nonnegative integer");
    }

    if (
      args.recurrenceEndDate !== undefined &&
      args.recurrenceEndDate !== "" &&
      !validDateKey(args.recurrenceEndDate)
    ) {
      throw new Error("Invalid recurrence end date");
    }

    const validWeekdays = new Set([
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
      "sunday",
    ]);
    if (
      args.recurrenceDays?.some((day) => !validWeekdays.has(day)) ||
      (args.recurrenceDays &&
        new Set(args.recurrenceDays).size !== args.recurrenceDays.length)
    ) {
      throw new Error("Invalid or duplicate recurrence weekdays");
    }
    if (
      args.recurring &&
      args.recurrenceType === "weekly" &&
      args.recurrenceDays?.length === 0
    ) {
      throw new Error("Select at least one recurrence weekday");
    }

    if (args.recurring) {
      if (!args.recurrenceType) {
        throw new Error("Recurring tasks need a recurrence type");
      }

      if (args.recurrenceInterval === undefined) {
        throw new Error("Recurring tasks need a recurrence interval");
      }
    }

    if (
      args.date !== undefined &&
      (task.status !== "scheduled" ||
        !Number.isFinite(new Date(args.date).getTime()))
    )
      throw new Error("Invalid scheduled date");
    await ctx.db.patch(args.id, {
      ...(args.date !== undefined && args.date !== task.date
        ? { date: args.date, order: undefined }
        : {}),
      title,
      notes: args.notes,
      priority: args.priority,
      contexts: args.contexts,
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

// TOGGLE COMPLETE
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

    // UNCOMPLETE TASK
    if (!completing) {
      await ctx.db.patch(args.id, {
        completed: false,
        completedAt: undefined,
        ...(task.recurring && task.recurrenceGenerated === undefined
          ? { recurrenceGenerated: true }
          : {}),
      });

      return;
    }

    // NORMAL / NON-RECURRING TASK
    if (!task.recurring || !task.recurrenceType || task.recurrenceGenerated) {
      await ctx.db.patch(args.id, {
        completed: true,
        completedAt: Date.now(),
      });

      return;
    }

    // CHECK REPEAT COUNT
    if (task.recurrenceCount !== undefined && task.recurrenceCount <= 0) {
      await ctx.db.patch(args.id, {
        completed: true,
        completedAt: Date.now(),
      });

      return;
    }

    // CALCULATE NEXT OCCURRENCE
    const nextDate = calculateNextOccurrence(
      task.date ?? new Date().toISOString(),
      task.recurrenceType,
      task.recurrenceInterval ?? 1,
      task.recurrenceDays,
    );

    // CHECK END DATE
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

    // CALCULATE REMAINING REPEATS
    const remainingRepeats =
      task.recurrenceCount !== undefined ? task.recurrenceCount - 1 : undefined;

    // CREATE NEXT OCCURRENCE
    await ctx.db.insert("tasks", {
      userId: task.userId,
      title: task.title,
      status: "scheduled",
      date: nextDate,
      completed: false,
      notes: task.notes,
      priority: task.priority,
      contexts: task.contexts,
      recurring: true,
      recurrenceType: task.recurrenceType,
      recurrenceInterval: task.recurrenceInterval,
      recurrenceCount: remainingRepeats,
      recurrenceDays: task.recurrenceDays,
      recurrenceEndDate: task.recurrenceEndDate,
      projectId: task.projectId,
      createdAt: Date.now(),
    });

    // MARK CURRENT TASK AS COMPLETED
    await ctx.db.patch(args.id, {
      recurrenceGenerated: true,
      completed: true,
      completedAt: Date.now(),
    });
  },
});

export const reorderDayTasks = mutation({
  args: {
    taskIds: v.array(v.id("tasks")),
    dayStart: v.number(),
    dayEnd: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    if (new Set(args.taskIds).size !== args.taskIds.length) {
      throw new Error("Duplicate task IDs are not allowed");
    }

    const tasks = await Promise.all(args.taskIds.map((id) => ctx.db.get(id)));

    for (const task of tasks) {
      if (!task) throw new Error("Task not found");
      if (task.userId !== identity.subject) {
        throw new Error("Unauthorized");
      }

      if (task.status !== "scheduled" || !task.date) {
        throw new Error("Only scheduled tasks can be reordered");
      }

      const taskTime = new Date(task.date).getTime();

      if (taskTime < args.dayStart || taskTime > args.dayEnd) {
        throw new Error("All reordered tasks must belong to the same day");
      }
    }

    await Promise.all(
      args.taskIds.map((id, index) => ctx.db.patch(id, { order: index })),
    );
  },
});

// DELETE TASK
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

    if (task.userId !== identity.subject) {
      throw new Error("Unauthorized");
    }

    await ctx.db.delete(args.id);
  },
});

export const reorderTasksInList = mutation({
  args: {
    taskIds: v.array(v.id("tasks")),
    listType: v.union(
      v.literal("inbox"),
      v.literal("incubator"),
      v.literal("today"),
    ),
    dayStart: v.optional(v.number()),
    dayEnd: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Not authenticated");
    }

    if (new Set(args.taskIds).size !== args.taskIds.length) {
      throw new Error("Duplicate task IDs are not allowed");
    }

    if (
      args.listType === "today" &&
      (args.dayStart === undefined ||
        args.dayEnd === undefined ||
        args.dayStart > args.dayEnd)
    ) {
      throw new Error("A valid day range is required for Today");
    }

    const tasks = await Promise.all(args.taskIds.map((id) => ctx.db.get(id)));

    for (const task of tasks) {
      if (!task) {
        throw new Error("Task not found");
      }

      if (task.userId !== identity.subject) {
        throw new Error("Unauthorized");
      }

      if (args.listType === "inbox" || args.listType === "incubator") {
        if (task.status !== args.listType) {
          throw new Error("Task does not belong to this list");
        }
      } else {
        if (task.status !== "scheduled" || !task.date) {
          throw new Error("Only scheduled tasks can be reordered in Today");
        }

        const taskTime = new Date(task.date).getTime();

        if (
          Number.isNaN(taskTime) ||
          taskTime < args.dayStart! ||
          taskTime > args.dayEnd!
        ) {
          throw new Error("All tasks must belong to Today");
        }
      }
    }

    await Promise.all(
      args.taskIds.map((id, index) => ctx.db.patch(id, { order: index })),
    );
  },
});
