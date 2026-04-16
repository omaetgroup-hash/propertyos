import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { getCurrentUserOrNull, requireCurrentUser, requireOwnedProperty, requireOwnedUnit } from "./authz";

export const listByProperty = query({
  args: { propertyId: v.id("properties") },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return [];
    const property = await ctx.db.get(args.propertyId);
    if (!property || property.ownerId !== user._id) return [];

    return await ctx.db
      .query("units")
      .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId))
      .collect();
  },
});

export const get = query({
  args: { id: v.id("units") },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return null;
    const unit = await ctx.db.get(args.id);
    if (!unit) return null;
    const property = await ctx.db.get(unit.propertyId);
    if (!property || property.ownerId !== user._id) return null;
    return unit;
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
    const user = await requireCurrentUser(ctx);
    await requireOwnedProperty(ctx, args.propertyId, user._id);
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
    const user = await requireCurrentUser(ctx);
    const { id, ...fields } = args;
    await requireOwnedUnit(ctx, id, user._id);
    await ctx.db.patch(id, fields);
  },
});

export const remove = mutation({
  args: { id: v.id("units") },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    await requireOwnedUnit(ctx, args.id, user._id);
    await ctx.db.delete(args.id);
  },
});
