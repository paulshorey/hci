import * as migration_20261017_012634_initial from './20261017_012634_initial';
import * as migration_20261017_013513_media_attribution from './20261017_013513_media_attribution';
import * as migration_20261017_014832_site_time_zone from './20261017_014832_site_time_zone';
import * as migration_20261017_015910_featured_embed_captions from './20261017_015910_featured_embed_captions';
import * as migration_20261017_021056_backfill_featured_embed_captions from './20261017_021056_backfill_featured_embed_captions';
import * as migration_20261017_030401_editor_media from './20261017_030401_editor_media';

export const migrations = [
  {
    up: migration_20261017_012634_initial.up,
    down: migration_20261017_012634_initial.down,
    name: '20261017_012634_initial',
  },
  {
    up: migration_20261017_013513_media_attribution.up,
    down: migration_20261017_013513_media_attribution.down,
    name: '20261017_013513_media_attribution',
  },
  {
    up: migration_20261017_014832_site_time_zone.up,
    down: migration_20261017_014832_site_time_zone.down,
    name: '20261017_014832_site_time_zone',
  },
  {
    up: migration_20261017_015910_featured_embed_captions.up,
    down: migration_20261017_015910_featured_embed_captions.down,
    name: '20261017_015910_featured_embed_captions',
  },
  {
    up: migration_20261017_021056_backfill_featured_embed_captions.up,
    down: migration_20261017_021056_backfill_featured_embed_captions.down,
    name: '20261017_021056_backfill_featured_embed_captions',
  },
  {
    up: migration_20261017_030401_editor_media.up,
    down: migration_20261017_030401_editor_media.down,
    name: '20261017_030401_editor_media'
  },
];
