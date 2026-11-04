import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_users_role" AS ENUM('admin', 'editor');
  CREATE TYPE "public"."enum_entries_visibility" AS ENUM('public', 'private');
  CREATE TYPE "public"."enum_entries_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__entries_v_version_visibility" AS ENUM('public', 'private');
  CREATE TYPE "public"."enum__entries_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_content_lists_blocks_video_source_type" AS ENUM('upload', 'external');
  CREATE TYPE "public"."enum_content_lists_items_layout" AS ENUM('stacked', 'comparison');
  CREATE TYPE "public"."enum_content_lists_presentation" AS ENUM('flow', 'carousel', 'list', 'grid');
  CREATE TYPE "public"."enum_media_visibility" AS ENUM('private', 'public');
  CREATE TYPE "public"."enum_sources_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__sources_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_snippets_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__snippets_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_payload_jobs_log_task_slug" AS ENUM('inline', 'schedulePublish');
  CREATE TYPE "public"."enum_payload_jobs_log_state" AS ENUM('failed', 'succeeded');
  CREATE TYPE "public"."enum_payload_jobs_task_slug" AS ENUM('inline', 'schedulePublish');
  CREATE TYPE "public"."enum_payload_folders_folder_type" AS ENUM('media');
  CREATE TABLE "users_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "users" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"role" "enum_users_role" DEFAULT 'editor' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"reset_password_requested_at" timestamp(3) with time zone,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "entries" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"slug" varchar,
  	"summary" varchar,
  	"visibility" "enum_entries_visibility" DEFAULT 'public',
  	"kind" varchar DEFAULT 'article',
  	"author_id" integer,
  	"byline" varchar,
  	"published_at" timestamp(3) with time zone,
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_entries_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "entries_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"content_lists_id" integer,
  	"topics_id" integer,
  	"sources_id" integer
  );
  
  CREATE TABLE "_entries_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar,
  	"version_slug" varchar,
  	"version_summary" varchar,
  	"version_visibility" "enum__entries_v_version_visibility" DEFAULT 'public',
  	"version_kind" varchar DEFAULT 'article',
  	"version_author_id" integer,
  	"version_byline" varchar,
  	"version_published_at" timestamp(3) with time zone,
  	"version_seo_title" varchar,
  	"version_seo_description" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__entries_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean,
  	"autosave" boolean
  );
  
  CREATE TABLE "_entries_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"content_lists_id" integer,
  	"topics_id" integer,
  	"sources_id" integer
  );
  
  CREATE TABLE "content_lists_blocks_rich_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"body" jsonb NOT NULL,
  	"block_name" varchar
  );
  
  CREATE TABLE "content_lists_blocks_image" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"media_id" integer NOT NULL,
  	"alt" varchar,
  	"caption" varchar,
  	"source_id" integer,
  	"block_name" varchar
  );
  
  CREATE TABLE "content_lists_blocks_video" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"source_type" "enum_content_lists_blocks_video_source_type" DEFAULT 'upload' NOT NULL,
  	"media_id" integer,
  	"url" varchar,
  	"poster_id" integer,
  	"transcript" varchar,
  	"caption" varchar,
  	"source_id" integer,
  	"block_name" varchar
  );
  
  CREATE TABLE "content_lists_blocks_audio" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"media_id" integer NOT NULL,
  	"transcript" varchar,
  	"caption" varchar,
  	"source_id" integer,
  	"block_name" varchar
  );
  
  CREATE TABLE "content_lists_blocks_link" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"url" varchar NOT NULL,
  	"label" varchar NOT NULL,
  	"description" varchar,
  	"source_id" integer,
  	"block_name" varchar
  );
  
  CREATE TABLE "content_lists_blocks_download" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"media_id" integer NOT NULL,
  	"label" varchar NOT NULL,
  	"description" varchar,
  	"source_id" integer,
  	"block_name" varchar
  );
  
  CREATE TABLE "content_lists_blocks_embed" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"snippet_id" integer NOT NULL,
  	"title" varchar NOT NULL,
  	"height" numeric DEFAULT 420 NOT NULL,
  	"caption" varchar,
  	"source_id" integer,
  	"block_name" varchar
  );
  
  CREATE TABLE "content_lists_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"title" varchar,
  	"layout" "enum_content_lists_items_layout" DEFAULT 'stacked' NOT NULL
  );
  
  CREATE TABLE "content_lists" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar DEFAULT 'Content',
  	"key" varchar NOT NULL,
  	"presentation" "enum_content_lists_presentation" DEFAULT 'flow' NOT NULL,
  	"sealed" boolean DEFAULT false,
  	"public" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "media" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"alt" varchar,
  	"visibility" "enum_media_visibility" DEFAULT 'private' NOT NULL,
  	"credit" varchar,
  	"source_id" integer,
  	"credit_u_r_l" varchar,
  	"license" varchar,
  	"prefix" varchar DEFAULT 'media',
  	"_objectkey" varchar,
  	"folder_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric,
  	"sizes_card_url" varchar,
  	"sizes_card_width" numeric,
  	"sizes_card_height" numeric,
  	"sizes_card_mime_type" varchar,
  	"sizes_card_filesize" numeric,
  	"sizes_card_filename" varchar
  );
  
  CREATE TABLE "sources" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"url" varchar,
  	"publisher" varchar,
  	"author" varchar,
  	"published_at" timestamp(3) with time zone,
  	"accessed_at" timestamp(3) with time zone,
  	"archive_u_r_l" varchar,
  	"notes" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_sources_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "sources_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"media_id" integer
  );
  
  CREATE TABLE "_sources_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar,
  	"version_url" varchar,
  	"version_publisher" varchar,
  	"version_author" varchar,
  	"version_published_at" timestamp(3) with time zone,
  	"version_accessed_at" timestamp(3) with time zone,
  	"version_archive_u_r_l" varchar,
  	"version_notes" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__sources_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "_sources_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"media_id" integer
  );
  
  CREATE TABLE "topics" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"description" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "snippets" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"description" varchar,
  	"storage_prefix" varchar,
  	"bundle_version" varchar,
  	"entry_file" varchar,
  	"manifest" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_snippets_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "_snippets_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar,
  	"version_description" varchar,
  	"version_storage_prefix" varchar,
  	"version_bundle_version" varchar,
  	"version_entry_file" varchar,
  	"version_manifest" jsonb,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__snippets_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "payload_kv" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  
  CREATE TABLE "payload_jobs_log" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"executed_at" timestamp(3) with time zone NOT NULL,
  	"completed_at" timestamp(3) with time zone NOT NULL,
  	"task_slug" "enum_payload_jobs_log_task_slug" NOT NULL,
  	"task_i_d" varchar NOT NULL,
  	"input" jsonb,
  	"output" jsonb,
  	"state" "enum_payload_jobs_log_state" NOT NULL,
  	"error" jsonb
  );
  
  CREATE TABLE "payload_jobs" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"input" jsonb,
  	"completed_at" timestamp(3) with time zone,
  	"total_tried" numeric DEFAULT 0,
  	"has_error" boolean DEFAULT false,
  	"error" jsonb,
  	"task_slug" "enum_payload_jobs_task_slug",
  	"queue" varchar DEFAULT 'default',
  	"wait_until" timestamp(3) with time zone,
  	"processing" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_folders_folder_type" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_payload_folders_folder_type",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "payload_folders" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"folder_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer,
  	"entries_id" integer,
  	"content_lists_id" integer,
  	"media_id" integer,
  	"sources_id" integer,
  	"topics_id" integer,
  	"snippets_id" integer,
  	"payload_folders_id" integer
  );
  
  CREATE TABLE "payload_preferences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer
  );
  
  CREATE TABLE "payload_migrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "site_settings_navigation" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"href" varchar NOT NULL
  );
  
  CREATE TABLE "site_settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar DEFAULT 'Human / Computer' NOT NULL,
  	"description" varchar DEFAULT 'A multimedia publishing site.',
  	"logo_id" integer,
  	"time_zone" varchar DEFAULT 'America/Chicago' NOT NULL,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "users_sessions" ADD CONSTRAINT "users_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "entries" ADD CONSTRAINT "entries_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "entries_rels" ADD CONSTRAINT "entries_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."entries"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "entries_rels" ADD CONSTRAINT "entries_rels_content_lists_fk" FOREIGN KEY ("content_lists_id") REFERENCES "public"."content_lists"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "entries_rels" ADD CONSTRAINT "entries_rels_topics_fk" FOREIGN KEY ("topics_id") REFERENCES "public"."topics"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "entries_rels" ADD CONSTRAINT "entries_rels_sources_fk" FOREIGN KEY ("sources_id") REFERENCES "public"."sources"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_entries_v" ADD CONSTRAINT "_entries_v_parent_id_entries_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."entries"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_entries_v" ADD CONSTRAINT "_entries_v_version_author_id_users_id_fk" FOREIGN KEY ("version_author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_entries_v_rels" ADD CONSTRAINT "_entries_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_entries_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_entries_v_rels" ADD CONSTRAINT "_entries_v_rels_content_lists_fk" FOREIGN KEY ("content_lists_id") REFERENCES "public"."content_lists"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_entries_v_rels" ADD CONSTRAINT "_entries_v_rels_topics_fk" FOREIGN KEY ("topics_id") REFERENCES "public"."topics"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_entries_v_rels" ADD CONSTRAINT "_entries_v_rels_sources_fk" FOREIGN KEY ("sources_id") REFERENCES "public"."sources"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "content_lists_blocks_rich_text" ADD CONSTRAINT "content_lists_blocks_rich_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."content_lists"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "content_lists_blocks_image" ADD CONSTRAINT "content_lists_blocks_image_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "content_lists_blocks_image" ADD CONSTRAINT "content_lists_blocks_image_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "content_lists_blocks_image" ADD CONSTRAINT "content_lists_blocks_image_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."content_lists"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "content_lists_blocks_video" ADD CONSTRAINT "content_lists_blocks_video_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "content_lists_blocks_video" ADD CONSTRAINT "content_lists_blocks_video_poster_id_media_id_fk" FOREIGN KEY ("poster_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "content_lists_blocks_video" ADD CONSTRAINT "content_lists_blocks_video_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "content_lists_blocks_video" ADD CONSTRAINT "content_lists_blocks_video_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."content_lists"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "content_lists_blocks_audio" ADD CONSTRAINT "content_lists_blocks_audio_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "content_lists_blocks_audio" ADD CONSTRAINT "content_lists_blocks_audio_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "content_lists_blocks_audio" ADD CONSTRAINT "content_lists_blocks_audio_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."content_lists"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "content_lists_blocks_link" ADD CONSTRAINT "content_lists_blocks_link_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "content_lists_blocks_link" ADD CONSTRAINT "content_lists_blocks_link_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."content_lists"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "content_lists_blocks_download" ADD CONSTRAINT "content_lists_blocks_download_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "content_lists_blocks_download" ADD CONSTRAINT "content_lists_blocks_download_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "content_lists_blocks_download" ADD CONSTRAINT "content_lists_blocks_download_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."content_lists"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "content_lists_blocks_embed" ADD CONSTRAINT "content_lists_blocks_embed_snippet_id_snippets_id_fk" FOREIGN KEY ("snippet_id") REFERENCES "public"."snippets"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "content_lists_blocks_embed" ADD CONSTRAINT "content_lists_blocks_embed_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "content_lists_blocks_embed" ADD CONSTRAINT "content_lists_blocks_embed_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."content_lists"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "content_lists_items" ADD CONSTRAINT "content_lists_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."content_lists"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "media" ADD CONSTRAINT "media_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "media" ADD CONSTRAINT "media_folder_id_payload_folders_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."payload_folders"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "sources_rels" ADD CONSTRAINT "sources_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."sources"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "sources_rels" ADD CONSTRAINT "sources_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_sources_v" ADD CONSTRAINT "_sources_v_parent_id_sources_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."sources"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_sources_v_rels" ADD CONSTRAINT "_sources_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_sources_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_sources_v_rels" ADD CONSTRAINT "_sources_v_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_snippets_v" ADD CONSTRAINT "_snippets_v_parent_id_snippets_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."snippets"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_jobs_log" ADD CONSTRAINT "payload_jobs_log_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."payload_jobs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_folders_folder_type" ADD CONSTRAINT "payload_folders_folder_type_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_folders"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_folders" ADD CONSTRAINT "payload_folders_folder_id_payload_folders_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."payload_folders"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_entries_fk" FOREIGN KEY ("entries_id") REFERENCES "public"."entries"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_content_lists_fk" FOREIGN KEY ("content_lists_id") REFERENCES "public"."content_lists"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_sources_fk" FOREIGN KEY ("sources_id") REFERENCES "public"."sources"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_topics_fk" FOREIGN KEY ("topics_id") REFERENCES "public"."topics"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_snippets_fk" FOREIGN KEY ("snippets_id") REFERENCES "public"."snippets"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_payload_folders_fk" FOREIGN KEY ("payload_folders_id") REFERENCES "public"."payload_folders"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings_navigation" ADD CONSTRAINT "site_settings_navigation_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "users_sessions_order_idx" ON "users_sessions" USING btree ("_order");
  CREATE INDEX "users_sessions_parent_id_idx" ON "users_sessions" USING btree ("_parent_id");
  CREATE INDEX "users_updated_at_idx" ON "users" USING btree ("updated_at");
  CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");
  CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");
  CREATE UNIQUE INDEX "entries_slug_idx" ON "entries" USING btree ("slug");
  CREATE INDEX "entries_kind_idx" ON "entries" USING btree ("kind");
  CREATE INDEX "entries_author_idx" ON "entries" USING btree ("author_id");
  CREATE INDEX "entries_published_at_idx" ON "entries" USING btree ("published_at");
  CREATE INDEX "entries_updated_at_idx" ON "entries" USING btree ("updated_at");
  CREATE INDEX "entries_created_at_idx" ON "entries" USING btree ("created_at");
  CREATE INDEX "entries__status_idx" ON "entries" USING btree ("_status");
  CREATE INDEX "entries_rels_order_idx" ON "entries_rels" USING btree ("order");
  CREATE INDEX "entries_rels_parent_idx" ON "entries_rels" USING btree ("parent_id");
  CREATE INDEX "entries_rels_path_idx" ON "entries_rels" USING btree ("path");
  CREATE INDEX "entries_rels_content_lists_id_idx" ON "entries_rels" USING btree ("content_lists_id");
  CREATE INDEX "entries_rels_topics_id_idx" ON "entries_rels" USING btree ("topics_id");
  CREATE INDEX "entries_rels_sources_id_idx" ON "entries_rels" USING btree ("sources_id");
  CREATE INDEX "_entries_v_parent_idx" ON "_entries_v" USING btree ("parent_id");
  CREATE INDEX "_entries_v_version_version_slug_idx" ON "_entries_v" USING btree ("version_slug");
  CREATE INDEX "_entries_v_version_version_kind_idx" ON "_entries_v" USING btree ("version_kind");
  CREATE INDEX "_entries_v_version_version_author_idx" ON "_entries_v" USING btree ("version_author_id");
  CREATE INDEX "_entries_v_version_version_published_at_idx" ON "_entries_v" USING btree ("version_published_at");
  CREATE INDEX "_entries_v_version_version_updated_at_idx" ON "_entries_v" USING btree ("version_updated_at");
  CREATE INDEX "_entries_v_version_version_created_at_idx" ON "_entries_v" USING btree ("version_created_at");
  CREATE INDEX "_entries_v_version_version__status_idx" ON "_entries_v" USING btree ("version__status");
  CREATE INDEX "_entries_v_created_at_idx" ON "_entries_v" USING btree ("created_at");
  CREATE INDEX "_entries_v_updated_at_idx" ON "_entries_v" USING btree ("updated_at");
  CREATE INDEX "_entries_v_latest_idx" ON "_entries_v" USING btree ("latest");
  CREATE INDEX "_entries_v_autosave_idx" ON "_entries_v" USING btree ("autosave");
  CREATE INDEX "_entries_v_rels_order_idx" ON "_entries_v_rels" USING btree ("order");
  CREATE INDEX "_entries_v_rels_parent_idx" ON "_entries_v_rels" USING btree ("parent_id");
  CREATE INDEX "_entries_v_rels_path_idx" ON "_entries_v_rels" USING btree ("path");
  CREATE INDEX "_entries_v_rels_content_lists_id_idx" ON "_entries_v_rels" USING btree ("content_lists_id");
  CREATE INDEX "_entries_v_rels_topics_id_idx" ON "_entries_v_rels" USING btree ("topics_id");
  CREATE INDEX "_entries_v_rels_sources_id_idx" ON "_entries_v_rels" USING btree ("sources_id");
  CREATE INDEX "content_lists_blocks_rich_text_order_idx" ON "content_lists_blocks_rich_text" USING btree ("_order");
  CREATE INDEX "content_lists_blocks_rich_text_parent_id_idx" ON "content_lists_blocks_rich_text" USING btree ("_parent_id");
  CREATE INDEX "content_lists_blocks_rich_text_path_idx" ON "content_lists_blocks_rich_text" USING btree ("_path");
  CREATE INDEX "content_lists_blocks_image_order_idx" ON "content_lists_blocks_image" USING btree ("_order");
  CREATE INDEX "content_lists_blocks_image_parent_id_idx" ON "content_lists_blocks_image" USING btree ("_parent_id");
  CREATE INDEX "content_lists_blocks_image_path_idx" ON "content_lists_blocks_image" USING btree ("_path");
  CREATE INDEX "content_lists_blocks_image_media_idx" ON "content_lists_blocks_image" USING btree ("media_id");
  CREATE INDEX "content_lists_blocks_image_source_idx" ON "content_lists_blocks_image" USING btree ("source_id");
  CREATE INDEX "content_lists_blocks_video_order_idx" ON "content_lists_blocks_video" USING btree ("_order");
  CREATE INDEX "content_lists_blocks_video_parent_id_idx" ON "content_lists_blocks_video" USING btree ("_parent_id");
  CREATE INDEX "content_lists_blocks_video_path_idx" ON "content_lists_blocks_video" USING btree ("_path");
  CREATE INDEX "content_lists_blocks_video_media_idx" ON "content_lists_blocks_video" USING btree ("media_id");
  CREATE INDEX "content_lists_blocks_video_poster_idx" ON "content_lists_blocks_video" USING btree ("poster_id");
  CREATE INDEX "content_lists_blocks_video_source_idx" ON "content_lists_blocks_video" USING btree ("source_id");
  CREATE INDEX "content_lists_blocks_audio_order_idx" ON "content_lists_blocks_audio" USING btree ("_order");
  CREATE INDEX "content_lists_blocks_audio_parent_id_idx" ON "content_lists_blocks_audio" USING btree ("_parent_id");
  CREATE INDEX "content_lists_blocks_audio_path_idx" ON "content_lists_blocks_audio" USING btree ("_path");
  CREATE INDEX "content_lists_blocks_audio_media_idx" ON "content_lists_blocks_audio" USING btree ("media_id");
  CREATE INDEX "content_lists_blocks_audio_source_idx" ON "content_lists_blocks_audio" USING btree ("source_id");
  CREATE INDEX "content_lists_blocks_link_order_idx" ON "content_lists_blocks_link" USING btree ("_order");
  CREATE INDEX "content_lists_blocks_link_parent_id_idx" ON "content_lists_blocks_link" USING btree ("_parent_id");
  CREATE INDEX "content_lists_blocks_link_path_idx" ON "content_lists_blocks_link" USING btree ("_path");
  CREATE INDEX "content_lists_blocks_link_source_idx" ON "content_lists_blocks_link" USING btree ("source_id");
  CREATE INDEX "content_lists_blocks_download_order_idx" ON "content_lists_blocks_download" USING btree ("_order");
  CREATE INDEX "content_lists_blocks_download_parent_id_idx" ON "content_lists_blocks_download" USING btree ("_parent_id");
  CREATE INDEX "content_lists_blocks_download_path_idx" ON "content_lists_blocks_download" USING btree ("_path");
  CREATE INDEX "content_lists_blocks_download_media_idx" ON "content_lists_blocks_download" USING btree ("media_id");
  CREATE INDEX "content_lists_blocks_download_source_idx" ON "content_lists_blocks_download" USING btree ("source_id");
  CREATE INDEX "content_lists_blocks_embed_order_idx" ON "content_lists_blocks_embed" USING btree ("_order");
  CREATE INDEX "content_lists_blocks_embed_parent_id_idx" ON "content_lists_blocks_embed" USING btree ("_parent_id");
  CREATE INDEX "content_lists_blocks_embed_path_idx" ON "content_lists_blocks_embed" USING btree ("_path");
  CREATE INDEX "content_lists_blocks_embed_snippet_idx" ON "content_lists_blocks_embed" USING btree ("snippet_id");
  CREATE INDEX "content_lists_blocks_embed_source_idx" ON "content_lists_blocks_embed" USING btree ("source_id");
  CREATE INDEX "content_lists_items_order_idx" ON "content_lists_items" USING btree ("_order");
  CREATE INDEX "content_lists_items_parent_id_idx" ON "content_lists_items" USING btree ("_parent_id");
  CREATE INDEX "content_lists_public_idx" ON "content_lists" USING btree ("public");
  CREATE INDEX "content_lists_updated_at_idx" ON "content_lists" USING btree ("updated_at");
  CREATE INDEX "content_lists_created_at_idx" ON "content_lists" USING btree ("created_at");
  CREATE INDEX "media_source_idx" ON "media" USING btree ("source_id");
  CREATE INDEX "media_folder_idx" ON "media" USING btree ("folder_id");
  CREATE INDEX "media_updated_at_idx" ON "media" USING btree ("updated_at");
  CREATE INDEX "media_created_at_idx" ON "media" USING btree ("created_at");
  CREATE UNIQUE INDEX "media_filename_idx" ON "media" USING btree ("filename");
  CREATE INDEX "media_sizes_card_sizes_card_filename_idx" ON "media" USING btree ("sizes_card_filename");
  CREATE INDEX "sources_updated_at_idx" ON "sources" USING btree ("updated_at");
  CREATE INDEX "sources_created_at_idx" ON "sources" USING btree ("created_at");
  CREATE INDEX "sources__status_idx" ON "sources" USING btree ("_status");
  CREATE INDEX "sources_rels_order_idx" ON "sources_rels" USING btree ("order");
  CREATE INDEX "sources_rels_parent_idx" ON "sources_rels" USING btree ("parent_id");
  CREATE INDEX "sources_rels_path_idx" ON "sources_rels" USING btree ("path");
  CREATE INDEX "sources_rels_media_id_idx" ON "sources_rels" USING btree ("media_id");
  CREATE INDEX "_sources_v_parent_idx" ON "_sources_v" USING btree ("parent_id");
  CREATE INDEX "_sources_v_version_version_updated_at_idx" ON "_sources_v" USING btree ("version_updated_at");
  CREATE INDEX "_sources_v_version_version_created_at_idx" ON "_sources_v" USING btree ("version_created_at");
  CREATE INDEX "_sources_v_version_version__status_idx" ON "_sources_v" USING btree ("version__status");
  CREATE INDEX "_sources_v_created_at_idx" ON "_sources_v" USING btree ("created_at");
  CREATE INDEX "_sources_v_updated_at_idx" ON "_sources_v" USING btree ("updated_at");
  CREATE INDEX "_sources_v_latest_idx" ON "_sources_v" USING btree ("latest");
  CREATE INDEX "_sources_v_rels_order_idx" ON "_sources_v_rels" USING btree ("order");
  CREATE INDEX "_sources_v_rels_parent_idx" ON "_sources_v_rels" USING btree ("parent_id");
  CREATE INDEX "_sources_v_rels_path_idx" ON "_sources_v_rels" USING btree ("path");
  CREATE INDEX "_sources_v_rels_media_id_idx" ON "_sources_v_rels" USING btree ("media_id");
  CREATE UNIQUE INDEX "topics_slug_idx" ON "topics" USING btree ("slug");
  CREATE INDEX "topics_updated_at_idx" ON "topics" USING btree ("updated_at");
  CREATE INDEX "topics_created_at_idx" ON "topics" USING btree ("created_at");
  CREATE UNIQUE INDEX "snippets_storage_prefix_idx" ON "snippets" USING btree ("storage_prefix");
  CREATE INDEX "snippets_updated_at_idx" ON "snippets" USING btree ("updated_at");
  CREATE INDEX "snippets_created_at_idx" ON "snippets" USING btree ("created_at");
  CREATE INDEX "snippets__status_idx" ON "snippets" USING btree ("_status");
  CREATE INDEX "_snippets_v_parent_idx" ON "_snippets_v" USING btree ("parent_id");
  CREATE INDEX "_snippets_v_version_version_storage_prefix_idx" ON "_snippets_v" USING btree ("version_storage_prefix");
  CREATE INDEX "_snippets_v_version_version_updated_at_idx" ON "_snippets_v" USING btree ("version_updated_at");
  CREATE INDEX "_snippets_v_version_version_created_at_idx" ON "_snippets_v" USING btree ("version_created_at");
  CREATE INDEX "_snippets_v_version_version__status_idx" ON "_snippets_v" USING btree ("version__status");
  CREATE INDEX "_snippets_v_created_at_idx" ON "_snippets_v" USING btree ("created_at");
  CREATE INDEX "_snippets_v_updated_at_idx" ON "_snippets_v" USING btree ("updated_at");
  CREATE INDEX "_snippets_v_latest_idx" ON "_snippets_v" USING btree ("latest");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload_kv" USING btree ("key");
  CREATE INDEX "payload_jobs_log_order_idx" ON "payload_jobs_log" USING btree ("_order");
  CREATE INDEX "payload_jobs_log_parent_id_idx" ON "payload_jobs_log" USING btree ("_parent_id");
  CREATE INDEX "payload_jobs_completed_at_idx" ON "payload_jobs" USING btree ("completed_at");
  CREATE INDEX "payload_jobs_total_tried_idx" ON "payload_jobs" USING btree ("total_tried");
  CREATE INDEX "payload_jobs_has_error_idx" ON "payload_jobs" USING btree ("has_error");
  CREATE INDEX "payload_jobs_task_slug_idx" ON "payload_jobs" USING btree ("task_slug");
  CREATE INDEX "payload_jobs_queue_idx" ON "payload_jobs" USING btree ("queue");
  CREATE INDEX "payload_jobs_wait_until_idx" ON "payload_jobs" USING btree ("wait_until");
  CREATE INDEX "payload_jobs_processing_idx" ON "payload_jobs" USING btree ("processing");
  CREATE INDEX "payload_jobs_updated_at_idx" ON "payload_jobs" USING btree ("updated_at");
  CREATE INDEX "payload_jobs_created_at_idx" ON "payload_jobs" USING btree ("created_at");
  CREATE INDEX "payload_folders_folder_type_order_idx" ON "payload_folders_folder_type" USING btree ("order");
  CREATE INDEX "payload_folders_folder_type_parent_idx" ON "payload_folders_folder_type" USING btree ("parent_id");
  CREATE INDEX "payload_folders_name_idx" ON "payload_folders" USING btree ("name");
  CREATE INDEX "payload_folders_folder_idx" ON "payload_folders" USING btree ("folder_id");
  CREATE INDEX "payload_folders_updated_at_idx" ON "payload_folders" USING btree ("updated_at");
  CREATE INDEX "payload_folders_created_at_idx" ON "payload_folders" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_users_id_idx" ON "payload_locked_documents_rels" USING btree ("users_id");
  CREATE INDEX "payload_locked_documents_rels_entries_id_idx" ON "payload_locked_documents_rels" USING btree ("entries_id");
  CREATE INDEX "payload_locked_documents_rels_content_lists_id_idx" ON "payload_locked_documents_rels" USING btree ("content_lists_id");
  CREATE INDEX "payload_locked_documents_rels_media_id_idx" ON "payload_locked_documents_rels" USING btree ("media_id");
  CREATE INDEX "payload_locked_documents_rels_sources_id_idx" ON "payload_locked_documents_rels" USING btree ("sources_id");
  CREATE INDEX "payload_locked_documents_rels_topics_id_idx" ON "payload_locked_documents_rels" USING btree ("topics_id");
  CREATE INDEX "payload_locked_documents_rels_snippets_id_idx" ON "payload_locked_documents_rels" USING btree ("snippets_id");
  CREATE INDEX "payload_locked_documents_rels_payload_folders_id_idx" ON "payload_locked_documents_rels" USING btree ("payload_folders_id");
  CREATE INDEX "payload_preferences_key_idx" ON "payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_users_id_idx" ON "payload_preferences_rels" USING btree ("users_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "payload_migrations" USING btree ("created_at");
  CREATE INDEX "site_settings_navigation_order_idx" ON "site_settings_navigation" USING btree ("_order");
  CREATE INDEX "site_settings_navigation_parent_id_idx" ON "site_settings_navigation" USING btree ("_parent_id");
  CREATE INDEX "site_settings_logo_idx" ON "site_settings" USING btree ("logo_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "users_sessions" CASCADE;
  DROP TABLE "users" CASCADE;
  DROP TABLE "entries" CASCADE;
  DROP TABLE "entries_rels" CASCADE;
  DROP TABLE "_entries_v" CASCADE;
  DROP TABLE "_entries_v_rels" CASCADE;
  DROP TABLE "content_lists_blocks_rich_text" CASCADE;
  DROP TABLE "content_lists_blocks_image" CASCADE;
  DROP TABLE "content_lists_blocks_video" CASCADE;
  DROP TABLE "content_lists_blocks_audio" CASCADE;
  DROP TABLE "content_lists_blocks_link" CASCADE;
  DROP TABLE "content_lists_blocks_download" CASCADE;
  DROP TABLE "content_lists_blocks_embed" CASCADE;
  DROP TABLE "content_lists_items" CASCADE;
  DROP TABLE "content_lists" CASCADE;
  DROP TABLE "media" CASCADE;
  DROP TABLE "sources" CASCADE;
  DROP TABLE "sources_rels" CASCADE;
  DROP TABLE "_sources_v" CASCADE;
  DROP TABLE "_sources_v_rels" CASCADE;
  DROP TABLE "topics" CASCADE;
  DROP TABLE "snippets" CASCADE;
  DROP TABLE "_snippets_v" CASCADE;
  DROP TABLE "payload_kv" CASCADE;
  DROP TABLE "payload_jobs_log" CASCADE;
  DROP TABLE "payload_jobs" CASCADE;
  DROP TABLE "payload_folders_folder_type" CASCADE;
  DROP TABLE "payload_folders" CASCADE;
  DROP TABLE "payload_locked_documents" CASCADE;
  DROP TABLE "payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload_preferences" CASCADE;
  DROP TABLE "payload_preferences_rels" CASCADE;
  DROP TABLE "payload_migrations" CASCADE;
  DROP TABLE "site_settings_navigation" CASCADE;
  DROP TABLE "site_settings" CASCADE;
  DROP TYPE "public"."enum_users_role";
  DROP TYPE "public"."enum_entries_visibility";
  DROP TYPE "public"."enum_entries_status";
  DROP TYPE "public"."enum__entries_v_version_visibility";
  DROP TYPE "public"."enum__entries_v_version_status";
  DROP TYPE "public"."enum_content_lists_blocks_video_source_type";
  DROP TYPE "public"."enum_content_lists_items_layout";
  DROP TYPE "public"."enum_content_lists_presentation";
  DROP TYPE "public"."enum_media_visibility";
  DROP TYPE "public"."enum_sources_status";
  DROP TYPE "public"."enum__sources_v_version_status";
  DROP TYPE "public"."enum_snippets_status";
  DROP TYPE "public"."enum__snippets_v_version_status";
  DROP TYPE "public"."enum_payload_jobs_log_task_slug";
  DROP TYPE "public"."enum_payload_jobs_log_state";
  DROP TYPE "public"."enum_payload_jobs_task_slug";
  DROP TYPE "public"."enum_payload_folders_folder_type";`)
}
