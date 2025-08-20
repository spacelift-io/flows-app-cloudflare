import { defineApp } from "@slflows/sdk/v1";
import { blocks } from "./blocks/index";
import Cloudflare from "cloudflare";

export const app = defineApp({
  name: "Cloudflare",
  installationInstructions:
    "Cloudflare integration for Flows.\n\nTo install:\n1. Add your Cloudflare API token\n2. Add your Cloudflare account ID (found in the URL: https://dash.cloudflare.com/{account-id}/)\n3. Confirm the app.\n 4. Start using the Cloudflare blocks in your flows",

  blocks,

  signals: {
    accountName: {
      name: "Account Name",
      description: "Cloudflare account name",
    },
  },

  onSync: async ({ app: { config } }) => {
    const cf = new Cloudflare({ apiToken: config.apiToken });

    try {
      const account = await cf.accounts.get({ account_id: config.accountId });

      return {
        newStatus: "ready",
        signalUpdates: { accountName: account.name },
      };
    } catch (error) {
      console.error("Error connecting to Cloudflare: ", error);

      return {
        newStatus: "failed",
        customStatusDescription: "Failed to connect, see logs",
      };
    }
  },

  config: {
    accountId: {
      name: "Account ID",
      description:
        "Your Cloudflare account ID (found in the URL after logging in: https://dash.cloudflare.com/{account-id}/)",
      type: "string",
      required: true,
      sensitive: false,
    },
    apiToken: {
      name: "API Token",
      description: "Your Cloudflare API token with appropriate permissions",
      type: "string",
      required: true,
      sensitive: true,
    },
  },
});
