// ============================================================
// DISCOVERY QUESTIONS — v2.0
// Requirements Intelligence System
//
// 28 questions across 7 sections.
// Adaptive branching via showIf — most clients see 18–22 questions.
// Feeds: Intent Classification, Architecture Inference,
//        Operational Architecture, Scope Analysis, Design Intelligence.
// ============================================================

export type QuestionType =
  | "textarea"
  | "text"
  | "select"
  | "multiselect"
  | "boolean";

export type QuestionOption = {
  label: string;
  value: string;
  hint?: string;
};

export type ShowIfCondition = {
  key: string;
  operator: "eq" | "neq" | "in" | "notIn";
  value: string | string[];
};

export type DiscoveryQuestion = {
  key: string;
  step: number; // Static index — used for DB storage. NOT the visible step number.
  category: string;
  question: string;
  subtext?: string;
  type: QuestionType;
  placeholder?: string;
  options?: QuestionOption[];
  required: boolean;
  classificationSignals: string[];
  showIf?: ShowIfCondition[]; // ALL conditions must pass for question to appear
};

// ── Branching Helper ──────────────────────────────────────────
// Evaluates whether a question should be shown given current answers.
// Call this before rendering or skipping each question.

export function isQuestionVisible(
  question: DiscoveryQuestion,
  answers: Record<string, string | string[]>
): boolean {
  if (!question.showIf || question.showIf.length === 0) return true;

  return question.showIf.every((condition) => {
    const answer = answers[condition.key];
    const answerStr = Array.isArray(answer) ? answer.join(",") : (answer ?? "");

    switch (condition.operator) {
      case "eq":
        return answerStr === condition.value;
      case "neq":
        return answerStr !== condition.value;
      case "in":
        return Array.isArray(condition.value)
          ? condition.value.includes(answerStr)
          : answerStr === condition.value;
      case "notIn":
        return Array.isArray(condition.value)
          ? !condition.value.includes(answerStr)
          : answerStr !== condition.value;
      default:
        return true;
    }
  });
}

// Returns only the questions visible given current answers.
export function getVisibleQuestions(
  answers: Record<string, string | string[]>
): DiscoveryQuestion[] {
  return DISCOVERY_QUESTIONS.filter((q) => isQuestionVisible(q, answers));
}

// ── Question Set ──────────────────────────────────────────────

