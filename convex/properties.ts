import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";

async function getAuthUser(ctx: { auth: { getUserIdentity: () => Promise<{ tokenIdentifier: string } | null> }; db: { query: (table: string) => { withIndex: (index: string, fn: (q: { eq: (field: string, value: string) => unknown }) => unknown) => { unique: () => Promise<{ _id: string } | null> } } } }) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });
  const user = await ctx.db
    .query("users")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
    .unique();
  if (!user) throw new ConvexError({ message: "User not found", code: "NOT_FOUND" });
  return user;
}

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
      .query("properties")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .collect();
  },
});

export const get = query({
  args: { id: v.id("properties") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    type: v.union(v.literal("residential"), v.literal("commercial")),
    address: v.string(),
    city: v.string(),
    state: v.string(),
    zipCode: v.string(),
    totalUnits: v.number(),
    status: v.union(v.literal("active"), v.literal("inactive")),
    yearBuilt: v.optional(v.number()),
    squareFootage: v.optional(v.number()),
    description: v.optional(v.string()),
    lat: v.optional(v.number()),
    lng: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) throw new ConvexError({ message: "User not found", code: "NOT_FOUND" });
    return await ctx.db.insert("properties", { ...args, ownerId: user._id });
  },
});

export const update = mutation({
  args: {
    id: v.id("properties"),
    name: v.optional(v.string()),
    type: v.optional(v.union(v.literal("residential"), v.literal("commercial"))),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    zipCode: v.optional(v.string()),
    totalUnits: v.optional(v.number()),
    status: v.optional(v.union(v.literal("active"), v.literal("inactive"))),
    yearBuilt: v.optional(v.number()),
    squareFootage: v.optional(v.number()),
    description: v.optional(v.string()),
    lat: v.optional(v.number()),
    lng: v.optional(v.number()),
    imageStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    await ctx.db.patch(id, fields);
  },
});

export const remove = mutation({
  args: { id: v.id("properties") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
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

    const activeLeases = await Promise.all(
      propertyIds.map((pid) =>
        ctx.db
          .query("leases")
          .withIndex("by_property", (q) => q.eq("propertyId", pid))
          .collect()
      )
    );
    const allLeases = activeLeases.flat();
    const activeLeaseCount = allLeases.filter((l) => l.status === "active").length;
    const monthlyRevenue = allLeases
      .filter((l) => l.status === "active")
      .reduce((sum, l) => sum + l.monthlyRent, 0);

    const overdueCompliance = await ctx.db
      .query("compliance")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .collect();
    const overdueCount = overdueCompliance.filter((c) => c.status === "overdue" || c.status === "expired").length;

    const pendingInspections = await ctx.db
      .query("inspections")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .collect();
    const pendingInspectionCount = pendingInspections.filter((i) => i.status === "scheduled").length;

    return {
      totalProperties: properties.length,
      totalUnits: totalUnitsCount,
      occupiedUnits,
      vacantUnits,
      activeLeases: activeLeaseCount,
      monthlyRevenue,
      overdueCompliance: overdueCount,
      pendingInspections: pendingInspectionCount,
      occupancyRate: totalUnitsCount > 0 ? Math.round((occupiedUnits / totalUnitsCount) * 100) : 0,
    };
  },
});
