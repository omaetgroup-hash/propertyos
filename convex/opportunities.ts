import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) return [];
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
    return await ctx.db.get(args.id);
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
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) throw new ConvexError({ message: "User not found", code: "NOT_FOUND" });
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
    const { id, ...fields } = args;
    await ctx.db.patch(id, fields);
  },
});

export const remove = mutation({
  args: { id: v.id("opportunities") },
  handler: async (ctx, args) => {
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
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) throw new ConvexError({ message: "User not found", code: "NOT_FOUND" });

    const opportunity = await ctx.db.get(args.id);
    if (!opportunity) throw new ConvexError({ message: "Opportunity not found", code: "NOT_FOUND" });

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
