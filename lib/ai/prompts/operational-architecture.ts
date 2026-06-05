// ============================================================
// OPERATIONAL ARCHITECTURE PROMPT — v1.0.0
// Extracts and formalizes the operational logic of the system:
// user roles, permissions, workflows, automation, admin design.
//
// This is the document a senior engineer reads to understand
// HOW the system works — not just what it does.
// ============================================================

import { z } from "zod";

export const OPERATIONAL_ARCH_PROMPT_VERSION = "1.0.0";

export type OperationalInput = {
  projectName: string;
  productType: string;
  complexityLabel: string;
  responses: Array<{
    questionKey: string;
    questionText: string;
    responseText: string;
  }>;
  intelligenceResult?: string | null; // JSON string of IntelligenceResult, if available
};

export const OperationalArchResultSchema = z.object({
  fullMarkdown: z
    .string()
    .describe(
      "Complete operational architecture document as dense Markdown. No preamble."
    ),
});

export function buildOperationalArchPrompt(input: OperationalInput): string {
  const formatted = input.responses
    .map((r) => `[${r.questionKey}] ${r.questionText}\n→ ${r.responseText}`)
    .join("\n\n");

  const intelligenceSection = input.intelligenceResult
    ? `\n## Intelligence Analysis (pre-computed)\n${input.intelligenceResult}\n`
    : "";

  return `You are a Principal Engineer generating the Operational Architecture document for a software system. This document describes how the system works at the business logic and workflow level — roles, permissions, user journeys, admin actions, automation, and data flows. It is read by engineers before implementation begins to understand the operational model.

Be specific and precise. Use concrete examples from the discovery responses. Do not write generic patterns — write the specific roles, workflows, and rules for THIS system.

## System: ${input.projectName}
## Classification: ${input.productType} | ${input.complexityLabel}
${intelligenceSection}
## Discovery Responses
${formatted}

---

Return ONLY the Markdown document. No preamble. Start with the # heading.

Generate the following sections in order:

# ${input.projectName} — Operational Architecture

## 1. USER ROLE MODEL

For each distinct user role in this system:

### [Role Name]
**Description:** What this user is trying to accomplish
**Access level:** [read-only | standard | elevated | admin | super-admin]
**Can create:** list of entities this role can create
**Can view:** what they can see
**Can edit:** what they can modify
**Can delete:** what they can delete (be explicit — "nothing" is valid)
**Cannot do:** important restrictions
**Onboarding path:** how this user type gets into the system

If roles are not explicitly stated but implied by the responses, infer them and explain the inference.

## 2. PERMISSIONS MATRIX

A table showing which roles can perform which actions. Rows = actions, Columns = roles. Use ✓ (can), ✗ (cannot), ~ (limited/conditional).

Include every meaningful action in the system, not just CRUD.

## 3. CORE USER JOURNEYS

For each primary workflow (minimum 3, maximum 8), write:

### Journey N — [Name]
**Actor:** [which role initiates this]
**Trigger:** [what starts this journey]
**Steps:**
1. [Exact step — what the user does, what the system does]
2. ...
**Exit condition:** [what completes or abandons this journey]
**System state change:** [what changes in the database/system]
**Edge cases:** [what can go wrong, how the system handles it]

Focus on the business-critical paths. Include error paths and empty states.

## 4. ADMIN INTERFACE DESIGN

For the administrative view of this system:

**Admin dashboard:** what metrics and views an admin sees on first load
**Queues and approvals:** any items that need admin action
**User management:** how admins manage users, roles, invites
**Content/data management:** what admins can create or moderate
**Configuration:** what settings exist in the admin panel
**Reporting:** what data exports or reports admins need

## 5. AUTOMATION & BACKGROUND JOBS

For each automated process:

### [Job Name]
**Trigger:** [time-based (cron), event-based (webhook/action), or hybrid]
**Frequency:** [if cron: schedule | if event: what fires it]
**Input:** [what data it needs]
**Process:** [what it does, step by step]
**Output:** [what it produces or changes]
**Failure handling:** [what happens if it fails, retry logic]
**Idempotency:** [safe to run twice? yes/no and why]

## 6. EVENT SYSTEM

List every domain event this system emits (or should emit), using the pattern Entity.action:

| Event | Fired when | Payload | Subscribers |
|---|---|---|---|
| [entity.action] | [description] | [key fields] | [who/what listens] |

## 7. DATA OWNERSHIP & ACCESS CONTROL

**Tenancy model:** [single-tenant | multi-tenant | hybrid] — explain the isolation boundary
**Row-level security rules:** list the rules for which users can see which data rows
**Data that crosses tenancy boundaries:** (if any) what data is shared and what the controls are
**Sensitive fields:** fields that should be encrypted or masked in the UI

## 8. INTEGRATION TOUCHPOINTS

For each external integration:

### [Service Name]
**Direction:** [inbound | outbound | bidirectional]
**When triggered:** [what action initiates the integration]
**Data sent/received:** [exact fields]
**Error handling:** [what happens when the integration fails]
**Idempotency requirement:** [can this be safely retried?]
**Auth method:** [API key | OAuth | webhook secret]

If no integrations were stated but are implied (e.g. "email notifications" implies a transactional email service), infer them.`;
}
