import { AppBlock, events } from "@slflows/sdk/v1";
import Cloudflare from "cloudflare";

export const listRecentSecurityEvents: AppBlock = {
  name: "List Recent Security Events",
  description:
    "Retrieve recent security events including firewall events, rate limiting triggers, and bot detections",
  category: "Security",

  inputs: {
    default: {
      config: {
        zone_id: {
          name: "Zone ID",
          description: "The zone identifier to get security events for",
          type: "string",
          required: true,
        },
        event_type: {
          name: "Event Type",
          description: "Type of security events to retrieve",
          type: {
            type: "string",
            enum: ["firewall", "ratelimit", "botfight", "ddos", "waf", "all"],
          },
          required: false,
        },
        since: {
          name: "Since",
          description:
            "Get events since this time (ISO format: 2024-01-01T00:00:00Z)",
          type: "string",
          required: false,
        },
        until: {
          name: "Until",
          description:
            "Get events until this time (ISO format: 2024-01-01T23:59:59Z)",
          type: "string",
          required: false,
        },
        limit: {
          name: "Limit",
          description: "Maximum number of events to return (1-1000)",
          type: "number",
          required: false,
        },
        action: {
          name: "Action",
          description: "Filter by action taken",
          type: {
            type: "string",
            enum: [
              "block",
              "challenge",
              "jschallenge",
              "allow",
              "log",
              "bypass",
            ],
          },
          required: false,
        },
        country: {
          name: "Country",
          description: "Filter by country code (e.g., US, GB)",
          type: "string",
          required: false,
        },
        ip: {
          name: "IP Address",
          description: "Filter by specific IP address",
          type: "string",
          required: false,
        },
        user_agent: {
          name: "User Agent",
          description: "Filter by user agent pattern",
          type: "string",
          required: false,
        },
      },
      onEvent: async (input) => {
        const {
          zone_id,
          event_type,
          since,
          until,
          limit,
          action,
          country,
          ip,
          user_agent,
        } = input.event.inputConfig;

        const client = new Cloudflare({
          apiToken: input.app.config.apiToken as string,
        });

        // Build query parameters
        const queryParams: any = {};

        if (since) {
          queryParams.since = since;
        } else {
          // Default to last 24 hours
          const defaultSince = new Date();
          defaultSince.setHours(defaultSince.getHours() - 24);
          queryParams.since = defaultSince.toISOString();
        }

        if (until) {
          queryParams.until = until;
        }

        if (limit) {
          queryParams.limit = Math.min(Math.max(limit, 1), 1000);
        } else {
          queryParams.limit = 100;
        }

        // Add filters
        if (action) {
          queryParams.action = action;
        }
        if (country) {
          queryParams.country = country;
        }
        if (ip) {
          queryParams.ip = ip;
        }
        if (user_agent) {
          queryParams.user_agent = user_agent;
        }

        let events_retrieved: any[] = [];

        try {
          // Get logs using the correct API structure
          const timeRange = {
            start: queryParams.since,
            end: queryParams.until || new Date().toISOString(),
          };

          let fields =
            "RayID,EdgeStartTimestamp,ClientIP,ClientCountry,Action,EdgeResponseStatus,UserAgent";

          // Add event-type specific fields
          if (
            event_type === "firewall" ||
            event_type === "all" ||
            !event_type
          ) {
            fields +=
              ",FirewallMatchesRuleIDs,FirewallMatchesActions,EdgeColoCode";
          }
          if (event_type === "ratelimit" || event_type === "all") {
            fields += ",RateLimitAction";
          }
          if (event_type === "botfight" || event_type === "all") {
            fields += ",BotScore,BotScoreSrc";
          }
          if (event_type === "waf" || event_type === "all") {
            fields += ",WAFAction,WAFRuleID,WAFRuleMessage";
          }

          const logParams = {
            zone_id,
            start: timeRange.start,
            end: timeRange.end,
            fields,
            count: queryParams.limit,
          };

          const logResponse = await client.logs.received.get(logParams);

          // Parse the log response (it's typically NDJSON format)
          if (typeof logResponse === "string") {
            const lines = logResponse.trim().split("\n");
            const logEvents = lines
              .map((line) => {
                try {
                  return JSON.parse(line);
                } catch (e) {
                  return null;
                }
              })
              .filter(Boolean);

            // Process and categorize events
            for (const event of logEvents) {
              let eventType = "unknown";
              let shouldInclude = false;

              // Categorize events based on available data
              if (
                event.FirewallMatchesRuleIDs &&
                event.FirewallMatchesRuleIDs.length > 0 &&
                (event_type === "firewall" ||
                  event_type === "all" ||
                  !event_type)
              ) {
                eventType = "firewall";
                shouldInclude = true;
              } else if (
                event.RateLimitAction &&
                (event_type === "ratelimit" || event_type === "all")
              ) {
                eventType = "ratelimit";
                shouldInclude = true;
              } else if (
                (event.BotScore !== undefined || event.BotScoreSrc) &&
                (event_type === "botfight" || event_type === "all")
              ) {
                eventType = "botfight";
                shouldInclude = true;
              } else if (
                event.WAFAction &&
                event.WAFAction !== "unknown" &&
                (event_type === "waf" || event_type === "all")
              ) {
                eventType = "waf";
                shouldInclude = true;
              } else if (
                (event_type === "all" || !event_type) &&
                (event.Action === "block" ||
                  event.Action === "challenge" ||
                  event.Action === "jschallenge")
              ) {
                eventType = "security";
                shouldInclude = true;
              }

              if (shouldInclude) {
                const processedEvent = {
                  event_type: eventType,
                  timestamp: event.EdgeStartTimestamp,
                  client_ip: event.ClientIP,
                  country: event.ClientCountry,
                  action:
                    event.Action || event.WAFAction || event.RateLimitAction,
                  ray_id: event.RayID,
                  user_agent: event.UserAgent,
                  response_status: event.EdgeResponseStatus,
                  rule_id: event.FirewallMatchesRuleIDs
                    ? event.FirewallMatchesRuleIDs[0]
                    : event.WAFRuleID,
                  bot_score: event.BotScore,
                  bot_score_src: event.BotScoreSrc,
                  waf_rule_id: event.WAFRuleID,
                  waf_rule_message: event.WAFRuleMessage,
                  colo: event.EdgeColoCode,
                  ...event, // Include all original fields
                };

                // Apply additional filters
                if (action && processedEvent.action !== action) continue;
                if (country && processedEvent.country !== country) continue;
                if (ip && processedEvent.client_ip !== ip) continue;
                if (
                  user_agent &&
                  !processedEvent.user_agent?.includes(user_agent)
                )
                  continue;

                events_retrieved.push(processedEvent);
              }
            }
          }
        } catch (error: any) {
          throw new Error(`Failed to fetch security events: ${error.message}`);
        }

        // Sort by timestamp (most recent first) and apply limit
        events_retrieved.sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
        );
        if (limit) {
          events_retrieved = events_retrieved.slice(0, limit);
        }

        await events.emit({
          events_count: events_retrieved.length,
          events: events_retrieved,
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
          events_count: { type: "number" },
          events: {
            type: "array",
            items: {
              type: "object",
              properties: {
                event_type: { type: "string" },
                timestamp: { type: "string" },
                client_ip: { type: "string" },
                country: { type: "string" },
                action: { type: "string" },
                ray_id: { type: "string" },
                user_agent: { type: "string" },
                response_status: { type: "number" },
                rule_id: { type: "string" },
                bot_score: { type: "number" },
                bot_score_src: { type: "string" },
                waf_rule_id: { type: "string" },
                waf_rule_message: { type: "string" },
                colo: { type: "string" },
              },
            },
          },
          timestamp: { type: "string" },
        },
      },
    },
  },
};
