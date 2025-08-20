import { AppBlock, events } from "@slflows/sdk/v1";
import Cloudflare from "cloudflare";

export const setBrowserCacheTtl: AppBlock = {
  name: "Set Browser Cache TTL",
  description: "Set how long resources cached by client browsers remain valid",
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
        ttl: {
          name: "Cache TTL",
          description: "Browser cache TTL in seconds",
          type: {
            type: "number",
            enum: [
              0, 30, 60, 120, 300, 1200, 1800, 3600, 7200, 10800, 14400, 18000,
              28800, 43200, 57600, 72000, 86400, 172800, 259200, 345600, 432000,
              691200, 1382400, 2073600, 2678400, 5356800, 16070400, 31536000,
            ],
          },
          required: true,
        },
      },
      onEvent: async (input) => {
        const { zone_id, ttl } = input.event.inputConfig;

        const client = new Cloudflare({
          apiToken: input.app.config.apiToken as string,
        });

        // Get current Browser Cache TTL setting
        const currentSetting = await client.zones.settings.get(
          "browser_cache_ttl",
          {
            zone_id,
          },
        );

        // Update the Browser Cache TTL setting
        const result = await client.zones.settings.edit("browser_cache_ttl", {
          zone_id,
          value: ttl,
        });

        // Type assertion for BrowserCacheTTL interface properties
        const currentTtl = currentSetting as {
          value: number;
          id: string;
          editable?: boolean;
          modified_on?: string;
        };
        const resultTtl = result as {
          value: number;
          id: string;
          editable?: boolean;
          modified_on?: string;
        };

        await events.emit({
          zone_id,
          setting_id: resultTtl.id,
          previous_value: currentTtl.value,
          current_value: resultTtl.value,
          changed: currentTtl.value !== resultTtl.value,
          ttl_seconds: resultTtl.value,
          respect_origin: resultTtl.value === 0,
          editable: resultTtl.editable,
          modified_on: resultTtl.modified_on,
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
          zone_id: { type: "string" },
          setting_id: { type: "string" },
          previous_value: { type: "number" },
          current_value: { type: "number" },
          changed: { type: "boolean" },
          ttl_seconds: { type: "number" },
          respect_origin: { type: "boolean" },
          editable: { type: "boolean" },
          modified_on: { type: "string" },
        },
      },
    },
  },
};
