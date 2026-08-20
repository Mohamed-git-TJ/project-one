import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// GET PROJECTS
export const getProjects = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) return [];

    return await ctx.db
      .query("projects")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();
  },
});

// CREATE PROJECT
export const createProject = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
  },

  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Not authenticated");
    }

    const name = args.name.trim();

    if (!name) {
      throw new Error("Project name cannot be empty");
    }

    return await ctx.db.insert("projects", {
      userId: identity.subject,
      name,
      description: args.description,
      createdAt: Date.now(),
    });
  },
});

// UPDATE PROJECT
export const updateProject = mutation({
  args: {
    id: v.id("projects"),
    name: v.string(),
    description: v.optional(v.string()),
  },

  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Not authenticated");
    }

    const project = await ctx.db.get(args.id);

    if (!project) {
      throw new Error("Project not found");
    }

    if (project.userId !== identity.subject) {
      throw new Error("Unauthorized");
    }

    const name = args.name.trim();

    if (!name) {
      throw new Error("Project name cannot be empty");
    }

    await ctx.db.patch(args.id, {
      name,
      description: args.description,
    });
  },
});

// DELETE PROJECT
export const deleteProject = mutation({
  args: {
    id: v.id("projects"),
  },

  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Not authenticated");
    }

    const project = await ctx.db.get(args.id);

    if (!project) {
      throw new Error("Project not found");
    }

    if (project.userId !== identity.subject) {
      throw new Error("Unauthorized");
    }

    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();

    for (const task of tasks) {
      if (task.projectId === args.id) {
        await ctx.db.patch(task._id, {
          projectId: undefined,
        });
      }
    }

    await ctx.db.delete(args.id);
  },
});
