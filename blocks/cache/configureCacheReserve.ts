import { AppBlock, events } from "@slflows/sdk/v1";
import Cloudflare from "cloudflare";

export const configureCacheReserve: AppBlock = {
  name: "Configure Cache Reserve",
  description:
    "Enable or disable Cloudflare Cache Reserve and Smart Tiered Cache for enhanced cache performance",
  category: "Cache",

  inputs: {
    default: {
      config: {
        zone_id: {
          name: "Zone ID",
          description: "The Cloudflare zone ID",
          type: "string",
          required: true,
        },
        cache_reserve: {
          name: "Cache Reserve",
          description:
            "Enable or disable Cache Reserve (requires subscription)",
          type: {
            type: "string",
            enum: ["on", "off"],
          },
          required: false,
        },
        smart_tiered_cache: {
          name: "Smart Tiered Cache",
          description: "Enable or disable Smart Tiered Cache",
          type: {
            type: "string",
            enum: ["on", "off"],
          },
          required: false,
        },
      },
      onEvent: async (input) => {
        const { zone_id, cache_reserve, smart_tiered_cache } =
          input.event.inputConfig;

        const client = new Cloudflare({
          apiToken: input.app.config.apiToken as string,
        });

        const results: any = {};

        // Configure Cache Reserve if specified
        if (cache_reserve) {
          const reserveResult = await client.cache.cacheReserve.edit({
            zone_id,
            value: cache_reserve,
          });
          results.cache_reserve = reserveResult;
        }

        // Configure Smart Tiered Cache if specified
        if (smart_tiered_cache) {
          if (smart_tiered_cache === "off") {
            const tieredResult = await client.cache.smartTieredCache.delete({
              zone_id,
            });
            results.smart_tiered_cache = tieredResult;
          } else {
            const tieredResult = await client.cache.smartTieredCache.edit({
              zone_id,
              value: smart_tiered_cache,
            });
            results.smart_tiered_cache = tieredResult;
          }
        }

        await events.emit(results);
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
          cache_reserve: {
            type: "object",
            properties: {
              id: { type: "string" },
              value: { type: "string" },
              editable: { type: "boolean" },
              modified_on: { type: "string" },
            },
          },
          smart_tiered_cache: {
            type: "object",
            properties: {
              id: { type: "string" },
              value: { type: "string" },
              editable: { type: "boolean" },
              modified_on: { type: "string" },
            },
          },
        },
      },
    },
  },
};
