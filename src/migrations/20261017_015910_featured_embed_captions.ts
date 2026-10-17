import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "posts" ADD COLUMN "featured_snippet_caption" varchar;
  ALTER TABLE "posts" ADD COLUMN "featured_snippet_source_id" integer;
  ALTER TABLE "_posts_v" ADD COLUMN "version_featured_snippet_caption" varchar;
  ALTER TABLE "_posts_v" ADD COLUMN "version_featured_snippet_source_id" integer;
  ALTER TABLE "posts" ADD CONSTRAINT "posts_featured_snippet_source_id_sources_id_fk" FOREIGN KEY ("featured_snippet_source_id") REFERENCES "public"."sources"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_posts_v" ADD CONSTRAINT "_posts_v_version_featured_snippet_source_id_sources_id_fk" FOREIGN KEY ("version_featured_snippet_source_id") REFERENCES "public"."sources"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "posts_featured_snippet_source_idx" ON "posts" USING btree ("featured_snippet_source_id");
  CREATE INDEX "_posts_v_version_version_featured_snippet_source_idx" ON "_posts_v" USING btree ("version_featured_snippet_source_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "posts" DROP CONSTRAINT "posts_featured_snippet_source_id_sources_id_fk";
  
  ALTER TABLE "_posts_v" DROP CONSTRAINT "_posts_v_version_featured_snippet_source_id_sources_id_fk";
  
  DROP INDEX "posts_featured_snippet_source_idx";
  DROP INDEX "_posts_v_version_version_featured_snippet_source_idx";
  ALTER TABLE "posts" DROP COLUMN "featured_snippet_caption";
  ALTER TABLE "posts" DROP COLUMN "featured_snippet_source_id";
  ALTER TABLE "_posts_v" DROP COLUMN "version_featured_snippet_caption";
  ALTER TABLE "_posts_v" DROP COLUMN "version_featured_snippet_source_id";`)
}
