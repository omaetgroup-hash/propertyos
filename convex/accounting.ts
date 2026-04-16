import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import {
  getCurrentUserOrNull,
  requireCurrentUser,
  requireOwnedProperty,
  requireOwnedTransaction,
} from "./authz";

// ── Category validator (shared between create args and schema) ────────────────
const categoryValidator = v.union(
  v.literal("rental_income"),
  v.literal("bond_income"),
  v.literal("late_fees"),
  v.literal("other_income"),
  v.literal("repairs_maintenance"),
  v.literal("council_rates"),
  v.literal("insurance"),
  v.literal("property_management_fees"),
  v.literal("utilities"),
  v.literal("cleaning"),
  v.literal("advertising"),
  v.literal("legal_fees"),
  v.literal("accounting_fees"),
  v.literal("other_expenses")
);

// ── GST rates by country ──────────────────────────────────────────────────────
function gstRate(country: "nz" | "au"): number {
  return country === "nz" ? 0.15 : 0.10;
}

// Extract GST from a GST-inclusive amount
function extractGST(grossAmount: number, rate: number): number {
  return Math.round(grossAmount * (rate / (1 + rate)) * 100) / 100;
}

// ── list — all transactions for the signed-in user ────────────────────────────
export const list = query({
  args: {
    dateFrom: v.optional(v.string()),
    dateTo: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return [];

    let rows;
    if (args.dateFrom && args.dateTo) {
      rows = await ctx.db
        .query("transactions")
        .withIndex("by_owner_and_date", (q) =>
          q.eq("ownerId", user._id).gte("date", args.dateFrom!).lte("date", args.dateTo!)
        )
        .order("desc")
        .take(500);
    } else {
      rows = await ctx.db
        .query("transactions")
        .withIndex("by_owner_and_date", (q) => q.eq("ownerId", user._id))
        .order("desc")
        .take(500);
    }

    return await Promise.all(
      rows.map(async (t) => {
        const property = await ctx.db.get(t.propertyId);
        return {
          ...t,
          propertyName: property?.name ?? "Unknown property",
          propertyCountry: (property?.country ?? "nz") as "nz" | "au",
        };
      })
    );
  },
});

// ── listByProperty — transactions for one property ───────────────────────────
export const listByProperty = query({
  args: {
    propertyId: v.id("properties"),
    dateFrom: v.optional(v.string()),
    dateTo: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return [];
    const property = await ctx.db.get(args.propertyId);
    if (!property || property.ownerId !== user._id) return [];

    if (args.dateFrom && args.dateTo) {
      return await ctx.db
        .query("transactions")
        .withIndex("by_property_and_date", (q) =>
          q.eq("propertyId", args.propertyId).gte("date", args.dateFrom!).lte("date", args.dateTo!)
        )
        .order("desc")
        .take(500);
    }
    return await ctx.db
      .query("transactions")
      .withIndex("by_property_and_date", (q) => q.eq("propertyId", args.propertyId))
      .order("desc")
      .take(500);
  },
});

