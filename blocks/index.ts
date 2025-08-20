/**
 * Block Registry for {{APP_NAME}}
 *
 * This file exports all blocks as a dictionary for easy registration.
 *
 * Usage in main.ts:
 *   import { blocks } from "./blocks/index.ts";
 *   export const app: App = {
 *     blocks: Object.values(blocks)
 *   };
 *
 * Adding new blocks:
 * 1. Create your block file (e.g., myBlock.ts)
 * 2. Import and add it to the blocks dictionary below
 * 3. Export it for type safety and external use
 */

import { purgeCache } from "./cache/purgeCache";
import { createCacheRule } from "./cache/createCacheRule";
import { toggleDevMode } from "./cache/toggleDevMode";
import { configureCacheReserve } from "./cache/configureCacheReserve";
import { configureAlwaysOnline } from "./cache/configureAlwaysOnline";
import { setBrowserCacheTtl } from "./cache/setBrowserCacheTtl";
import { updateDnsRecord } from "./dns/updateDnsRecord";
import { toggleProxyStatus } from "./dns/toggleProxyStatus";
import { updateLoadBalancerPool } from "./load-balancer/updateLoadBalancerPool";
import { setTrafficSteering } from "./load-balancer/setTrafficSteering";
import { configureHealthCheck } from "./load-balancer/configureHealthCheck";
import { createFirewallRule } from "./firewall/createFirewallRule";
import { updateRateLimitingRule } from "./firewall/updateRateLimitingRule";
import { toggleUnderAttackMode } from "./security/toggleUnderAttackMode";
import { createAccessPolicy } from "./zero-trust/createAccessPolicy";
import { updateWafCustomRule } from "./waf/updateWafCustomRule";
import { uploadCustomCertificate } from "./ssl/uploadCustomCertificate";
import { createOriginCertificate } from "./ssl/createOriginCertificate";
import { updateTlsVersion } from "./ssl/updateTlsVersion";
import { createPageRule } from "./page-rules/createPageRule";
import { setupRedirectRule } from "./redirect-rules/setupRedirectRule";
import { getZoneAnalytics } from "./analytics/getZoneAnalytics";
import { listRecentSecurityEvents } from "./security/listRecentSecurityEvents";
import { checkOriginHealthStatus } from "./monitoring/checkOriginHealthStatus";
import { getRateLimitAnalytics } from "./analytics/getRateLimitAnalytics";
import { aiSearch } from "./autorag/aiSearch";
import { search } from "./autorag/search";
import { syncData } from "./autorag/syncData";

/**
 * Dictionary of all available blocks
 * Key: block identifier (for programmatic access)
 * Value: block definition
 */
export const blocks = {
  purgeCache: purgeCache,
  createCacheRule: createCacheRule,
  toggleDevMode: toggleDevMode,
  configureCacheReserve: configureCacheReserve,
  configureAlwaysOnline: configureAlwaysOnline,
  setBrowserCacheTtl: setBrowserCacheTtl,
  updateDnsRecord: updateDnsRecord,
  toggleProxyStatus: toggleProxyStatus,
  updateLoadBalancerPool: updateLoadBalancerPool,
  setTrafficSteering: setTrafficSteering,
  configureHealthCheck: configureHealthCheck,
  createFirewallRule: createFirewallRule,
  updateRateLimitingRule: updateRateLimitingRule,
  toggleUnderAttackMode: toggleUnderAttackMode,
  createAccessPolicy: createAccessPolicy,
  updateWafCustomRule: updateWafCustomRule,
  uploadCustomCertificate: uploadCustomCertificate,
  createOriginCertificate: createOriginCertificate,
  updateTlsVersion: updateTlsVersion,
  createPageRule: createPageRule,
  setupRedirectRule: setupRedirectRule,
  getZoneAnalytics: getZoneAnalytics,
  listRecentSecurityEvents: listRecentSecurityEvents,
  checkOriginHealthStatus: checkOriginHealthStatus,
  getRateLimitAnalytics: getRateLimitAnalytics,
  aiSearch: aiSearch,
  search: search,
  syncData: syncData,
} as const;

// Named exports for individual blocks (optional, for external imports)
export {
  purgeCache,
  createCacheRule,
  toggleDevMode,
  configureCacheReserve,
  configureAlwaysOnline,
  setBrowserCacheTtl,
  updateDnsRecord,
  toggleProxyStatus,
  updateLoadBalancerPool,
  setTrafficSteering,
  configureHealthCheck,
  createFirewallRule,
  updateRateLimitingRule,
  toggleUnderAttackMode,
  createAccessPolicy,
  updateWafCustomRule,
  uploadCustomCertificate,
  createOriginCertificate,
  updateTlsVersion,
  createPageRule,
  setupRedirectRule,
  getZoneAnalytics,
  listRecentSecurityEvents,
  checkOriginHealthStatus,
  getRateLimitAnalytics,
  aiSearch,
  search,
  syncData,
};
