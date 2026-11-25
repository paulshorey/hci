WITH manifests(prefix, manifest) AS (
  SELECT storage_prefix, manifest FROM snippets
  UNION
  SELECT version_storage_prefix, version_manifest FROM _snippets_v
), objects(key, size, sha256) AS (
  SELECT 'media/' || filename, filesize, NULL::text FROM media WHERE filename IS NOT NULL
  UNION
  SELECT 'media/' || sizes_card_filename, sizes_card_filesize, NULL::text
    FROM media WHERE sizes_card_filename IS NOT NULL
  UNION
  SELECT prefix || '/' || (f->>'path'), (f->>'size')::numeric, f->>'sha256'
    FROM manifests CROSS JOIN LATERAL jsonb_array_elements(manifest->'files') AS f
)
SELECT row_to_json(objects) FROM objects;
