import { AppBlock, events } from "@slflows/sdk/v1";
import Cloudflare from "cloudflare";

export const search: AppBlock = {
  name: "AutoRAG Search",
  description:
    "Perform semantic search using Cloudflare AutoRAG to retrieve relevant documents",
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
        query: {
          name: "Search Query",
          description: "The search query to find relevant documents",
          type: "string",
          required: true,
        },
        max_results: {
          name: "Max Results",
          description:
            "Maximum number of search results to return (default: 10)",
          type: "number",
          required: false,
        },
        metadata_filters: {
          name: "Metadata Filters",
          description: "Filters to apply based on metadata (JSON object)",
          type: {
            type: "object",
          },
          required: false,
        },
        similarity_threshold: {
          name: "Similarity Threshold",
          description: "Minimum similarity score for results (0.0-1.0)",
          type: "number",
          required: false,
        },
      },
      onEvent: async (input) => {
        const {
          rag_id,
          query,
          max_results,
          metadata_filters,
          similarity_threshold,
        } = input.event.inputConfig;

        const client = new Cloudflare({
          apiToken: input.app.config.apiToken as string,
        });

        const account_id = input.app.config.accountId as string;

        // Build request body
        const requestBody: any = {
          query: query,
        };

        if (max_results) {
          requestBody.max_results = max_results;
        }

        if (metadata_filters) {
          requestBody.metadata_filters = metadata_filters;
        }

        if (similarity_threshold !== undefined) {
          requestBody.similarity_threshold = similarity_threshold;
        }

        try {
          // Make raw HTTP request using client's internal request method
          const response = await (client as any)._client.post(
            `/accounts/${account_id}/autorag/rags/${rag_id}/search`,
            {
              body: requestBody,
            },
          );

          await events.emit({
            search_query: response.search_query,
            data: response.data,
            has_more: response.has_more,
            total_count: response.total_count,
            metadata: response.metadata,
            timestamp: new Date().toISOString(),
          });
        } catch (error: any) {
          throw new Error(`AutoRAG search failed: ${error.message}`);
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
          search_query: { type: "string" },
          data: {
            type: "array",
            items: {
              type: "object",
              properties: {
                content: { type: "string" },
                metadata: { type: "object" },
                score: { type: "number" },
                source: { type: "string" },
              },
            },
          },
          has_more: { type: "boolean" },
          total_count: { type: "number" },
          metadata: { type: "object" },
          timestamp: { type: "string" },
        },
      },
    },
  },
};
