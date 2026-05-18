import {
  sqliteTable,
  text,
  integer,
  numeric,
  index,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

// ============================================================
// USERS
// Internal user record mapped from Clerk identity.
// id = our UUID (PK). clerk_user_id = Clerk's reference (unique).
// All FK relationships use users.id — never Clerk's ID directly.
// ============================================================
export const users = sqliteTable(
  "users",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    clerkUserId: text("clerk_user_id").notNull().unique(),
    email: text("email").notNull(),
    fullName: text("full_name"),
    avatarUrl: text("avatar_url"),
    onboardingCompleted: integer("onboarding_completed", {
      mode: "boolean",
    }).default(false),
    technicalLevel: text("technical_level").default("non_technical"),
    // 'non_technical' | 'semi_technical' | 'technical'
    stripeCustomerId: text("stripe_customer_id").unique(),
    subscriptionStatus: text("subscription_status").default("free"),
    subscriptionTier: text("subscription_tier").default("free"),
    // 'free' | 'starter' | 'pro' | 'agency'
    generationsUsed: integer("generations_used").default(0),
    generationsLimit: integer("generations_limit").default(1),
    createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(
      () => new Date()
    ),
    updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(
      () => new Date()
    ),
  },
  (t) => [
    uniqueIndex("users_clerk_idx").on(t.clerkUserId),
    index("users_email_idx").on(t.email),
  ]
);

// ============================================================
// ORGANIZATIONS
// ============================================================
export const organizations = sqliteTable("organizations", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  clerkOrgId: text("clerk_org_id").unique(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  ownerId: text("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  stripeCustomerId: text("stripe_customer_id").unique(),
  subscriptionStatus: text("subscription_status").default("free"),
  subscriptionTier: text("subscription_tier").default("free"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(
    () => new Date()
  ),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(
    () => new Date()
  ),
});

// ============================================================
// ORGANIZATION MEMBERS
// ============================================================
export const organizationMembers = sqliteTable(
  "organization_members",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role").default("member"),
    // 'owner' | 'admin' | 'strategist' | 'developer' | 'client' | 'viewer'
    joinedAt: integer("joined_at", { mode: "timestamp" }).$defaultFn(
      () => new Date()
    ),
  },
  (t) => [uniqueIndex("org_user_unique").on(t.organizationId, t.userId)]
);

// ============================================================
// PROJECTS
// ============================================================
export const projects = sqliteTable(
  "projects",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    organizationId: text("organization_id").references(
      () => organizations.id,
      { onDelete: "set null" }
    ),
    name: text("name").notNull(),
    description: text("description"),
    industry: text("industry"),
    businessModel: text("business_model"),
    status: text("status").default("draft"),
    // 'draft' | 'discovery' | 'classified' | 'inferring' | 'generating' | 'complete' | 'archived'
    technicalComplexity: text("technical_complexity"),
    createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(
      () => new Date()
    ),
    updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(
      () => new Date()
    ),
  },
  (t) => [index("projects_owner_idx").on(t.ownerId)]
);

// ============================================================
// DISCOVERY SESSIONS
// ============================================================
export const discoverySessions = sqliteTable("discovery_sessions", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  status: text("status").default("in_progress"),
  // 'in_progress' | 'completed' | 'abandoned'
  currentStep: integer("current_step").default(0),
  totalSteps: integer("total_steps"),
  startedAt: integer("started_at", { mode: "timestamp" }).$defaultFn(
    () => new Date()
  ),
  completedAt: integer("completed_at", { mode: "timestamp" }),
});

// ============================================================
// DISCOVERY RESPONSES
// ============================================================
export const discoveryResponses = sqliteTable(
  "discovery_responses",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    sessionId: text("session_id")
      .notNull()
      .references(() => discoverySessions.id, { onDelete: "cascade" }),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    questionKey: text("question_key").notNull(),
    questionText: text("question_text").notNull(),
    responseText: text("response_text"),
    responseMetadata: text("response_metadata"), // JSON string
    stepNumber: integer("step_number"),
    createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(
      () => new Date()
    ),
  },
  (t) => [index("discovery_session_idx").on(t.sessionId)]
);

