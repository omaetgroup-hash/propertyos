import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    tokenIdentifier: v.string(),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
  }).index("by_token", ["tokenIdentifier"]),

  properties: defineTable({
    name: v.string(),
    type: v.union(v.literal("residential"), v.literal("commercial")),
    address: v.string(),
    city: v.string(),
    state: v.string(),
    zipCode: v.string(),
    lat: v.optional(v.number()),
    lng: v.optional(v.number()),
    totalUnits: v.number(),
    status: v.union(v.literal("active"), v.literal("inactive")),
    imageStorageId: v.optional(v.id("_storage")),
    ownerId: v.id("users"),
    yearBuilt: v.optional(v.number()),
    squareFootage: v.optional(v.number()),
    description: v.optional(v.string()),
  })
    .index("by_owner", ["ownerId"])
    .index("by_status", ["status"])
    .index("by_type", ["type"]),

  units: defineTable({
    propertyId: v.id("properties"),
    unitNumber: v.string(),
    floor: v.optional(v.number()),
    squareFootage: v.optional(v.number()),
    bedrooms: v.optional(v.number()),
    bathrooms: v.optional(v.number()),
    status: v.union(v.literal("vacant"), v.literal("occupied"), v.literal("maintenance")),
    monthlyRent: v.optional(v.number()),
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
    monthlyRent: v.number(),
    depositAmount: v.number(),
    status: v.union(v.literal("active"), v.literal("expired"), v.literal("terminated"), v.literal("pending")),
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
      v.literal("utilities"),
      v.literal("insurance"),
      v.literal("taxes"),
      v.literal("management"),
      v.literal("repairs"),
      v.literal("landscaping"),
      v.literal("other")
    ),
    amount: v.number(),
    date: v.string(),
    description: v.string(),
    vendor: v.optional(v.string()),
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
      v.literal("internet"),
      v.literal("trash"),
      v.literal("sewer"),
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
      v.literal("maintenance"),
      v.literal("compliance")
    ),
    scheduledDate: v.string(),
    completedDate: v.optional(v.string()),
    inspectorName: v.string(),
    status: v.union(v.literal("scheduled"), v.literal("in_progress"), v.literal("completed"), v.literal("cancelled")),
    notes: v.optional(v.string()),
    overallCondition: v.optional(v.union(v.literal("excellent"), v.literal("good"), v.literal("fair"), v.literal("poor"))),
    imageStorageIds: v.optional(v.array(v.id("_storage"))),
    ownerId: v.id("users"),
  })
    .index("by_property", ["propertyId"])
    .index("by_owner", ["ownerId"])
    .index("by_status", ["status"]),

  compliance: defineTable({
    propertyId: v.id("properties"),
    title: v.string(),
    type: v.union(
      v.literal("fire_safety"),
      v.literal("building_permit"),
      v.literal("health_safety"),
      v.literal("electrical"),
      v.literal("plumbing"),
      v.literal("elevator"),
      v.literal("environmental"),
      v.literal("insurance"),
      v.literal("other")
    ),
    authority: v.optional(v.string()),
    dueDate: v.string(),
    renewalDate: v.optional(v.string()),
    status: v.union(v.literal("compliant"), v.literal("pending"), v.literal("overdue"), v.literal("expired")),
    notes: v.optional(v.string()),
    documentStorageId: v.optional(v.id("_storage")),
    ownerId: v.id("users"),
  })
    .index("by_property", ["propertyId"])
    .index("by_owner", ["ownerId"])
    .index("by_status", ["status"]),
});
