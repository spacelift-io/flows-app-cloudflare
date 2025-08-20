import { AppBlock, events } from "@slflows/sdk/v1";
import Cloudflare from "cloudflare";

export const createAccessPolicy: AppBlock = {
  name: "Create Access Policy",
  description:
    "Create a Zero Trust Access policy for controlling access to applications",
  category: "Zero Trust",

  inputs: {
    default: {
      config: {
        name: {
          name: "Policy Name",
          description: "Name of the Access policy",
          type: "string",
          required: true,
        },
        decision: {
          name: "Decision",
          description: "Action to take when policy matches",
          type: {
            type: "string",
            enum: ["allow", "deny", "non_identity", "bypass"],
          },
          required: true,
        },
        include: {
          name: "Include Rules",
          description:
            "Rules that must match (OR logic) - JSON array of access rule objects",
          type: "string",
          required: true,
        },
        exclude: {
          name: "Exclude Rules",
          description:
            "Rules that must NOT match (NOT logic) - JSON array of access rule objects",
          type: "string",
          required: false,
        },
        require: {
          name: "Require Rules",
          description:
            "Rules that ALL must match (AND logic) - JSON array of access rule objects",
          type: "string",
          required: false,
        },
        approval_required: {
          name: "Approval Required",
          description: "Require administrator approval for access",
          type: "boolean",
          required: false,
        },
        approval_groups: {
          name: "Approval Groups",
          description: "Groups that can approve access requests - JSON array",
          type: "string",
          required: false,
        },
        session_duration: {
          name: "Session Duration",
          description:
            "Token validity duration (e.g., '24h', '300ms', '2h45m')",
          type: "string",
          required: false,
        },
        isolation_required: {
          name: "Isolation Required",
          description: "Require browser isolation for matching users",
          type: "boolean",
          required: false,
        },
        purpose_justification_required: {
          name: "Purpose Justification Required",
          description: "Require users to enter justification when logging in",
          type: "boolean",
          required: false,
        },
        purpose_justification_prompt: {
          name: "Purpose Justification Prompt",
          description: "Custom message for purpose justification screen",
          type: "string",
          required: false,
        },
      },
      onEvent: async (input) => {
        const {
          name,
          decision,
          include,
          exclude,
          require,
          approval_required,
          approval_groups,
          session_duration,
          isolation_required,
          purpose_justification_required,
          purpose_justification_prompt,
        } = input.event.inputConfig;

        const client = new Cloudflare({
          apiToken: input.app.config.apiToken as string,
        });

        const account_id = input.app.config.accountId as string;

        // Parse JSON string inputs
        const includeRules = JSON.parse(include);
        const excludeRules = exclude ? JSON.parse(exclude) : undefined;
        const requireRules = require ? JSON.parse(require) : undefined;
        const approvalGroups = approval_groups
          ? JSON.parse(approval_groups)
          : undefined;

        const result = await client.zeroTrust.access.policies.create({
          account_id,
          name,
          decision: decision as any,
          include: includeRules,
          exclude: excludeRules,
          require: requireRules,
          approval_required,
          approval_groups: approvalGroups,
          session_duration,
          isolation_required,
          purpose_justification_required,
          purpose_justification_prompt,
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
          name: { type: "string" },
          decision: { type: "string" },
          include: { type: "array" },
          exclude: { type: "array" },
          require: { type: "array" },
          approval_required: { type: "boolean" },
          approval_groups: { type: "array" },
          session_duration: { type: "string" },
          isolation_required: { type: "boolean" },
          purpose_justification_required: { type: "boolean" },
          purpose_justification_prompt: { type: "string" },
          created_at: { type: "string" },
          updated_at: { type: "string" },
        },
      },
    },
  },
};
