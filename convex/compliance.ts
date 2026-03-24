import { query, mutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";

// ── Queries ───────────────────────────────────────────────────────────────────

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

    const items = await ctx.db
      .query("compliance")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .order("desc")
      .collect();

    return await Promise.all(
      items.map(async (c) => {
        const property = await ctx.db.get(c.propertyId);
        return {
          ...c,
          propertyName: property?.name ?? "Unknown property",
          propertyCountry: property?.country ?? "nz",
        };
      })
    );
  },
});

export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) return null;

    const items = await ctx.db
      .query("compliance")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .collect();

    const now = new Date();
    const nowIso = now.toISOString().split("T")[0] as string;
    const in30 = new Date(now);
    in30.setDate(in30.getDate() + 30);
    const in60 = new Date(now);
    in60.setDate(in60.getDate() + 60);
    const in30Iso = in30.toISOString().split("T")[0] as string;
    const in60Iso = in60.toISOString().split("T")[0] as string;

    return {
      total: items.length,
      compliant: items.filter((i) => i.status === "compliant").length,
      pending: items.filter((i) => i.status === "pending").length,
      overdue: items.filter((i) => i.status === "overdue").length,
      expired: items.filter((i) => i.status === "expired").length,
      upcomingIn30: items.filter(
        (i) => i.status !== "compliant" && i.dueDate >= nowIso && i.dueDate <= in30Iso
      ).length,
      upcomingIn60: items.filter(
        (i) => i.status !== "compliant" && i.dueDate > in30Iso && i.dueDate <= in60Iso
      ).length,
    };
  },
});

// ── Mutations ─────────────────────────────────────────────────────────────────

export const create = mutation({
  args: {
    propertyId: v.id("properties"),
    title: v.string(),
    type: v.union(
      v.literal("healthy_homes"),
      v.literal("bwof"),
      v.literal("rta_nz"),
      v.literal("insulation"),
      v.literal("meth_testing"),
      v.literal("bca"),
      v.literal("rta_au"),
      v.literal("pool_safety"),
      v.literal("nabers"),
      v.literal("nathers"),
      v.literal("smoke_alarm"),
      v.literal("fire_safety"),
      v.literal("electrical_wof"),
      v.literal("asbestos"),
      v.literal("building_consent"),
      v.literal("insurance"),
      v.literal("public_liability"),
      v.literal("other")
    ),
    authority: v.optional(v.string()),
    dueDate: v.string(),
    renewalDate: v.optional(v.string()),
    status: v.union(
      v.literal("compliant"),
      v.literal("pending"),
      v.literal("overdue"),
      v.literal("expired")
    ),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) throw new ConvexError({ message: "User not found", code: "NOT_FOUND" });
    return await ctx.db.insert("compliance", { ...args, ownerId: user._id });
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id("compliance"),
    status: v.union(
      v.literal("compliant"),
      v.literal("pending"),
      v.literal("overdue"),
      v.literal("expired")
    ),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) throw new ConvexError({ message: "Item not found", code: "NOT_FOUND" });
    await ctx.db.patch(args.id, { status: args.status });
  },
});

export const remove = mutation({
  args: { id: v.id("compliance") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
