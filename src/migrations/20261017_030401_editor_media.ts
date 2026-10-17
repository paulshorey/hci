import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_payload_folders_folder_type" AS ENUM('media');
  CREATE TABLE "posts_blocks_audio" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"media_id" integer,
  	"transcript" varchar,
  	"caption" varchar,
  	"source_id" integer,
  	"block_name" varchar
  );
  
  CREATE TABLE "_posts_v_blocks_audio" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"media_id" integer,
  	"transcript" varchar,
  	"caption" varchar,
  	"source_id" integer,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "sources_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"media_id" integer
  );
  
  CREATE TABLE "_sources_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"media_id" integer
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
  
  ALTER TABLE "media" ADD COLUMN "prefix" varchar DEFAULT 'media';
  ALTER TABLE "media" ADD COLUMN "_objectkey" varchar;
  ALTER TABLE "media" ADD COLUMN "folder_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "payload_folders_id" integer;
  ALTER TABLE "posts_blocks_audio" ADD CONSTRAINT "posts_blocks_audio_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "posts_blocks_audio" ADD CONSTRAINT "posts_blocks_audio_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "posts_blocks_audio" ADD CONSTRAINT "posts_blocks_audio_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_audio" ADD CONSTRAINT "_posts_v_blocks_audio_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_audio" ADD CONSTRAINT "_posts_v_blocks_audio_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_audio" ADD CONSTRAINT "_posts_v_blocks_audio_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_posts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "sources_rels" ADD CONSTRAINT "sources_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."sources"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "sources_rels" ADD CONSTRAINT "sources_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_sources_v_rels" ADD CONSTRAINT "_sources_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_sources_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_sources_v_rels" ADD CONSTRAINT "_sources_v_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_folders_folder_type" ADD CONSTRAINT "payload_folders_folder_type_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_folders"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_folders" ADD CONSTRAINT "payload_folders_folder_id_payload_folders_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."payload_folders"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "posts_blocks_audio_order_idx" ON "posts_blocks_audio" USING btree ("_order");
  CREATE INDEX "posts_blocks_audio_parent_id_idx" ON "posts_blocks_audio" USING btree ("_parent_id");
  CREATE INDEX "posts_blocks_audio_path_idx" ON "posts_blocks_audio" USING btree ("_path");
  CREATE INDEX "posts_blocks_audio_media_idx" ON "posts_blocks_audio" USING btree ("media_id");
  CREATE INDEX "posts_blocks_audio_source_idx" ON "posts_blocks_audio" USING btree ("source_id");
  CREATE INDEX "_posts_v_blocks_audio_order_idx" ON "_posts_v_blocks_audio" USING btree ("_order");
  CREATE INDEX "_posts_v_blocks_audio_parent_id_idx" ON "_posts_v_blocks_audio" USING btree ("_parent_id");
  CREATE INDEX "_posts_v_blocks_audio_path_idx" ON "_posts_v_blocks_audio" USING btree ("_path");
  CREATE INDEX "_posts_v_blocks_audio_media_idx" ON "_posts_v_blocks_audio" USING btree ("media_id");
  CREATE INDEX "_posts_v_blocks_audio_source_idx" ON "_posts_v_blocks_audio" USING btree ("source_id");
  CREATE INDEX "sources_rels_order_idx" ON "sources_rels" USING btree ("order");
  CREATE INDEX "sources_rels_parent_idx" ON "sources_rels" USING btree ("parent_id");
  CREATE INDEX "sources_rels_path_idx" ON "sources_rels" USING btree ("path");
  CREATE INDEX "sources_rels_media_id_idx" ON "sources_rels" USING btree ("media_id");
  CREATE INDEX "_sources_v_rels_order_idx" ON "_sources_v_rels" USING btree ("order");
  CREATE INDEX "_sources_v_rels_parent_idx" ON "_sources_v_rels" USING btree ("parent_id");
  CREATE INDEX "_sources_v_rels_path_idx" ON "_sources_v_rels" USING btree ("path");
  CREATE INDEX "_sources_v_rels_media_id_idx" ON "_sources_v_rels" USING btree ("media_id");
  CREATE INDEX "payload_folders_folder_type_order_idx" ON "payload_folders_folder_type" USING btree ("order");
  CREATE INDEX "payload_folders_folder_type_parent_idx" ON "payload_folders_folder_type" USING btree ("parent_id");
  CREATE INDEX "payload_folders_name_idx" ON "payload_folders" USING btree ("name");
  CREATE INDEX "payload_folders_folder_idx" ON "payload_folders" USING btree ("folder_id");
  CREATE INDEX "payload_folders_updated_at_idx" ON "payload_folders" USING btree ("updated_at");
  CREATE INDEX "payload_folders_created_at_idx" ON "payload_folders" USING btree ("created_at");
  ALTER TABLE "media" ADD CONSTRAINT "media_folder_id_payload_folders_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."payload_folders"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_payload_folders_fk" FOREIGN KEY ("payload_folders_id") REFERENCES "public"."payload_folders"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "media_folder_idx" ON "media" USING btree ("folder_id");
  CREATE INDEX "payload_locked_documents_rels_payload_folders_id_idx" ON "payload_locked_documents_rels" USING btree ("payload_folders_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "posts_blocks_audio" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_posts_v_blocks_audio" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "sources_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_sources_v_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload_folders_folder_type" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload_folders" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "posts_blocks_audio" CASCADE;
  DROP TABLE "_posts_v_blocks_audio" CASCADE;
  DROP TABLE "sources_rels" CASCADE;
  DROP TABLE "_sources_v_rels" CASCADE;
  DROP TABLE "payload_folders_folder_type" CASCADE;
  DROP TABLE "payload_folders" CASCADE;
  ALTER TABLE "media" DROP CONSTRAINT "media_folder_id_payload_folders_id_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_payload_folders_fk";
  
  DROP INDEX "media_folder_idx";
  DROP INDEX "payload_locked_documents_rels_payload_folders_id_idx";
  ALTER TABLE "media" DROP COLUMN "prefix";
  ALTER TABLE "media" DROP COLUMN "_objectkey";
  ALTER TABLE "media" DROP COLUMN "folder_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "payload_folders_id";
  DROP TYPE "public"."enum_payload_folders_folder_type";`)
}
