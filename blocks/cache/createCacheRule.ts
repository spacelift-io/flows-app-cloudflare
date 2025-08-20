import { AppBlock, events } from "@slflows/sdk/v1";
import Cloudflare from "cloudflare";

export const createCacheRule: AppBlock = {
  name: "Create Cache Rule",
  description:
    "Create a Cloudflare cache rule with bypass or TTL overrides for a zone",
  category: "Cache",

  inputs: {
    default: {
      config: {
        zone_id: {
          name: "Zone ID",
          description: "The Cloudflare zone ID",
          type: "string",
          required: true,
        },
        ruleset_id: {
          name: "Ruleset ID",
          description:
            "The cache ruleset ID (defaults to zone's cache ruleset)",
          type: "string",
          required: false,
        },
        description: {
          name: "Description",
          description: "Description of the cache rule",
          type: "string",
          required: true,
        },
        expression: {
          name: "Expression",
          description:
            "Cloudflare expression defining when this rule matches (e.g., 'http.request.uri.path matches \"^/api/\"')",
          type: "string",
          required: true,
        },
        enabled: {
          name: "Enabled",
          description: "Whether the rule should be active",
          type: "boolean",
          required: false,
        },
        cache: {
          name: "Cache",
          description: "Set to false to bypass cache for matching requests",
          type: "boolean",
          required: false,
        },
        browser_ttl: {
          name: "Browser TTL",
          description: "Browser cache TTL configuration",
          type: {
            type: "object",
            properties: {
              mode: {
                type: "string",
                enum: [
                  "respect_origin",
                  "bypass_by_default",
                  "override_origin",
                ],
              },
              default: { type: "number" },
            },
          },
          required: false,
        },
        edge_ttl: {
          name: "Edge TTL",
          description: "Edge cache TTL configuration",
          type: {
            type: "object",
            properties: {
              mode: {
                type: "string",
                enum: [
                  "respect_origin",
                  "bypass_by_default",
                  "override_origin",
                ],
              },
              default: { type: "number" },
            },
          },
          required: false,
        },
      },
      onEvent: async (input) => {
        const {
          zone_id,
          ruleset_id,
          description,
          expression,
          enabled = true,
          cache,
          browser_ttl,
          edge_ttl,
        } = input.event.inputConfig;

        const client = new Cloudflare({
          apiToken: input.app.config.apiToken as string,
        });

        // Build action parameters based on inputs
        let actionParameters: any = {};

        // Handle cache setting
        if (cache !== undefined) {
          actionParameters.cache = cache;
        }

        // Handle browser TTL
        if (browser_ttl) {
          actionParameters.browser_ttl = browser_ttl;
        }

        // Handle edge TTL
        if (edge_ttl) {
          actionParameters.edge_ttl = edge_ttl;
        }

        const ruleData = {
          zone_id: zone_id,
          action: "set_cache_settings" as const,
          action_parameters: actionParameters,
          description,
          expression,
          enabled,
        };

        let result;
        if (ruleset_id) {
          // Add rule to existing ruleset
          result = await client.rulesets.rules.create(ruleset_id, ruleData);
        } else {
          // Get or create zone's cache ruleset and add rule
          const rulesetsResponse = await client.rulesets.list({
            zone_id: zone_id,
          });
          const rulesets = [];
          for await (const ruleset of rulesetsResponse) {
            rulesets.push(ruleset);
          }
          let cacheRuleset = rulesets.find(
            (r: any) => r.phase === "http_request_cache_settings",
          );

          if (!cacheRuleset) {
            // Create new cache ruleset for zone
            cacheRuleset = await client.rulesets.create({
              zone_id: zone_id,
              name: "Cache Rules",
              phase: "http_request_cache_settings",
              kind: "zone",
            });
          }

          result = await client.rulesets.rules.create(
            cacheRuleset.id,
            ruleData,
          );
        }

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
          name: { type: "string" },
          description: { type: "string" },
          kind: { type: "string" },
          phase: { type: "string" },
          rules: {
            type: "array",
            items: { type: "object" },
          },
          version: { type: "string" },
        },
      },
    },
  },
};
