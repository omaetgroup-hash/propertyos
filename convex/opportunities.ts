import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUserOrNull, requireAdminUser, requireOwnedOpportunity } from "./authz";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user || user.role !== "admin") return [];
    return await ctx.db
      .query("opportunities")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .order("desc")
      .collect();
  },
});

export const get = query({
  args: { id: v.id("opportunities") },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user || user.role !== "admin") return null;
    const opportunity = await ctx.db.get(args.id);
    if (!opportunity || opportunity.ownerId !== user._id) return null;
    return opportunity;
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    location: v.string(),
    notes: v.optional(v.string()),
    numberOfRooms: v.number(),
    bedsPerRoom: v.number(),
    pricingType: v.union(v.literal("nightly"), v.literal("weekly")),
    pricePerUnit: v.number(),
    occupancyRate: v.number(),
    leaseCost: v.number(),
    power: v.number(),
    water: v.number(),
    internet: v.number(),
    cleaning: v.number(),
    maintenance: v.number(),
    otherExpenses: v.number(),
    status: v.union(
      v.literal("evaluating"),
      v.literal("approved"),
      v.literal("rejected"),
      v.literal("converted")
    ),
  },
  handler: async (ctx, args) => {
    const user = await requireAdminUser(ctx);
    return await ctx.db.insert("opportunities", { ...args, ownerId: user._id });
  },
});

export const update = mutation({
  args: {
    id: v.id("opportunities"),
    name: v.optional(v.string()),
    location: v.optional(v.string()),
    notes: v.optional(v.string()),
    numberOfRooms: v.optional(v.number()),
    bedsPerRoom: v.optional(v.number()),
    pricingType: v.optional(v.union(v.literal("nightly"), v.literal("weekly"))),
    pricePerUnit: v.optional(v.number()),
    occupancyRate: v.optional(v.number()),
    leaseCost: v.optional(v.number()),
    power: v.optional(v.number()),
    water: v.optional(v.number()),
    internet: v.optional(v.number()),
    cleaning: v.optional(v.number()),
    maintenance: v.optional(v.number()),
    otherExpenses: v.optional(v.number()),
    status: v.optional(
      v.union(
        v.literal("evaluating"),
        v.literal("approved"),
        v.literal("rejected"),
        v.literal("converted")
      )
    ),
    convertedPropertyId: v.optional(v.id("properties")),
  },
  handler: async (ctx, args) => {
    const user = await requireAdminUser(ctx);
    const { id, ...fields } = args;
    await requireOwnedOpportunity(ctx, id, user._id);
    await ctx.db.patch(id, fields);
  },
});

export const remove = mutation({
  args: { id: v.id("opportunities") },
  handler: async (ctx, args) => {
    const user = await requireAdminUser(ctx);
    await requireOwnedOpportunity(ctx, args.id, user._id);
    await ctx.db.delete(args.id);
  },
});

export const convertToProperty = mutation({
  args: {
    id: v.id("opportunities"),
    country: v.union(v.literal("nz"), v.literal("au")),
    address: v.string(),
    city: v.string(),
    region: v.string(),
    postCode: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireAdminUser(ctx);
    const opportunity = await requireOwnedOpportunity(ctx, args.id, user._id);

    const propertyId = await ctx.db.insert("properties", {
      name: opportunity.name,
      type: "residential",
      country: args.country,
      address: args.address,
      city: args.city,
      region: args.region,
      postCode: args.postCode,
      totalUnits: opportunity.numberOfRooms,
      status: "active",
      description: opportunity.notes,
      ownerId: user._id,
    });

    await ctx.db.patch(args.id, {
      status: "converted",
      convertedPropertyId: propertyId,
    });

    return propertyId;
  },
});