// ============================================================
// PROJECT CLASSIFICATIONS
// Intent classification result — gates all generation.
// ============================================================
export const projectClassifications = sqliteTable(
  "project_classifications",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    productType: text("product_type").notNull(),
    complexityLevel: integer("complexity_level").notNull(),
    complexityLabel: text("complexity_label").notNull(),
    functionalDomain: text("functional_domain").notNull(),
    executionStyle: text("execution_style").notNull(),
    targetUsers: text("target_users"),
    coreSystemSummary: text("core_system_summary"),
    phaseTemplate: text("phase_template"), // JSON string array
    classificationRationale: text("classification_rationale"),
    confidenceScore: integer("confidence_score"),
    requiresAiLayer: integer("requires_ai_layer", {
      mode: "boolean",
    }).default(false),
    requiresMultiTenancy: integer("requires_multi_tenancy", {
      mode: "boolean",
    }).default(false),
    requiresMarketplace: integer("requires_marketplace", {
      mode: "boolean",
    }).default(false),
    aiProvider: text("ai_provider"),
    promptVersion: text("prompt_version"),
    createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(
      () => new Date()
    ),
    updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(
      () => new Date()
    ),
  },
  (t) => [uniqueIndex("classifications_project_idx").on(t.projectId)]
);

// ============================================================
// ARCHITECTURE RECOMMENDATIONS
// ============================================================
export const architectureRecommendations = sqliteTable(
  "architecture_recommendations",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    recommendedStack: text("recommended_stack"), // JSON string
    authStrategy: text("auth_strategy"),
    databaseDesign: text("database_design"),
    infrastructure: text("infrastructure"), // JSON string
    recommendedApis: text("recommended_apis"), // JSON string
    recommendedIntegrations: text("recommended_integrations"), // JSON string
    scalingConsiderations: text("scaling_considerations"),
    complexityScore: integer("complexity_score"),
    complexityRationale: text("complexity_rationale"),
    estimatedBuildWeeks: integer("estimated_build_weeks"),
    keyRisks: text("key_risks"), // JSON string
    aiProvider: text("ai_provider"),
    aiModel: text("ai_model"),
    promptVersion: text("prompt_version"),
    createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(
      () => new Date()
    ),
  }
);

// ============================================================
// GENERATED SPECIFICATIONS
// Parent record — actual content in specification_versions
// ============================================================
export const generatedSpecifications = sqliteTable(
  "generated_specifications",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    currentVersionId: text("current_version_id"),
    status: text("status").default("queued"),
    // 'queued' | 'generating' | 'complete' | 'failed'
    targetAiProvider: text("target_ai_provider").default("claude"),
    errorMessage: text("error_message"),
    createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(
      () => new Date()
    ),
    updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(
      () => new Date()
    ),
  },
  (t) => [index("specs_project_idx").on(t.projectId)]
);

// ============================================================
// SPECIFICATION VERSIONS
// Git-like versioning for generated specs
// ============================================================
export const specificationVersions = sqliteTable(
  "specification_versions",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    specificationId: text("specification_id")
      .notNull()
      .references(() => generatedSpecifications.id, { onDelete: "cascade" }),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    versionNumber: text("version_number").notNull(),
    parentVersionId: text("parent_version_id"),
    changelog: text("changelog"),
    executiveSummary: text("executive_summary"),
    productVision: text("product_vision"),
    technicalArchitecture: text("technical_architecture"),
    recommendedStack: text("recommended_stack"),
    databaseSchema: text("database_schema"),
    apiStructure: text("api_structure"),
    frontendArchitecture: text("frontend_architecture"),
    backendArchitecture: text("backend_architecture"),
    securityRequirements: text("security_requirements"),
    deploymentStrategy: text("deployment_strategy"),
    scalingConsiderations: text("scaling_considerations"),
    aiCodingInstructions: text("ai_coding_instructions"),
    fileTree: text("file_tree"),
    cliCommands: text("cli_commands"),
    sprintPlans: text("sprint_plans"),
    futureScalability: text("future_scalability"),
    fullSpecMarkdown: text("full_spec_markdown"),
    fullSpecJson: text("full_spec_json"),
    structuralDiff: text("structural_diff"),
    tokenCount: integer("token_count"),
    generationTimeMs: integer("generation_time_ms"),
    aiProvider: text("ai_provider"),
    aiModel: text("ai_model"),
    promptVersion: text("prompt_version"),
    generationMetadata: text("generation_metadata"),
    createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(
      () => new Date()
    ),
  },
  (t) => [
    index("spec_versions_spec_idx").on(t.specificationId),
    index("spec_versions_project_idx").on(t.projectId),
  ]
);

