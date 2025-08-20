import { AppBlock, events } from "@slflows/sdk/v1";
import Cloudflare from "cloudflare";

export const createFirewallRule: AppBlock = {
  name: "Create Firewall Rule",
  description:
    "Create a Cloudflare firewall rule to block or challenge traffic by IP, ASN, country, or custom expression",
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
          description: "A descriptive name for this firewall rule",
          type: "string",
          required: true,
        },
        action: {
          name: "Action",
          description: "Action to take when rule matches",
          type: {
            type: "string",
            enum: ["block", "challenge", "js_challenge", "managed_challenge"],
          },
          required: true,
        },
        target_type: {
          name: "Target Type",
          description: "Type of target to filter by",
          type: {
            type: "string",
            enum: ["ip", "ip_range", "asn", "country", "custom_expression"],
          },
          required: true,
        },
        target_value: {
          name: "Target Value",
          description:
            "Value for the target (IP address, ASN number, country code, or custom expression)",
          type: "string",
          required: true,
        },
        description: {
          name: "Description",
          description: "Description of what this rule does",
          type: "string",
          required: false,
        },
        enabled: {
          name: "Enabled",
          description: "Whether the rule should be active",
          type: "boolean",
          required: false,
        },
        priority: {
          name: "Priority",
          description: "Rule priority (lower numbers have higher priority)",
          type: "number",
          required: false,
        },
      },
      onEvent: async (input) => {
        const {
          zone_id,
          rule_name,
          action,
          target_type,
          target_value,
          description,
          enabled = true,
          priority,
        } = input.event.inputConfig;

        // Use account_id from app config if zone_id is not provided
        const account_id = zone_id
          ? undefined
          : (input.app.config.accountId as string);

        const client = new Cloudflare({
          apiToken: input.app.config.apiToken as string,
        });

        // Build the expression based on target type
        let expression = "";
        switch (target_type) {
          case "ip":
            expression = `(ip.src eq ${target_value})`;
            break;
          case "ip_range":
            expression = `(ip.src in {${target_value}})`;
            break;
          case "asn":
            expression = `(ip.geoip.asnum eq ${target_value})`;
            break;
          case "country":
            expression = `(ip.geoip.country eq "${target_value.toUpperCase()}")`;
            break;
          case "custom_expression":
            expression = target_value;
            break;
          default:
            throw new Error(`Unsupported target type: ${target_type}`);
        }

        // Find or create the custom firewall ruleset
        const phase = "http_request_firewall_custom";
        let rulesetId: string | null = null;

        // List existing rulesets to find custom firewall ruleset
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
            name: zone_id ? "Custom Firewall Rules" : "Account Firewall Rules",
            phase: phase,
            ...(zone_id ? { zone_id } : { account_id }),
          };
          const newRuleset = await client.rulesets.create(createParams);
          rulesetId = newRuleset.id!;
        }

        // Prepare the rule based on action type
        const baseRuleParams = {
          expression,
          description: rule_name,
          enabled,
          ...(zone_id ? { zone_id } : { account_id }),
        };

        let ruleParams: any;
        switch (action) {
          case "block":
            ruleParams = {
              ...baseRuleParams,
              action: "block",
            };
            break;
          case "challenge":
            ruleParams = {
              ...baseRuleParams,
              action: "challenge",
            };
            break;
          case "js_challenge":
            ruleParams = {
              ...baseRuleParams,
              action: "js_challenge",
            };
            break;
          case "managed_challenge":
            ruleParams = {
              ...baseRuleParams,
              action: "managed_challenge",
            };
            break;
          default:
            throw new Error(`Unsupported action: ${action}`);
        }

        // Add position if priority is specified
        if (priority !== undefined) {
          ruleParams.position = {
            index: priority,
          };
        }

        const result = await client.rulesets.rules.create(
          rulesetId,
          ruleParams,
        );

        await events.emit({
          rule_id: result.rules?.[0]?.id,
          ruleset_id: result.id,
          name: rule_name,
          action,
          expression,
          target_type,
          target_value,
          enabled,
          description,
          version: result.version,
          created: true,
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
          target_type: { type: "string" },
          target_value: { type: "string" },
          enabled: { type: "boolean" },
          description: { type: "string" },
          version: { type: "string" },
          created: { type: "boolean" },
        },
      },
    },
  },
};
