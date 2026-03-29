/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as compliance from "../compliance.js";
import type * as expenses from "../expenses.js";
import type * as inspections from "../inspections.js";
import type * as leases from "../leases.js";
import type * as opportunities from "../opportunities.js";
import type * as properties from "../properties.js";
import type * as reports from "../reports.js";
import type * as storage from "../storage.js";
import type * as tenants from "../tenants.js";
import type * as units from "../units.js";
import type * as users from "../users.js";
import type * as utilities from "../utilities.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  compliance: typeof compliance;
  expenses: typeof expenses;
  inspections: typeof inspections;
  leases: typeof leases;
  opportunities: typeof opportunities;
  properties: typeof properties;
  reports: typeof reports;
  storage: typeof storage;
  tenants: typeof tenants;
  units: typeof units;
  users: typeof users;
  utilities: typeof utilities;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