// ── getAccountingStats — P&L summary for a property (used in detail tab) ─────
export const getAccountingStats = query({
  args: { propertyId: v.id("properties") },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return null;
    const property = await ctx.db.get(args.propertyId);
    if (!property || property.ownerId !== user._id) return null;

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    // 12-month window start
    const twelveMonthsAgo = new Date(now);
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
    twelveMonthsAgo.setDate(1);
    const twelveMonthStart = `${twelveMonthsAgo.getFullYear()}-${String(twelveMonthsAgo.getMonth() + 1).padStart(2, "0")}-01`;

    // YTD start
    const yearStart = `${year}-01-01`;

    const allRecent = await ctx.db
      .query("transactions")
      .withIndex("by_property_and_date", (q) =>
        q.eq("propertyId", args.propertyId).gte("date", twelveMonthStart)
      )
      .collect();

    // Current month
    const monthKey = `${year}-${String(month).padStart(2, "0")}`;
    const monthTxns = allRecent.filter((t) => t.date.startsWith(monthKey));
    const monthIncome = monthTxns
      .filter((t) => t.type === "income")
      .reduce((s, t) => s + t.netAmount, 0);
    const monthExpenses = monthTxns
      .filter((t) => t.type === "expense")
      .reduce((s, t) => s + t.netAmount, 0);

    // YTD
    const ytdTxns = allRecent.filter((t) => t.date >= yearStart);
    const ytdIncome = ytdTxns
      .filter((t) => t.type === "income")
      .reduce((s, t) => s + t.netAmount, 0);
    const ytdExpenses = ytdTxns
      .filter((t) => t.type === "expense")
      .reduce((s, t) => s + t.netAmount, 0);

    // Monthly breakdown (last 12 months)
    const monthlyData: { month: string; income: number; expenses: number; net: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(year, month - 1 - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("en-NZ", { month: "short", year: "2-digit" });
      const txns = allRecent.filter((t) => t.date.startsWith(key));
      const inc = txns.filter((t) => t.type === "income").reduce((s, t) => s + t.netAmount, 0);
      const exp = txns.filter((t) => t.type === "expense").reduce((s, t) => s + t.netAmount, 0);
      monthlyData.push({ month: label, income: inc, expenses: exp, net: inc - exp });
    }

    // Top expense categories (YTD)
    const expenseByCategory: Record<string, number> = {};
    for (const t of ytdTxns.filter((t) => t.type === "expense")) {
      expenseByCategory[t.category] = (expenseByCategory[t.category] ?? 0) + t.netAmount;
    }
    const topCategories = Object.entries(expenseByCategory)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    return {
      monthIncome,
      monthExpenses,
      monthNet: monthIncome - monthExpenses,
      ytdIncome,
      ytdExpenses,
      ytdNet: ytdIncome - ytdExpenses,
      monthlyData,
      topCategories,
      propertyCountry: property.country as "nz" | "au",
    };
  },
});

// ── getGSTReport — GST summary for a date range ───────────────────────────────
export const getGSTReport = query({
  args: {
    dateFrom: v.string(),
    dateTo: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return null;

    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_owner_and_date", (q) =>
        q.eq("ownerId", user._id).gte("date", args.dateFrom).lte("date", args.dateTo)
      )
      .collect();

    // Attach property names for breakdown
    const withProps = await Promise.all(
      transactions.map(async (t) => {
        const p = await ctx.db.get(t.propertyId);
        return { ...t, propertyName: p?.name ?? "Unknown" };
      })
    );

    const incomeGST = withProps
      .filter((t) => t.type === "income")
      .reduce((s, t) => s + t.gstAmount, 0);
    const expenseGST = withProps
      .filter((t) => t.type === "expense")
      .reduce((s, t) => s + t.gstAmount, 0);

    // Breakdown by category
    const incomeRows: { category: string; gross: number; gst: number; net: number }[] = [];
    const expenseRows: { category: string; gross: number; gst: number; net: number }[] = [];

    const incomeByCategory: Record<string, { gross: number; gst: number; net: number }> = {};
    const expenseByCategory: Record<string, { gross: number; gst: number; net: number }> = {};

    for (const t of withProps) {
      const target = t.type === "income" ? incomeByCategory : expenseByCategory;
      if (!target[t.category]) target[t.category] = { gross: 0, gst: 0, net: 0 };
      target[t.category].gross += t.amount;
      target[t.category].gst += t.gstAmount;
      target[t.category].net += t.netAmount;
    }

    for (const [cat, vals] of Object.entries(incomeByCategory)) {
      incomeRows.push({ category: cat, ...vals });
    }
    for (const [cat, vals] of Object.entries(expenseByCategory)) {
      expenseRows.push({ category: cat, ...vals });
    }

    return {
      dateFrom: args.dateFrom,
      dateTo: args.dateTo,
      totalIncomeGST: incomeGST,
      totalExpenseGST: expenseGST,
      netGSTPosition: incomeGST - expenseGST,
      totalIncomeNet: withProps
        .filter((t) => t.type === "income")
        .reduce((s, t) => s + t.netAmount, 0),
      totalExpenseNet: withProps
        .filter((t) => t.type === "expense")
        .reduce((s, t) => s + t.netAmount, 0),
      incomeRows: incomeRows.sort((a, b) => b.gross - a.gross),
      expenseRows: expenseRows.sort((a, b) => b.gross - a.gross),
      transactionCount: transactions.length,
    };
  },
});

