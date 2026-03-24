// NZ / AU locale constants and formatting helpers

export type Country = "nz" | "au";

// ── Australian states & territories ──────────────────────────────────────────
export const AU_STATES = [
  { value: "NSW", label: "New South Wales" },
  { value: "VIC", label: "Victoria" },
  { value: "QLD", label: "Queensland" },
  { value: "SA", label: "South Australia" },
  { value: "WA", label: "Western Australia" },
  { value: "TAS", label: "Tasmania" },
  { value: "NT", label: "Northern Territory" },
  { value: "ACT", label: "Australian Capital Territory" },
] as const;

// ── New Zealand regions ───────────────────────────────────────────────────────
export const NZ_REGIONS = [
  { value: "AUK", label: "Auckland" },
  { value: "WLG", label: "Wellington" },
  { value: "CAN", label: "Canterbury" },
  { value: "WKO", label: "Waikato" },
  { value: "BOP", label: "Bay of Plenty" },
  { value: "HKB", label: "Hawke's Bay" },
  { value: "MWT", label: "Manawatū-Whanganui" },
  { value: "OTA", label: "Otago" },
  { value: "STL", label: "Southland" },
  { value: "NTL", label: "Northland" },
  { value: "TAS", label: "Tasman" },
  { value: "NSN", label: "Nelson" },
  { value: "MBH", label: "Marlborough" },
  { value: "WTC", label: "West Coast" },
  { value: "GIS", label: "Gisborne" },
  { value: "TKI", label: "Taranaki" },
] as const;

// ── Compliance types (NZ / AU specific) ──────────────────────────────────────
export const COMPLIANCE_TYPES = [
  // New Zealand
  { value: "healthy_homes", label: "Healthy Homes Standards (NZ)", country: "nz" },
  { value: "bwof", label: "Building Warrant of Fitness (BWOF)", country: "nz" },
  { value: "rta_nz", label: "Residential Tenancies Act (NZ)", country: "nz" },
  { value: "insulation", label: "Ceiling / Underfloor Insulation (NZ)", country: "nz" },
  { value: "meth_testing", label: "Methamphetamine Testing (NZ)", country: "nz" },
  // Australia
  { value: "bca", label: "Building Code of Australia (BCA)", country: "au" },
  { value: "rta_au", label: "Residential Tenancies Act (AU)", country: "au" },
  { value: "pool_safety", label: "Swimming Pool Safety Certificate (AU)", country: "au" },
  { value: "nabers", label: "NABERS Energy Rating (AU)", country: "au" },
  { value: "nathers", label: "NatHERS Thermal Rating (AU)", country: "au" },
  // Both countries
  { value: "smoke_alarm", label: "Smoke Alarm Compliance", country: "both" },
  { value: "fire_safety", label: "Fire Safety & Evacuation", country: "both" },
  { value: "electrical_wof", label: "Electrical Certificate / WoF", country: "both" },
  { value: "asbestos", label: "Asbestos Management Plan", country: "both" },
  { value: "building_consent", label: "Building Consent / Permit", country: "both" },
  { value: "insurance", label: "Insurance Certificate", country: "both" },
  { value: "public_liability", label: "Public Liability Certificate", country: "both" },
  { value: "other", label: "Other", country: "both" },
] as const;

export type ComplianceType = (typeof COMPLIANCE_TYPES)[number]["value"];

// ── Inspection types ──────────────────────────────────────────────────────────
export const INSPECTION_TYPES = [
  { value: "move_in", label: "Move-In Inspection" },
  { value: "move_out", label: "Move-Out Inspection" },
  { value: "routine", label: "Routine / Periodic Inspection" },
  { value: "healthy_homes", label: "Healthy Homes Assessment (NZ)" },
  { value: "maintenance", label: "Maintenance Inspection" },
  { value: "compliance", label: "Compliance Inspection" },
  { value: "pre_tenancy", label: "Pre-Tenancy Inspection" },
] as const;

// ── Utility types ─────────────────────────────────────────────────────────────
export const UTILITY_TYPES = [
  { value: "electricity", label: "Electricity" },
  { value: "gas", label: "Gas / LPG" },
  { value: "water", label: "Water & Wastewater" },
  { value: "broadband", label: "Broadband / Internet" },
  { value: "rates", label: "Council Rates" },
  { value: "body_corporate", label: "Body Corporate Levy" },
  { value: "rubbish", label: "Rubbish / Recycling" },
  { value: "other", label: "Other" },
] as const;

// ── Expense categories ────────────────────────────────────────────────────────
export const EXPENSE_CATEGORIES = [
  { value: "maintenance", label: "Maintenance & Repairs" },
  { value: "rates", label: "Council Rates" },
  { value: "insurance", label: "Insurance" },
  { value: "body_corporate", label: "Body Corporate" },
  { value: "property_management", label: "Property Management Fees" },
  { value: "landscaping", label: "Landscaping / Grounds" },
  { value: "utilities", label: "Utilities" },
  { value: "legal", label: "Legal & Professional" },
  { value: "advertising", label: "Advertising / Letting Fees" },
  { value: "depreciation", label: "Depreciation" },
  { value: "other", label: "Other" },
] as const;

// ── Country options ───────────────────────────────────────────────────────────
export const COUNTRIES = [
  { value: "nz", label: "New Zealand", currency: "NZD", locale: "en-NZ", flag: "🇳🇿" },
  { value: "au", label: "Australia", currency: "AUD", locale: "en-AU", flag: "🇦🇺" },
] as const;

// ── Formatting helpers ────────────────────────────────────────────────────────

export function formatCurrency(amount: number, country: Country = "nz"): string {
  const { currency, locale } = COUNTRIES.find((c) => c.value === country) ?? COUNTRIES[0];
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Format a stored ISO date string as DD/MM/YYYY */
export function formatDate(isoDate: string): string {
  if (!isoDate) return "—";
  const d = new Date(isoDate);
  return d.toLocaleDateString("en-AU", { day: "2-digit", month: "2-digit", year: "numeric" });
}

/** Format a stored ISO date string as D MMM YYYY (human-friendly) */
export function formatDateLong(isoDate: string): string {
  if (!isoDate) return "—";
  const d = new Date(isoDate);
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

export function getRegionsForCountry(country: Country) {
  return country === "au" ? AU_STATES : NZ_REGIONS;
}

export function getComplianceTypesForCountry(country: Country) {
  return COMPLIANCE_TYPES.filter((t) => t.country === country || t.country === "both");
}
