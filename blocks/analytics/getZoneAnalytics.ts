import { AppBlock, events } from "@slflows/sdk/v1";
import Cloudflare from "cloudflare";

export const getZoneAnalytics: AppBlock = {
  name: "Get Zone Analytics",
  description:
    "Get analytics data for traffic, threats, and performance using Cloudflare's Radar API",
  category: "Analytics",

  inputs: {
    default: {
      config: {
        zone_name: {
          name: "Zone Name",
          description:
            "The domain name to get analytics for (e.g., example.com)",
          type: "string",
          required: false,
        },
        analytics_type: {
          name: "Analytics Type",
          description: "Type of analytics to retrieve",
          type: {
            type: "string",
            enum: ["http_traffic", "attacks", "bots", "dns", "netflows"],
          },
          required: true,
        },
        time_range: {
          name: "Time Range",
          description: "Time range for the analytics data",
          type: {
            type: "string",
            enum: ["1h", "3h", "6h", "12h", "24h", "3d", "7d", "30d"],
          },
          required: false,
        },
        date_start: {
          name: "Start Date",
          description: "Start date (ISO format: 2024-01-01T00:00:00Z)",
          type: "string",
          required: false,
        },
        date_end: {
          name: "End Date",
          description: "End date (ISO format: 2024-01-01T23:59:59Z)",
          type: "string",
          required: false,
        },
        location: {
          name: "Location",
          description: "Country code for location-specific data (e.g., US, GB)",
          type: "string",
          required: false,
        },
        asn: {
          name: "ASN",
          description: "Autonomous System Number for ASN-specific data",
          type: "string",
          required: false,
        },
        format: {
          name: "Format",
          description: "Data format for the response",
          type: {
            type: "string",
            enum: ["json", "csv"],
          },
          required: false,
        },
      },
      onEvent: async (input) => {
        const {
          zone_name,
          analytics_type,
          time_range,
          date_start,
          date_end,
          location,
          asn,
          format,
        } = input.event.inputConfig;

        const client = new Cloudflare({
          apiToken: input.app.config.apiToken as string,
        });

        // Build query parameters
        const queryParams: any = {};

        if (zone_name) {
          queryParams.name = zone_name;
        }
        if (date_start) {
          queryParams.dateStart = date_start;
        }
        if (date_end) {
          queryParams.dateEnd = date_end;
        }
        if (location) {
          queryParams.location = location;
        }
        if (asn) {
          queryParams.asn = asn;
        }
        if (format) {
          queryParams.format = format;
        }

        // Set default time range if no specific dates provided
        if (!date_start && !date_end && time_range) {
          const now = new Date();
          const start = new Date(now);

          switch (time_range) {
            case "1h":
              start.setHours(now.getHours() - 1);
              break;
            case "3h":
              start.setHours(now.getHours() - 3);
              break;
            case "6h":
              start.setHours(now.getHours() - 6);
              break;
            case "12h":
              start.setHours(now.getHours() - 12);
              break;
            case "24h":
              start.setDate(now.getDate() - 1);
              break;
            case "3d":
              start.setDate(now.getDate() - 3);
              break;
            case "7d":
              start.setDate(now.getDate() - 7);
              break;
            case "30d":
              start.setDate(now.getDate() - 30);
              break;
          }

          queryParams.dateStart = start.toISOString();
          queryParams.dateEnd = now.toISOString();
        }

        let result: any;
        let analytics_category: string;

        try {
          switch (analytics_type) {
            case "http_traffic":
              result = await client.radar.http.timeseries(queryParams);
              analytics_category = "HTTP Traffic";
              break;

            case "attacks":
              result =
                await client.radar.attacks.layer3.timeseries(queryParams);
              analytics_category = "Layer 3 Attacks";
              break;

            case "bots":
              result = await client.radar.bots.timeseries(queryParams);
              analytics_category = "Bot Traffic";
              break;

            case "dns":
              result = await client.radar.dns.timeseries(queryParams);
              analytics_category = "DNS Queries";
              break;

            case "netflows":
              result = await client.radar.netflows.timeseries(queryParams);
              analytics_category = "Network Flows";
              break;

            default:
              throw new Error(`Unsupported analytics type: ${analytics_type}`);
          }
        } catch (error: any) {
          throw new Error(
            `Failed to fetch ${analytics_type} analytics: ${error.message}`,
          );
        }

        await events.emit({
          analytics_type,
          analytics_category,
          zone_name: zone_name || "Global",
          time_range: time_range || "Custom",
          date_range: {
            start: queryParams.dateStart,
            end: queryParams.dateEnd,
          },
          filters: {
            location,
            asn,
          },
          data: result,
          meta: result.meta || null,
          timestamp: new Date().toISOString(),
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
          analytics_type: { type: "string" },
          analytics_category: { type: "string" },
          zone_name: { type: "string" },
          time_range: { type: "string" },
          date_range: {
            type: "object",
            properties: {
              start: { type: "string" },
              end: { type: "string" },
            },
          },
          filters: {
            type: "object",
            properties: {
              location: { type: "string" },
              asn: { type: "string" },
            },
          },
          data: { type: "object" },
          meta: { type: "object" },
          timestamp: { type: "string" },
        },
      },
    },
  },
};
