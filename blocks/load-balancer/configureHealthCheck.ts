import { AppBlock, events } from "@slflows/sdk/v1";
import Cloudflare from "cloudflare";

export const configureHealthCheck: AppBlock = {
  name: "Configure Health Check",
  description:
    "Create or update a Cloudflare Load Balancer health check monitor",
  category: "Load Balancer",

  inputs: {
    default: {
      config: {
        name: {
          name: "Monitor Name",
          description: "A descriptive name for this health check monitor",
          type: "string",
          required: true,
        },
        type: {
          name: "Monitor Type",
          description: "The protocol to use for the health check",
          type: {
            type: "string",
            enum: ["http", "https", "tcp", "udp_icmp", "icmp_ping", "smtp"],
          },
          required: true,
        },
        description: {
          name: "Description",
          description: "Description of the health check monitor",
          type: "string",
          required: false,
        },
        path: {
          name: "Path",
          description:
            "The endpoint path for HTTP/HTTPS health checks (e.g., /health)",
          type: "string",
          required: false,
        },
        port: {
          name: "Port",
          description:
            "Port number for the health check (required for TCP, UDP, SMTP)",
          type: "number",
          required: false,
        },
        method: {
          name: "HTTP Method",
          description: "HTTP method for HTTP/HTTPS checks (default: GET)",
          type: "string",
          required: false,
        },
        expected_codes: {
          name: "Expected HTTP Codes",
          description:
            "Expected HTTP response codes (e.g., '200', '200,201', '2xx')",
          type: "string",
          required: false,
        },
        expected_body: {
          name: "Expected Response Body",
          description: "String to look for in the response body",
          type: "string",
          required: false,
        },
        interval: {
          name: "Check Interval",
          description:
            "Interval between health checks in seconds (default: 60)",
          type: "number",
          required: false,
        },
        timeout: {
          name: "Timeout",
          description:
            "Timeout in seconds before marking check as failed (default: 5)",
          type: "number",
          required: false,
        },
        retries: {
          name: "Retries",
          description:
            "Number of retries before marking as unhealthy (default: 2)",
          type: "number",
          required: false,
        },
        consecutive_up: {
          name: "Consecutive Up",
          description:
            "Consecutive successful checks to mark as healthy (default: 1)",
          type: "number",
          required: false,
        },
        consecutive_down: {
          name: "Consecutive Down",
          description:
            "Consecutive failed checks to mark as unhealthy (default: 3)",
          type: "number",
          required: false,
        },
        follow_redirects: {
          name: "Follow Redirects",
          description: "Follow HTTP redirects (HTTP/HTTPS only)",
          type: "boolean",
          required: false,
        },
        allow_insecure: {
          name: "Allow Insecure",
          description: "Do not validate SSL certificate (HTTPS only)",
          type: "boolean",
          required: false,
        },
        headers: {
          name: "HTTP Headers",
          description: "Custom HTTP headers for the health check",
          type: {
            type: "object",
          },
          required: false,
        },
        probe_zone: {
          name: "Probe Zone",
          description: "Zone to emulate while probing (HTTP/HTTPS only)",
          type: "string",
          required: false,
        },
      },
      onEvent: async (input) => {
        const {
          name,
          type,
          description,
          path,
          port,
          method,
          expected_codes,
          expected_body,
          interval = 60,
          timeout = 5,
          retries = 2,
          consecutive_up = 1,
          consecutive_down = 3,
          follow_redirects,
          allow_insecure,
          headers,
          probe_zone,
        } = input.event.inputConfig;

        const client = new Cloudflare({
          apiToken: input.app.config.apiToken as string,
        });

        const account_id = input.app.config.accountId as string;

        // Find existing monitor by description (using name as description)
        const existingMonitors = [];
        for await (const monitor of client.loadBalancers.monitors.list({
          account_id,
        })) {
          if (monitor.description === name) {
            existingMonitors.push(monitor);
          }
        }

        let result;
        let operation;

        const monitorData: any = {
          type: type as any,
          description: name,
          interval,
          timeout,
          retries,
          consecutive_up,
          consecutive_down,
        };

        // Add optional parameters based on monitor type
        if (description) {
          monitorData.description = description;
        }
        if (path && (type === "http" || type === "https")) {
          monitorData.path = path;
        }
        if (port) {
          monitorData.port = port;
        }
        if (method && (type === "http" || type === "https")) {
          monitorData.method = method;
        }
        if (expected_codes && (type === "http" || type === "https")) {
          monitorData.expected_codes = expected_codes;
        }
        if (expected_body && (type === "http" || type === "https")) {
          monitorData.expected_body = expected_body;
        }
        if (
          follow_redirects !== undefined &&
          (type === "http" || type === "https")
        ) {
          monitorData.follow_redirects = follow_redirects;
        }
        if (
          allow_insecure !== undefined &&
          (type === "http" || type === "https")
        ) {
          monitorData.allow_insecure = allow_insecure;
        }
        if (headers && (type === "http" || type === "https")) {
          monitorData.header = headers;
        }
        if (probe_zone && (type === "http" || type === "https")) {
          monitorData.probe_zone = probe_zone;
        }

        if (existingMonitors.length > 0) {
          // Update existing monitor
          const monitorToUpdate = existingMonitors[0];
          result = await client.loadBalancers.monitors.update(
            monitorToUpdate.id!,
            {
              account_id,
              ...monitorData,
            },
          );
          operation = "updated";
        } else {
          // Create new monitor
          result = await client.loadBalancers.monitors.create({
            account_id,
            ...monitorData,
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
          type: { type: "string" },
          description: { type: "string" },
          path: { type: "string" },
          port: { type: "number" },
          method: { type: "string" },
          expected_codes: { type: "string" },
          expected_body: { type: "string" },
          interval: { type: "number" },
          timeout: { type: "number" },
          retries: { type: "number" },
          consecutive_up: { type: "number" },
          consecutive_down: { type: "number" },
          follow_redirects: { type: "boolean" },
          allow_insecure: { type: "boolean" },
          header: { type: "object" },
          probe_zone: { type: "string" },
          created_on: { type: "string" },
          modified_on: { type: "string" },
          operation: { type: "string" },
        },
      },
    },
  },
};
