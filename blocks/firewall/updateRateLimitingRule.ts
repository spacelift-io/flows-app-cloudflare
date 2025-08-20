import { AppBlock, events } from "@slflows/sdk/v1";
import Cloudflare from "cloudflare";

export const updateRateLimitingRule: AppBlock = {
  name: "Update Rate Limiting Rule",
  description:
    "Create or update a Cloudflare rate limiting rule to control traffic based on request patterns",
  category: "Firewall",

  inputs: {
    default: {
      config: {
        zone_id: {
          name: "Zone ID",
          description:
            "The Cloudflare zone ID (optional - if not provided, uses account-level rule)",
          type: "string",
          required: false,
        },
        rule_name: {
          name: "Rule Name",
          description: "A descriptive name for this rate limiting rule",
          type: "string",
          required: true,
        },
        action: {
          name: "Action",
          description: "Action to take when rate limit is exceeded",
          type: {
            type: "string",
            enum: [
              "block",
              "challenge",
              "js_challenge",
              "managed_challenge",
              "log",
            ],
          },
          required: true,
        },
        requests_per_period: {
          name: "Requests per Period",
          description: "Number of requests allowed per period",
          type: "number",
          required: true,
        },
        period: {
          name: "Period (seconds)",
          description:
            "Time period in seconds for rate limiting (e.g., 60 for per minute)",
          type: "number",
          required: true,
        },
        characteristics: {
          name: "Rate Limit Characteristics",
          description: "Characteristics to group requests by for rate limiting",
          type: {
            type: "array",
            items: {
              type: "string",
              enum: [
                "ip.src",
                "cf.colo.id",
                "http.request.uri.path",
                "http.request.uri.query",
                "http.host",
                "http.user_agent",
                "http.cookie",
                "http.referer",
                "cf.ray_id",
                "cf.edge.server_port",
                "ip.geoip.country",
                "ip.geoip.asnum",
              ],
            },
          },
          required: true,
        },
        expression: {
          name: "Expression",
          description:
            "Expression to match requests for rate limiting (optional - applies to all requests if not specified)",
          type: "string",
          required: false,
        },
        mitigation_timeout: {
          name: "Mitigation Timeout",
          description:
            "Time in seconds after which action is disabled following execution (0 for no timeout)",
          type: "number",
          required: false,
        },
        counting_expression: {
          name: "Counting Expression",
          description:
            "Expression defining when to increment rate limit counter (optional - defaults to match expression)",
          type: "string",
          required: false,
        },
        requests_to_origin: {
          name: "Count Only Origin Requests",
          description: "Only count requests that reach the origin server",
          type: "boolean",
          required: false,
        },
        score_per_period: {
          name: "Score per Period",
          description:
            "Score threshold per period for action execution (alternative to requests_per_period)",
          type: "number",
          required: false,
        },
        enabled: {
          name: "Enabled",
          description: "Whether the rule should be active",
          type: "boolean",
          required: false,
        },
        description: {
          name: "Description",
          description: "Description of what this rate limiting rule does",
          type: "string",
          required: false,
        },
      },
      onEvent: async (input) => {
        const {
          zone_id,
          rule_name,
          action,
          requests_per_period,
          period,
          characteristics,
          expression = "true",
          mitigation_timeout,
          counting_expression,
          requests_to_origin,
          score_per_period,
          enabled = true,
          description,
        } = input.event.inputConfig;

        // Use account_id from app config if zone_id is not provided
        const account_id = zone_id
          ? undefined
          : (input.app.config.accountId as string);

        const client = new Cloudflare({
          apiToken: input.app.config.apiToken as string,
        });

        // Find or create the rate limiting ruleset
        const phase = "http_ratelimit";
        let rulesetId: string | null = null;

        // List existing rulesets to find rate limiting ruleset
        const listParams = zone_id ? { zone_id } : { account_id };
        const rulesetKind = zone_id ? "zone" : "custom";

        for await (const ruleset of client.rulesets.list(listParams)) {
          if (ruleset.phase === phase && ruleset.kind === rulesetKind) {
            rulesetId = ruleset.id!;
            break;
          }
        }

        // Create ruleset if it doesn't exist
        if (!rulesetId) {
          const createParams: any = {
            kind: rulesetKind,
            name: zone_id
              ? "Rate Limiting Rules"
              : "Account Rate Limiting Rules",
            phase: phase,
            ...(zone_id ? { zone_id } : { account_id }),
          };
          const newRuleset = await client.rulesets.create(createParams);
          rulesetId = newRuleset.id!;
        }

        // Build the ratelimit configuration
        const ratelimitConfig: any = {
          characteristics,
          period,
        };

        // Add rate limiting thresholds
        if (requests_per_period !== undefined) {
          ratelimitConfig.requests_per_period = requests_per_period;
        }
        if (score_per_period !== undefined) {
          ratelimitConfig.score_per_period = score_per_period;
        }

        // Add optional parameters
        if (mitigation_timeout !== undefined) {
          ratelimitConfig.mitigation_timeout = mitigation_timeout;
        }
        if (counting_expression) {
          ratelimitConfig.counting_expression = counting_expression;
        }
        if (requests_to_origin !== undefined) {
          ratelimitConfig.requests_to_origin = requests_to_origin;
        }

        // Check if rule already exists by name (using description field)
        let existingRuleId: string | null = null;
        const existingRuleset = await client.rulesets.get(
          rulesetId,
          listParams,
        );

        if (existingRuleset.rules) {
          for (const rule of existingRuleset.rules) {
            if (rule.description === rule_name) {
              existingRuleId = rule.id!;
              break;
            }
          }
        }

        const ruleParams: any = {
          action,
          expression,
          description: rule_name,
          enabled,
          ratelimit: ratelimitConfig,
          ...(zone_id ? { zone_id } : { account_id }),
        };

        let result;
        let operation;

        if (existingRuleId) {
          // Update existing rule
          result = await client.rulesets.rules.edit(
            rulesetId,
            existingRuleId,
            ruleParams,
          );
          operation = "updated";
        } else {
          // Create new rule
          result = await client.rulesets.rules.create(rulesetId, ruleParams);
          operation = "created";
        }

        // Get the rule from the result
        const rule =
          result.rules?.find((r) => r.description === rule_name) ||
          result.rules?.[0];

        await events.emit({
          rule_id: rule?.id,
          ruleset_id: result.id,
          name: rule_name,
          action,
          expression,
          requests_per_period,
          period,
          characteristics,
          mitigation_timeout,
          counting_expression,
          requests_to_origin,
          score_per_period,
          enabled,
          description,
          version: result.version,
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
          rule_id: { type: "string" },
          ruleset_id: { type: "string" },
          name: { type: "string" },
          action: { type: "string" },
          expression: { type: "string" },
          requests_per_period: { type: "number" },
          period: { type: "number" },
          characteristics: {
            type: "array",
            items: { type: "string" },
          },
          mitigation_timeout: { type: "number" },
          counting_expression: { type: "string" },
          requests_to_origin: { type: "boolean" },
          score_per_period: { type: "number" },
          enabled: { type: "boolean" },
          description: { type: "string" },
          version: { type: "string" },
          operation: { type: "string" },
        },
      },
    },
  },
};
