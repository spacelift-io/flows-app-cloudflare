import { AppBlock, events } from "@slflows/sdk/v1";
import Cloudflare from "cloudflare";

export const updateTlsVersion: AppBlock = {
  name: "Update TLS Version",
  description:
    "Update the minimum TLS version required for connections to the zone",
  category: "SSL",

  inputs: {
    default: {
      config: {
        zone_id: {
          name: "Zone ID",
          description: "The Cloudflare zone ID",
          type: "string",
          required: true,
        },
        min_tls_version: {
          name: "Minimum TLS Version",
          description: "Minimum TLS protocol version required for connections",
          type: {
            type: "string",
            enum: ["1.0", "1.1", "1.2", "1.3"],
          },
          required: true,
        },
      },
      onEvent: async (input) => {
        const { zone_id, min_tls_version } = input.event.inputConfig;

        const client = new Cloudflare({
          apiToken: input.app.config.apiToken as string,
        });

        // Get current TLS version setting
        const currentSetting = await client.zones.settings.get(
          "min_tls_version",
          {
            zone_id,
          },
        );

        // Update the minimum TLS version setting
        const result = await client.zones.settings.edit("min_tls_version", {
          zone_id,
          value: min_tls_version,
        });

        // Type assertion for MinTLSVersion interface properties
        const currentTls = currentSetting as {
          value: string;
          id: string;
          editable?: boolean;
          modified_on?: string;
        };
        const resultTls = result as {
          value: string;
          id: string;
          editable?: boolean;
          modified_on?: string;
        };

        await events.emit({
          zone_id,
          setting_id: resultTls.id,
          previous_value: currentTls.value,
          current_value: resultTls.value,
          changed: currentTls.value !== resultTls.value,
          editable: resultTls.editable,
          modified_on: resultTls.modified_on,
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
          previous_value: { type: "string" },
          current_value: { type: "string" },
          changed: { type: "boolean" },
          editable: { type: "boolean" },
          modified_on: { type: "string" },
        },
      },
    },
  },
};
