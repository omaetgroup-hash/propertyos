import { ConvexError } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { resolveUserRole } from "./roles";

type AuthCtx = QueryCtx | MutationCtx;
type AppUser = Doc<"users"> & { role: "admin" | "staff" };
type OwnedTable =
  | "properties"
  | "tenants"
  | "expenses"
  | "utilities"
  | "inspections"
  | "compliance"
  | "opportunities"
  | "transactions";

function notFound(label: string) {
  return new ConvexError({ message: `${label} not found`, code: "NOT_FOUND" });
}

function invalidArgument(message: string) {
  return new ConvexError({ message, code: "INVALID_ARGUMENT" });
}

async function requireOwnedRecord<T extends OwnedTable>(
  ctx: AuthCtx,
  table: T,
  id: Id<T>,
  ownerId: Id<"users">,
  label: string,
): Promise<Doc<T>> {
  const record = await ctx.db.get(id);
  if (!record || (record as Doc<T> & { ownerId: Id<"users"> }).ownerId !== ownerId) {
    throw notFound(label);
  }
  return record;
}

export async function getCurrentUserOrNull(ctx: AuthCtx): Promise<AppUser | null> {
  const userId = await getAuthUserId(ctx);
  if (!userId) return null;

  const user = await ctx.db.get(userId);
  if (!user) return null;

  const identity = await ctx.auth.getUserIdentity();
  return {
    ...user,
    role: resolveUserRole(identity?.email ?? user.email),
  };
}

export async function requireCurrentUser(ctx: AuthCtx): Promise<AppUser> {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });
  }

  const user = await ctx.db.get(userId);
  if (!user) {
    throw notFound("User");
  }

  const identity = await ctx.auth.getUserIdentity();
  return {
    ...user,
    role: resolveUserRole(identity?.email ?? user.email),
  };
}

export async function requireAdminUser(ctx: AuthCtx): Promise<AppUser> {
  const user = await requireCurrentUser(ctx);
  if (user.role !== "admin") {
    throw new ConvexError({ message: "Admin access required", code: "FORBIDDEN" });
  }
  return user;
}

export async function requireOwnedProperty(
  ctx: AuthCtx,
  propertyId: Id<"properties">,
  ownerId: Id<"users">,
): Promise<Doc<"properties">> {
  return await requireOwnedRecord(ctx, "properties", propertyId, ownerId, "Property");
}

export async function requireOwnedTenant(
  ctx: AuthCtx,
  tenantId: Id<"tenants">,
  ownerId: Id<"users">,
): Promise<Doc<"tenants">> {
  return await requireOwnedRecord(ctx, "tenants", tenantId, ownerId, "Tenant");
}

export async function requireOwnedExpense(
  ctx: AuthCtx,
  expenseId: Id<"expenses">,
  ownerId: Id<"users">,
): Promise<Doc<"expenses">> {
  return await requireOwnedRecord(ctx, "expenses", expenseId, ownerId, "Expense");
}

export async function requireOwnedUtility(
  ctx: AuthCtx,
  utilityId: Id<"utilities">,
  ownerId: Id<"users">,
): Promise<Doc<"utilities">> {
  return await requireOwnedRecord(ctx, "utilities", utilityId, ownerId, "Utility");
}

export async function requireOwnedInspection(
  ctx: AuthCtx,
  inspectionId: Id<"inspections">,
  ownerId: Id<"users">,
): Promise<Doc<"inspections">> {
  return await requireOwnedRecord(ctx, "inspections", inspectionId, ownerId, "Inspection");
}

export async function requireOwnedCompliance(
  ctx: AuthCtx,
  complianceId: Id<"compliance">,
  ownerId: Id<"users">,
): Promise<Doc<"compliance">> {
  return await requireOwnedRecord(ctx, "compliance", complianceId, ownerId, "Compliance item");
}

export async function requireOwnedOpportunity(
  ctx: AuthCtx,
  opportunityId: Id<"opportunities">,
  ownerId: Id<"users">,
): Promise<Doc<"opportunities">> {
  return await requireOwnedRecord(ctx, "opportunities", opportunityId, ownerId, "Opportunity");
}

export async function requireOwnedTransaction(
  ctx: AuthCtx,
  transactionId: Id<"transactions">,
  ownerId: Id<"users">,
): Promise<Doc<"transactions">> {
  return await requireOwnedRecord(ctx, "transactions", transactionId, ownerId, "Transaction");
}

export async function requireOwnedUnit(
  ctx: AuthCtx,
  unitId: Id<"units">,
  ownerId: Id<"users">,
): Promise<Doc<"units">> {
  const unit = await ctx.db.get(unitId);
  if (!unit) throw notFound("Unit");
  await requireOwnedProperty(ctx, unit.propertyId, ownerId);
  return unit;
}

export async function requireOwnedLease(
  ctx: AuthCtx,
  leaseId: Id<"leases">,
  ownerId: Id<"users">,
): Promise<Doc<"leases">> {
  const lease = await ctx.db.get(leaseId);
  if (!lease) throw notFound("Lease");
  await requireOwnedProperty(ctx, lease.propertyId, ownerId);
  return lease;
}

export function assertBelongsToProperty(
  label: string,
  actualPropertyId: string,
  expectedPropertyId: string,
) {
  if (actualPropertyId !== expectedPropertyId) {
    throw invalidArgument(`${label} does not belong to the selected property`);
  }
}
