// ============================================================
// SPEC GENERATION PROMPTS
// Produces three documents from discovery + classification + inference:
//   1. Technical Spec (full Claude Code / Cursor implementation guide)
//   2. Brand Plan (identity, voice, palette, guidelines)
//   3. Marketing Plan (GTM strategy, channels, launch plan)
// ============================================================

import { z } from "zod";

export const SPEC_GENERATION_PROMPT_VERSION = "1.0.0";

// ── Types ─────────────────────────────────────────────────────

export type ClassificationInput = {
  productType: string;
  complexityLevel: number;
  complexityLabel: string;
  functionalDomain: string;
  executionStyle: string;
  targetUsers: string;
  coreSystemSummary: string;
  requiresAiLayer: boolean;
  requiresMultiTenancy: boolean;
  requiresMarketplace: boolean;
  classificationRationale: string;
  phaseTemplate: string[];
};

export type ArchitectureInput = {
  recommendedStack: {
    frontend: string;
    backend: string;
    database: string;
    auth: string;
    hosting: string;
    additional: string[];
  };
  authStrategy: string;
  databaseDesign: string;
  infrastructure: {
    hosting: string;
    cdn: string;
    storage: string;
    backgroundJobs: string;
    aiGateway?: string;
  };
  recommendedApis: string[];
  recommendedIntegrations: string[];
  scalingConsiderations: string;
  complexityScore: number;
  complexityRationale: string;
  estimatedBuildWeeks: number;
  keyRisks: string[];
  aiLayerDesign?: string;
  multiTenancyDesign?: string;
  marketplaceDesign?: string;
};

export type DiscoveryResponse = {
  questionKey: string;
  questionText: string;
  responseText: string;
  stepNumber: number;
};

// ── Zod Schemas ───────────────────────────────────────────────

export const TechSpecResultSchema = z.object({
  fullMarkdown: z.string().describe("Complete implementation-ready technical specification as formatted Markdown"),
});

export const BrandPlanResultSchema = z.object({
  fullMarkdown: z.string().describe("Complete brand plan document as formatted Markdown"),
});

export const MarketingPlanResultSchema = z.object({
  fullMarkdown: z.string().describe("Complete marketing and go-to-market plan as formatted Markdown"),
});

// ── Helper ────────────────────────────────────────────────────

function formatResponses(responses: DiscoveryResponse[]): string {
  return responses
    .map((r) => `**${r.questionText}**\n${r.responseText}`)
    .join("\n\n");
}

function getResponseValue(responses: DiscoveryResponse[], key: string): string {
  return responses.find((r) => r.questionKey === key)?.responseText ?? "";
}

// ── TECH SPEC PROMPT ──────────────────────────────────────────

