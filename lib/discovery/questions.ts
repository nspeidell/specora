// ============================================================
// DISCOVERY QUESTIONS
// 12-step guided Q&A that feeds the Intent Classification Engine.
// Each answer becomes a discovery_response row and informs:
//   - productType, complexityLevel, functionalDomain, executionStyle
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

export type DiscoveryQuestion = {
  key: string;
  step: number; // 1-based
  category: string;
  question: string;
  subtext?: string;
  type: QuestionType;
  placeholder?: string;
  options?: QuestionOption[];
  required: boolean;
  classificationSignals: string[]; // which intent dimensions this informs
};

export const DISCOVERY_QUESTIONS: DiscoveryQuestion[] = [
  // ── CORE PRODUCT UNDERSTANDING ──────────────────────────────
  {
    key: "primary_user",
    step: 1,
    category: "Core product",
    question: "Who is the main person using this product?",
    subtext:
      "Describe them in plain terms — their role, situation, or what they're trying to accomplish.",
    type: "textarea",
    placeholder:
      "e.g. Small business owners who need to invoice clients without hiring an accountant. They're non-technical and want something simple.",
    required: true,
    classificationSignals: ["productType", "functionalDomain", "targetUsers"],
  },
  {
    key: "core_action",
    step: 2,
    category: "Core product",
    question:
      "What's the single most important thing a user does in your product?",
    subtext:
      "If you had to describe the core action in one sentence, what would it be?",
    type: "textarea",
    placeholder:
      "e.g. They create a project, invite a client, and send a proposal — all in under 5 minutes.",
    required: true,
    classificationSignals: ["productType", "executionStyle", "coreSystemSummary"],
  },
  {
    key: "user_types",
    step: 3,
    category: "Core product",
    question: "Does your product have more than one type of user?",
    subtext:
      "For example: admin + customer, buyer + seller, creator + viewer, employer + freelancer.",
    type: "select",
    options: [
      {
        label: "No — just one type of user",
        value: "single",
        hint: "Simpler auth and permissions model",
      },
      {
        label: "Yes — two distinct user types",
        value: "two_roles",
        hint: "e.g. buyer/seller, employer/applicant",
      },
      {
        label: "Yes — three or more user types",
        value: "multi_role",
        hint: "e.g. admin, manager, staff, customer",
      },
      {
        label: "Not sure yet",
        value: "unsure",
      },
    ],
    required: true,
    classificationSignals: ["complexityLevel", "requiresMultiTenancy"],
  },
  {
    key: "business_model",
    step: 4,
    category: "Core product",
    question: "How does this product make money?",
    subtext: "Pick the model that best fits, even if you're still figuring it out.",
    type: "select",
    options: [
      {
        label: "Monthly or annual subscription",
        value: "subscription",
        hint: "SaaS — users pay to access the platform",
      },
      {
        label: "Marketplace commission",
        value: "marketplace",
        hint: "You take a cut of transactions between users",
      },
      {
        label: "One-time purchase",
        value: "one_time",
        hint: "Users pay once for access or a product",
      },
      {
        label: "Freemium — free tier + paid upgrades",
        value: "freemium",
        hint: "Free core, paid premium features",
      },
      {
        label: "Usage-based / pay-per-use",
        value: "usage_based",
        hint: "Users pay based on how much they consume",
      },
      {
        label: "Not monetized / internal tool",
        value: "internal",
        hint: "Built for a team or organization",
      },
      { label: "Not sure yet", value: "unsure" },
    ],
    required: true,
    classificationSignals: ["executionStyle", "requiresMarketplace"],
  },

  // ── SCALE & COMPLEXITY ───────────────────────────────────────
  {
    key: "target_scale",
    step: 5,
    category: "Scale",
    question: "How many users do you expect in the first 12 months?",
    type: "select",
    options: [
      { label: "Under 100", value: "tiny", hint: "Internal tool or early beta" },
      { label: "100 – 1,000", value: "small", hint: "Early-stage SaaS" },
      { label: "1,000 – 10,000", value: "medium", hint: "Growing product" },
      { label: "10,000 – 100,000", value: "large", hint: "Scaled launch" },
      { label: "100,000+", value: "massive", hint: "Consumer app / viral potential" },
      { label: "Not sure", value: "unsure" },
    ],
    required: true,
    classificationSignals: ["complexityLevel"],
  },
  {
    key: "needs_realtime",
    step: 6,
    category: "Scale",
    question: "Does your product need real-time features?",
    subtext:
      "Things like live notifications, real-time chat, collaborative editing, or live data dashboards.",
    type: "select",
    options: [
      { label: "No — standard page loads are fine", value: "none" },
      {
        label: "Yes — live notifications or status updates",
        value: "notifications",
      },
      { label: "Yes — real-time chat or messaging", value: "chat" },
      {
        label: "Yes — collaborative editing (like Google Docs)",
        value: "collaborative",
      },
      { label: "Yes — live data feeds or dashboards", value: "live_data" },
    ],
    required: true,
    classificationSignals: ["complexityLevel", "functionalDomain"],
  },

  // ── PAYMENT & MARKETPLACE ────────────────────────────────────
  {
    key: "needs_payments",
    step: 7,
    category: "Payments",
    question: "Does your product need to process payments?",
    subtext: "Include subscriptions, one-time charges, or marketplace payouts.",
    type: "select",
    options: [
      { label: "No payments needed", value: "none" },
      {
        label: "Yes — subscription billing",
        value: "subscriptions",
        hint: "Monthly/annual via Stripe Billing",
      },
      {
        label: "Yes — one-time charges",
        value: "one_time",
        hint: "Checkout or invoice payments",
      },
      {
        label: "Yes — marketplace payouts (pay sellers/creators)",
        value: "marketplace_payouts",
        hint: "Stripe Connect or similar",
      },
      { label: "Yes — multiple of the above", value: "complex" },
    ],
    required: true,
    classificationSignals: [
      "complexityLevel",
      "requiresMarketplace",
      "functionalDomain",
    ],
  },
  {
    key: "needs_marketplace",
    step: 8,
    category: "Payments",
    question:
      "Does your product connect two groups of people — like buyers and sellers, or employers and freelancers?",
    subtext:
      "This shapes whether we design for a marketplace architecture vs. a standard SaaS.",
    type: "select",
    options: [
      {
        label: "No — it's a tool for one group of users",
        value: "no",
      },
      {
        label: "Yes — it matches or connects two groups",
        value: "yes_marketplace",
        hint: "e.g. Airbnb, Upwork, Etsy model",
      },
      {
        label: "Partially — users can share or sell to each other",
        value: "partial",
        hint: "e.g. community + some commerce",
      },
    ],
    required: true,
    classificationSignals: ["requiresMarketplace", "productType"],
  },

  // ── AI & INTELLIGENCE ────────────────────────────────────────
  {
    key: "needs_ai",
    step: 9,
    category: "AI & intelligence",
    question: "Does your product involve AI or smart automation?",
    subtext:
      "This could be generative AI (text/image/code), recommendations, classification, or any other ML-powered feature.",
    type: "select",
    options: [
      { label: "No AI — this is a standard web app", value: "none" },
      {
        label: "Yes — AI generates content (text, images, code)",
        value: "generative",
        hint: "GPT, Claude, Stable Diffusion, etc.",
      },
      {
        label: "Yes — AI powers smart recommendations",
        value: "recommendations",
        hint: "Personalization or matching algorithms",
      },
      {
        label: "Yes — AI automates a workflow or task",
        value: "automation",
        hint: "Agents, pipelines, document processing",
      },
      {
        label: "Yes — AI analyzes data or provides insights",
        value: "analytics",
        hint: "Dashboards with AI-powered insights",
      },
      { label: "Possibly — not sure yet", value: "maybe" },
    ],
    required: true,
    classificationSignals: [
      "requiresAiLayer",
      "complexityLevel",
      "functionalDomain",
    ],
  },

  // ── DATA & CONTENT ───────────────────────────────────────────
  {
    key: "data_types",
    step: 10,
    category: "Data & content",
    question: "What kinds of data does your product primarily deal with?",
    subtext: "Select all that apply.",
    type: "multiselect",
    options: [
      { label: "User profiles & accounts", value: "profiles" },
      { label: "Documents or rich text", value: "documents" },
      { label: "Images or video", value: "media" },
      { label: "Financial transactions", value: "financial" },
      { label: "Scheduling or calendar events", value: "scheduling" },
      { label: "Messages or chat history", value: "messages" },
      { label: "Products or inventory", value: "inventory" },
      { label: "Location or map data", value: "location" },
      { label: "Analytics or metrics", value: "analytics" },
      { label: "Forms or survey responses", value: "forms" },
    ],
    required: true,
    classificationSignals: ["functionalDomain", "complexityLevel"],
  },
  {
    key: "integrations",
    step: 11,
    category: "Data & content",
    question:
      "Does your product need to connect to any external services or APIs?",
    subtext:
      "Name specific tools if you know them — e.g. Google Calendar, Slack, Stripe, Salesforce, Twilio.",
    type: "textarea",
    placeholder:
      "e.g. We need to sync with Google Calendar, send emails via SendGrid, and pull property data from Zillow's API. Also want Slack notifications for our team.",
    required: false,
    classificationSignals: ["complexityLevel", "functionalDomain"],
  },

  // ── UI / UX ──────────────────────────────────────────────────
  {
    key: "primary_platform",
    step: 12,
    category: "UI / UX",
    question: "What device or platform is this primarily designed for?",
    subtext: "This shapes navigation patterns, layout density, and mobile considerations.",
    type: "select",
    options: [
      {
        label: "Web browser — desktop first",
        value: "web_desktop",
        hint: "Dashboard, SaaS tools, internal apps",
      },
      {
        label: "Web browser — mobile first",
        value: "web_mobile",
        hint: "Consumer apps, marketplaces, services",
      },
      {
        label: "Web browser — works well on both",
        value: "web_responsive",
        hint: "Fully responsive, no dominant device",
      },
      {
        label: "Native mobile app (iOS / Android)",
        value: "native_mobile",
        hint: "Requires React Native or similar",
      },
      {
        label: "Not sure yet",
        value: "unsure",
      },
    ],
    required: true,
    classificationSignals: ["productType", "complexityLevel"],
  },
  {
    key: "visual_style",
    step: 13,
    category: "UI / UX",
    question: "What's the visual style and feel you're aiming for?",
    subtext: "This informs design system choices and component complexity in the spec.",
    type: "select",
    options: [
      {
        label: "Clean and minimal — lots of whitespace, simple layouts",
        value: "minimal",
        hint: "e.g. Linear, Notion, Stripe",
      },
      {
        label: "Data-dense — tables, charts, dashboards, lots on screen",
        value: "data_dense",
        hint: "e.g. analytics tools, CRMs, admin panels",
      },
      {
        label: "Media-rich — images, video, visual browsing",
        value: "media_rich",
        hint: "e.g. marketplaces, portfolios, content platforms",
      },
      {
        label: "Consumer / friendly — approachable, colorful, fun",
        value: "consumer",
        hint: "e.g. Duolingo, Airbnb, social apps",
      },
      {
        label: "Enterprise / formal — professional, structured",
        value: "enterprise",
        hint: "e.g. ERP, HR tools, compliance software",
      },
    ],
    required: true,
    classificationSignals: ["productType", "functionalDomain"],
  },
  {
    key: "ui_pattern",
    step: 14,
    category: "UI / UX",
    question: "What's the core UI pattern users spend most of their time in?",
    subtext: "Pick the one that best describes the primary user experience.",
    type: "select",
    options: [
      {
        label: "Dashboard — overview metrics and navigation hub",
        value: "dashboard",
        hint: "Home base with widgets and KPIs",
      },
      {
        label: "List + detail — browse items, click into detail view",
        value: "list_detail",
        hint: "e.g. inbox, CRM contacts, product catalog",
      },
      {
        label: "Wizard / guided flow — step-by-step process",
        value: "wizard",
        hint: "e.g. onboarding, setup, checkout",
      },
      {
        label: "Canvas / editor — users create or edit content",
        value: "canvas_editor",
        hint: "e.g. doc editor, design tool, form builder",
      },
      {
        label: "Feed / browse — scrollable content stream",
        value: "feed",
        hint: "e.g. social feed, marketplace listings, blog",
      },
      {
        label: "Search-first — users find things via search",
        value: "search",
        hint: "e.g. job board, directory, knowledge base",
      },
    ],
    required: true,
    classificationSignals: ["productType", "executionStyle"],
  },

  // ── FINAL CONTEXT ────────────────────────────────────────────
  {
    key: "special_requirements",
    step: 15,
    category: "Final context",
    question:
      "Anything else important we should know about this product?",
    subtext:
      "Compliance needs (HIPAA, SOC2, GDPR), must-have features, specific constraints, or context that didn't fit above.",
    type: "textarea",
    placeholder:
      "e.g. This handles patient health data so we need HIPAA compliance. Also, our users are in the EU so GDPR matters. Must work offline on mobile.",
    required: false,
    classificationSignals: ["complexityLevel", "functionalDomain"],
  },
];

export const TOTAL_STEPS = DISCOVERY_QUESTIONS.length;

export function getQuestion(step: number): DiscoveryQuestion | undefined {
  return DISCOVERY_QUESTIONS.find((q) => q.step === step);
}

export function getQuestionByKey(key: string): DiscoveryQuestion | undefined {
  return DISCOVERY_QUESTIONS.find((q) => q.key === key);
}
