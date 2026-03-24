import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";

export const listByProperty = query({
  args: { propertyId: v.id("properties") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("units")
      .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId))
      .collect();
  },
});

export const get = query({
  args: { id: v.id("units") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const create = mutation({
  args: {
    propertyId: v.id("properties"),
    unitNumber: v.string(),
    floor: v.optional(v.number()),
    squareMetres: v.optional(v.number()),
    bedrooms: v.optional(v.number()),
    bathrooms: v.optional(v.number()),
    status: v.union(v.literal("vacant"), v.literal("occupied"), v.literal("maintenance")),
    weeklyRent: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });
    return await ctx.db.insert("units", args);
  },
});

export const update = mutation({
  args: {
    id: v.id("units"),
    unitNumber: v.optional(v.string()),
    floor: v.optional(v.number()),
    squareMetres: v.optional(v.number()),
    bedrooms: v.optional(v.number()),
    bathrooms: v.optional(v.number()),
    status: v.optional(v.union(v.literal("vacant"), v.literal("occupied"), v.literal("maintenance"))),
    weeklyRent: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    await ctx.db.patch(id, fields);
  },
});

export const remove = mutation({
  args: { id: v.id("units") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
