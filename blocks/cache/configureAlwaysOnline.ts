import { AppBlock, events } from "@slflows/sdk/v1";
import Cloudflare from "cloudflare";

export const configureAlwaysOnline: AppBlock = {
  name: "Configure Always Online",
  description:
    "Enable or disable Always Online to serve cached pages from Internet Archive when origin is offline",
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
        enabled: {
          name: "Enabled",
          description: "Enable or disable Always Online",
          type: "boolean",
          required: true,
        },
      },
      onEvent: async (input) => {
        const { zone_id, enabled } = input.event.inputConfig;

        const client = new Cloudflare({
          apiToken: input.app.config.apiToken as string,
        });

        // Get current Always Online setting
        const currentSetting = await client.zones.settings.get(
          "always_online",
          {
            zone_id,
          },
        );

        // Update the Always Online setting
        const result = await client.zones.settings.edit("always_online", {
          zone_id,
          value: enabled ? "on" : "off",
        });

        // Type assertion for AlwaysOnline interface properties
        const currentAlwaysOnline = currentSetting as {
          value: string;
          id: string;
          editable?: boolean;
          modified_on?: string;
        };
        const resultAlwaysOnline = result as {
          value: string;
          id: string;
          editable?: boolean;
          modified_on?: string;
        };

        await events.emit({
          zone_id,
          setting_id: resultAlwaysOnline.id,
          previous_value: currentAlwaysOnline.value,
          current_value: resultAlwaysOnline.value,
          changed: currentAlwaysOnline.value !== resultAlwaysOnline.value,
          enabled: resultAlwaysOnline.value === "on",
          editable: resultAlwaysOnline.editable,
          modified_on: resultAlwaysOnline.modified_on,
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
          enabled: { type: "boolean" },
          editable: { type: "boolean" },
          modified_on: { type: "string" },
        },
      },
    },
  },
};