export function buildTechSpecPrompt(
  projectName: string,
  projectDescription: string,
  classification: ClassificationInput,
  architecture: ArchitectureInput,
  responses: DiscoveryResponse[]
): string {
  const stack = architecture.recommendedStack;
  const infra = architecture.infrastructure;

  return `You are a senior software architect generating a complete, implementation-ready technical specification for a software product. This spec will be fed directly into AI coding tools (Claude Code, Cursor, Windsurf) to bootstrap the entire project from scratch.

## Project Overview
**Name:** ${projectName}
**Description:** ${projectDescription}

## Classification
- **Product Type:** ${classification.productType} (${classification.complexityLabel})
- **Domain:** ${classification.functionalDomain}
- **Execution Style:** ${classification.executionStyle}
- **Target Users:** ${classification.targetUsers}
- **Summary:** ${classification.coreSystemSummary}
- **Requires AI Layer:** ${classification.requiresAiLayer}
- **Requires Multi-Tenancy:** ${classification.requiresMultiTenancy}
- **Requires Marketplace:** ${classification.requiresMarketplace}

## Architecture
**Stack:**
- Frontend: ${stack.frontend}
- Backend: ${stack.backend}
- Database: ${stack.database}
- Auth: ${stack.auth}
- Hosting: ${stack.hosting}
- Additional: ${stack.additional.join(", ") || "none"}

**Infrastructure:**
- Hosting: ${infra.hosting}
- CDN: ${infra.cdn}
- Storage: ${infra.storage}
- Background Jobs: ${infra.backgroundJobs}
${infra.aiGateway ? `- AI Gateway: ${infra.aiGateway}` : ""}

**Auth Strategy:** ${architecture.authStrategy}
**Database Design:** ${architecture.databaseDesign}
**APIs:** ${architecture.recommendedApis.join(", ")}
**Integrations:** ${architecture.recommendedIntegrations.join(", ")}
**Scaling:** ${architecture.scalingConsiderations}
**Complexity Score:** ${architecture.complexityScore}/10
**Estimated Build:** ~${architecture.estimatedBuildWeeks} weeks to MVP
**Key Risks:** ${architecture.keyRisks.join("; ")}
${architecture.aiLayerDesign ? `**AI Layer Design:** ${architecture.aiLayerDesign}` : ""}
${architecture.multiTenancyDesign ? `**Multi-Tenancy Design:** ${architecture.multiTenancyDesign}` : ""}
${architecture.marketplaceDesign ? `**Marketplace Design:** ${architecture.marketplaceDesign}` : ""}

## Discovery Responses (22-question intake)
${formatResponses(responses)}

## Phase Template
${classification.phaseTemplate.map((p, i) => `${i + 1}. ${p}`).join("\n")}

---

Generate a **complete, implementation-ready technical specification** as a well-structured Markdown document. This is the primary deliverable — make it exhaustive and precise.

The spec MUST include ALL of the following sections:

### 1. Executive Summary
2–3 paragraphs covering what this product is, who it's for, and what makes it valuable.

### 2. Product Vision & Core Features
List every core feature with: feature name, description, user story, and priority (P0 = MVP / P1 = Phase 2 / P2 = Future).

### 3. Technical Architecture
Detailed prose explanation of the full system architecture. How the pieces fit together. Data flow diagrams in ASCII/Mermaid where helpful.

### 4. Database Schema
Complete table/collection definitions with all fields, types, indexes, and relationships. Use the actual syntax for the chosen database.

### 5. API Structure
Every endpoint: method, path, auth requirement, request shape, response shape, error codes. Group by resource.

### 6. Frontend Architecture
Component tree, routing structure, state management approach, key UI patterns, accessibility considerations.

### 7. Backend Architecture
Service layer design, background jobs, queue patterns, error handling strategy, logging approach.

### 8. Security & Auth
Auth flow in detail, permission model, data validation approach, secrets management, rate limiting.

### 9. Deployment & DevOps
Step-by-step deployment setup, environment variables needed, CI/CD pipeline recommendation, monitoring.

### 10. Implementation Phases & Sprint Plan
Break the build into 2-week sprints. For each sprint: goal, specific deliverables, acceptance criteria.

### 11. Project File Tree
Full recommended directory structure with comments explaining each directory's purpose.

### 12. Bootstrap Commands
Exact CLI commands to initialize the project, install dependencies, configure services, and run locally.

### 13. AI Coding Instructions
Specific CLAUDE.md / .cursorrules content for the AI coding tool. Include: code style rules, naming conventions, patterns to follow, patterns to avoid, testing requirements.

### 14. Scaling Considerations & Future Architecture
How the system should evolve as it scales. What to refactor when, approximate traffic thresholds.

Be exhaustive. A developer should be able to hand this spec to an AI coding tool and build the entire product without additional context. Do not add any preamble or postscript — return only the Markdown document starting with a # heading.`;
}

// ── BRAND PLAN PROMPT ─────────────────────────────────────────

export function buildBrandPlanPrompt(
  projectName: string,
  projectDescription: string,
  classification: ClassificationInput,
  responses: DiscoveryResponse[]
): string {
  const businessName = getResponseValue(responses, "business_name") || projectName;
  const brandPersonality = getResponseValue(responses, "brand_personality");
  const colorPreference = getResponseValue(responses, "color_preference");
  const visualStyle = getResponseValue(responses, "visual_style");
  const targetUsers = classification.targetUsers;
  const uniqueValue = getResponseValue(responses, "unique_value");
  const competitors = getResponseValue(responses, "competitors");

  return `You are a brand strategist generating a complete brand identity plan for a new software product. This document will guide the founder, designer, and marketing team.

## Product Context
**Business Name:** ${businessName}
**Description:** ${projectDescription}
**Product Type:** ${classification.productType}
**Domain:** ${classification.functionalDomain}
**Target Users:** ${targetUsers}
**Unique Value:** ${uniqueValue || "Not specified"}
**Competitors:** ${competitors || "Not specified"}

## Founder's Brand Preferences
**Brand Personality:** ${brandPersonality || "Not specified — infer from product context"}
**Color Preference:** ${colorPreference || "Not specified — recommend based on domain"}
**Visual Style:** ${visualStyle || "Not specified — recommend based on audience"}

## Discovery Responses
${formatResponses(responses)}

---

Generate a **complete brand identity plan** as a well-structured Markdown document. Make it actionable — a designer or marketer should be able to execute directly from this document.

The brand plan MUST include ALL of the following sections:

### 1. Brand Overview
The brand's mission, vision, and what it stands for in one paragraph each.

### 2. Brand Personality & Voice
5–7 personality adjectives with explanations. Tone of voice guidelines (formal/casual, technical/friendly, etc.). Do/Don't examples for copy.

### 3. Target Audience Personas
2–3 detailed user personas with: name, role, goals, pain points, how they discover products, what they value in a tool.

### 4. Brand Positioning
One-sentence positioning statement. Competitive differentiation. What category the brand owns.

### 5. Name & Tagline
Evaluate the business name. Suggest 2–3 tagline options with rationale. Domain name recommendations.

### 6. Logo Brief
Describe the ideal logo concept (symbol ideas, wordmark vs. combination mark, style direction). What to avoid. Reference brands for style inspiration.

### 7. Color Palette
Primary color (hex + name + why). Secondary color. Accent color. Neutral palette. Background/surface colors. Semantic colors (success, warning, error). For each color: exact hex, RGB, usage guidance.

### 8. Typography
Primary typeface (with free/paid alternatives). Secondary typeface. Type scale (H1–H6, body, caption, label). Font pairing rationale.

### 9. Visual Style & Imagery
UI design style direction (minimalist, bold, playful, enterprise, etc.). Icon style. Photography/illustration direction. What imagery to avoid.

### 10. Brand Application Examples
Examples of how the brand applies to: landing page header, email subject lines, social media bio, error messages, empty states, onboarding copy, pricing page headline.

### 11. Brand Assets Checklist
Complete list of brand assets needed for launch with priority (must-have vs. nice-to-have).

Do not add any preamble or postscript — return only the Markdown document starting with a # heading.`;
}