export const DISCOVERY_QUESTIONS: DiscoveryQuestion[] = [

  // ============================================================
  // SECTION A — PRODUCT FOUNDATION (4 questions, always visible)
  // Rapid orientation. Establishes product type, user, and role structure.
  // ============================================================

  {
    key: "product_type",
    step: 1,
    category: "What are you building",
    question: "What kind of product is this?",
    subtext: "Choose the closest match — we'll adapt the rest of the questions based on this.",
    type: "select",
    options: [
      { label: "SaaS web app", value: "saas", hint: "Subscription-based tool used in a browser" },
      { label: "Marketplace or platform", value: "marketplace", hint: "Connects two groups — buyers/sellers, employers/freelancers, etc." },
      { label: "Internal tool or admin system", value: "internal_tool", hint: "Used by a team, not public-facing" },
      { label: "AI product or automation", value: "ai_product", hint: "AI-powered generation, analysis, or agentic automation" },
      { label: "Consumer app (B2C)", value: "consumer_app", hint: "Direct-to-consumer, mobile-first or social" },
      { label: "E-commerce or digital product", value: "ecommerce", hint: "Sells physical goods, digital products, or services" },
      { label: "Content or media platform", value: "content_platform", hint: "Publishing, courses, newsletters, communities" },
      { label: "Something else", value: "other" },
    ],
    required: true,
    classificationSignals: ["productType", "functionalDomain", "executionStyle"],
  },

  {
    key: "primary_user",
    step: 2,
    category: "What are you building",
    question: "Who is the main person using this?",
    subtext: "Describe them in plain terms — their role, situation, what they're trying to get done.",
    type: "textarea",
    placeholder:
      "e.g. Operations managers at mid-size logistics companies. They spend hours a day tracking shipments across 3 different spreadsheets and just want one place to see everything.",
    required: true,
    classificationSignals: ["targetUsers", "functionalDomain", "coreSystemSummary"],
  },

  {
    key: "core_workflow",
    step: 3,
    category: "What are you building",
    question: "What's the single most important thing a user accomplishes here?",
    subtext: "Describe the core job this product does — the reason someone would pay for or use it.",
    type: "textarea",
    placeholder:
      "e.g. They submit a quote request, it gets routed to the right vendor automatically, and they track the whole approval process in one view.",
    required: true,
    classificationSignals: ["productType", "executionStyle", "coreSystemSummary"],
  },

  {
    key: "user_roles",
    step: 4,
    category: "What are you building",
    question: "How many distinct user types does this product have?",
    subtext: "Different roles mean different permissions, different views, different data access.",
    type: "select",
    options: [
      { label: "Just one type of user", value: "single", hint: "Everyone has the same access" },
      { label: "Two user types", value: "two", hint: "e.g. admin + member, buyer + seller" },
      { label: "Three or more user types", value: "multi", hint: "e.g. admin, manager, staff, client" },
      { label: "Not sure yet", value: "unsure" },
    ],
    required: true,
    classificationSignals: ["complexityLevel", "requiresMultiTenancy"],
  },

  // ============================================================
  // SECTION B — OPERATIONAL LOGIC (4 questions)
  // Extracts roles, workflows, admin capabilities, automation.
  // Skipped if single user type + internal tool.
  // ============================================================

  {
    key: "role_breakdown",
    step: 5,
    category: "How it operates",
    question: "Describe each user role and what they can do.",
    subtext: "Be specific about what each role can see, create, edit, approve, or manage.",
    type: "textarea",
    placeholder:
      "e.g. Admin: creates projects, invites clients, views all data, manages billing. Client: fills out their brief, views their own project status, downloads deliverables. Guest: views-only access to shared links.",
    required: true,
    classificationSignals: ["complexityLevel", "requiresMultiTenancy", "coreSystemSummary"],
    showIf: [{ key: "user_roles", operator: "notIn", value: ["single", "unsure"] }],
  },

  {
    key: "key_workflows",
    step: 6,
    category: "How it operates",
    question: "Walk me through the 2–3 main workflows a user moves through.",
    subtext: "Think of each workflow as: what triggers it, what steps happen, what's the outcome.",
    type: "textarea",
    placeholder:
      "e.g. Workflow 1 — New project: Admin creates project → fills in brief → invites client → client reviews → admin kicks off work.\nWorkflow 2 — Delivery: Admin uploads deliverable → client gets notified → client approves or requests revision → marked complete.",
    required: true,
    classificationSignals: ["productType", "executionStyle", "coreSystemSummary", "functionalDomain"],
  },

  {
    key: "admin_capabilities",
    step: 7,
    category: "How it operates",
    question: "What does an admin or power user need to be able to do?",
    subtext: "Select everything that applies — this shapes the admin architecture.",
    type: "multiselect",
    options: [
      { label: "Manage users and invite team members", value: "user_management" },
      { label: "Approve or reject submissions", value: "approvals" },
      { label: "View analytics and reporting", value: "analytics" },
      { label: "Manage content or listings", value: "content_management" },
      { label: "Configure settings and rules", value: "settings" },
      { label: "Manage billing and subscriptions", value: "billing" },
      { label: "Export data or generate reports", value: "data_export" },
      { label: "Audit logs and activity history", value: "audit_logs" },
      { label: "Assign roles and permissions", value: "role_management" },
      { label: "Communicate with users in-app", value: "messaging" },
    ],
    required: true,
    classificationSignals: ["complexityLevel", "functionalDomain", "coreSystemSummary"],
  },

  {
    key: "automation_triggers",
    step: 8,
    category: "How it operates",
    question: "What should happen automatically — without a user clicking anything?",
    subtext: "These become background jobs, webhooks, or scheduled tasks in the architecture.",
    type: "multiselect",
    options: [
      { label: "Email or SMS notifications", value: "notifications" },
      { label: "Status changes based on rules", value: "status_automation" },
      { label: "Scheduled reports or digests", value: "scheduled_reports" },
      { label: "Data sync with external services", value: "data_sync" },
      { label: "Payment processing and invoicing", value: "payment_processing" },
      { label: "User onboarding sequences", value: "onboarding_sequences" },
      { label: "Expiry, reminders, or deadlines", value: "deadlines" },
      { label: "AI processing on new inputs", value: "ai_processing" },
      { label: "Nothing — everything is manual", value: "none" },
    ],
    required: true,
    classificationSignals: ["complexityLevel", "functionalDomain"],
  },

  // ============================================================
  // SECTION C — BUSINESS MODEL (3 questions)
  // Shapes payments architecture and marketplace patterns.
  // Payment + marketplace questions skip if internal tool.
  // ============================================================

  {
    key: "business_model",
    step: 9,
    category: "Business model",
    question: "How does this product make money?",
    type: "select",
    options: [
      { label: "Monthly or annual subscription", value: "subscription", hint: "Users pay to access the platform" },
      { label: "Marketplace commission or transaction fee", value: "marketplace_fee", hint: "You take a % of each transaction" },
      { label: "One-time purchase or license", value: "one_time", hint: "Single payment for access" },
      { label: "Freemium — free tier with paid upgrades", value: "freemium", hint: "Free core, paid premium features" },
      { label: "Usage-based — pay per use", value: "usage_based", hint: "API calls, credits, seats, etc." },
      { label: "Service fee or lead generation", value: "service_fee", hint: "Charges for connecting buyers and providers" },
      { label: "Not monetized — internal tool", value: "internal", hint: "Built for an organization, not sold" },
      { label: "Not sure yet", value: "unsure" },
    ],
    required: true,
    classificationSignals: ["executionStyle", "requiresMarketplace", "functionalDomain"],
  },

  {
    key: "needs_payments",
    step: 10,
    category: "Business model",
    question: "What payment infrastructure does this need?",
    type: "select",
    options: [
      { label: "No payments — it's free or billed externally", value: "none" },
      { label: "Subscription billing with a payment portal", value: "subscriptions", hint: "Stripe Billing + customer portal" },
      { label: "One-time checkout", value: "one_time", hint: "Simple Stripe Checkout" },
      { label: "Marketplace payouts to sellers or providers", value: "marketplace_payouts", hint: "Stripe Connect — complex" },
      { label: "Multiple payment flows", value: "complex", hint: "More than one of the above" },
    ],
    required: true,
    classificationSignals: ["complexityLevel", "requiresMarketplace"],
    showIf: [{ key: "business_model", operator: "notIn", value: ["internal", "unsure"] }],
  },

  {
    key: "two_sided_market",
    step: 11,
    category: "Business model",
    question: "Does it need to manage transactions or relationships between two separate groups?",
    subtext: "e.g. buyers + sellers, employers + freelancers, hosts + guests, clients + providers.",
    type: "select",
    options: [
      { label: "No — single-sided, one primary user group", value: "no" },
      { label: "Yes — full marketplace with listings, matching, payouts", value: "yes_full", hint: "Complex — escrow, reviews, payout splits" },
      { label: "Partially — users can transact with each other but it's secondary", value: "yes_partial", hint: "Community with some commerce" },
    ],
    required: true,
    classificationSignals: ["requiresMarketplace", "complexityLevel"],
    showIf: [
      { key: "product_type", operator: "in", value: ["marketplace", "saas", "consumer_app"] },
    ],
  },

  // ============================================================
  // SECTION D — SCOPE & BUILD CONTEXT (5 questions)
  // Scope compression. Establishes MVP boundary and build constraints.
  // ============================================================

  {
    key: "mvp_must_have",
    step: 12,
    category: "Scope & timeline",
    question: "What absolutely must be in version 1?",
    subtext: "Describe the minimum product that solves the core problem. Be ruthless — scope is the biggest risk.",
    type: "textarea",
    placeholder:
      "e.g. V1 must have: user auth, project creation, a client intake form, and a dashboard showing project status. That's it. Everything else can come later.",
    required: true,
    classificationSignals: ["executionStyle", "complexityLevel", "coreSystemSummary"],
  },

  {
    key: "future_scope",
    step: 13,
    category: "Scope & timeline",
    question: "What can wait for version 2 or later?",
    subtext: "List features you want but don't need at launch. This helps us separate MVP from future architecture.",
    type: "textarea",
    placeholder:
      "e.g. V2+: Mobile app, team collaboration, advanced analytics, white-labeling, API for third-party integrations, AI suggestions.",
    required: false,
    classificationSignals: ["complexityLevel"],
  },

  {
    key: "launch_timeline",
    step: 14,
    category: "Scope & timeline",
    question: "When do you need to ship version 1?",
    subtext: "This calibrates build complexity and MVP scope in the specification.",
    type: "select",
    options: [
      { label: "Under 4 weeks — ship as fast as possible", value: "asap", hint: "Ultra-minimal scope only" },
      { label: "1–3 months", value: "one_to_three", hint: "Focused MVP" },
      { label: "3–6 months", value: "three_to_six", hint: "Full-featured MVP" },
      { label: "6–12 months", value: "six_to_twelve", hint: "Comprehensive build" },
      { label: "No fixed timeline", value: "flexible" },
    ],
    required: true,
    classificationSignals: ["complexityLevel", "executionStyle"],
  },

  {
    key: "build_team",
    step: 15,
    category: "Scope & timeline",
    question: "Who is building this?",
    subtext: "This shapes infrastructure choices — a solo dev needs simpler ops than a team of 5.",
    type: "select",
    options: [
      { label: "Me alone — I'm the developer", value: "solo_dev" },
      { label: "Me using AI coding tools (Claude Code, Cursor, etc.)", value: "ai_assisted", hint: "Spec will be optimized for this" },
      { label: "Small dev team (2–4 people)", value: "small_team" },
      { label: "Technical co-founder", value: "cofounder" },
      { label: "Agency or freelancers", value: "agency" },
      { label: "Not sure yet", value: "unsure" },
    ],
    required: true,
    classificationSignals: ["complexityLevel", "executionStyle"],
  },

  {
    key: "budget_range",
    step: 16,
    category: "Scope & timeline",
    question: "What's the rough budget for building this?",
    subtext: "Guides infrastructure choices — serverless vs. dedicated servers, managed services vs. self-hosted.",
    type: "select",
    options: [
      { label: "Bootstrap — under $500/month infra budget", value: "bootstrap", hint: "Serverless-first, free tiers wherever possible" },
      { label: "Early-stage — $500–$2,000/month", value: "early_stage", hint: "Managed services, no ops overhead" },
      { label: "Growth — $2,000–$10,000/month", value: "growth", hint: "Can afford dedicated resources" },
      { label: "Enterprise — $10,000+/month", value: "enterprise", hint: "Performance and compliance first" },
      { label: "Not sure / doesn't matter yet", value: "unsure" },
    ],
    required: true,
    classificationSignals: ["complexityLevel", "executionStyle"],
  },

  // ============================================================
  // SECTION E — TECHNICAL COMPLEXITY (5 questions)
  // Always visible. Shapes architecture and infrastructure.
  // ============================================================

  {
    key: "target_scale",
    step: 17,
    category: "Technical requirements",
    question: "How many users do you expect in the first 12 months?",
    type: "select",
    options: [
      { label: "Under 100 — internal or invite-only", value: "tiny" },
      { label: "100–1,000 — early-stage", value: "small" },
      { label: "1,000–10,000 — growing product", value: "medium" },
      { label: "10,000–100,000 — scaled launch", value: "large" },
      { label: "100,000+ — consumer scale", value: "massive" },
      { label: "Not sure", value: "unsure" },
    ],
    required: true,
    classificationSignals: ["complexityLevel"],
  },

  {
    key: "needs_ai",
    step: 18,
    category: "Technical requirements",
    question: "Does this product involve AI or smart automation?",
    type: "select",
    options: [
      { label: "No — standard web application", value: "none" },
      { label: "Yes — AI generates content (text, images, code)", value: "generative", hint: "LLM API integration" },
      { label: "Yes — AI automates a workflow or decision", value: "automation", hint: "Agents, pipelines, classification" },
      { label: "Yes — AI powers recommendations or personalization", value: "recommendations" },
      { label: "Yes — AI analyzes data and surfaces insights", value: "analytics_ai" },
      { label: "Possibly — not decided yet", value: "maybe" },
    ],
    required: true,
    classificationSignals: ["requiresAiLayer", "complexityLevel", "productType"],
  },

  {
    key: "needs_realtime",
    step: 19,
    category: "Technical requirements",
    question: "Does it need real-time features?",
    type: "select",
    options: [
      { label: "No — standard page loads are fine", value: "none" },
      { label: "Yes — live notifications or status updates", value: "notifications" },
      { label: "Yes — real-time messaging or chat", value: "chat" },
      { label: "Yes — collaborative editing", value: "collaborative", hint: "Multiple users editing the same thing" },
      { label: "Yes — live data feeds or dashboards", value: "live_data" },
    ],
    required: true,
    classificationSignals: ["complexityLevel", "functionalDomain"],
  },

  {
    key: "data_sensitivity",
    step: 20,
    category: "Technical requirements",
    question: "Does it handle sensitive or regulated data?",
    subtext: "This triggers compliance requirements (HIPAA, SOC2, GDPR) in the architecture.",
    type: "multiselect",
    options: [
      { label: "Health or medical information", value: "health", hint: "HIPAA compliance required" },
      { label: "Financial data or payment records", value: "financial", hint: "PCI-DSS scope" },
      { label: "Personal identifiable information (PII)", value: "pii", hint: "GDPR / CCPA scope" },
      { label: "Children's data (under 13)", value: "children", hint: "COPPA compliance" },
      { label: "Proprietary business data from enterprise clients", value: "enterprise_data", hint: "SOC2 / data processing agreements" },
      { label: "No — standard non-sensitive data", value: "none" },
    ],
    required: true,
    classificationSignals: ["complexityLevel", "functionalDomain"],
  },

  {
    key: "integrations",
    step: 21,
    category: "Technical requirements",
    question: "Does it need to connect to any external services?",
    subtext: "Name specific tools — email providers, CRMs, APIs, ERPs, etc.",
    type: "textarea",
    placeholder:
      "e.g. Must integrate with: HubSpot (CRM), SendGrid (email), Google Calendar (scheduling), Zapier (automation). Nice-to-have: Slack notifications, QuickBooks for invoices.",
    required: false,
    classificationSignals: ["complexityLevel", "functionalDomain"],
  },

  // ============================================================
  // SECTION F — DESIGN DIRECTION (3 questions)
  // Skipped for pure internal tools. Feeds design intelligence output.
  // ============================================================

  {
    key: "visual_style",
    step: 22,
    category: "Design direction",
    question: "What's the visual feel you're aiming for?",
    type: "select",
    options: [
      { label: "Clean and minimal — lots of whitespace", value: "minimal", hint: "e.g. Linear, Notion, Stripe" },
      { label: "Data-dense — tables, charts, metrics", value: "data_dense", hint: "e.g. analytics tools, CRMs, admin panels" },
      { label: "Media-rich — images, visual browsing", value: "media_rich", hint: "e.g. marketplaces, portfolios, galleries" },
      { label: "Friendly and consumer — colorful, approachable", value: "consumer", hint: "e.g. Duolingo, Airbnb, social apps" },
      { label: "Enterprise — professional, structured", value: "enterprise", hint: "e.g. ERP, compliance, HR tools" },
    ],
    required: true,
    classificationSignals: ["productType"],
    showIf: [{ key: "product_type", operator: "notIn", value: ["internal_tool"] }],
  },

  {
    key: "ui_pattern",
    step: 23,
    category: "Design direction",
    question: "What's the primary UI experience?",
    subtext: "Where users spend most of their time in the product.",
    type: "select",
    options: [
      { label: "Dashboard — overview with metrics and navigation", value: "dashboard" },
      { label: "List + detail — browse items, click into detail", value: "list_detail", hint: "Inbox, CRM contacts, product catalog" },
      { label: "Wizard or guided flow — step-by-step process", value: "wizard", hint: "Onboarding, setup, checkout" },
      { label: "Canvas or editor — users create and edit", value: "canvas_editor", hint: "Doc editor, design tool, form builder" },
      { label: "Feed or browse — scrollable content stream", value: "feed", hint: "Social feed, marketplace listings" },
      { label: "Search-first — users find things via search", value: "search_first", hint: "Job board, directory, knowledge base" },
    ],
    required: true,
    classificationSignals: ["productType", "executionStyle"],
    showIf: [{ key: "product_type", operator: "notIn", value: ["internal_tool"] }],
  },

  {
    key: "brand_direction",
    step: 24,
    category: "Design direction",
    question: "How would you describe this brand's personality?",
    subtext: "Pick up to 3. This shapes visual tone, typography, and copy direction.",
    type: "multiselect",
    options: [
      { label: "Professional and trustworthy", value: "professional" },
      { label: "Friendly and approachable", value: "friendly" },
      { label: "Bold and innovative", value: "bold" },
      { label: "Clean and minimal", value: "minimal" },
      { label: "Playful and fun", value: "playful" },
      { label: "Premium and exclusive", value: "premium" },
      { label: "Technical and expert", value: "technical" },
      { label: "Calm and reliable", value: "calm" },
    ],
    required: false,
    classificationSignals: ["functionalDomain"],
    showIf: [{ key: "product_type", operator: "notIn", value: ["internal_tool"] }],
  },

  // ============================================================
  // SECTION G — MARKET POSITIONING (3 questions)
  // Skipped for internal tools. Feeds GTM and positioning output.
  // ============================================================

  {
    key: "unique_value",
    step: 25,
    category: "Positioning",
    question: "What makes this different from what already exists?",
    subtext: "The core insight or advantage — why would someone choose yours?",
    type: "textarea",
    placeholder:
      "e.g. Every other invoicing tool is built for accountants. Ours is built for freelancers who hate admin — it takes 45 seconds from project to paid invoice.",
    required: false,
    classificationSignals: ["functionalDomain", "coreSystemSummary"],
    showIf: [{ key: "product_type", operator: "notIn", value: ["internal_tool"] }],
  },

  {
    key: "competitors",
    step: 26,
    category: "Positioning",
    question: "What do people use instead of this today?",
    subtext: "Name specific products, tools, or even manual processes your users currently rely on.",
    type: "textarea",
    placeholder:
      "e.g. Currently: Notion + spreadsheets cobbled together. Direct competitors: Monday.com, ClickUp — both too complex for our market. Indirect: email and phone calls.",
    required: false,
    classificationSignals: ["functionalDomain", "productType"],
    showIf: [{ key: "product_type", operator: "notIn", value: ["internal_tool"] }],
  },

  {
    key: "target_geography",
    step: 27,
    category: "Positioning",
    question: "Where is your target market?",
    type: "select",
    options: [
      { label: "Local — specific city or region", value: "local" },
      { label: "National — one country", value: "national" },
      { label: "Global — English-speaking markets", value: "global_english" },
      { label: "Global — multiple languages required", value: "global_multilingual", hint: "Adds i18n architecture complexity" },
      { label: "Not sure yet", value: "unsure" },
    ],
    required: false,
    classificationSignals: ["complexityLevel"],
    showIf: [{ key: "product_type", operator: "notIn", value: ["internal_tool"] }],
  },

  // ============================================================
  // SECTION H — FINAL CONTEXT (1 question, always visible)
  // ============================================================

  {
    key: "special_requirements",
    step: 28,
    category: "Anything else",
    question: "Anything else we should know?",
    subtext:
      "Compliance requirements, hard constraints, existing systems to migrate from, or context that didn't fit above.",
    type: "textarea",
    placeholder:
      "e.g. Must be HIPAA-compliant — we handle patient data. Users are primarily on mobile. We're migrating from a legacy Salesforce setup. Must support SSO for enterprise clients.",
    required: false,
    classificationSignals: ["complexityLevel", "functionalDomain"],
  },
];

export const TOTAL_STEPS = DISCOVERY_QUESTIONS.length; // 28 static questions

export function getQuestion(step: number): DiscoveryQuestion | undefined {
  return DISCOVERY_QUESTIONS.find((q) => q.step === step);
}

export function getQuestionByKey(key: string): DiscoveryQuestion | undefined {
  return DISCOVERY_QUESTIONS.find((q) => q.key === key);
}
