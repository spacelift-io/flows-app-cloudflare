import { AppBlock, events } from "@slflows/sdk/v1";
import Cloudflare from "cloudflare";

export const uploadCustomCertificate: AppBlock = {
  name: "Upload Custom Certificate",
  description:
    "Upload a new SSL certificate or update an existing one for a zone",
  category: "SSL",

  inputs: {
    default: {
      config: {
        zone_id: {
          name: "Zone ID",
          description: "The Cloudflare zone ID",
          type: "string",
          required: true,
        },
        certificate_id: {
          name: "Certificate ID",
          description:
            "ID of existing certificate to update (leave empty to upload new certificate)",
          type: "string",
          required: false,
        },
        certificate: {
          name: "Certificate",
          description:
            "The SSL certificate in PEM format (-----BEGIN CERTIFICATE-----...-----END CERTIFICATE-----)",
          type: "string",
          required: true,
        },
        private_key: {
          name: "Private Key",
          description:
            "The private key in PEM format (-----BEGIN RSA PRIVATE KEY-----...-----END RSA PRIVATE KEY-----)",
          type: "string",
          required: true,
          sensitive: true,
        },
        bundle_method: {
          name: "Bundle Method",
          description: "Certificate bundle method",
          type: {
            type: "string",
            enum: ["ubiquitous", "optimal", "force"],
          },
          required: false,
        },
        type: {
          name: "Certificate Type",
          description: "Type of custom certificate",
          type: {
            type: "string",
            enum: ["legacy_custom", "sni_custom"],
          },
          required: false,
        },
        geo_restrictions: {
          name: "Geographic Restrictions",
          description: "Restrict private key to specific regions",
          type: {
            type: "string",
            enum: ["us", "eu", "highest_security"],
          },
          required: false,
        },
        policy: {
          name: "Key Policy",
          description:
            "Policy for private key location (e.g., 'country: US' or 'region: EU')",
          type: "string",
          required: false,
        },
      },
      onEvent: async (input) => {
        const {
          zone_id,
          certificate_id,
          certificate,
          private_key,
          bundle_method,
          type,
          geo_restrictions,
          policy,
        } = input.event.inputConfig;

        const client = new Cloudflare({
          apiToken: input.app.config.apiToken as string,
        });

        // Prepare geo restrictions
        const geoRestrictions = geo_restrictions
          ? { label: geo_restrictions as any }
          : undefined;

        let result;
        let operation;

        if (certificate_id) {
          // Update existing certificate
          result = await client.customCertificates.edit(certificate_id, {
            zone_id,
            certificate,
            private_key,
            bundle_method: bundle_method as any,
            geo_restrictions: geoRestrictions,
            policy,
          });
          operation = "updated";
        } else {
          // Upload new certificate
          result = await client.customCertificates.create({
            zone_id,
            certificate,
            private_key,
            bundle_method: bundle_method as any,
            type: type as any,
            geo_restrictions: geoRestrictions,
            policy,
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
          zone_id: { type: "string" },
          hosts: { type: "array" },
          issuer: { type: "string" },
          signature: { type: "string" },
          status: { type: "string" },
          bundle_method: { type: "string" },
          geo_restrictions: { type: "object" },
          priority: { type: "number" },
          expires_on: { type: "string" },
          uploaded_on: { type: "string" },
          modified_on: { type: "string" },
          operation: { type: "string" },
        },
      },
    },
  },
};
