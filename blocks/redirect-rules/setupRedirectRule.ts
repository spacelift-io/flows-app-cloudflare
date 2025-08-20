import { AppBlock, events } from "@slflows/sdk/v1";
import Cloudflare from "cloudflare";

export const setupRedirectRule: AppBlock = {
  name: "Setup Redirect Rule",
  description:
    "Create or update a redirect rule using Cloudflare's Rules Engine for 301/302 redirects",
  category: "Redirect Rules",

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
            "ID of the ruleset to add/update the rule in (if not provided, will create/find redirect ruleset)",
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
            "Expression for matching traffic (e.g., 'http.request.uri.path matches \"/old-path/*\"')",
          type: "string",
          required: true,
        },
        target_url: {
          name: "Target URL",
          description:
            "URL to redirect to (static URL like 'https://example.com/new-path')",
          type: "string",
          required: false,
        },
        target_expression: {
          name: "Target Expression",
          description:
            "Dynamic expression for redirect URL (e.g., 'concat(\"https://new-domain.com\", http.request.uri.path)')",
          type: "string",
          required: false,
        },
        status_code: {
          name: "Status Code",
          description: "HTTP redirect status code",
          type: {
            type: "number",
            enum: [301, 302, 303, 307, 308],
          },
          required: true,
        },
        preserve_query_string: {
          name: "Preserve Query String",
          description: "Keep the original query string parameters",
          type: "boolean",
          required: false,
        },
        description: {
          name: "Description",
          description: "Description of the redirect rule",
          type: "string",
          required: false,
        },
        enabled: {
          name: "Enabled",
          description: "Whether the rule is enabled",
          type: "boolean",
          required: false,
        },
      },
      onEvent: async (input) => {
        const {
          zone_id,
          ruleset_id,
          rule_id,
          expression,
          target_url,
          target_expression,
          status_code,
          preserve_query_string,
          description,
          enabled,
        } = input.event.inputConfig;

        const client = new Cloudflare({
          apiToken: input.app.config.apiToken as string,
        });

        const account_id = input.app.config.accountId as string;

        // Validate that either target_url or target_expression is provided
        if (!target_url && !target_expression) {
          throw new Error(
            "Either target_url or target_expression must be provided",
          );
        }

        let targetRulesetId = ruleset_id;

        // If no ruleset ID provided, find or create the redirect ruleset
        if (!targetRulesetId) {
          const listParams = zone_id ? { zone_id } : { account_id };
          const rulesets = await client.rulesets.list(listParams);

          // Look for existing redirect ruleset
          const redirectRuleset = rulesets.result?.find(
            (rs) =>
              rs.phase === "http_request_dynamic_redirect" &&
              rs.kind === "zone",
          );

          if (redirectRuleset) {
            targetRulesetId = redirectRuleset.id;
          } else {
            // Create new redirect ruleset
            const newRuleset = await client.rulesets.create({
              ...(zone_id ? { zone_id } : { account_id }),
              name: "Redirect Rules",
              description: "HTTP redirect rules",
              kind: "zone" as any,
              phase: "http_request_dynamic_redirect" as any,
            });
            targetRulesetId = newRuleset.id;
          }
        }

        // Build target URL configuration
        let targetUrlConfig;
        if (target_url) {
          targetUrlConfig = { value: target_url };
        } else {
          targetUrlConfig = { expression: target_expression };
        }

        const ruleData = {
          expression,
          action: "redirect" as const,
          action_parameters: {
            from_value: {
              status_code: status_code as any,
              target_url: targetUrlConfig,
              preserve_query_string: preserve_query_string ?? true,
            },
          },
          description,
          enabled: enabled ?? true,
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
          action_parameters: { type: "object" },
          description: { type: "string" },
          enabled: { type: "boolean" },
          last_updated: { type: "string" },
          version: { type: "string" },
          ruleset_id: { type: "string" },
          operation: { type: "string" },
        },
      },
    },
  },
};
