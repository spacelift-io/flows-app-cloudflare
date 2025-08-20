import { AppBlock, events } from "@slflows/sdk/v1";
import Cloudflare from "cloudflare";

export const toggleDevMode: AppBlock = {
  name: "Toggle Development Mode",
  description:
    "Enable or disable Cloudflare development mode to bypass cache temporarily",
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
        value: {
          name: "Development Mode",
          description: "Enable or disable development mode",
          type: {
            type: "string",
            enum: ["on", "off"],
          },
          required: true,
        },
      },
      onEvent: async (input) => {
        const { zone_id, value } = input.event.inputConfig;

        const client = new Cloudflare({
          apiToken: input.app.config.apiToken as string,
        });

        const result = await client.zones.settings.edit("development_mode", {
          zone_id,
          value,
        });

        await events.emit(result);
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
          value: { type: "string" },
          editable: { type: "boolean" },
          modified_on: { type: "string" },
        },
      },
    },
  },
};
