CREATE TABLE `activity_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`project_id` text,
	`organization_id` text,
	`event_type` text NOT NULL,
	`event_data` text,
	`created_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `activity_user_idx` ON `activity_logs` (`user_id`);--> statement-breakpoint
CREATE TABLE `architecture_recommendations` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`recommended_stack` text,
	`auth_strategy` text,
	`database_design` text,
	`infrastructure` text,
	`recommended_apis` text,
	`recommended_integrations` text,
	`scaling_considerations` text,
	`complexity_score` integer,
	`complexity_rationale` text,
	`estimated_build_weeks` integer,
	`key_risks` text,
	`ai_provider` text,
	`ai_model` text,
	`prompt_version` text,
	`created_at` integer,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `cap_table_snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text,
	`label` text NOT NULL,
	`snapshot_data` text NOT NULL,
	`total_shares` numeric,
	`valuation` numeric,
	`created_at` integer,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `cap_tables` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text,
	`project_id` text,
	`shareholder_name` text NOT NULL,
	`role` text NOT NULL,
	`equity_percentage` numeric NOT NULL,
	`vesting_start_date` text,
	`vesting_cliff_months` integer,
	`vesting_duration_months` integer,
	`shares_issued` numeric,
	`dilution_group` text,
	`notes` text,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `cap_tables_org_idx` ON `cap_tables` (`organization_id`);--> statement-breakpoint
CREATE INDEX `cap_tables_project_idx` ON `cap_tables` (`project_id`);--> statement-breakpoint
CREATE TABLE `discovery_responses` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`project_id` text NOT NULL,
	`question_key` text NOT NULL,
	`question_text` text NOT NULL,
	`response_text` text,
	`response_metadata` text,
	`step_number` integer,
	`created_at` integer,
	FOREIGN KEY (`session_id`) REFERENCES `discovery_sessions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `discovery_session_idx` ON `discovery_responses` (`session_id`);--> statement-breakpoint
CREATE TABLE `discovery_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`user_id` text NOT NULL,
	`status` text DEFAULT 'in_progress',
	`current_step` integer DEFAULT 0,
	`total_steps` integer,
	`started_at` integer,
	`completed_at` integer,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `generated_specifications` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`user_id` text NOT NULL,
	`current_version_id` text,
	`status` text DEFAULT 'queued',
	`target_ai_provider` text DEFAULT 'claude',
	`error_message` text,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `specs_project_idx` ON `generated_specifications` (`project_id`);--> statement-breakpoint
CREATE TABLE `generation_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`specification_id` text NOT NULL,
	`stage` text NOT NULL,
	`status` text NOT NULL,
	`message` text,
	`metadata` text,
	`created_at` integer,
	FOREIGN KEY (`specification_id`) REFERENCES `generated_specifications`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `gen_logs_spec_idx` ON `generation_logs` (`specification_id`);--> statement-breakpoint
CREATE TABLE `organization_members` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text DEFAULT 'member',
	`joined_at` integer,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `org_user_unique` ON `organization_members` (`organization_id`,`user_id`);--> statement-breakpoint
CREATE TABLE `organizations` (
	`id` text PRIMARY KEY NOT NULL,
	`clerk_org_id` text,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`owner_id` text NOT NULL,
	`stripe_customer_id` text,
	`subscription_status` text DEFAULT 'free',
	`subscription_tier` text DEFAULT 'free',
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `organizations_clerk_org_id_unique` ON `organizations` (`clerk_org_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `organizations_slug_unique` ON `organizations` (`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `organizations_stripe_customer_id_unique` ON `organizations` (`stripe_customer_id`);--> statement-breakpoint
CREATE TABLE `project_assets` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`asset_type` text NOT NULL,
	`file_name` text NOT NULL,
	`r2_key` text NOT NULL,
	`file_size_bytes` integer,
	`created_at` integer,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `project_classifications` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`product_type` text NOT NULL,
	`complexity_level` integer NOT NULL,
	`complexity_label` text NOT NULL,
	`functional_domain` text NOT NULL,
	`execution_style` text NOT NULL,
	`target_users` text,
	`core_system_summary` text,
	`phase_template` text,
	`classification_rationale` text,
	`confidence_score` integer,
	`requires_ai_layer` integer DEFAULT false,
	`requires_multi_tenancy` integer DEFAULT false,
	`requires_marketplace` integer DEFAULT false,
	`ai_provider` text,
	`prompt_version` text,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `classifications_project_idx` ON `project_classifications` (`project_id`);--> statement-breakpoint
CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`organization_id` text,
	`name` text NOT NULL,
	`description` text,
	`industry` text,
	`business_model` text,
	`status` text DEFAULT 'draft',
	`technical_complexity` text,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `projects_owner_idx` ON `projects` (`owner_id`);--> statement-breakpoint
CREATE TABLE `prompt_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`prompt_type` text NOT NULL,
	`content` text NOT NULL,
	`is_active` integer DEFAULT false,
	`created_at` integer
);
--> statement-breakpoint
CREATE TABLE `specification_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`specification_id` text NOT NULL,
	`project_id` text NOT NULL,
	`version_number` text NOT NULL,
	`parent_version_id` text,
	`changelog` text,
	`executive_summary` text,
	`product_vision` text,
	`technical_architecture` text,
	`recommended_stack` text,
	`database_schema` text,
	`api_structure` text,
	`frontend_architecture` text,
	`backend_architecture` text,
	`security_requirements` text,
	`deployment_strategy` text,
	`scaling_considerations` text,
	`ai_coding_instructions` text,
	`file_tree` text,
	`cli_commands` text,
	`sprint_plans` text,
	`future_scalability` text,
	`full_spec_markdown` text,
	`full_spec_json` text,
	`structural_diff` text,
	`token_count` integer,
	`generation_time_ms` integer,
	`ai_provider` text,
	`ai_model` text,
	`prompt_version` text,
	`generation_metadata` text,
	`created_at` integer,
	FOREIGN KEY (`specification_id`) REFERENCES `generated_specifications`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `spec_versions_spec_idx` ON `specification_versions` (`specification_id`);--> statement-breakpoint
CREATE INDEX `spec_versions_project_idx` ON `specification_versions` (`project_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`clerk_user_id` text NOT NULL,
	`email` text NOT NULL,
	`full_name` text,
	`avatar_url` text,
	`onboarding_completed` integer DEFAULT false,
	`technical_level` text DEFAULT 'non_technical',
	`stripe_customer_id` text,
	`subscription_status` text DEFAULT 'free',
	`subscription_tier` text DEFAULT 'free',
	`generations_used` integer DEFAULT 0,
	`generations_limit` integer DEFAULT 1,
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_clerk_user_id_unique` ON `users` (`clerk_user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_stripe_customer_id_unique` ON `users` (`stripe_customer_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_clerk_idx` ON `users` (`clerk_user_id`);--> statement-breakpoint
CREATE INDEX `users_email_idx` ON `users` (`email`);