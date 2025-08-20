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
        system_prompt: {
          name: "System Prompt",
          description: "Custom system prompt to override default",
          type: "string",
          required: false,
        },
        temperature: {
          name: "Temperature",
          description: "Controls randomness in AI responses (0.0-2.0)",
          type: "number",
          required: false,
        },
        max_tokens: {
          name: "Max Tokens",
          description: "Maximum tokens in the AI response",
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
          system_prompt,
          temperature,
          max_tokens,
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

        if (system_prompt) {
          requestBody.system_prompt = system_prompt;
        }

        if (temperature !== undefined) {
          requestBody.temperature = temperature;
        }

        if (max_tokens) {
          requestBody.max_tokens = max_tokens;
        }

        try {
          // Make raw HTTP request using client's internal request method
          const response = await (client as any)._client.post(
            `/accounts/${account_id}/autorag/rags/${rag_id}/ai-search`,
            {
              body: requestBody,
            },
          );

          await events.emit({
            response: response.response,
            search_query: response.search_query,
            data: response.data,
            metadata: response.metadata,
            usage: response.usage,
            timestamp: new Date().toISOString(),
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
                content: { type: "string" },
                metadata: { type: "object" },
                score: { type: "number" },
              },
            },
          },
          metadata: { type: "object" },
          usage: {
            type: "object",
            properties: {
              prompt_tokens: { type: "number" },
              completion_tokens: { type: "number" },
              total_tokens: { type: "number" },
            },
          },
          timestamp: { type: "string" },
        },
      },
    },
  },
};
