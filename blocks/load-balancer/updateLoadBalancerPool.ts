import { AppBlock, events } from "@slflows/sdk/v1";
import Cloudflare from "cloudflare";

export const updateLoadBalancerPool: AppBlock = {
  name: "Update Load Balancer Pool",
  description:
    "Create or update a Cloudflare Load Balancer pool with origins and configuration",
  category: "Load Balancer",

  inputs: {
    default: {
      config: {
        name: {
          name: "Pool Name",
          description:
            "A short name (tag) for the pool. Only alphanumeric characters, hyphens, and underscores are allowed",
          type: "string",
          required: true,
        },
        origins: {
          name: "Origins",
          description: "List of origin servers in the pool",
          type: {
            type: "array",
            items: {
              type: "object",
              properties: {
                address: {
                  type: "string",
                  description:
                    "The IP address or hostname of the origin server",
                },
                name: {
                  type: "string",
                  description: "A human-identifiable name for the origin",
                },
                enabled: {
                  type: "boolean",
                  description: "Whether this origin is enabled",
                },
                weight: {
                  type: "number",
                  description: "Weight for traffic distribution (1-1)",
                },
                port: {
                  type: "number",
                  description: "Port for upstream connections (0 for default)",
                },
              },
              required: ["address"],
            },
          },
          required: true,
        },
        description: {
          name: "Description",
          description: "A human-readable description of the pool",
          type: "string",
          required: false,
        },
        enabled: {
          name: "Enabled",
          description: "Whether to enable this pool",
          type: "boolean",
          required: false,
        },
        minimum_origins: {
          name: "Minimum Origins",
          description: "Minimum number of origins that must be healthy",
          type: "number",
          required: false,
        },
        monitor: {
          name: "Monitor ID",
          description: "The ID of the Monitor to use for health checks",
          type: "string",
          required: false,
        },
        latitude: {
          name: "Latitude",
          description:
            "Latitude of the data center containing origins (decimal degrees)",
          type: "number",
          required: false,
        },
        longitude: {
          name: "Longitude",
          description:
            "Longitude of the data center containing origins (decimal degrees)",
          type: "number",
          required: false,
        },
        notification_email: {
          name: "Notification Email",
          description:
            "Email address for health status notifications (deprecated)",
          type: "string",
          required: false,
        },
      },
      onEvent: async (input) => {
        const {
          name,
          origins,
          description,
          enabled = true,
          minimum_origins,
          monitor,
          latitude,
          longitude,
          notification_email,
        } = input.event.inputConfig;

        const client = new Cloudflare({
          apiToken: input.app.config.apiToken as string,
        });

        const account_id = input.app.config.accountId as string;

        // Try to find existing pool with the same name
        const existingPools = [];
        for await (const pool of client.loadBalancers.pools.list({
          account_id,
        })) {
          if (pool.name === name) {
            existingPools.push(pool);
          }
        }

        let result;
        let operation;

        const poolData = {
          name,
          origins: origins.map((origin: any) => ({
            address: origin.address,
            ...(origin.name && { name: origin.name }),
            ...(origin.enabled !== undefined && { enabled: origin.enabled }),
            ...(origin.weight && { weight: origin.weight }),
            ...(origin.port && { port: origin.port }),
          })),
          ...(description && { description }),
          ...(enabled !== undefined && { enabled }),
          ...(minimum_origins && { minimum_origins }),
          ...(monitor && { monitor }),
          ...(latitude !== undefined &&
            longitude !== undefined && {
              latitude,
              longitude,
            }),
          ...(notification_email && { notification_email }),
        };

        if (existingPools.length > 0) {
          // Update existing pool
          const poolToUpdate = existingPools[0];
          result = await client.loadBalancers.pools.update(poolToUpdate.id!, {
            account_id,
            ...poolData,
          });
          operation = "updated";
        } else {
          // Create new pool
          result = await client.loadBalancers.pools.create({
            account_id,
            ...poolData,
          });
          operation = "created";
        }

        await events.emit({
          ...result,
          operation,
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
          id: { type: "string" },
          name: { type: "string" },
          description: { type: "string" },
          enabled: { type: "boolean" },
          minimum_origins: { type: "number" },
          monitor: { type: "string" },
          origins: {
            type: "array",
            items: {
              type: "object",
              properties: {
                address: { type: "string" },
                name: { type: "string" },
                enabled: { type: "boolean" },
                weight: { type: "number" },
                port: { type: "number" },
              },
            },
          },
          check_regions: {
            type: "array",
            items: { type: "string" },
          },
          latitude: { type: "number" },
          longitude: { type: "number" },
          notification_email: { type: "string" },
          created_on: { type: "string" },
          modified_on: { type: "string" },
          operation: { type: "string" },
        },
      },
    },
  },
};
