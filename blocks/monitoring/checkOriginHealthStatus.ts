import { AppBlock, events } from "@slflows/sdk/v1";
import Cloudflare from "cloudflare";

export const checkOriginHealthStatus: AppBlock = {
  name: "Check Origin Health Status",
  description:
    "Check the health status of origin servers including health check results and pool status",
  category: "Monitoring",

  inputs: {
    default: {
      config: {
        pool_id: {
          name: "Pool ID",
          description: "Specific load balancer pool ID to check (optional)",
          type: "string",
          required: false,
        },
        origin_name: {
          name: "Origin Name",
          description: "Name of the origin to filter by (optional)",
          type: "string",
          required: false,
        },
        include_disabled: {
          name: "Include Disabled",
          description: "Include disabled origins in results",
          type: "boolean",
          required: false,
        },
      },
      onEvent: async (input) => {
        const { pool_id, origin_name, include_disabled } =
          input.event.inputConfig;

        const client = new Cloudflare({
          apiToken: input.app.config.apiToken,
        });

        const account_id = input.app.config.accountId;

        const healthResults: any[] = [];

        try {
          if (pool_id) {
            // Check specific pool
            const pool = await client.loadBalancers.pools.get(pool_id, {
              account_id: account_id,
            });

            const poolHealth = await client.loadBalancers.pools.health.get(
              pool_id,
              {
                account_id: account_id,
              },
            );

            const poolResult = {
              pool_id: pool_id,
              pool_name: pool.name,
              pool_enabled: pool.enabled,
              pool_healthy: poolHealth.pop_health
                ? Object.values(poolHealth.pop_health).some(
                    (p: any) => p.healthy,
                  )
                : false,
              origins:
                pool.origins?.map((origin: any) => ({
                  name: origin.name,
                  address: origin.address,
                  enabled: origin.enabled,
                  weight: origin.weight,
                  header: origin.header,
                })) || [],
              health_details: poolHealth,
            };

            // Filter by origin name if specified
            if (origin_name) {
              poolResult.origins = poolResult.origins.filter((origin: any) =>
                origin.name.includes(origin_name),
              );
            }

            // Filter out disabled origins unless requested
            if (!include_disabled) {
              poolResult.origins = poolResult.origins.filter(
                (origin: any) => origin.enabled,
              );
            }

            healthResults.push(poolResult);
          } else {
            // Check all pools
            const pools = await client.loadBalancers.pools.list({
              account_id: account_id,
            });

            for await (const pool of pools) {
              try {
                const poolHealth = await client.loadBalancers.pools.health.get(
                  pool.id!,
                  {
                    account_id: account_id,
                  },
                );

                let origins =
                  pool.origins?.map((origin: any) => ({
                    name: origin.name,
                    address: origin.address,
                    enabled: origin.enabled,
                    weight: origin.weight,
                    header: origin.header,
                  })) || [];

                // Filter by origin name if specified
                if (origin_name) {
                  origins = origins.filter((origin: any) =>
                    origin.name.includes(origin_name),
                  );
                }

                // Filter out disabled origins unless requested
                if (!include_disabled) {
                  origins = origins.filter((origin: any) => origin.enabled);
                }

                // Only include pools that have matching origins after filtering
                if (!origin_name || origins.length > 0) {
                  const poolResult = {
                    pool_id: pool.id,
                    pool_name: pool.name,
                    pool_enabled: pool.enabled,
                    pool_healthy: poolHealth.pop_health
                      ? Object.values(poolHealth.pop_health).some(
                          (p: any) => p.healthy,
                        )
                      : false,
                    origins: origins,
                    health_details: poolHealth,
                  };

                  healthResults.push(poolResult);
                }
              } catch (error: any) {
                // Continue with other pools if one fails
                healthResults.push({
                  pool_id: pool.id,
                  pool_name: pool.name,
                  pool_enabled: pool.enabled,
                  pool_healthy: false,
                  origins: pool.origins || [],
                  error: `Failed to get health status: ${error.message}`,
                });
              }
            }
          }
        } catch (error: any) {
          throw new Error(`Failed to check origin health: ${error.message}`);
        }

        await events.emit({
          total_pools: healthResults.length,
          healthy_pools: healthResults.filter(
            (p) => p.pool_healthy && p.pool_enabled,
          ).length,
          total_origins: healthResults.reduce(
            (sum, pool) => sum + pool.origins.length,
            0,
          ),
          enabled_origins: healthResults.reduce(
            (sum, pool) =>
              sum + pool.origins.filter((o: any) => o.enabled).length,
            0,
          ),
          pools: healthResults,
          timestamp: new Date().toISOString(),
        });
      },
    },
  },

  outputs: {
    default: {
      default: true,
      possiblePrimaryParents: ["default"],
      type: {
        type: "object",
        properties: {
          total_pools: { type: "number" },
          healthy_pools: { type: "number" },
          total_origins: { type: "number" },
          enabled_origins: { type: "number" },
          pools: {
            type: "array",
            items: {
              type: "object",
              properties: {
                pool_id: { type: "string" },
                pool_name: { type: "string" },
                pool_enabled: { type: "boolean" },
                pool_healthy: { type: "boolean" },
                origins: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      address: { type: "string" },
                      enabled: { type: "boolean" },
                      weight: { type: "number" },
                      header: { type: "object" },
                    },
                  },
                },
                health_details: { type: "object" },
                error: { type: "string" },
              },
            },
          },
          timestamp: { type: "string" },
        },
      },
    },
  },
};