// ── MARKETING PLAN PROMPT ─────────────────────────────────────

export function buildMarketingPlanPrompt(
  projectName: string,
  projectDescription: string,
  classification: ClassificationInput,
  responses: DiscoveryResponse[]
): string {
  const businessName = getResponseValue(responses, "business_name") || projectName;
  const businessModel = getResponseValue(responses, "business_model");
  const uniqueValue = getResponseValue(responses, "unique_value");
  const competitors = getResponseValue(responses, "competitors");
  const targetGeography = getResponseValue(responses, "target_geography");
  const marketingChannels = getResponseValue(responses, "marketing_channels");
  const launchTimeline = getResponseValue(responses, "launch_timeline");
  const targetScale = getResponseValue(responses, "target_scale");

  return `You are a growth and marketing strategist generating a complete go-to-market plan for a new software product. This document will guide the founder through launch and early growth.

## Product Context
**Business Name:** ${businessName}
**Description:** ${projectDescription}
**Product Type:** ${classification.productType}
**Domain:** ${classification.functionalDomain}
**Target Users:** ${classification.targetUsers}
**Business Model:** ${businessModel || "Not specified"}
**Unique Value:** ${uniqueValue || "Not specified"}
**Competitors:** ${competitors || "Not specified"}
**Target Geography:** ${targetGeography || "Not specified"}
**Preferred Marketing Channels:** ${marketingChannels || "Not specified"}
**Launch Timeline:** ${launchTimeline || "Not specified"}
**Target Scale:** ${targetScale || "Not specified"}
**Estimated Build Time:** ~${classification.complexityLevel} complexity level

## Discovery Responses
${formatResponses(responses)}

---

Generate a **complete marketing and go-to-market plan** as a well-structured Markdown document. Make it actionable with specific tactics, not generic advice.

The marketing plan MUST include ALL of the following sections:

### 1. Go-to-Market Summary
One-page overview: who we're targeting, what we're offering, why now, and how we'll reach them.

### 2. Target Market Analysis
Total Addressable Market (TAM) estimate. Serviceable Available Market (SAM). Initial beachhead market. Buyer vs. user distinction (if applicable). Jobs-to-be-done analysis.

### 3. Competitive Landscape
Map of 3–5 direct and indirect competitors. Feature/price comparison table. Differentiation strategy. Why someone would switch from each competitor.

### 4. Positioning & Messaging
Core value proposition (one sentence). Key messages for each persona. Proof points and claims. Landing page headline options (5 options, A/B testable).

### 5. Pricing Strategy
Recommended pricing model (free/freemium/trial/paid). Tier breakdown with features per tier. Price points with rationale. Pricing page structure recommendations. Competitor price comparison.

### 6. Pre-Launch Strategy (0–4 weeks before launch)
Waitlist / early access setup. Beta user recruitment tactics. Community building (where, how). Content seeding strategy. Influencer/partner outreach.

### 7. Launch Plan
Launch week playbook (day-by-day). Launch platforms (Product Hunt, Hacker News, Reddit, etc.) with posting strategy for each. Press / journalist outreach targets. Social media launch posts (draft examples). Email announcement sequence.

### 8. Channel Strategy
For each channel relevant to this product — explain: why this channel, what content/approach, metrics to track, budget estimate (time or money), realistic outcome at 90 days.

Channels to evaluate: SEO/Content, Paid Search, Paid Social, Organic Social, Email/Newsletter, Community, Partnerships, Outbound Sales, Product-Led Growth, Referral/Affiliate.

### 9. Content Marketing Plan
Content pillars (3–5 themes). First 12 pieces of content to create (title, format, channel, goal). SEO keyword clusters to target. Content calendar template for first 30 days.

### 10. Growth Loops & Retention
Primary growth loop design. Referral/viral mechanics. Onboarding email sequence (7 emails with subject lines and goals). Activation metric to optimize. Retention levers.

### 11. Metrics & KPIs
North Star Metric. Weekly/monthly KPIs for first 6 months. Target numbers at 30/60/90 days. Leading indicators to watch.

### 12. 90-Day Marketing Roadmap
Week-by-week action plan for the first 90 days post-launch. What to do, in what order, with what budget.

### 13. Budget Allocation
Recommended monthly marketing budget breakdown (assume bootstrap budget, then optional paid tiers). Free tools to use for each function.

Be specific and tactical. This founder is likely non-technical — make the plan executable without a marketing team. Do not add any preamble or postscript — return only the Markdown document starting with a # heading.`;
}
