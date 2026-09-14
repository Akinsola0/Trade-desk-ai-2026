/**
 * The only data entry point for the UI.
 *
 * Components import from `@/lib/api` and nothing else — never `fetch`, never
 * `lib/api/mock/*`. Each function below is documented in `docs/api-contract.md`
 * and currently resolves against mock data; swapping one to a real route is a
 * one-line change inside that function.
 */
export * from "@/lib/api/types";
export { getSession } from "@/lib/api/session";
export {
  DEMO_ACCOUNT,
  NotSignedInError,
  getCurrentUser,
  isDemoAuth,
  signIn,
  signOut,
  signUp,
} from "@/lib/api/auth";
export { getBusiness, updateBusiness } from "@/lib/api/business";
export { getAvailability, saveAvailability } from "@/lib/api/availability";
export { getLeads, getLead, updateLeadStatus } from "@/lib/api/leads";
export { getJobs, updateJob } from "@/lib/api/jobs";
export { getCalls, reclassifyCall } from "@/lib/api/calls";
export { getMessages, retryMessage } from "@/lib/api/messages";
export { getDashboardSummary, getAttentionItems } from "@/lib/api/dashboard";
export {
  getCategories,
  getLocations,
  getLocation,
  searchListings,
  recommendTradespeople,
  getMarketplaceProfile,
  getFeaturedReviews,
  createMarketplaceLead,
} from "@/lib/api/marketplace";
export {
  getMatchRequests,
  createMatchRequest,
  respondToMatchRequest,
} from "@/lib/api/match-requests";
