import { AppBlock, events } from "@slflows/sdk/v1";
import Cloudflare from "cloudflare";

export const updateWafCustomRule: AppBlock = {
  name: "Update WAF Custom Rule",
  description: "Create or update a WAF custom rule in a ruleset",
  category: "WAF",

  inputs: {
    default: {
      config: {
        zone_id: {
          name: "Zone ID",
          description: "The Cloudflare zone ID",
          type: "string",
          required: false,
        },
        ruleset_id: {
          name: "Ruleset ID",
          description:
            "ID of the ruleset to add/update the rule in (if not provided, will create/find WAF custom ruleset)",
          type: "string",
          required: false,
        },
        rule_id: {
          name: "Rule ID",
          description:
            "ID of existing rule to update (leave empty to create new rule)",
          type: "string",
          required: false,
        },
        expression: {
          name: "Rule Expression",
          description:
            "Wireshark-like expression for matching traffic (e.g., 'http.request.uri.path contains \"/api/\"')",
          type: "string",
          required: true,
        },
        action: {
          name: "Action",
          description: "Action to take when rule matches",
          type: {
            type: "string",
            enum: [
              "block",
              "challenge",
              "js_challenge",
              "managed_challenge",
              "allow",
              "log",
              "skip",
            ],
          },
          required: true,
        },
        description: {
          name: "Description",
          description: "Description of the rule",
          type: "string",
          required: false,
        },
        enabled: {
          name: "Enabled",
          description: "Whether the rule is enabled",
          type: "boolean",
          required: false,
        },
        action_parameters: {
          name: "Action Parameters",
          description: "Additional parameters for the action (JSON string)",
          type: "string",
          required: false,
        },
        logging: {
          name: "Logging Settings",
          description:
            "Logging configuration (JSON string with enabled boolean)",
          type: "string",
          required: false,
        },
      },
      onEvent: async (input) => {
        const {
          zone_id,
          ruleset_id,
          rule_id,
          expression,
          action,
          description,
          enabled,
          action_parameters,
          logging,
        } = input.event.inputConfig;

        const client = new Cloudflare({
          apiToken: input.app.config.apiToken as string,
        });

        const account_id = input.app.config.accountId as string;

        // Parse JSON parameters
        const actionParams = action_parameters
          ? JSON.parse(action_parameters)
          : undefined;
        const loggingConfig = logging ? JSON.parse(logging) : undefined;

        let targetRulesetId = ruleset_id;

        // If no ruleset ID provided, find or create the WAF custom ruleset
        if (!targetRulesetId) {
          const listParams = zone_id ? { zone_id } : { account_id };
          const rulesets = await client.rulesets.list(listParams);

          // Look for existing WAF custom ruleset
          const wafRuleset = rulesets.result?.find(
            (rs) =>
              rs.phase === "http_request_firewall_custom" && rs.kind === "zone",
          );

          if (wafRuleset) {
            targetRulesetId = wafRuleset.id;
          } else {
            // Create new WAF custom ruleset
            const newRuleset = await client.rulesets.create({
              ...(zone_id ? { zone_id } : { account_id }),
              name: "WAF Custom Rules",
              description: "Custom WAF rules",
              kind: "zone" as any,
              phase: "http_request_firewall_custom" as any,
            });
            targetRulesetId = newRuleset.id;
          }
        }

        const ruleData = {
          expression,
          action: action as any,
          description,
          enabled: enabled ?? true,
          action_parameters: actionParams,
          logging: loggingConfig,
        };

        let result;
        let operation;

        if (rule_id) {
          // Update existing rule
          const updateParams = zone_id ? { zone_id } : { account_id };
          result = await client.rulesets.rules.edit(targetRulesetId, rule_id, {
            ...updateParams,
            ...ruleData,
          });
          operation = "updated";
        } else {
          // Create new rule
          const createParams = zone_id ? { zone_id } : { account_id };
          result = await client.rulesets.rules.create(targetRulesetId, {
            ...createParams,
            ...ruleData,
          });
          operation = "created";
        }

        await events.emit({
          ...result,
          ruleset_id: targetRulesetId,
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
          expression: { type: "string" },
          action: { type: "string" },
          description: { type: "string" },
          enabled: { type: "boolean" },
          action_parameters: { type: "object" },
          logging: { type: "object" },
          last_updated: { type: "string" },
          version: { type: "string" },
          ruleset_id: { type: "string" },
          operation: { type: "string" },
        },
      },
    },
  },
};
