\if :{?storage_driver}
\else
  \set storage_driver s3
\endif

WITH media_paths AS (
  SELECT CASE WHEN :'storage_driver' = 'disk' THEN 'media'
    ELSE concat_ws('/', COALESCE(NULLIF(prefix, ''), 'media'), NULLIF(_objectkey, ''))
    END AS folder,
    filename, filesize, sizes_card_filename, sizes_card_filesize
  FROM media
), manifests(prefix, manifest) AS (
  SELECT storage_prefix, manifest FROM snippets
  UNION
  SELECT version_storage_prefix, version_manifest FROM _snippets_v
), objects(key, size, sha256) AS (
  SELECT folder || '/' || filename, filesize, NULL::text FROM media_paths WHERE filename IS NOT NULL
  UNION
  SELECT folder || '/' || sizes_card_filename, sizes_card_filesize, NULL::text
    FROM media_paths WHERE sizes_card_filename IS NOT NULL
  UNION
  SELECT prefix || '/' || (f->>'path'), (f->>'size')::numeric, f->>'sha256'
    FROM manifests CROSS JOIN LATERAL jsonb_array_elements(manifest->'files') AS f
)
SELECT row_to_json(objects) FROM objects;
