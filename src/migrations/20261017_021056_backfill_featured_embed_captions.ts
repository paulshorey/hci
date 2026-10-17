import { type MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    UPDATE posts AS p
    SET featured_snippet_caption = 'Interactive exhibit: ' || COALESCE(NULLIF(trim(s.title), ''), 'Untitled experiment')
    FROM snippets AS s
    WHERE p.featured_snippet_id = s.id AND p._status = 'published'
      AND COALESCE(trim(p.featured_snippet_caption), '') = '';
    UPDATE _posts_v AS v
    SET version_featured_snippet_caption = 'Interactive exhibit: ' || COALESCE(NULLIF(trim(s.title), ''), 'Untitled experiment')
    FROM snippets AS s
    WHERE v.version_featured_snippet_id = s.id AND v.version__status = 'published'
      AND COALESCE(trim(v.version_featured_snippet_caption), '') = '';
  `)
}

export async function down(): Promise<void> {
  throw new Error('Caption data backfills are forward-only.')
}