// ── getOwnerStatement — monthly statement for a property ──────────────────────
export const getOwnerStatement = query({
  args: {
    propertyId: v.id("properties"),
    yearMonth: v.string(), // "2026-04"
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return null;
    const property = await ctx.db.get(args.propertyId);
    if (!property || property.ownerId !== user._id) return null;

    const monthStart = `${args.yearMonth}-01`;
    // Use "99" as the upper bound so all dates in month are captured
    const monthEnd = `${args.yearMonth}-31`;

    // All transactions before this month (opening balance)
    const prior = await ctx.db
      .query("transactions")
      .withIndex("by_property_and_date", (q) =>
        q.eq("propertyId", args.propertyId).lt("date", monthStart)
      )
      .collect();

    // Transactions in this month
    const monthTxns = await ctx.db
      .query("transactions")
      .withIndex("by_property_and_date", (q) =>
        q.eq("propertyId", args.propertyId).gte("date", monthStart).lte("date", monthEnd)
      )
      .order("asc")
      .collect();

    const openingBalance = prior.reduce(
      (s, t) => s + (t.type === "income" ? t.netAmount : -t.netAmount),
      0
    );

    const incomeItems = monthTxns.filter((t) => t.type === "income");
    const expenseItems = monthTxns.filter((t) => t.type === "expense");
    const totalIncome = incomeItems.reduce((s, t) => s + t.netAmount, 0);
    const totalExpenses = expenseItems.reduce((s, t) => s + t.netAmount, 0);
    const netAmount = totalIncome - totalExpenses;

    return {
      property: {
        name: property.name,
        address: property.address,
        country: property.country as "nz" | "au",
      },
      yearMonth: args.yearMonth,
      openingBalance,
      incomeItems,
      expenseItems,
      totalIncome,
      totalExpenses,
      netAmount,
      closingBalance: openingBalance + netAmount,
    };
  },
});

// ── create — add a new transaction ────────────────────────────────────────────
export const create = mutation({
  args: {
    date: v.string(),
    type: v.union(v.literal("income"), v.literal("expense")),
    category: categoryValidator,
    amount: v.number(),
    gstApplicable: v.boolean(),
    propertyId: v.id("properties"),
    description: v.string(),
    supplierId: v.optional(v.string()),
    receiptStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const property = await requireOwnedProperty(ctx, args.propertyId, user._id);

    const rate = gstRate(property.country as "nz" | "au");
    const gstAmount = args.gstApplicable ? extractGST(args.amount, rate) : 0;
    const netAmount = Math.round((args.amount - gstAmount) * 100) / 100;

    return await ctx.db.insert("transactions", {
      date: args.date,
      type: args.type,
      category: args.category,
      amount: args.amount,
      gstAmount,
      netAmount,
      propertyId: args.propertyId,
      description: args.description,
      supplierId: args.supplierId,
      receiptStorageId: args.receiptStorageId,
      xeroSyncStatus: "not_synced",
      ownerId: user._id,
    });
  },
});

// ── remove — delete a transaction ─────────────────────────────────────────────
export const remove = mutation({
  args: { id: v.id("transactions") },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    await requireOwnedTransaction(ctx, args.id, user._id);
    await ctx.db.delete(args.id);
  },
});

// ── markXeroPending — flag a transaction for Xero sync ────────────────────────
export const markXeroPending = mutation({
  args: { id: v.id("transactions") },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    await requireOwnedTransaction(ctx, args.id, user._id);
    await ctx.db.patch(args.id, { xeroSyncStatus: "pending" });
  },
});
