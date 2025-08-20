import { AppBlock, events } from "@slflows/sdk/v1";
import Cloudflare from "cloudflare";

export const updateDnsRecord: AppBlock = {
  name: "Update DNS Record",
  description:
    "Update or create DNS records (A, AAAA, CNAME, TXT) for a Cloudflare zone",
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
          name: "Name",
          description: "DNS record name (or @ for the zone apex)",
          type: "string",
          required: true,
        },
        type: {
          name: "Type",
          description: "DNS record type",
          type: {
            type: "string",
            enum: ["A", "AAAA", "CNAME", "TXT"],
          },
          required: true,
        },
        content: {
          name: "Content",
          description:
            "DNS record content (IP address for A/AAAA, domain for CNAME, text for TXT)",
          type: "string",
          required: true,
        },
        ttl: {
          name: "TTL",
          description: "Time To Live in seconds (60-86400, or 1 for automatic)",
          type: "number",
          required: false,
        },
        proxied: {
          name: "Proxied",
          description:
            "Whether the record is proxied through Cloudflare (A, AAAA, CNAME only)",
          type: "boolean",
          required: false,
        },
        comment: {
          name: "Comment",
          description: "Comments or notes about the DNS record",
          type: "string",
          required: false,
        },
      },
      onEvent: async (input) => {
        const {
          zone_id,
          name,
          type,
          content,
          ttl = 1,
          proxied,
          comment,
        } = input.event.inputConfig;

        const client = new Cloudflare({
          apiToken: input.app.config.apiToken as string,
        });

        // First, try to find existing record with the same name and type
        const existingRecords = [];
        for await (const record of client.dns.records.list({
          zone_id,
          name,
          type: type as any,
        })) {
          existingRecords.push(record);
        }

        let result;
        let operation;

        if (existingRecords.length > 0) {
          // Update existing record (take the first one if multiple exist)
          const recordToUpdate = existingRecords[0];
          result = await client.dns.records.update(recordToUpdate.id, {
            zone_id,
            name,
            type: type as any,
            content,
            ttl,
            ...(proxied !== undefined && { proxied }),
            ...(comment && { comment }),
          });
          operation = "updated";
        } else {
          // Create new record
          result = await client.dns.records.create({
            zone_id,
            name,
            type: type as any,
            content,
            ttl,
            ...(proxied !== undefined && { proxied }),
            ...(comment && { comment }),
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
          operation: { type: "string" },
        },
      },
    },
  },
};
