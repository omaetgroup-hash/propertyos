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

    const properties = await ctx.db
      .query("properties")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .collect();

    const allLeases = await Promise.all(
      properties.map((p) =>
        ctx.db
          .query("leases")
          .withIndex("by_property", (q) => q.eq("propertyId", p._id))
          .collect()
      )
    );

    const enriched = await Promise.all(
      allLeases.flat().map(async (lease) => {
        const [property, unit, tenant] = await Promise.all([
          ctx.db.get(lease.propertyId),
          ctx.db.get(lease.unitId),
          ctx.db.get(lease.tenantId),
        ]);
        return {
          ...lease,
          propertyName: property?.name ?? "Unknown property",
          propertyCountry: property?.country ?? "nz",
          unitNumber: unit?.unitNumber ?? "?",
          tenantName: tenant?.name ?? "Unknown tenant",
          tenantEmail: tenant?.email ?? "",
        };
      })
    );

    // Sort by startDate descending
    return enriched.sort((a, b) => b.startDate.localeCompare(a.startDate));
  },
});

export const get = query({
  args: { id: v.id("leases") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const listByProperty = query({
  args: { propertyId: v.id("properties") },
  handler: async (ctx, args) => {
    const leases = await ctx.db
      .query("leases")
      .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId))
      .collect();

    return await Promise.all(
      leases.map(async (lease) => {
        const [unit, tenant] = await Promise.all([
          ctx.db.get(lease.unitId),
          ctx.db.get(lease.tenantId),
        ]);
        return {
          ...lease,
          unitNumber: unit?.unitNumber ?? "?",
          tenantName: tenant?.name ?? "Unknown tenant",
        };
      })
    );
  },
});

export const create = mutation({
  args: {
    propertyId: v.id("properties"),
    unitId: v.id("units"),
    tenantId: v.id("tenants"),
    startDate: v.string(),
    endDate: v.string(),
    weeklyRent: v.number(),
    bondAmount: v.number(),
    status: v.union(
      v.literal("active"),
      v.literal("expired"),
      v.literal("terminated"),
      v.literal("periodic"),
      v.literal("pending")
    ),
    rtaLodged: v.optional(v.boolean()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });
    // Mark unit as occupied when lease is active
    if (args.status === "active" || args.status === "periodic") {
      await ctx.db.patch(args.unitId, { status: "occupied" });
    }
    return await ctx.db.insert("leases", args);
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id("leases"),
    status: v.union(
      v.literal("active"),
      v.literal("expired"),
      v.literal("terminated"),
      v.literal("periodic"),
      v.literal("pending")
    ),
  },
  handler: async (ctx, args) => {
    const lease = await ctx.db.get(args.id);
    if (!lease) throw new ConvexError({ message: "Lease not found", code: "NOT_FOUND" });
    await ctx.db.patch(args.id, { status: args.status });
    // Update unit status accordingly
    if (args.status === "active" || args.status === "periodic") {
      await ctx.db.patch(lease.unitId, { status: "occupied" });
    } else if (args.status === "terminated" || args.status === "expired") {
      await ctx.db.patch(lease.unitId, { status: "vacant" });
    }
  },
});

export const update = mutation({
  args: {
    id: v.id("leases"),
    weeklyRent: v.optional(v.number()),
    bondAmount: v.optional(v.number()),
    endDate: v.optional(v.string()),
    rtaLodged: v.optional(v.boolean()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    await ctx.db.patch(id, fields);
  },
});

export const remove = mutation({
  args: { id: v.id("leases") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
