import { AppBlock, events } from "@slflows/sdk/v1";
import Cloudflare from "cloudflare";

export const createOriginCertificate: AppBlock = {
  name: "Create Origin Certificate",
  description:
    "Create a Cloudflare Origin CA certificate for securing traffic between Cloudflare and your origin server",
  category: "SSL",

  inputs: {
    default: {
      config: {
        hostnames: {
          name: "Hostnames",
          description:
            "Array of hostnames or wildcard names (e.g., example.com, *.example.com) - JSON array string",
          type: "string",
          required: false,
        },
        request_type: {
          name: "Request Type",
          description: "Signature type for the certificate",
          type: {
            type: "string",
            enum: ["origin-rsa", "origin-ecc", "keyless-certificate"],
          },
          required: false,
        },
        requested_validity: {
          name: "Validity Period",
          description: "Number of days the certificate should be valid",
          type: {
            type: "number",
            enum: [7, 30, 90, 365, 730, 1095, 5475],
          },
          required: false,
        },
        csr: {
          name: "Certificate Signing Request",
          description:
            "Custom CSR in PEM format (if not provided, Cloudflare will generate one)",
          type: "string",
          required: false,
          sensitive: true,
        },
      },
      onEvent: async (input) => {
        const { hostnames, request_type, requested_validity, csr } =
          input.event.inputConfig;

        const client = new Cloudflare({
          apiToken: input.app.config.apiToken as string,
        });

        // Parse hostnames JSON array
        const hostnamesArray = hostnames ? JSON.parse(hostnames) : undefined;

        const result = await client.originCACertificates.create({
          hostnames: hostnamesArray,
          request_type: request_type as any,
          requested_validity: requested_validity as any,
          csr,
        });

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
          certificate: { type: "string" },
          csr: { type: "string" },
          hostnames: { type: "array" },
          request_type: { type: "string" },
          requested_validity: { type: "number" },
          expires_on: { type: "string" },
        },
      },
    },
  },
};
