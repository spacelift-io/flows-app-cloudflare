import { AppBlock, events } from "@slflows/sdk/v1";
import Cloudflare from "cloudflare";

export const syncData: AppBlock = {
  name: "AutoRAG Sync Data",
  description:
    "Trigger a data synchronization job for Cloudflare AutoRAG to update the knowledge base",
  category: "AutoRAG",

  inputs: {
    default: {
      config: {
        rag_id: {
          name: "AutoRAG ID",
          description: "The AutoRAG instance identifier",
          type: "string",
          required: true,
        },
      },
      onEvent: async (input) => {
        const { rag_id } = input.event.inputConfig;

        const client = new Cloudflare({
          apiToken: input.app.config.apiToken as string,
        });

        const account_id = input.app.config.accountId as string;

        try {
          // Make PATCH request to sync endpoint (no body required)
          const { result } = (await client.patch(
            `/accounts/${account_id}/autorag/rags/${rag_id}/sync`,
            {},
          )) as any;

          await events.emit({ job_id: result.job_id });
        } catch (error: any) {
          throw new Error(`AutoRAG sync failed: ${error.message}`);
        }
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
          job_id: { type: "string" },
        },
      },
    },
  },
};