// ============================================================
// GENERATION LOGS
// Real-time progress events for SSE streaming
// ============================================================
export const generationLogs = sqliteTable(
  "generation_logs",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    specificationId: text("specification_id")
      .notNull()
      .references(() => generatedSpecifications.id, { onDelete: "cascade" }),
    stage: text("stage").notNull(),
    status: text("status").notNull(),
    message: text("message"),
    metadata: text("metadata"),
    createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(
      () => new Date()
    ),
  },
  (t) => [index("gen_logs_spec_idx").on(t.specificationId)]
);

// ============================================================
// PROMPT VERSIONS
// ============================================================
export const promptVersions = sqliteTable("prompt_versions", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  promptType: text("prompt_type").notNull(),
  content: text("content").notNull(),
  isActive: integer("is_active", { mode: "boolean" }).default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(
    () => new Date()
  ),
});

// ============================================================
// CAP TABLES
// ============================================================
export const capTables = sqliteTable(
  "cap_tables",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organization_id").references(
      () => organizations.id,
      { onDelete: "cascade" }
    ),
    projectId: text("project_id").references(() => projects.id, {
      onDelete: "cascade",
    }),
    shareholderName: text("shareholder_name").notNull(),
    role: text("role").notNull(),
    equityPercentage: numeric("equity_percentage").notNull(),
    vestingStartDate: text("vesting_start_date"),
    vestingCliffMonths: integer("vesting_cliff_months"),
    vestingDurationMonths: integer("vesting_duration_months"),
    sharesIssued: numeric("shares_issued"),
    dilutionGroup: text("dilution_group"),
    notes: text("notes"),
    createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(
      () => new Date()
    ),
    updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(
      () => new Date()
    ),
  },
  (t) => [
    index("cap_tables_org_idx").on(t.organizationId),
    index("cap_tables_project_idx").on(t.projectId),
  ]
);

// ============================================================
// CAP TABLE SNAPSHOTS
// ============================================================
export const capTableSnapshots = sqliteTable("cap_table_snapshots", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  organizationId: text("organization_id").references(() => organizations.id, {
    onDelete: "cascade",
  }),
  label: text("label").notNull(),
  snapshotData: text("snapshot_data").notNull(),
  totalShares: numeric("total_shares"),
  valuation: numeric("valuation"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(
    () => new Date()
  ),
});

// ============================================================
// PROJECT ASSETS
// ============================================================
export const projectAssets = sqliteTable("project_assets", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  assetType: text("asset_type").notNull(),
  fileName: text("file_name").notNull(),
  r2Key: text("r2_key").notNull(),
  fileSizeBytes: integer("file_size_bytes"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(
    () => new Date()
  ),
});

// ============================================================
// ACTIVITY LOGS
// ============================================================
export const activityLogs = sqliteTable(
  "activity_logs",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id").references(() => users.id, {
      onDelete: "cascade",
    }),
    projectId: text("project_id").references(() => projects.id, {
      onDelete: "cascade",
    }),
    organizationId: text("organization_id").references(
      () => organizations.id,
      { onDelete: "cascade" }
    ),
    eventType: text("event_type").notNull(),
    eventData: text("event_data"),
    createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(
      () => new Date()
    ),
  },
  (t) => [index("activity_user_idx").on(t.userId)]
);

// ============================================================
// TYPE EXPORTS
// ============================================================
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type ProjectClassification =
  typeof projectClassifications.$inferSelect;
export type NewProjectClassification =
  typeof projectClassifications.$inferInsert;
export type GeneratedSpecification =
  typeof generatedSpecifications.$inferSelect;
export type SpecificationVersion = typeof specificationVersions.$inferSelect;
export type NewSpecificationVersion =
  typeof specificationVersions.$inferInsert;
export type GenerationLog = typeof generationLogs.$inferSelect;
export type CapTable = typeof capTables.$inferSelect;
export type NewCapTable = typeof capTables.$inferInsert;
