import { AppBlock, events } from "@slflows/sdk/v1";
import Cloudflare from "cloudflare";

export const purgeCache: AppBlock = {
  name: "Purge Cache",
  description: "Purge Cloudflare cache by URL, tag, or everything for a zone",
  category: "Cache",

  inputs: {
    default: {
      config: {
        zoneId: {
          name: "Zone ID",
          description: "The Cloudflare zone ID",
          type: "string",
          required: true,
        },
        purgeType: {
          name: "Purge Type",
          description: "Type of cache purge to perform",
          type: {
            type: "string",
            enum: ["everything", "urls", "tags"],
          },
          required: true,
        },
        urls: {
          name: "URLs",
          description:
            "Array of URLs to purge (required if purge type is 'urls')",
          type: {
            type: "array",
            items: { type: "string" },
          },
          required: false,
        },
        tags: {
          name: "Tags",
          description:
            "Array of cache tags to purge (required if purge type is 'tags')",
          type: {
            type: "array",
            items: { type: "string" },
          },
          required: false,
        },
      },
      onEvent: async (input) => {
        const { zoneId, purgeType, urls, tags } = input.event.inputConfig;
        const client = new Cloudflare({
          apiToken: input.app.config.apiToken as string,
        });

        let purgeParams: any = { zone_id: zoneId };

        switch (purgeType) {
          case "everything":
            purgeParams.purge_everything = true;
            break;

          case "urls":
            if (!urls || !Array.isArray(urls) || urls.length === 0) {
              throw new Error("URLs are required when purge type is 'urls'");
            }
            purgeParams.files = urls;
            break;

          case "tags":
            if (!tags || !Array.isArray(tags) || tags.length === 0) {
              throw new Error("Tags are required when purge type is 'tags'");
            }
            purgeParams.tags = tags;
            break;

          default:
            throw new Error(`Invalid purge type: ${purgeType}`);
        }

        const result = await client.cache.purge(purgeParams);

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
        },
      },
    },
  },
};
