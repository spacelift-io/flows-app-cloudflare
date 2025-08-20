import { AppBlock, events } from "@slflows/sdk/v1";
import Cloudflare from "cloudflare";

export const createPageRule: AppBlock = {
  name: "Create Page Rule",
  description:
    "Create a Page Rule to control cache level, security, and performance settings for specific URL patterns",
  category: "Page Rules",

  inputs: {
    default: {
      config: {
        zone_id: {
          name: "Zone ID",
          description: "The Cloudflare zone ID",
          type: "string",
          required: true,
        },
        url_pattern: {
          name: "URL Pattern",
          description:
            "URL pattern to match (supports wildcards like *.example.com/path/*)",
          type: "string",
          required: true,
        },
        priority: {
          name: "Priority",
          description: "Rule priority (higher number = higher priority)",
          type: "number",
          required: false,
        },
        status: {
          name: "Status",
          description: "Whether the rule is active or disabled",
          type: {
            type: "string",
            enum: ["active", "disabled"],
          },
          required: false,
        },
        // Cache Settings
        cache_level: {
          name: "Cache Level",
          description: "Cache level setting",
          type: {
            type: "string",
            enum: [
              "bypass",
              "basic",
              "simplified",
              "aggressive",
              "cache_everything",
            ],
          },
          required: false,
        },
        edge_cache_ttl: {
          name: "Edge Cache TTL",
          description: "Edge cache TTL in seconds",
          type: "number",
          required: false,
        },
        browser_cache_ttl: {
          name: "Browser Cache TTL",
          description: "Browser cache TTL in seconds (or 0 for respect origin)",
          type: "number",
          required: false,
        },
        cache_by_device_type: {
          name: "Cache by Device Type",
          description: "Separate cache for mobile/desktop/tablet",
          type: {
            type: "string",
            enum: ["on", "off"],
          },
          required: false,
        },
        cache_deception_armor: {
          name: "Cache Deception Armor",
          description: "Protect against web cache deception attacks",
          type: {
            type: "string",
            enum: ["on", "off"],
          },
          required: false,
        },
        // Security Settings
        security_level: {
          name: "Security Level",
          description: "Security level for requests",
          type: {
            type: "string",
            enum: [
              "off",
              "essentially_off",
              "low",
              "medium",
              "high",
              "under_attack",
            ],
          },
          required: false,
        },
        waf: {
          name: "WAF",
          description: "Web Application Firewall setting",
          type: {
            type: "string",
            enum: ["on", "off"],
          },
          required: false,
        },
        disable_security: {
          name: "Disable Security",
          description: "Disable all security features",
          type: "boolean",
          required: false,
        },
        // Performance Settings
        rocket_loader: {
          name: "Rocket Loader",
          description: "Rocket Loader setting",
          type: {
            type: "string",
            enum: ["on", "off"],
          },
          required: false,
        },
        mirage: {
          name: "Mirage",
          description: "Mirage setting",
          type: {
            type: "string",
            enum: ["on", "off"],
          },
          required: false,
        },
        polish: {
          name: "Polish",
          description: "Image optimization setting",
          type: {
            type: "string",
            enum: ["off", "lossless", "lossy"],
          },
          required: false,
        },
        disable_performance: {
          name: "Disable Performance",
          description: "Disable all performance features",
          type: "boolean",
          required: false,
        },
        // Other Settings
        ssl: {
          name: "SSL",
          description: "SSL setting",
          type: {
            type: "string",
            enum: ["off", "flexible", "full", "full_strict", "origin_pull"],
          },
          required: false,
        },
        always_use_https: {
          name: "Always Use HTTPS",
          description: "Always use HTTPS setting",
          type: "boolean",
          required: false,
        },
        forwarding_url: {
          name: "Forwarding URL",
          description:
            "URL forwarding configuration (JSON string with status_code and url)",
          type: "string",
          required: false,
        },
      },
      onEvent: async (input) => {
        const {
          zone_id,
          url_pattern,
          priority,
          status,
          cache_level,
          edge_cache_ttl,
          browser_cache_ttl,
          cache_by_device_type,
          cache_deception_armor,
          security_level,
          waf,
          disable_security,
          rocket_loader,
          mirage,
          polish,
          disable_performance,
          ssl,
          always_use_https,
          forwarding_url,
        } = input.event.inputConfig;

        const client = new Cloudflare({
          apiToken: input.app.config.apiToken as string,
        });

        // Build actions array
        const actions: any[] = [];

        // Cache actions
        if (cache_level) {
          actions.push({ id: "cache_level", value: cache_level });
        }
        if (edge_cache_ttl !== undefined) {
          actions.push({ id: "edge_cache_ttl", value: edge_cache_ttl });
        }
        if (browser_cache_ttl !== undefined) {
          actions.push({ id: "browser_cache_ttl", value: browser_cache_ttl });
        }
        if (cache_by_device_type) {
          actions.push({
            id: "cache_by_device_type",
            value: cache_by_device_type,
          });
        }
        if (cache_deception_armor) {
          actions.push({
            id: "cache_deception_armor",
            value: cache_deception_armor,
          });
        }

        // Security actions
        if (security_level) {
          actions.push({ id: "security_level", value: security_level });
        }
        if (waf) {
          actions.push({ id: "waf", value: waf });
        }
        if (disable_security) {
          actions.push({ id: "disable_security" });
        }

        // Performance actions
        if (rocket_loader) {
          actions.push({ id: "rocket_loader", value: rocket_loader });
        }
        if (mirage) {
          actions.push({ id: "mirage", value: mirage });
        }
        if (polish) {
          actions.push({ id: "polish", value: polish });
        }
        if (disable_performance) {
          actions.push({ id: "disable_performance" });
        }

        // Other actions
        if (ssl) {
          actions.push({ id: "ssl", value: ssl });
        }
        if (always_use_https) {
          actions.push({ id: "always_use_https" });
        }
        if (forwarding_url) {
          const forwardingConfig = JSON.parse(forwarding_url);
          actions.push({ id: "forwarding_url", value: forwardingConfig });
        }

        // Build targets array
        const targets = [
          {
            target: "url" as const,
            constraint: {
              operator: "matches" as const,
              value: url_pattern,
            },
          },
        ];

        const result = await client.pageRules.create({
          zone_id,
          actions,
          targets,
          priority: priority || 1,
          status: (status as any) || "active",
        });

        await events.emit({
          ...result,
          operation: "created",
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
          actions: { type: "array" },
          targets: { type: "array" },
          priority: { type: "number" },
          status: { type: "string" },
          created_on: { type: "string" },
          modified_on: { type: "string" },
          operation: { type: "string" },
        },
      },
    },
  },
};
