// Shared Deal Analysis calculation engine
// Used by Opportunities module and reusable for Financials/Reports

export type PricingType = "nightly" | "weekly";
export type Viability = "profitable" | "borderline" | "not_viable";

export interface DealInputs {
  numberOfRooms: number;
  bedsPerRoom: number;
  pricingType: PricingType;
  pricePerUnit: number;
  occupancyRate: number; // 0–100
  leaseCost: number;
  power: number;
  water: number;
  internet: number;
  cleaning: number;
  maintenance: number;
  otherExpenses: number;
}

export interface DealMetrics {
  totalBeds: number;
  weeklyRevenue: number;
  monthlyRevenue: number;
  weeklyExpenses: number;
  monthlyExpenses: number;
  weeklyProfit: number;
  monthlyProfit: number;
  profitMargin: number; // percentage, may be NaN if revenue = 0
  breakEvenOccupancy: number; // percentage
  viability: Viability;
}

const WEEKS_PER_MONTH = 52 / 12;

export function calculateDeal(inputs: DealInputs): DealMetrics {
  const {
    numberOfRooms,
    bedsPerRoom,
    pricingType,
    pricePerUnit,
    occupancyRate,
    leaseCost,
    power,
    water,
    internet,
    cleaning,
    maintenance,
    otherExpenses,
  } = inputs;

  const totalBeds = numberOfRooms * bedsPerRoom;

  // Weekly revenue: nightly price × 7 = weekly equivalent per bed
  const weeklyPricePerBed =
    pricingType === "nightly" ? pricePerUnit * 7 : pricePerUnit;

  const weeklyRevenue = totalBeds * weeklyPricePerBed * (occupancyRate / 100);
  const monthlyRevenue = weeklyRevenue * WEEKS_PER_MONTH;

  const weeklyExpenses =
    leaseCost + power + water + internet + cleaning + maintenance + otherExpenses;
  const monthlyExpenses = weeklyExpenses * WEEKS_PER_MONTH;

  const weeklyProfit = weeklyRevenue - weeklyExpenses;
  const monthlyProfit = monthlyRevenue - monthlyExpenses;

  const profitMargin =
    weeklyRevenue > 0 ? (weeklyProfit / weeklyRevenue) * 100 : -Infinity;

  // Minimum occupancy rate needed to cover all expenses
  const maxWeeklyRevenue = totalBeds * weeklyPricePerBed;
  const breakEvenOccupancy =
    maxWeeklyRevenue > 0
      ? Math.min((weeklyExpenses / maxWeeklyRevenue) * 100, 100)
      : 100;

  let viability: Viability;
  if (profitMargin >= 20) {
    viability = "profitable";
  } else if (profitMargin > 0) {
    viability = "borderline";
  } else {
    viability = "not_viable";
  }

  return {
    totalBeds,
    weeklyRevenue,
    monthlyRevenue,
    weeklyExpenses,
    monthlyExpenses,
    weeklyProfit,
    monthlyProfit,
    profitMargin: isFinite(profitMargin) ? profitMargin : 0,
    breakEvenOccupancy,
    viability,
  };
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-NZ", {
    style: "currency",
    currency: "NZD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}
