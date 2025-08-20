import { AppBlock, events } from "@slflows/sdk/v1";
import Cloudflare from "cloudflare";

export const getRateLimitAnalytics: AppBlock = {
  name: "Get Rate Limit Analytics",
  description:
    "Retrieve rate limiting analytics and statistics from Cloudflare",
  category: "Analytics",

  inputs: {
    default: {
      config: {
        zone_id: {
          name: "Zone ID",
          description: "The zone identifier to get rate limit analytics for",
          type: "string",
          required: true,
        },
        time_range: {
          name: "Time Range",
          description: "Time range for the analytics data",
          type: {
            type: "string",
            enum: ["1h", "6h", "12h", "24h", "3d", "7d", "30d"],
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
        rule_id: {
          name: "Rule ID",
          description: "Specific rate limiting rule ID to filter by",
          type: "string",
          required: false,
        },
        action: {
          name: "Action",
          description: "Filter by rate limit action taken",
          type: {
            type: "string",
            enum: ["block", "challenge", "simulate", "ban", "log"],
          },
          required: false,
        },
        interval: {
          name: "Interval",
          description: "Data aggregation interval",
          type: {
            type: "string",
            enum: ["1m", "5m", "15m", "1h", "1d"],
          },
          required: false,
        },
      },
      onEvent: async (input) => {
        const { zone_id, time_range, date_start, date_end, rule_id, action } =
          input.event.inputConfig;

        const client = new Cloudflare({
          apiToken: input.app.config.apiToken as string,
        });

        // Calculate time range if not provided
        let startTime = date_start;
        let endTime = date_end;

        if (!startTime && !endTime && time_range) {
          const now = new Date();
          const start = new Date(now);

          switch (time_range) {
            case "1h":
              start.setHours(now.getHours() - 1);
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

          startTime = start.toISOString();
          endTime = now.toISOString();
        } else if (!startTime || !endTime) {
          // Default to last 24 hours
          const now = new Date();
          const start = new Date(now);
          start.setDate(now.getDate() - 1);
          startTime = start.toISOString();
          endTime = now.toISOString();
        }

        let rateLimitEvents: any[] = [];
        let totalRequests = 0;
        let rateLimitedRequests = 0;
        let actionCounts: { [key: string]: number } = {};
        let ruleStats: { [key: string]: any } = {};
        let rateLimitPercentage = "0.00";

        try {
          // Get rate limiting analytics using logs API
          const logParams: any = {
            zone_id,
            start: startTime,
            end: endTime,
            fields:
              "RayID,EdgeStartTimestamp,ClientIP,ClientCountry,Action,RateLimitAction,RuleID,EdgeResponseStatus,ClientRequestURI,UserAgent",
          };

          const logResponse = await client.logs.received.get(logParams);

          // Parse log response
          if (typeof logResponse === "string") {
            const lines = logResponse.trim().split("\n");

            for (const line of lines) {
              try {
                const logEntry = JSON.parse(line);
                totalRequests++;

                // Check if this is a rate limit event
                if (
                  logEntry.RateLimitAction ||
                  (logEntry.Action &&
                    ["ratelimit", "rate_limit"].includes(logEntry.Action))
                ) {
                  rateLimitedRequests++;

                  const actionTaken =
                    logEntry.RateLimitAction || logEntry.Action;
                  const ruleId = logEntry.RuleID || "unknown";

                  // Filter by action if specified
                  if (action && actionTaken !== action) continue;

                  // Filter by rule ID if specified
                  if (rule_id && ruleId !== rule_id) continue;

                  // Count actions
                  actionCounts[actionTaken] =
                    (actionCounts[actionTaken] || 0) + 1;

                  // Track rule statistics
                  if (!ruleStats[ruleId]) {
                    ruleStats[ruleId] = {
                      rule_id: ruleId,
                      total_triggers: 0,
                      actions: {},
                      unique_ips: new Set(),
                    };
                  }

                  ruleStats[ruleId].total_triggers++;
                  ruleStats[ruleId].actions[actionTaken] =
                    (ruleStats[ruleId].actions[actionTaken] || 0) + 1;
                  ruleStats[ruleId].unique_ips.add(logEntry.ClientIP);

                  const rateLimitEvent = {
                    timestamp: logEntry.EdgeStartTimestamp,
                    ray_id: logEntry.RayID,
                    client_ip: logEntry.ClientIP,
                    country: logEntry.ClientCountry,
                    action: actionTaken,
                    rule_id: ruleId,
                    response_status: logEntry.EdgeResponseStatus,
                    request_uri: logEntry.ClientRequestURI,
                    user_agent: logEntry.UserAgent,
                  };

                  rateLimitEvents.push(rateLimitEvent);
                }
              } catch (e) {
                // Skip invalid JSON lines
                continue;
              }
            }
          }

          // Calculate rate limit percentage
          rateLimitPercentage =
            totalRequests > 0
              ? ((rateLimitedRequests / totalRequests) * 100).toFixed(2)
              : "0.00";
        } catch (error: any) {
          throw new Error(
            `Failed to fetch rate limit analytics: ${error.message}`,
          );
        }

        // Convert rule stats to array and calculate unique IP counts
        const ruleStatsArray = Object.values(ruleStats).map((rule: any) => ({
          ...rule,
          unique_ips: rule.unique_ips.size,
        }));

        // Sort events by timestamp (most recent first)
        rateLimitEvents.sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
        );

        await events.emit({
          total_requests: totalRequests,
          rate_limited_requests: rateLimitedRequests,
          rate_limit_percentage: parseFloat(rateLimitPercentage),
          action_counts: actionCounts,
          rule_statistics: ruleStatsArray,
          events_count: rateLimitEvents.length,
          events: rateLimitEvents,
          time_range: {
            start: startTime,
            end: endTime,
          },
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
          total_requests: { type: "number" },
          rate_limited_requests: { type: "number" },
          rate_limit_percentage: { type: "number" },
          action_counts: {
            type: "object",
            additionalProperties: { type: "number" },
          },
          rule_statistics: {
            type: "array",
            items: {
              type: "object",
              properties: {
                rule_id: { type: "string" },
                total_triggers: { type: "number" },
                unique_ips: { type: "number" },
                actions: {
                  type: "object",
                  additionalProperties: { type: "number" },
                },
              },
            },
          },
          events_count: { type: "number" },
          events: {
            type: "array",
            items: {
              type: "object",
              properties: {
                timestamp: { type: "string" },
                ray_id: { type: "string" },
                client_ip: { type: "string" },
                country: { type: "string" },
                action: { type: "string" },
                rule_id: { type: "string" },
                response_status: { type: "number" },
                request_uri: { type: "string" },
                user_agent: { type: "string" },
              },
            },
          },
          time_range: {
            type: "object",
            properties: {
              start: { type: "string" },
              end: { type: "string" },
            },
          },
          timestamp: { type: "string" },
        },
      },
    },
  },
};
