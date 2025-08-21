import { AppBlock, events } from "@slflows/sdk/v1";
import Cloudflare from "cloudflare";

export const aiSearch: AppBlock = {
  name: "AutoRAG AI Search",
  description:
    "Perform AI-powered search using Cloudflare AutoRAG with context-aware responses",
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
          description: "The search query or question to ask",
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
            "Maximum number of search results to return (1-50, default: 50)",
          type: "number",
          required: false,
        },
        model: {
          name: "Model",
          description: "AI model to use for generating responses",
          type: "string",
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
        stream: {
          name: "Stream",
          description: "Whether to stream the response",
          type: "boolean",
          required: false,
        },
        system_prompt: {
          name: "System Prompt",
          description: "Custom system prompt to override default",
          type: "string",
          required: false,
        },
      },
      onEvent: async (input) => {
        const {
          rag_id,
          query,
          filters,
          max_num_results,
          model,
          ranking_options,
          rewrite_query,
          stream,
          system_prompt,
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

        if (model) {
          requestBody.model = model;
        }

        if (ranking_options) {
          requestBody.ranking_options = ranking_options;
        }

        if (rewrite_query !== undefined) {
          requestBody.rewrite_query = rewrite_query;
        }

        if (stream !== undefined) {
          requestBody.stream = stream;
        }

        if (system_prompt) {
          requestBody.system_prompt = system_prompt;
        }

        try {
          // Make raw HTTP request using client's internal request method
          const { result } = (await client.post(
            `/accounts/${account_id}/autorag/rags/${rag_id}/ai-search`,
            {
              body: requestBody,
            },
          )) as any;

          await events.emit({
            response: result.response,
            search_query: result.search_query,
            data: result.data,
            has_more: result.has_more,
            next_page: result.next_page,
            object: result.object,
          });
        } catch (error: any) {
          throw new Error(`AutoRAG AI search failed: ${error.message}`);
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
          response: { type: "string" },
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
