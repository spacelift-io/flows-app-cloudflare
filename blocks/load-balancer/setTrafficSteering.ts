import { AppBlock, events } from "@slflows/sdk/v1";
import Cloudflare from "cloudflare";

export const setTrafficSteering: AppBlock = {
  name: "Set Traffic Steering",
  description:
    "Configure traffic steering policy for a Cloudflare Load Balancer (geo, random, dynamic, etc.)",
  category: "Load Balancer",

  inputs: {
    default: {
      config: {
        zone_id: {
          name: "Zone ID",
          description: "The Cloudflare zone ID",
          type: "string",
          required: true,
        },
        name: {
          name: "Load Balancer Name",
          description: "Name of the load balancer to update",
          type: "string",
          required: true,
        },
        steering_policy: {
          name: "Steering Policy",
          description: "Traffic steering policy to use",
          type: {
            type: "string",
            enum: [
              "off",
              "geo",
              "random",
              "dynamic_latency",
              "proximity",
              "least_outstanding_requests",
              "least_connections",
            ],
          },
          required: true,
        },
        region_pools: {
          name: "Region Pools",
          description:
            "Mapping of region codes to pool IDs (required for geo steering)",
          type: {
            type: "object",
          },
          required: false,
        },
        country_pools: {
          name: "Country Pools",
          description:
            "Mapping of country codes to pool IDs (optional for geo steering)",
          type: {
            type: "object",
          },
          required: false,
        },
        pop_pools: {
          name: "PoP Pools",
          description:
            "Enterprise: mapping of Cloudflare PoP identifiers to pool IDs",
          type: {
            type: "object",
          },
          required: false,
        },
        random_steering: {
          name: "Random Steering",
          description: "Pool weights configuration for random steering",
          type: {
            type: "object",
            properties: {
              default_weight: {
                type: "number",
                description:
                  "Default weight for pools not specified in pool_weights",
              },
              pool_weights: {
                type: "object",
                additionalProperties: { type: "number" },
                description: "Mapping of pool IDs to custom weights",
              },
            },
          },
          required: false,
        },
        location_strategy: {
          name: "Location Strategy",
          description:
            "Controls location-based steering for non-proxied requests",
          type: {
            type: "object",
            properties: {
              mode: {
                type: "string",
                enum: ["pop", "resolver_ip"],
                description: "Authoritative location when ECS is not available",
              },
              prefer_ecs: {
                type: "string",
                enum: ["always", "never", "proximity", "geo"],
                description: "Whether to prefer EDNS Client Subnet GeoIP",
              },
            },
          },
          required: false,
        },
      },
      onEvent: async (input) => {
        const {
          zone_id,
          name,
          steering_policy,
          region_pools,
          country_pools,
          pop_pools,
          random_steering,
          location_strategy,
        } = input.event.inputConfig;

        const client = new Cloudflare({
          apiToken: input.app.config.apiToken as string,
        });

        // Find the load balancer by name
        const existingLoadBalancers = [];
        for await (const lb of client.loadBalancers.list({ zone_id })) {
          if (lb.name === name) {
            existingLoadBalancers.push(lb);
          }
        }

        if (existingLoadBalancers.length === 0) {
          throw new Error(`Load balancer not found: ${name}`);
        }

        const loadBalancer = existingLoadBalancers[0];

        // Build update parameters
        const updateParams: any = {
          zone_id,
          default_pools: loadBalancer.default_pools || [],
          fallback_pool: loadBalancer.fallback_pool,
          name: loadBalancer.name,
          steering_policy,
        };

        // Add optional parameters based on steering policy and configuration
        if (region_pools) {
          updateParams.region_pools = region_pools;
        }

        if (country_pools) {
          updateParams.country_pools = country_pools;
        }

        if (pop_pools) {
          updateParams.pop_pools = pop_pools;
        }

        if (random_steering) {
          updateParams.random_steering = random_steering;
        }

        if (location_strategy) {
          updateParams.location_strategy = location_strategy;
        }

        // Preserve other existing settings
        if (loadBalancer.description) {
          updateParams.description = loadBalancer.description;
        }
        if (loadBalancer.enabled !== undefined) {
          updateParams.enabled = loadBalancer.enabled;
        }
        if (loadBalancer.proxied !== undefined) {
          updateParams.proxied = loadBalancer.proxied;
        }
        if (loadBalancer.session_affinity) {
          updateParams.session_affinity = loadBalancer.session_affinity;
        }
        if (loadBalancer.ttl) {
          updateParams.ttl = loadBalancer.ttl;
        }

        const result = await client.loadBalancers.update(
          loadBalancer.id!,
          updateParams,
        );

        await events.emit({
          ...result,
          previous_steering_policy: loadBalancer.steering_policy,
          steering_changed: loadBalancer.steering_policy !== steering_policy,
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
          default_pools: {
            type: "array",
            items: { type: "string" },
          },
          fallback_pool: { type: "string" },
          steering_policy: { type: "string" },
          region_pools: {
            type: "object",
          },
          country_pools: {
            type: "object",
          },
          pop_pools: {
            type: "object",
          },
          random_steering: {
            type: "object",
            properties: {
              default_weight: { type: "number" },
              pool_weights: {
                type: "object",
                additionalProperties: { type: "number" },
              },
            },
          },
          location_strategy: {
            type: "object",
            properties: {
              mode: { type: "string" },
              prefer_ecs: { type: "string" },
            },
          },
          proxied: { type: "boolean" },
          session_affinity: { type: "string" },
          ttl: { type: "number" },
          created_on: { type: "string" },
          modified_on: { type: "string" },
          previous_steering_policy: { type: "string" },
          steering_changed: { type: "boolean" },
        },
      },
    },
  },
};
