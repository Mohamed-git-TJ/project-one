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

    return await ctx.db.insert("projects", {
      userId: identity.subject,
      name: args.name,
      description: args.description,
      createdAt: Date.now(),
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

    await ctx.db.delete(args.id);
  },
});
