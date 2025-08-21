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
        filters: {
          name: "Filters",
          description: "Filters to apply to search results",
          type: {
            type: "object",
          },
          required: false,
        },
        max_num_results: {
          name: "Max Results",
          description:
            "Maximum number of search results to return (1-50, default: 10)",
          type: "number",
          required: false,
        },
        ranking_options: {
          name: "Ranking Options",
          description: "Configure ranking and scoring options",
          type: {
            type: "object",
            properties: {
              ranker: { type: "string" },
              score_threshold: { type: "number" },
            },
          },
          required: false,
        },
        rewrite_query: {
          name: "Rewrite Query",
          description: "Whether to use query rewriting for better results",
          type: "boolean",
          required: false,
        },
      },
      onEvent: async (input) => {
        const {
          rag_id,
          query,
          filters,
          max_num_results,
          ranking_options,
          rewrite_query,
        } = input.event.inputConfig;

        const client = new Cloudflare({
          apiToken: input.app.config.apiToken as string,
        });

        const account_id = input.app.config.accountId as string;

        // Build request body
        const requestBody: any = {
          query: query,
        };

        if (filters) {
          requestBody.filters = filters;
        }

        if (max_num_results) {
          requestBody.max_num_results = max_num_results;
        }

        if (ranking_options) {
          requestBody.ranking_options = ranking_options;
        }

        if (rewrite_query !== undefined) {
          requestBody.rewrite_query = rewrite_query;
        }

        try {
          // Make raw HTTP request using client's internal request method
          const response = (await client.post(
            `/accounts/${account_id}/autorag/rags/${rag_id}/search`,
            {
              body: requestBody,
            },
          )) as any;

          const { result } = response;

          await events.emit({
            search_query: result.search_query,
            data: result.data,
            has_more: result.has_more,
            next_page: result.next_page,
            object: result.object,
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
                score: { type: "number" },
                attributes: { type: "object" },
                content: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      text: { type: "string" },
                      type: { type: "string" },
                    },
                  },
                },
                file_id: { type: "string" },
                filename: { type: "string" },
              },
            },
          },
          has_more: { type: "boolean" },
          next_page: { type: "string" },
          object: { type: "string" },
        },
      },
    },
  },
};
