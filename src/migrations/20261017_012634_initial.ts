import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_users_role" AS ENUM('admin', 'editor');
  CREATE TYPE "public"."enum_posts_blocks_video_source_type" AS ENUM('upload', 'external');
  CREATE TYPE "public"."enum_posts_slides_layout" AS ENUM('stacked', 'comparison');
  CREATE TYPE "public"."enum_posts_featured_video_source_type" AS ENUM('upload', 'external');
  CREATE TYPE "public"."enum_posts_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__posts_v_blocks_video_source_type" AS ENUM('upload', 'external');
  CREATE TYPE "public"."enum__posts_v_version_slides_layout" AS ENUM('stacked', 'comparison');
  CREATE TYPE "public"."enum__posts_v_version_featured_video_source_type" AS ENUM('upload', 'external');
  CREATE TYPE "public"."enum__posts_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_media_visibility" AS ENUM('private', 'public');
  CREATE TYPE "public"."enum_sources_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__sources_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_snippets_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__snippets_v_version_status" AS ENUM('draft', 'published');
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
  
  CREATE TABLE "posts_blocks_rich_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"body" jsonb,
  	"block_name" varchar
  );
  
  CREATE TABLE "posts_blocks_image" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"media_id" integer,
  	"alt" varchar,
  	"caption" varchar,
  	"source_id" integer,
  	"block_name" varchar
  );
  
  CREATE TABLE "posts_blocks_video" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"source_type" "enum_posts_blocks_video_source_type" DEFAULT 'upload',
  	"media_id" integer,
  	"url" varchar,
  	"poster_id" integer,
  	"transcript" varchar,
  	"caption" varchar,
  	"source_id" integer,
  	"block_name" varchar
  );
  
  CREATE TABLE "posts_blocks_link" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"url" varchar,
  	"label" varchar,
  	"description" varchar,
  	"source_id" integer,
  	"block_name" varchar
  );
  
  CREATE TABLE "posts_blocks_download" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"media_id" integer,
  	"label" varchar,
  	"description" varchar,
  	"source_id" integer,
  	"block_name" varchar
  );
  
  CREATE TABLE "posts_blocks_embed" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"snippet_id" integer,
  	"title" varchar,
  	"height" numeric DEFAULT 420,
  	"caption" varchar,
  	"source_id" integer,
  	"block_name" varchar
  );
  
  CREATE TABLE "posts_slides" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"layout" "enum_posts_slides_layout" DEFAULT 'stacked'
  );
  
  CREATE TABLE "posts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"slug" varchar,
  	"summary" varchar,
  	"body" jsonb,
  	"author_id" integer,
  	"byline" varchar,
  	"published_at" timestamp(3) with time zone,
  	"featured_image_media_id" integer,
  	"featured_image_alt" varchar,
  	"featured_image_caption" varchar,
  	"featured_image_source_id" integer,
  	"featured_video_source_type" "enum_posts_featured_video_source_type" DEFAULT 'upload',
  	"featured_video_media_id" integer,
  	"featured_video_url" varchar,
  	"featured_video_poster_id" integer,
  	"featured_video_transcript" varchar,
  	"featured_video_caption" varchar,
  	"featured_video_source_id" integer,
  	"featured_link" varchar,
  	"featured_snippet_id" integer,
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_posts_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "posts_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"topics_id" integer,
  	"sources_id" integer
  );
  
  CREATE TABLE "_posts_v_blocks_rich_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"body" jsonb,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_posts_v_blocks_image" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"media_id" integer,
  	"alt" varchar,
  	"caption" varchar,
  	"source_id" integer,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_posts_v_blocks_video" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"source_type" "enum__posts_v_blocks_video_source_type" DEFAULT 'upload',
  	"media_id" integer,
  	"url" varchar,
  	"poster_id" integer,
  	"transcript" varchar,
  	"caption" varchar,
  	"source_id" integer,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_posts_v_blocks_link" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"url" varchar,
  	"label" varchar,
  	"description" varchar,
  	"source_id" integer,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_posts_v_blocks_download" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"media_id" integer,
  	"label" varchar,
  	"description" varchar,
  	"source_id" integer,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_posts_v_blocks_embed" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"snippet_id" integer,
  	"title" varchar,
  	"height" numeric DEFAULT 420,
  	"caption" varchar,
  	"source_id" integer,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_posts_v_version_slides" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"layout" "enum__posts_v_version_slides_layout" DEFAULT 'stacked',
  	"_uuid" varchar
  );
  
  CREATE TABLE "_posts_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar,
  	"version_slug" varchar,
  	"version_summary" varchar,
  	"version_body" jsonb,
  	"version_author_id" integer,
  	"version_byline" varchar,
  	"version_published_at" timestamp(3) with time zone,
  	"version_featured_image_media_id" integer,
  	"version_featured_image_alt" varchar,
  	"version_featured_image_caption" varchar,
  	"version_featured_image_source_id" integer,
  	"version_featured_video_source_type" "enum__posts_v_version_featured_video_source_type" DEFAULT 'upload',
  	"version_featured_video_media_id" integer,
  	"version_featured_video_url" varchar,
  	"version_featured_video_poster_id" integer,
  	"version_featured_video_transcript" varchar,
  	"version_featured_video_caption" varchar,
  	"version_featured_video_source_id" integer,
  	"version_featured_link" varchar,
  	"version_featured_snippet_id" integer,
  	"version_seo_title" varchar,
  	"version_seo_description" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__posts_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean,
  	"autosave" boolean
  );
  
  CREATE TABLE "_posts_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"topics_id" integer,
  	"sources_id" integer
  );
  
  CREATE TABLE "media" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"alt" varchar,
  	"visibility" "enum_media_visibility" DEFAULT 'private' NOT NULL,
  	"credit" varchar,
  	"source_id" integer,
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
  	"posts_id" integer,
  	"media_id" integer,
  	"sources_id" integer,
  	"topics_id" integer,
  	"snippets_id" integer
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
  	"description" varchar DEFAULT 'A field journal of interfaces, interactions, and the evidence behind them.',
  	"logo_id" integer,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "users_sessions" ADD CONSTRAINT "users_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts_blocks_rich_text" ADD CONSTRAINT "posts_blocks_rich_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts_blocks_image" ADD CONSTRAINT "posts_blocks_image_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "posts_blocks_image" ADD CONSTRAINT "posts_blocks_image_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "posts_blocks_image" ADD CONSTRAINT "posts_blocks_image_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts_blocks_video" ADD CONSTRAINT "posts_blocks_video_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "posts_blocks_video" ADD CONSTRAINT "posts_blocks_video_poster_id_media_id_fk" FOREIGN KEY ("poster_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "posts_blocks_video" ADD CONSTRAINT "posts_blocks_video_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "posts_blocks_video" ADD CONSTRAINT "posts_blocks_video_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts_blocks_link" ADD CONSTRAINT "posts_blocks_link_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "posts_blocks_link" ADD CONSTRAINT "posts_blocks_link_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts_blocks_download" ADD CONSTRAINT "posts_blocks_download_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "posts_blocks_download" ADD CONSTRAINT "posts_blocks_download_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "posts_blocks_download" ADD CONSTRAINT "posts_blocks_download_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts_blocks_embed" ADD CONSTRAINT "posts_blocks_embed_snippet_id_snippets_id_fk" FOREIGN KEY ("snippet_id") REFERENCES "public"."snippets"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "posts_blocks_embed" ADD CONSTRAINT "posts_blocks_embed_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "posts_blocks_embed" ADD CONSTRAINT "posts_blocks_embed_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts_slides" ADD CONSTRAINT "posts_slides_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts" ADD CONSTRAINT "posts_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "posts" ADD CONSTRAINT "posts_featured_image_media_id_media_id_fk" FOREIGN KEY ("featured_image_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "posts" ADD CONSTRAINT "posts_featured_image_source_id_sources_id_fk" FOREIGN KEY ("featured_image_source_id") REFERENCES "public"."sources"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "posts" ADD CONSTRAINT "posts_featured_video_media_id_media_id_fk" FOREIGN KEY ("featured_video_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "posts" ADD CONSTRAINT "posts_featured_video_poster_id_media_id_fk" FOREIGN KEY ("featured_video_poster_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "posts" ADD CONSTRAINT "posts_featured_video_source_id_sources_id_fk" FOREIGN KEY ("featured_video_source_id") REFERENCES "public"."sources"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "posts" ADD CONSTRAINT "posts_featured_snippet_id_snippets_id_fk" FOREIGN KEY ("featured_snippet_id") REFERENCES "public"."snippets"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "posts_rels" ADD CONSTRAINT "posts_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts_rels" ADD CONSTRAINT "posts_rels_topics_fk" FOREIGN KEY ("topics_id") REFERENCES "public"."topics"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts_rels" ADD CONSTRAINT "posts_rels_sources_fk" FOREIGN KEY ("sources_id") REFERENCES "public"."sources"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_rich_text" ADD CONSTRAINT "_posts_v_blocks_rich_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_posts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_image" ADD CONSTRAINT "_posts_v_blocks_image_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_image" ADD CONSTRAINT "_posts_v_blocks_image_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_image" ADD CONSTRAINT "_posts_v_blocks_image_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_posts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_video" ADD CONSTRAINT "_posts_v_blocks_video_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_video" ADD CONSTRAINT "_posts_v_blocks_video_poster_id_media_id_fk" FOREIGN KEY ("poster_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_video" ADD CONSTRAINT "_posts_v_blocks_video_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_video" ADD CONSTRAINT "_posts_v_blocks_video_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_posts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_link" ADD CONSTRAINT "_posts_v_blocks_link_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_link" ADD CONSTRAINT "_posts_v_blocks_link_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_posts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_download" ADD CONSTRAINT "_posts_v_blocks_download_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_download" ADD CONSTRAINT "_posts_v_blocks_download_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_download" ADD CONSTRAINT "_posts_v_blocks_download_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_posts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_embed" ADD CONSTRAINT "_posts_v_blocks_embed_snippet_id_snippets_id_fk" FOREIGN KEY ("snippet_id") REFERENCES "public"."snippets"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_embed" ADD CONSTRAINT "_posts_v_blocks_embed_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_embed" ADD CONSTRAINT "_posts_v_blocks_embed_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_posts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_version_slides" ADD CONSTRAINT "_posts_v_version_slides_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_posts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v" ADD CONSTRAINT "_posts_v_parent_id_posts_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."posts"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_posts_v" ADD CONSTRAINT "_posts_v_version_author_id_users_id_fk" FOREIGN KEY ("version_author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_posts_v" ADD CONSTRAINT "_posts_v_version_featured_image_media_id_media_id_fk" FOREIGN KEY ("version_featured_image_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_posts_v" ADD CONSTRAINT "_posts_v_version_featured_image_source_id_sources_id_fk" FOREIGN KEY ("version_featured_image_source_id") REFERENCES "public"."sources"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_posts_v" ADD CONSTRAINT "_posts_v_version_featured_video_media_id_media_id_fk" FOREIGN KEY ("version_featured_video_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_posts_v" ADD CONSTRAINT "_posts_v_version_featured_video_poster_id_media_id_fk" FOREIGN KEY ("version_featured_video_poster_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_posts_v" ADD CONSTRAINT "_posts_v_version_featured_video_source_id_sources_id_fk" FOREIGN KEY ("version_featured_video_source_id") REFERENCES "public"."sources"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_posts_v" ADD CONSTRAINT "_posts_v_version_featured_snippet_id_snippets_id_fk" FOREIGN KEY ("version_featured_snippet_id") REFERENCES "public"."snippets"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_posts_v_rels" ADD CONSTRAINT "_posts_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_posts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_rels" ADD CONSTRAINT "_posts_v_rels_topics_fk" FOREIGN KEY ("topics_id") REFERENCES "public"."topics"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_rels" ADD CONSTRAINT "_posts_v_rels_sources_fk" FOREIGN KEY ("sources_id") REFERENCES "public"."sources"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "media" ADD CONSTRAINT "media_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_sources_v" ADD CONSTRAINT "_sources_v_parent_id_sources_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."sources"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_snippets_v" ADD CONSTRAINT "_snippets_v_parent_id_snippets_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."snippets"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_posts_fk" FOREIGN KEY ("posts_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_sources_fk" FOREIGN KEY ("sources_id") REFERENCES "public"."sources"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_topics_fk" FOREIGN KEY ("topics_id") REFERENCES "public"."topics"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_snippets_fk" FOREIGN KEY ("snippets_id") REFERENCES "public"."snippets"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings_navigation" ADD CONSTRAINT "site_settings_navigation_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "users_sessions_order_idx" ON "users_sessions" USING btree ("_order");
  CREATE INDEX "users_sessions_parent_id_idx" ON "users_sessions" USING btree ("_parent_id");
  CREATE INDEX "users_updated_at_idx" ON "users" USING btree ("updated_at");
  CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");
  CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");
  CREATE INDEX "posts_blocks_rich_text_order_idx" ON "posts_blocks_rich_text" USING btree ("_order");
  CREATE INDEX "posts_blocks_rich_text_parent_id_idx" ON "posts_blocks_rich_text" USING btree ("_parent_id");
  CREATE INDEX "posts_blocks_rich_text_path_idx" ON "posts_blocks_rich_text" USING btree ("_path");
  CREATE INDEX "posts_blocks_image_order_idx" ON "posts_blocks_image" USING btree ("_order");
  CREATE INDEX "posts_blocks_image_parent_id_idx" ON "posts_blocks_image" USING btree ("_parent_id");
  CREATE INDEX "posts_blocks_image_path_idx" ON "posts_blocks_image" USING btree ("_path");
  CREATE INDEX "posts_blocks_image_media_idx" ON "posts_blocks_image" USING btree ("media_id");
  CREATE INDEX "posts_blocks_image_source_idx" ON "posts_blocks_image" USING btree ("source_id");
  CREATE INDEX "posts_blocks_video_order_idx" ON "posts_blocks_video" USING btree ("_order");
  CREATE INDEX "posts_blocks_video_parent_id_idx" ON "posts_blocks_video" USING btree ("_parent_id");
  CREATE INDEX "posts_blocks_video_path_idx" ON "posts_blocks_video" USING btree ("_path");
  CREATE INDEX "posts_blocks_video_media_idx" ON "posts_blocks_video" USING btree ("media_id");
  CREATE INDEX "posts_blocks_video_poster_idx" ON "posts_blocks_video" USING btree ("poster_id");
  CREATE INDEX "posts_blocks_video_source_idx" ON "posts_blocks_video" USING btree ("source_id");
  CREATE INDEX "posts_blocks_link_order_idx" ON "posts_blocks_link" USING btree ("_order");
  CREATE INDEX "posts_blocks_link_parent_id_idx" ON "posts_blocks_link" USING btree ("_parent_id");
  CREATE INDEX "posts_blocks_link_path_idx" ON "posts_blocks_link" USING btree ("_path");
  CREATE INDEX "posts_blocks_link_source_idx" ON "posts_blocks_link" USING btree ("source_id");
  CREATE INDEX "posts_blocks_download_order_idx" ON "posts_blocks_download" USING btree ("_order");
  CREATE INDEX "posts_blocks_download_parent_id_idx" ON "posts_blocks_download" USING btree ("_parent_id");
  CREATE INDEX "posts_blocks_download_path_idx" ON "posts_blocks_download" USING btree ("_path");
  CREATE INDEX "posts_blocks_download_media_idx" ON "posts_blocks_download" USING btree ("media_id");
  CREATE INDEX "posts_blocks_download_source_idx" ON "posts_blocks_download" USING btree ("source_id");
  CREATE INDEX "posts_blocks_embed_order_idx" ON "posts_blocks_embed" USING btree ("_order");
  CREATE INDEX "posts_blocks_embed_parent_id_idx" ON "posts_blocks_embed" USING btree ("_parent_id");
  CREATE INDEX "posts_blocks_embed_path_idx" ON "posts_blocks_embed" USING btree ("_path");
  CREATE INDEX "posts_blocks_embed_snippet_idx" ON "posts_blocks_embed" USING btree ("snippet_id");
  CREATE INDEX "posts_blocks_embed_source_idx" ON "posts_blocks_embed" USING btree ("source_id");
  CREATE INDEX "posts_slides_order_idx" ON "posts_slides" USING btree ("_order");
  CREATE INDEX "posts_slides_parent_id_idx" ON "posts_slides" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "posts_slug_idx" ON "posts" USING btree ("slug");
  CREATE INDEX "posts_author_idx" ON "posts" USING btree ("author_id");
  CREATE INDEX "posts_published_at_idx" ON "posts" USING btree ("published_at");
  CREATE INDEX "posts_featured_image_featured_image_media_idx" ON "posts" USING btree ("featured_image_media_id");
  CREATE INDEX "posts_featured_image_featured_image_source_idx" ON "posts" USING btree ("featured_image_source_id");
  CREATE INDEX "posts_featured_video_featured_video_media_idx" ON "posts" USING btree ("featured_video_media_id");
  CREATE INDEX "posts_featured_video_featured_video_poster_idx" ON "posts" USING btree ("featured_video_poster_id");
  CREATE INDEX "posts_featured_video_featured_video_source_idx" ON "posts" USING btree ("featured_video_source_id");
  CREATE INDEX "posts_featured_snippet_idx" ON "posts" USING btree ("featured_snippet_id");
  CREATE INDEX "posts_updated_at_idx" ON "posts" USING btree ("updated_at");
  CREATE INDEX "posts_created_at_idx" ON "posts" USING btree ("created_at");
  CREATE INDEX "posts__status_idx" ON "posts" USING btree ("_status");
  CREATE INDEX "posts_rels_order_idx" ON "posts_rels" USING btree ("order");
  CREATE INDEX "posts_rels_parent_idx" ON "posts_rels" USING btree ("parent_id");
  CREATE INDEX "posts_rels_path_idx" ON "posts_rels" USING btree ("path");
  CREATE INDEX "posts_rels_topics_id_idx" ON "posts_rels" USING btree ("topics_id");
  CREATE INDEX "posts_rels_sources_id_idx" ON "posts_rels" USING btree ("sources_id");
  CREATE INDEX "_posts_v_blocks_rich_text_order_idx" ON "_posts_v_blocks_rich_text" USING btree ("_order");
  CREATE INDEX "_posts_v_blocks_rich_text_parent_id_idx" ON "_posts_v_blocks_rich_text" USING btree ("_parent_id");
  CREATE INDEX "_posts_v_blocks_rich_text_path_idx" ON "_posts_v_blocks_rich_text" USING btree ("_path");
  CREATE INDEX "_posts_v_blocks_image_order_idx" ON "_posts_v_blocks_image" USING btree ("_order");
  CREATE INDEX "_posts_v_blocks_image_parent_id_idx" ON "_posts_v_blocks_image" USING btree ("_parent_id");
  CREATE INDEX "_posts_v_blocks_image_path_idx" ON "_posts_v_blocks_image" USING btree ("_path");
  CREATE INDEX "_posts_v_blocks_image_media_idx" ON "_posts_v_blocks_image" USING btree ("media_id");
  CREATE INDEX "_posts_v_blocks_image_source_idx" ON "_posts_v_blocks_image" USING btree ("source_id");
  CREATE INDEX "_posts_v_blocks_video_order_idx" ON "_posts_v_blocks_video" USING btree ("_order");
  CREATE INDEX "_posts_v_blocks_video_parent_id_idx" ON "_posts_v_blocks_video" USING btree ("_parent_id");
  CREATE INDEX "_posts_v_blocks_video_path_idx" ON "_posts_v_blocks_video" USING btree ("_path");
  CREATE INDEX "_posts_v_blocks_video_media_idx" ON "_posts_v_blocks_video" USING btree ("media_id");
  CREATE INDEX "_posts_v_blocks_video_poster_idx" ON "_posts_v_blocks_video" USING btree ("poster_id");
  CREATE INDEX "_posts_v_blocks_video_source_idx" ON "_posts_v_blocks_video" USING btree ("source_id");
  CREATE INDEX "_posts_v_blocks_link_order_idx" ON "_posts_v_blocks_link" USING btree ("_order");
  CREATE INDEX "_posts_v_blocks_link_parent_id_idx" ON "_posts_v_blocks_link" USING btree ("_parent_id");
  CREATE INDEX "_posts_v_blocks_link_path_idx" ON "_posts_v_blocks_link" USING btree ("_path");
  CREATE INDEX "_posts_v_blocks_link_source_idx" ON "_posts_v_blocks_link" USING btree ("source_id");
  CREATE INDEX "_posts_v_blocks_download_order_idx" ON "_posts_v_blocks_download" USING btree ("_order");
  CREATE INDEX "_posts_v_blocks_download_parent_id_idx" ON "_posts_v_blocks_download" USING btree ("_parent_id");
  CREATE INDEX "_posts_v_blocks_download_path_idx" ON "_posts_v_blocks_download" USING btree ("_path");
  CREATE INDEX "_posts_v_blocks_download_media_idx" ON "_posts_v_blocks_download" USING btree ("media_id");
  CREATE INDEX "_posts_v_blocks_download_source_idx" ON "_posts_v_blocks_download" USING btree ("source_id");
  CREATE INDEX "_posts_v_blocks_embed_order_idx" ON "_posts_v_blocks_embed" USING btree ("_order");
  CREATE INDEX "_posts_v_blocks_embed_parent_id_idx" ON "_posts_v_blocks_embed" USING btree ("_parent_id");
  CREATE INDEX "_posts_v_blocks_embed_path_idx" ON "_posts_v_blocks_embed" USING btree ("_path");
  CREATE INDEX "_posts_v_blocks_embed_snippet_idx" ON "_posts_v_blocks_embed" USING btree ("snippet_id");
  CREATE INDEX "_posts_v_blocks_embed_source_idx" ON "_posts_v_blocks_embed" USING btree ("source_id");
  CREATE INDEX "_posts_v_version_slides_order_idx" ON "_posts_v_version_slides" USING btree ("_order");
  CREATE INDEX "_posts_v_version_slides_parent_id_idx" ON "_posts_v_version_slides" USING btree ("_parent_id");
  CREATE INDEX "_posts_v_parent_idx" ON "_posts_v" USING btree ("parent_id");
  CREATE INDEX "_posts_v_version_version_slug_idx" ON "_posts_v" USING btree ("version_slug");
  CREATE INDEX "_posts_v_version_version_author_idx" ON "_posts_v" USING btree ("version_author_id");
  CREATE INDEX "_posts_v_version_version_published_at_idx" ON "_posts_v" USING btree ("version_published_at");
  CREATE INDEX "_posts_v_version_featured_image_version_featured_image_m_idx" ON "_posts_v" USING btree ("version_featured_image_media_id");
  CREATE INDEX "_posts_v_version_featured_image_version_featured_image_s_idx" ON "_posts_v" USING btree ("version_featured_image_source_id");
  CREATE INDEX "_posts_v_version_featured_video_version_featured_video_m_idx" ON "_posts_v" USING btree ("version_featured_video_media_id");
  CREATE INDEX "_posts_v_version_featured_video_version_featured_video_p_idx" ON "_posts_v" USING btree ("version_featured_video_poster_id");
  CREATE INDEX "_posts_v_version_featured_video_version_featured_video_s_idx" ON "_posts_v" USING btree ("version_featured_video_source_id");
  CREATE INDEX "_posts_v_version_version_featured_snippet_idx" ON "_posts_v" USING btree ("version_featured_snippet_id");
  CREATE INDEX "_posts_v_version_version_updated_at_idx" ON "_posts_v" USING btree ("version_updated_at");
  CREATE INDEX "_posts_v_version_version_created_at_idx" ON "_posts_v" USING btree ("version_created_at");
  CREATE INDEX "_posts_v_version_version__status_idx" ON "_posts_v" USING btree ("version__status");
  CREATE INDEX "_posts_v_created_at_idx" ON "_posts_v" USING btree ("created_at");
  CREATE INDEX "_posts_v_updated_at_idx" ON "_posts_v" USING btree ("updated_at");
  CREATE INDEX "_posts_v_latest_idx" ON "_posts_v" USING btree ("latest");
  CREATE INDEX "_posts_v_autosave_idx" ON "_posts_v" USING btree ("autosave");
  CREATE INDEX "_posts_v_rels_order_idx" ON "_posts_v_rels" USING btree ("order");
  CREATE INDEX "_posts_v_rels_parent_idx" ON "_posts_v_rels" USING btree ("parent_id");
  CREATE INDEX "_posts_v_rels_path_idx" ON "_posts_v_rels" USING btree ("path");
  CREATE INDEX "_posts_v_rels_topics_id_idx" ON "_posts_v_rels" USING btree ("topics_id");
  CREATE INDEX "_posts_v_rels_sources_id_idx" ON "_posts_v_rels" USING btree ("sources_id");
  CREATE INDEX "media_source_idx" ON "media" USING btree ("source_id");
  CREATE INDEX "media_updated_at_idx" ON "media" USING btree ("updated_at");
  CREATE INDEX "media_created_at_idx" ON "media" USING btree ("created_at");
  CREATE UNIQUE INDEX "media_filename_idx" ON "media" USING btree ("filename");
  CREATE INDEX "media_sizes_card_sizes_card_filename_idx" ON "media" USING btree ("sizes_card_filename");
  CREATE INDEX "sources_updated_at_idx" ON "sources" USING btree ("updated_at");
  CREATE INDEX "sources_created_at_idx" ON "sources" USING btree ("created_at");
  CREATE INDEX "sources__status_idx" ON "sources" USING btree ("_status");
  CREATE INDEX "_sources_v_parent_idx" ON "_sources_v" USING btree ("parent_id");
  CREATE INDEX "_sources_v_version_version_updated_at_idx" ON "_sources_v" USING btree ("version_updated_at");
  CREATE INDEX "_sources_v_version_version_created_at_idx" ON "_sources_v" USING btree ("version_created_at");
  CREATE INDEX "_sources_v_version_version__status_idx" ON "_sources_v" USING btree ("version__status");
  CREATE INDEX "_sources_v_created_at_idx" ON "_sources_v" USING btree ("created_at");
  CREATE INDEX "_sources_v_updated_at_idx" ON "_sources_v" USING btree ("updated_at");
  CREATE INDEX "_sources_v_latest_idx" ON "_sources_v" USING btree ("latest");
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
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_users_id_idx" ON "payload_locked_documents_rels" USING btree ("users_id");
  CREATE INDEX "payload_locked_documents_rels_posts_id_idx" ON "payload_locked_documents_rels" USING btree ("posts_id");
  CREATE INDEX "payload_locked_documents_rels_media_id_idx" ON "payload_locked_documents_rels" USING btree ("media_id");
  CREATE INDEX "payload_locked_documents_rels_sources_id_idx" ON "payload_locked_documents_rels" USING btree ("sources_id");
  CREATE INDEX "payload_locked_documents_rels_topics_id_idx" ON "payload_locked_documents_rels" USING btree ("topics_id");
  CREATE INDEX "payload_locked_documents_rels_snippets_id_idx" ON "payload_locked_documents_rels" USING btree ("snippets_id");
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
  DROP TABLE "posts_blocks_rich_text" CASCADE;
  DROP TABLE "posts_blocks_image" CASCADE;
  DROP TABLE "posts_blocks_video" CASCADE;
  DROP TABLE "posts_blocks_link" CASCADE;
  DROP TABLE "posts_blocks_download" CASCADE;
  DROP TABLE "posts_blocks_embed" CASCADE;
  DROP TABLE "posts_slides" CASCADE;
  DROP TABLE "posts" CASCADE;
  DROP TABLE "posts_rels" CASCADE;
  DROP TABLE "_posts_v_blocks_rich_text" CASCADE;
  DROP TABLE "_posts_v_blocks_image" CASCADE;
  DROP TABLE "_posts_v_blocks_video" CASCADE;
  DROP TABLE "_posts_v_blocks_link" CASCADE;
  DROP TABLE "_posts_v_blocks_download" CASCADE;
  DROP TABLE "_posts_v_blocks_embed" CASCADE;
  DROP TABLE "_posts_v_version_slides" CASCADE;
  DROP TABLE "_posts_v" CASCADE;
  DROP TABLE "_posts_v_rels" CASCADE;
  DROP TABLE "media" CASCADE;
  DROP TABLE "sources" CASCADE;
  DROP TABLE "_sources_v" CASCADE;
  DROP TABLE "topics" CASCADE;
  DROP TABLE "snippets" CASCADE;
  DROP TABLE "_snippets_v" CASCADE;
  DROP TABLE "payload_kv" CASCADE;
  DROP TABLE "payload_locked_documents" CASCADE;
  DROP TABLE "payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload_preferences" CASCADE;
  DROP TABLE "payload_preferences_rels" CASCADE;
  DROP TABLE "payload_migrations" CASCADE;
  DROP TABLE "site_settings_navigation" CASCADE;
  DROP TABLE "site_settings" CASCADE;
  DROP TYPE "public"."enum_users_role";
  DROP TYPE "public"."enum_posts_blocks_video_source_type";
  DROP TYPE "public"."enum_posts_slides_layout";
  DROP TYPE "public"."enum_posts_featured_video_source_type";
  DROP TYPE "public"."enum_posts_status";
  DROP TYPE "public"."enum__posts_v_blocks_video_source_type";
  DROP TYPE "public"."enum__posts_v_version_slides_layout";
  DROP TYPE "public"."enum__posts_v_version_featured_video_source_type";
  DROP TYPE "public"."enum__posts_v_version_status";
  DROP TYPE "public"."enum_media_visibility";
  DROP TYPE "public"."enum_sources_status";
  DROP TYPE "public"."enum__sources_v_version_status";
  DROP TYPE "public"."enum_snippets_status";
  DROP TYPE "public"."enum__snippets_v_version_status";`)
}
