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
        force_reindex: {
          name: "Force Reindex",
          description: "Force a complete reindex of all data",
          type: "boolean",
          required: false,
        },
        source_filters: {
          name: "Source Filters",
          description:
            "Filter specific data sources to sync (array of source IDs)",
          type: {
            type: "array",
            items: { type: "string" },
          },
          required: false,
        },
      },
      onEvent: async (input) => {
        const { rag_id, force_reindex, source_filters } =
          input.event.inputConfig;

        const client = new Cloudflare({
          apiToken: input.app.config.apiToken as string,
        });

        const account_id = input.app.config.accountId as string;

        // Build request body
        const requestBody: any = {};

        if (force_reindex !== undefined) {
          requestBody.force_reindex = force_reindex;
        }

        if (source_filters && source_filters.length > 0) {
          requestBody.source_filters = source_filters;
        }

        try {
          // Make raw HTTP request using client's internal request method
          const response = await (client as any)._client.patch(
            `/accounts/${account_id}/autorag/rags/${rag_id}/sync`,
            {
              body: requestBody,
            },
          );

          await events.emit({
            job_id: response.job_id,
            status: response.status,
            created_at: response.created_at,
            timestamp: new Date().toISOString(),
          });
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
          status: { type: "string" },
          created_at: { type: "string" },
          timestamp: { type: "string" },
        },
      },
    },
  },
};
