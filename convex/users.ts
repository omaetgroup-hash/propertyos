import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { resolveUserRole } from "./roles";

export const updateCurrentUser = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const identity = await ctx.auth.getUserIdentity();
    const role = resolveUserRole(identity?.email);

    const existing = await ctx.db.get(userId);
    if (existing) {
      await ctx.db.patch(userId, {
        name: identity?.name ?? existing.name,
        email: identity?.email ?? existing.email,
        role,
      });
      return userId;
    }
    return null;
  },
});

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const user = await ctx.db.get(userId);
    if (!user) return null;

    const identity = await ctx.auth.getUserIdentity();
    return {
      ...user,
      role: resolveUserRole(identity?.email ?? user.email),
    };
  },
});
