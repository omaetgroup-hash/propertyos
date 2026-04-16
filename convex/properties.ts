import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { getCurrentUserOrNull, requireCurrentUser, requireOwnedProperty } from "./authz";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return [];
    const properties = await ctx.db
      .query("properties")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .collect();
    return await Promise.all(
      properties.map(async (p) => ({
        ...p,
        imageUrl: p.imageStorageId ? await ctx.storage.getUrl(p.imageStorageId) : null,
      }))
    );
  },
});

export const get = query({
  args: { id: v.id("properties") },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return null;

    const property = await ctx.db.get(args.id);
    if (!property || property.ownerId !== user._id) return null;
    return {
      ...property,
      imageUrl: property.imageStorageId
        ? await ctx.storage.getUrl(property.imageStorageId)
        : null,
    };
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    type: v.union(v.literal("residential"), v.literal("commercial")),
    country: v.union(v.literal("nz"), v.literal("au")),
    address: v.string(),
    suburb: v.optional(v.string()),
    city: v.string(),
    region: v.string(),
    postCode: v.string(),
    totalUnits: v.number(),
    status: v.union(v.literal("active"), v.literal("inactive")),
    yearBuilt: v.optional(v.number()),
    squareMetres: v.optional(v.number()),
    description: v.optional(v.string()),
    councilRef: v.optional(v.string()),
    titleNumber: v.optional(v.string()),
    lat: v.optional(v.number()),
    lng: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    return await ctx.db.insert("properties", { ...args, ownerId: user._id });
  },
});

export const update = mutation({
  args: {
    id: v.id("properties"),
    name: v.optional(v.string()),
    type: v.optional(v.union(v.literal("residential"), v.literal("commercial"))),
    country: v.optional(v.union(v.literal("nz"), v.literal("au"))),
    address: v.optional(v.string()),
    suburb: v.optional(v.string()),
    city: v.optional(v.string()),
    region: v.optional(v.string()),
    postCode: v.optional(v.string()),
    totalUnits: v.optional(v.number()),
    status: v.optional(v.union(v.literal("active"), v.literal("inactive"))),
    yearBuilt: v.optional(v.number()),
    squareMetres: v.optional(v.number()),
    description: v.optional(v.string()),
    councilRef: v.optional(v.string()),
    titleNumber: v.optional(v.string()),
    lat: v.optional(v.number()),
    lng: v.optional(v.number()),
    imageStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const { id, ...fields } = args;
    await requireOwnedProperty(ctx, id, user._id);
    await ctx.db.patch(id, fields);
  },
});

export const remove = mutation({
  args: { id: v.id("properties") },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    await requireOwnedProperty(ctx, args.id, user._id);
    await ctx.db.delete(args.id);
  },
});

export const removeImage = mutation({
  args: { id: v.id("properties") },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const property = await requireOwnedProperty(ctx, args.id, user._id);
    const { _id, _creationTime, imageStorageId, ...rest } = property;
    void _id;
    void _creationTime;
    void imageStorageId;
    await ctx.db.replace(args.id, rest);
  },
});

export const clearLocation = mutation({
  args: { id: v.id("properties") },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const property = await requireOwnedProperty(ctx, args.id, user._id);
    const { _id, _creationTime, lat, lng, ...rest } = property;
    void _id;
    void _creationTime;
    void lat;
    void lng;
    await ctx.db.replace(args.id, rest);
  },
});

export const getDashboardStats = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) return null;

    const properties = await ctx.db
      .query("properties")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .collect();

    const propertyIds = properties.map((p) => p._id);
    let totalUnitsCount = 0;
    let occupiedUnits = 0;
    let vacantUnits = 0;

    for (const property of properties) {
      const units = await ctx.db
        .query("units")
        .withIndex("by_property", (q) => q.eq("propertyId", property._id))
        .collect();
      totalUnitsCount += units.length;
      occupiedUnits += units.filter((u) => u.status === "occupied").length;
      vacantUnits += units.filter((u) => u.status === "vacant").length;
    }

    const allLeaseArrays = await Promise.all(
      propertyIds.map((pid) =>
        ctx.db
          .query("leases")
          .withIndex("by_property", (q) => q.eq("propertyId", pid))
          .collect()
      )
    );
    const allLeases = allLeaseArrays.flat();
    const activeLeaseCount = allLeases.filter((l) => l.status === "active" || l.status === "periodic").length;
    // Weekly rent × (52/12) ≈ monthly equivalent
    const weeklyIncome = allLeases
      .filter((l) => l.status === "active" || l.status === "periodic")
      .reduce((sum, l) => sum + l.weeklyRent, 0);
    const monthlyRevenue = Math.round(weeklyIncome * (52 / 12));

    const allCompliance = await ctx.db
      .query("compliance")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .collect();
    const overdueCount = allCompliance.filter(
      (c) => c.status === "overdue" || c.status === "expired"
    ).length;

    const allInspections = await ctx.db
      .query("inspections")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .collect();
    const pendingInspectionCount = allInspections.filter((i) => i.status === "scheduled").length;

    return {
      totalProperties: properties.length,
      totalUnits: totalUnitsCount,
      occupiedUnits,
      vacantUnits,
      activeLeases: activeLeaseCount,
      weeklyIncome,
      monthlyRevenue,
      overdueCompliance: overdueCount,
      pendingInspections: pendingInspectionCount,
      occupancyRate:
        totalUnitsCount > 0 ? Math.round((occupiedUnits / totalUnitsCount) * 100) : 0,
      nzProperties: properties.filter((p) => p.country === "nz").length,
      auProperties: properties.filter((p) => p.country === "au").length,
    };
  },
});
