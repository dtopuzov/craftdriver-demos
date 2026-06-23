CREATE EXTENSION IF NOT EXISTS "pgcrypto";
--> statement-breakpoint
CREATE TYPE "user_role" AS ENUM ('student', 'teacher', 'admin');
--> statement-breakpoint
CREATE TYPE "exam_status" AS ENUM ('draft', 'published', 'unpublished');
--> statement-breakpoint
CREATE TYPE "feedback_policy" AS ENUM ('none', 'score_only', 'answers_and_explanations');
--> statement-breakpoint
CREATE TYPE "question_kind" AS ENUM ('single_choice', 'multiple_choice', 'numeric');
--> statement-breakpoint
CREATE TYPE "attempt_status" AS ENUM ('in_progress', 'submitted', 'expired');
--> statement-breakpoint

CREATE TABLE "users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "email" text NOT NULL,
  "password_hash" text NOT NULL,
  "display_name" text NOT NULL,
  "role" "user_role" NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "users_email_normalized" CHECK ("email" = lower("email"))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "users" USING btree ("email");
--> statement-breakpoint

CREATE TABLE "sessions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "token_hash" text NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "revoked_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_token_hash_unique" ON "sessions" USING btree ("token_hash");
--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "sessions" USING btree ("user_id");
--> statement-breakpoint

CREATE TABLE "exams" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "owner_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE restrict,
  "title" text NOT NULL,
  "instructions" text DEFAULT '' NOT NULL,
  "status" "exam_status" DEFAULT 'draft' NOT NULL,
  "duration_minutes" integer,
  "available_from" timestamp with time zone,
  "available_until" timestamp with time zone,
  "feedback_policy" "feedback_policy" DEFAULT 'score_only' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "exams_duration_non_negative" CHECK ("duration_minutes" IS NULL OR "duration_minutes" > 0),
  CONSTRAINT "exams_availability_order" CHECK ("available_until" IS NULL OR "available_from" IS NULL OR "available_from" < "available_until")
);
--> statement-breakpoint
CREATE INDEX "exams_owner_id_idx" ON "exams" USING btree ("owner_id");
--> statement-breakpoint
CREATE INDEX "exams_published_availability_idx" ON "exams" USING btree ("status", "available_from", "available_until");
--> statement-breakpoint

CREATE TABLE "exam_revisions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "exam_id" uuid NOT NULL REFERENCES "exams"("id") ON DELETE cascade,
  "revision_number" integer NOT NULL,
  "snapshot_json" jsonb NOT NULL,
  "published_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "exam_revisions_revision_positive" CHECK ("revision_number" > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "exam_revisions_exam_revision_unique" ON "exam_revisions" USING btree ("exam_id", "revision_number");
--> statement-breakpoint
CREATE INDEX "exam_revisions_exam_id_idx" ON "exam_revisions" USING btree ("exam_id");
--> statement-breakpoint

CREATE TABLE "questions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "exam_id" uuid NOT NULL REFERENCES "exams"("id") ON DELETE cascade,
  "position" integer NOT NULL,
  "kind" "question_kind" NOT NULL,
  "prompt" text NOT NULL,
  "points" integer NOT NULL,
  "config_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "questions_position_positive" CHECK ("position" > 0),
  CONSTRAINT "questions_points_non_negative" CHECK ("points" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "questions_exam_position_unique" ON "questions" USING btree ("exam_id", "position");
--> statement-breakpoint

CREATE TABLE "question_answers" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "question_id" uuid NOT NULL REFERENCES "questions"("id") ON DELETE cascade,
  "answer_json" jsonb NOT NULL,
  "explanation" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "question_answers_question_id_unique" ON "question_answers" USING btree ("question_id");
--> statement-breakpoint

CREATE TABLE "attempts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "student_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE restrict,
  "exam_revision_id" uuid NOT NULL REFERENCES "exam_revisions"("id") ON DELETE restrict,
  "status" "attempt_status" DEFAULT 'in_progress' NOT NULL,
  "started_at" timestamp with time zone DEFAULT now() NOT NULL,
  "submitted_at" timestamp with time zone,
  "score" integer,
  "max_score" integer NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "attempts_scores_non_negative" CHECK (("score" IS NULL OR "score" >= 0) AND "max_score" >= 0)
);
--> statement-breakpoint
CREATE INDEX "attempts_student_id_idx" ON "attempts" USING btree ("student_id");
--> statement-breakpoint
CREATE INDEX "attempts_revision_id_idx" ON "attempts" USING btree ("exam_revision_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "attempts_one_active_per_student_revision" ON "attempts" USING btree ("student_id", "exam_revision_id") WHERE "status" = 'in_progress';
--> statement-breakpoint

CREATE TABLE "attempt_answers" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "attempt_id" uuid NOT NULL REFERENCES "attempts"("id") ON DELETE cascade,
  "question_key" text NOT NULL,
  "answer_json" jsonb NOT NULL,
  "is_correct" boolean,
  "awarded_points" integer,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "attempt_answers_points_non_negative" CHECK ("awarded_points" IS NULL OR "awarded_points" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "attempt_answers_attempt_question_unique" ON "attempt_answers" USING btree ("attempt_id", "question_key");
--> statement-breakpoint

CREATE TABLE "audit_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "actor_id" uuid REFERENCES "users"("id") ON DELETE set null,
  "event_type" text NOT NULL,
  "entity_type" text NOT NULL,
  "entity_id" uuid NOT NULL,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "audit_events_entity_idx" ON "audit_events" USING btree ("entity_type", "entity_id");
--> statement-breakpoint
CREATE INDEX "audit_events_actor_idx" ON "audit_events" USING btree ("actor_id");
--> statement-breakpoint

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER users_set_updated_at BEFORE UPDATE ON "users" FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
CREATE TRIGGER sessions_set_updated_at BEFORE UPDATE ON "sessions" FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
CREATE TRIGGER exams_set_updated_at BEFORE UPDATE ON "exams" FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
CREATE TRIGGER exam_revisions_set_updated_at BEFORE UPDATE ON "exam_revisions" FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
CREATE TRIGGER questions_set_updated_at BEFORE UPDATE ON "questions" FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
CREATE TRIGGER question_answers_set_updated_at BEFORE UPDATE ON "question_answers" FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
CREATE TRIGGER attempts_set_updated_at BEFORE UPDATE ON "attempts" FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
CREATE TRIGGER attempt_answers_set_updated_at BEFORE UPDATE ON "attempt_answers" FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
CREATE TRIGGER audit_events_set_updated_at BEFORE UPDATE ON "audit_events" FOR EACH ROW EXECUTE FUNCTION set_updated_at();
