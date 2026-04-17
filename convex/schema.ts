import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,
  // Extends authTables.users — must preserve the email + phone indexes
  // that @convex-dev/auth requires, and add our own fields/indexes on top.
  users: defineTable({
    // @convex-dev/auth fields
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    // App-specific fields
    tokenIdentifier: v.optional(v.string()),
    role: v.optional(v.union(v.literal("admin"), v.literal("staff"))),
  })
    .index("email", ["email"])
    .index("phone", ["phone"])
    .index("by_token", ["tokenIdentifier"]),

  properties: defineTable({
    name: v.string(),
    type: v.union(v.literal("residential"), v.literal("commercial")),
    country: v.union(v.literal("nz"), v.literal("au")),
    address: v.string(),
    suburb: v.optional(v.string()),
    city: v.string(),
    // AU = state/territory code, NZ = region code
    region: v.string(),
    postCode: v.string(),
    lat: v.optional(v.number()),
    lng: v.optional(v.number()),
    totalUnits: v.number(),
    status: v.union(v.literal("active"), v.literal("inactive")),
    imageStorageId: v.optional(v.id("_storage")),
    ownerId: v.id("users"),
    yearBuilt: v.optional(v.number()),
    // Square metres (m²)
    squareMetres: v.optional(v.number()),
    description: v.optional(v.string()),
    councilRef: v.optional(v.string()),
    titleNumber: v.optional(v.string()),
  })
    .index("by_owner", ["ownerId"])
    .index("by_status", ["status"])
    .index("by_type", ["type"])
    .index("by_country", ["country"]),

  units: defineTable({
    propertyId: v.id("properties"),
    unitNumber: v.string(),
    floor: v.optional(v.number()),
    squareMetres: v.optional(v.number()),
    bedrooms: v.optional(v.number()),
    bathrooms: v.optional(v.number()),
    status: v.union(v.literal("vacant"), v.literal("occupied"), v.literal("maintenance")),
    weeklyRent: v.optional(v.number()),
  })
    .index("by_property", ["propertyId"])
    .index("by_status", ["status"]),

  tenants: defineTable({
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    status: v.union(v.literal("active"), v.literal("inactive"), v.literal("prospect")),
    ownerId: v.id("users"),
    emergencyContactName: v.optional(v.string()),
    emergencyContactPhone: v.optional(v.string()),
  })
    .index("by_owner", ["ownerId"])
    .index("by_status", ["status"]),

  leases: defineTable({
    propertyId: v.id("properties"),
    unitId: v.id("units"),
    tenantId: v.id("tenants"),
    startDate: v.string(),
    endDate: v.string(),
    // Stored as weekly rent (standard in NZ/AU)
    weeklyRent: v.number(),
    // Bond amount (NZ/AU term for security deposit)
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
  })
    .index("by_property", ["propertyId"])
    .index("by_tenant", ["tenantId"])
    .index("by_unit", ["unitId"])
    .index("by_status", ["status"]),

  expenses: defineTable({
    propertyId: v.id("properties"),
    unitId: v.optional(v.id("units")),
    category: v.union(
      v.literal("maintenance"),
      v.literal("rates"),
      v.literal("insurance"),
      v.literal("body_corporate"),
      v.literal("property_management"),
      v.literal("landscaping"),
      v.literal("utilities"),
      v.literal("legal"),
      v.literal("advertising"),
      v.literal("depreciation"),
      v.literal("other")
    ),
    amount: v.number(),
    date: v.string(),
    description: v.string(),
    vendor: v.optional(v.string()),
    gstInclusive: v.optional(v.boolean()),
    receiptStorageId: v.optional(v.id("_storage")),
    ownerId: v.id("users"),
  })
    .index("by_property", ["propertyId"])
    .index("by_owner", ["ownerId"])
    .index("by_date", ["date"]),

  utilities: defineTable({
    propertyId: v.id("properties"),
    unitId: v.optional(v.id("units")),
    type: v.union(
      v.literal("electricity"),
      v.literal("gas"),
      v.literal("water"),
      v.literal("broadband"),
      v.literal("rates"),
      v.literal("body_corporate"),
      v.literal("rubbish"),
      v.literal("other")
    ),
    provider: v.string(),
    accountNumber: v.optional(v.string()),
    amount: v.number(),
    billingDate: v.string(),
    dueDate: v.string(),
    status: v.union(v.literal("paid"), v.literal("pending"), v.literal("overdue")),
    ownerId: v.id("users"),
  })
    .index("by_property", ["propertyId"])
    .index("by_owner", ["ownerId"])
    .index("by_status", ["status"]),

  inspections: defineTable({
    propertyId: v.id("properties"),
    unitId: v.optional(v.id("units")),
    type: v.union(
      v.literal("move_in"),
      v.literal("move_out"),
      v.literal("routine"),
      v.literal("healthy_homes"),
      v.literal("maintenance"),
      v.literal("compliance"),
      v.literal("pre_tenancy")
    ),
    scheduledDate: v.string(),
    completedDate: v.optional(v.string()),
    inspectorName: v.string(),
    status: v.union(
      v.literal("scheduled"),
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("cancelled")
    ),
    notes: v.optional(v.string()),
    overallCondition: v.optional(
      v.union(
        v.literal("excellent"),
        v.literal("good"),
        v.literal("fair"),
        v.literal("poor")
      )
    ),
    imageStorageIds: v.optional(v.array(v.id("_storage"))),
    ownerId: v.id("users"),
  })
    .index("by_property", ["propertyId"])
    .index("by_owner", ["ownerId"])
    .index("by_status", ["status"]),

  opportunities: defineTable({
    name: v.string(),
    location: v.string(),
    notes: v.optional(v.string()),
    // Capacity
    numberOfRooms: v.number(),
    bedsPerRoom: v.number(),
    // Revenue
    pricingType: v.union(v.literal("nightly"), v.literal("weekly")),
    pricePerUnit: v.number(),
    occupancyRate: v.number(), // 0–100
    // Weekly expenses
    leaseCost: v.number(),
    power: v.number(),
    water: v.number(),
    internet: v.number(),
    cleaning: v.number(),
    maintenance: v.number(),
    otherExpenses: v.number(),
    // Lifecycle
    status: v.union(
      v.literal("evaluating"),
      v.literal("approved"),
      v.literal("rejected"),
      v.literal("converted")
    ),
    convertedPropertyId: v.optional(v.id("properties")),
    ownerId: v.id("users"),
  })
    .index("by_owner", ["ownerId"])
    .index("by_status", ["status"]),

  transactions: defineTable({
    date: v.string(),
    type: v.union(v.literal("income"), v.literal("expense")),
    category: v.union(
      // Income categories
      v.literal("rental_income"),
      v.literal("bond_income"),
      v.literal("late_fees"),
      v.literal("other_income"),
      // Expense categories
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
    ),
    // amount = gross (GST-inclusive if applicable)
    amount: v.number(),
    // gstAmount = extracted GST component (0 if not a GST transaction)
    gstAmount: v.number(),
    // netAmount = amount - gstAmount
    netAmount: v.number(),
    propertyId: v.id("properties"),
    description: v.string(),
    supplierId: v.optional(v.string()),
    receiptStorageId: v.optional(v.id("_storage")),
    xeroSyncStatus: v.union(
      v.literal("not_synced"),
      v.literal("pending"),
      v.literal("synced")
    ),
    ownerId: v.id("users"),
  })
    .index("by_owner_and_date", ["ownerId", "date"])
    .index("by_property_and_date", ["propertyId", "date"]),

  compliance: defineTable({
    propertyId: v.id("properties"),
    title: v.string(),
    type: v.union(
      // NZ-specific
      v.literal("healthy_homes"),
      v.literal("bwof"),
      v.literal("rta_nz"),
      v.literal("insulation"),
      v.literal("meth_testing"),
      // AU-specific
      v.literal("bca"),
      v.literal("rta_au"),
      v.literal("pool_safety"),
      v.literal("nabers"),
      v.literal("nathers"),
      // Both
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
    documentStorageId: v.optional(v.id("_storage")),
    ownerId: v.id("users"),
  })
    .index("by_property", ["propertyId"])
    .index("by_owner", ["ownerId"])
    .index("by_status", ["status"]),
});
