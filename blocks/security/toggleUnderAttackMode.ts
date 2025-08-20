import { AppBlock, events } from "@slflows/sdk/v1";
import Cloudflare from "cloudflare";

export const toggleUnderAttackMode: AppBlock = {
  name: "Toggle Under Attack Mode",
  description:
    "Enable or disable Cloudflare's Under Attack Mode for enhanced DDoS protection",
  category: "Security",

  inputs: {
    default: {
      config: {
        zone_id: {
          name: "Zone ID",
          description: "The Cloudflare zone ID",
          type: "string",
          required: true,
        },
        mode: {
          name: "Security Level",
          description: "Security level to set",
          type: {
            type: "string",
            enum: [
              "off",
              "essentially_off",
              "low",
              "medium",
              "high",
              "under_attack",
            ],
          },
          required: true,
        },
      },
      onEvent: async (input) => {
        const { zone_id, mode } = input.event.inputConfig;

        const client = new Cloudflare({
          apiToken: input.app.config.apiToken as string,
        });

        // Get current security level setting
        const currentSetting = (await client.zones.settings.get(
          "security_level",
          {
            zone_id,
          },
        )) as any;

        // Update the security level setting
        const result = (await client.zones.settings.edit("security_level", {
          zone_id,
          value: mode as any,
        })) as any;

        await events.emit({
          zone_id,
          setting_id: result.id,
          previous_value: currentSetting.value,
          current_value: result.value,
          changed: currentSetting.value !== result.value,
          under_attack_enabled: result.value === "under_attack",
          editable: result.editable,
          modified_on: result.modified_on,
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
          under_attack_enabled: { type: "boolean" },
          editable: { type: "boolean" },
          modified_on: { type: "string" },
        },
      },
    },
  },
};
