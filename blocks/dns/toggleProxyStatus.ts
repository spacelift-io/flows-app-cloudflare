import { AppBlock, events } from "@slflows/sdk/v1";
import Cloudflare from "cloudflare";

export const toggleProxyStatus: AppBlock = {
  name: "Toggle Proxy Status",
  description:
    "Toggle DNS record proxy status (orange/gray cloud) for A, AAAA, and CNAME records",
  category: "DNS",

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
          name: "Record Name",
          description: "DNS record name to modify (or @ for the zone apex)",
          type: "string",
          required: true,
        },
        type: {
          name: "Record Type",
          description:
            "DNS record type (only A, AAAA, and CNAME can be proxied)",
          type: {
            type: "string",
            enum: ["A", "AAAA", "CNAME"],
          },
          required: true,
        },
        proxied: {
          name: "Proxied",
          description: "Enable (orange cloud) or disable (gray cloud) proxy",
          type: "boolean",
          required: true,
        },
      },
      onEvent: async (input) => {
        const { zone_id, name, type, proxied } = input.event.inputConfig;

        const client = new Cloudflare({
          apiToken: input.app.config.apiToken as string,
        });

        // Find the DNS record to update
        const existingRecords = [];
        for await (const record of client.dns.records.list({
          zone_id,
          name,
          type: type as any,
        })) {
          existingRecords.push(record);
        }

        if (existingRecords.length === 0) {
          throw new Error(`DNS record not found: ${name} (${type})`);
        }

        // Update the first matching record's proxy status
        const recordToUpdate = existingRecords[0];
        const result = await client.dns.records.update(recordToUpdate.id, {
          zone_id,
          name: recordToUpdate.name,
          type: recordToUpdate.type as any,
          content: recordToUpdate.content,
          ttl: recordToUpdate.ttl,
          proxied,
          ...(recordToUpdate.comment && { comment: recordToUpdate.comment }),
        });

        await events.emit({
          ...result,
          previous_proxied: recordToUpdate.proxied,
          proxy_changed: recordToUpdate.proxied !== proxied,
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
          zone_id: { type: "string" },
          zone_name: { type: "string" },
          name: { type: "string" },
          type: { type: "string" },
          content: { type: "string" },
          ttl: { type: "number" },
          proxied: { type: "boolean" },
          comment: { type: "string" },
          created_on: { type: "string" },
          modified_on: { type: "string" },
          previous_proxied: { type: "boolean" },
          proxy_changed: { type: "boolean" },
        },
      },
    },
  },
};
