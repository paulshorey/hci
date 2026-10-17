SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

CREATE SCHEMA public;

COMMENT ON SCHEMA public IS 'standard public schema';

CREATE TYPE public.enum__posts_v_blocks_video_source_type AS ENUM (
    'upload',
    'external'
);

CREATE TYPE public.enum__posts_v_version_featured_video_source_type AS ENUM (
    'upload',
    'external'
);

CREATE TYPE public.enum__posts_v_version_slides_layout AS ENUM (
    'stacked',
    'comparison'
);

CREATE TYPE public.enum__posts_v_version_status AS ENUM (
    'draft',
    'published'
);

CREATE TYPE public.enum__snippets_v_version_status AS ENUM (
    'draft',
    'published'
);

CREATE TYPE public.enum__sources_v_version_status AS ENUM (
    'draft',
    'published'
);

CREATE TYPE public.enum_media_visibility AS ENUM (
    'private',
    'public'
);

CREATE TYPE public.enum_posts_blocks_video_source_type AS ENUM (
    'upload',
    'external'
);

CREATE TYPE public.enum_posts_featured_video_source_type AS ENUM (
    'upload',
    'external'
);

CREATE TYPE public.enum_posts_slides_layout AS ENUM (
    'stacked',
    'comparison'
);

CREATE TYPE public.enum_posts_status AS ENUM (
    'draft',
    'published'
);

CREATE TYPE public.enum_snippets_status AS ENUM (
    'draft',
    'published'
);

CREATE TYPE public.enum_sources_status AS ENUM (
    'draft',
    'published'
);

CREATE TYPE public.enum_users_role AS ENUM (
    'admin',
    'editor'
);

SET default_tablespace = '';

SET default_table_access_method = heap;

CREATE TABLE public._posts_v (
    id integer NOT NULL,
    parent_id integer,
    version_title character varying,
    version_slug character varying,
    version_summary character varying,
    version_body jsonb,
    version_author_id integer,
    version_byline character varying,
    version_published_at timestamp(3) with time zone,
    version_featured_image_media_id integer,
    version_featured_image_alt character varying,
    version_featured_image_caption character varying,
    version_featured_image_source_id integer,
    version_featured_video_source_type public.enum__posts_v_version_featured_video_source_type DEFAULT 'upload'::public.enum__posts_v_version_featured_video_source_type,
    version_featured_video_media_id integer,
    version_featured_video_url character varying,
    version_featured_video_poster_id integer,
    version_featured_video_transcript character varying,
    version_featured_video_caption character varying,
    version_featured_video_source_id integer,
    version_featured_link character varying,
    version_featured_snippet_id integer,
    version_seo_title character varying,
    version_seo_description character varying,
    version_updated_at timestamp(3) with time zone,
    version_created_at timestamp(3) with time zone,
    version__status public.enum__posts_v_version_status DEFAULT 'draft'::public.enum__posts_v_version_status,
    created_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    updated_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    latest boolean,
    autosave boolean
);

CREATE TABLE public._posts_v_blocks_download (
    _order integer NOT NULL,
    _parent_id integer NOT NULL,
    _path text NOT NULL,
    id integer NOT NULL,
    media_id integer,
    label character varying,
    description character varying,
    source_id integer,
    _uuid character varying,
    block_name character varying
);

CREATE SEQUENCE public._posts_v_blocks_download_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public._posts_v_blocks_download_id_seq OWNED BY public._posts_v_blocks_download.id;

CREATE TABLE public._posts_v_blocks_embed (
    _order integer NOT NULL,
    _parent_id integer NOT NULL,
    _path text NOT NULL,
    id integer NOT NULL,
    snippet_id integer,
    title character varying,
    height numeric DEFAULT 420,
    caption character varying,
    source_id integer,
    _uuid character varying,
    block_name character varying
);

CREATE SEQUENCE public._posts_v_blocks_embed_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public._posts_v_blocks_embed_id_seq OWNED BY public._posts_v_blocks_embed.id;

CREATE TABLE public._posts_v_blocks_image (
    _order integer NOT NULL,
    _parent_id integer NOT NULL,
    _path text NOT NULL,
    id integer NOT NULL,
    media_id integer,
    alt character varying,
    caption character varying,
    source_id integer,
    _uuid character varying,
    block_name character varying
);

CREATE SEQUENCE public._posts_v_blocks_image_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public._posts_v_blocks_image_id_seq OWNED BY public._posts_v_blocks_image.id;

CREATE TABLE public._posts_v_blocks_link (
    _order integer NOT NULL,
    _parent_id integer NOT NULL,
    _path text NOT NULL,
    id integer NOT NULL,
    url character varying,
    label character varying,
    description character varying,
    source_id integer,
    _uuid character varying,
    block_name character varying
);

CREATE SEQUENCE public._posts_v_blocks_link_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public._posts_v_blocks_link_id_seq OWNED BY public._posts_v_blocks_link.id;

CREATE TABLE public._posts_v_blocks_rich_text (
    _order integer NOT NULL,
    _parent_id integer NOT NULL,
    _path text NOT NULL,
    id integer NOT NULL,
    body jsonb,
    _uuid character varying,
    block_name character varying
);

CREATE SEQUENCE public._posts_v_blocks_rich_text_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public._posts_v_blocks_rich_text_id_seq OWNED BY public._posts_v_blocks_rich_text.id;

CREATE TABLE public._posts_v_blocks_video (
    _order integer NOT NULL,
    _parent_id integer NOT NULL,
    _path text NOT NULL,
    id integer NOT NULL,
    source_type public.enum__posts_v_blocks_video_source_type DEFAULT 'upload'::public.enum__posts_v_blocks_video_source_type,
    media_id integer,
    url character varying,
    poster_id integer,
    transcript character varying,
    caption character varying,
    source_id integer,
    _uuid character varying,
    block_name character varying
);

CREATE SEQUENCE public._posts_v_blocks_video_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public._posts_v_blocks_video_id_seq OWNED BY public._posts_v_blocks_video.id;

CREATE SEQUENCE public._posts_v_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public._posts_v_id_seq OWNED BY public._posts_v.id;

CREATE TABLE public._posts_v_rels (
    id integer NOT NULL,
    "order" integer,
    parent_id integer NOT NULL,
    path character varying NOT NULL,
    topics_id integer,
    sources_id integer
);

CREATE SEQUENCE public._posts_v_rels_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public._posts_v_rels_id_seq OWNED BY public._posts_v_rels.id;

CREATE TABLE public._posts_v_version_slides (
    _order integer NOT NULL,
    _parent_id integer NOT NULL,
    id integer NOT NULL,
    title character varying,
    layout public.enum__posts_v_version_slides_layout DEFAULT 'stacked'::public.enum__posts_v_version_slides_layout,
    _uuid character varying
);

CREATE SEQUENCE public._posts_v_version_slides_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public._posts_v_version_slides_id_seq OWNED BY public._posts_v_version_slides.id;

CREATE TABLE public._snippets_v (
    id integer NOT NULL,
    parent_id integer,
    version_title character varying,
    version_description character varying,
    version_storage_prefix character varying,
    version_bundle_version character varying,
    version_entry_file character varying,
    version_manifest jsonb,
    version_updated_at timestamp(3) with time zone,
    version_created_at timestamp(3) with time zone,
    version__status public.enum__snippets_v_version_status DEFAULT 'draft'::public.enum__snippets_v_version_status,
    created_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    updated_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    latest boolean
);

CREATE SEQUENCE public._snippets_v_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public._snippets_v_id_seq OWNED BY public._snippets_v.id;

CREATE TABLE public._sources_v (
    id integer NOT NULL,
    parent_id integer,
    version_title character varying,
    version_url character varying,
    version_publisher character varying,
    version_author character varying,
    version_published_at timestamp(3) with time zone,
    version_accessed_at timestamp(3) with time zone,
    version_archive_u_r_l character varying,
    version_notes character varying,
    version_updated_at timestamp(3) with time zone,
    version_created_at timestamp(3) with time zone,
    version__status public.enum__sources_v_version_status DEFAULT 'draft'::public.enum__sources_v_version_status,
    created_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    updated_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    latest boolean
);

CREATE SEQUENCE public._sources_v_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public._sources_v_id_seq OWNED BY public._sources_v.id;

CREATE TABLE public.hci_migration_checksums (
    name text NOT NULL,
    checksum text NOT NULL
);

CREATE TABLE public.media (
    id integer NOT NULL,
    title character varying NOT NULL,
    alt character varying,
    visibility public.enum_media_visibility DEFAULT 'private'::public.enum_media_visibility NOT NULL,
    credit character varying,
    source_id integer,
    updated_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    created_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    url character varying,
    thumbnail_u_r_l character varying,
    filename character varying,
    mime_type character varying,
    filesize numeric,
    width numeric,
    height numeric,
    focal_x numeric,
    focal_y numeric,
    sizes_card_url character varying,
    sizes_card_width numeric,
    sizes_card_height numeric,
    sizes_card_mime_type character varying,
    sizes_card_filesize numeric,
    sizes_card_filename character varying,
    credit_u_r_l character varying,
    license character varying
);

CREATE SEQUENCE public.media_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.media_id_seq OWNED BY public.media.id;

CREATE TABLE public.payload_kv (
    id integer NOT NULL,
    key character varying NOT NULL,
    data jsonb NOT NULL
);

CREATE SEQUENCE public.payload_kv_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.payload_kv_id_seq OWNED BY public.payload_kv.id;

CREATE TABLE public.payload_locked_documents (
    id integer NOT NULL,
    global_slug character varying,
    updated_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    created_at timestamp(3) with time zone DEFAULT now() NOT NULL
);

CREATE SEQUENCE public.payload_locked_documents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.payload_locked_documents_id_seq OWNED BY public.payload_locked_documents.id;

CREATE TABLE public.payload_locked_documents_rels (
    id integer NOT NULL,
    "order" integer,
    parent_id integer NOT NULL,
    path character varying NOT NULL,
    users_id integer,
    posts_id integer,
    media_id integer,
    sources_id integer,
    topics_id integer,
    snippets_id integer
);

CREATE SEQUENCE public.payload_locked_documents_rels_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.payload_locked_documents_rels_id_seq OWNED BY public.payload_locked_documents_rels.id;

CREATE TABLE public.payload_migrations (
    id integer NOT NULL,
    name character varying,
    batch numeric,
    updated_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    created_at timestamp(3) with time zone DEFAULT now() NOT NULL
);

CREATE SEQUENCE public.payload_migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.payload_migrations_id_seq OWNED BY public.payload_migrations.id;

CREATE TABLE public.payload_preferences (
    id integer NOT NULL,
    key character varying,
    value jsonb,
    updated_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    created_at timestamp(3) with time zone DEFAULT now() NOT NULL
);

CREATE SEQUENCE public.payload_preferences_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.payload_preferences_id_seq OWNED BY public.payload_preferences.id;

CREATE TABLE public.payload_preferences_rels (
    id integer NOT NULL,
    "order" integer,
    parent_id integer NOT NULL,
    path character varying NOT NULL,
    users_id integer
);

CREATE SEQUENCE public.payload_preferences_rels_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.payload_preferences_rels_id_seq OWNED BY public.payload_preferences_rels.id;

CREATE TABLE public.posts (
    id integer NOT NULL,
    title character varying,
    slug character varying,
    summary character varying,
    body jsonb,
    author_id integer,
    byline character varying,
    published_at timestamp(3) with time zone,
    featured_image_media_id integer,
    featured_image_alt character varying,
    featured_image_caption character varying,
    featured_image_source_id integer,
    featured_video_source_type public.enum_posts_featured_video_source_type DEFAULT 'upload'::public.enum_posts_featured_video_source_type,
    featured_video_media_id integer,
    featured_video_url character varying,
    featured_video_poster_id integer,
    featured_video_transcript character varying,
    featured_video_caption character varying,
    featured_video_source_id integer,
    featured_link character varying,
    featured_snippet_id integer,
    seo_title character varying,
    seo_description character varying,
    updated_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    created_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    _status public.enum_posts_status DEFAULT 'draft'::public.enum_posts_status
);

CREATE TABLE public.posts_blocks_download (
    _order integer NOT NULL,
    _parent_id integer NOT NULL,
    _path text NOT NULL,
    id character varying NOT NULL,
    media_id integer,
    label character varying,
    description character varying,
    source_id integer,
    block_name character varying
);

CREATE TABLE public.posts_blocks_embed (
    _order integer NOT NULL,
    _parent_id integer NOT NULL,
    _path text NOT NULL,
    id character varying NOT NULL,
    snippet_id integer,
    title character varying,
    height numeric DEFAULT 420,
    caption character varying,
    source_id integer,
    block_name character varying
);

CREATE TABLE public.posts_blocks_image (
    _order integer NOT NULL,
    _parent_id integer NOT NULL,
    _path text NOT NULL,
    id character varying NOT NULL,
    media_id integer,
    alt character varying,
    caption character varying,
    source_id integer,
    block_name character varying
);

CREATE TABLE public.posts_blocks_link (
    _order integer NOT NULL,
    _parent_id integer NOT NULL,
    _path text NOT NULL,
    id character varying NOT NULL,
    url character varying,
    label character varying,
    description character varying,
    source_id integer,
    block_name character varying
);

CREATE TABLE public.posts_blocks_rich_text (
    _order integer NOT NULL,
    _parent_id integer NOT NULL,
    _path text NOT NULL,
    id character varying NOT NULL,
    body jsonb,
    block_name character varying
);

CREATE TABLE public.posts_blocks_video (
    _order integer NOT NULL,
    _parent_id integer NOT NULL,
    _path text NOT NULL,
    id character varying NOT NULL,
    source_type public.enum_posts_blocks_video_source_type DEFAULT 'upload'::public.enum_posts_blocks_video_source_type,
    media_id integer,
    url character varying,
    poster_id integer,
    transcript character varying,
    caption character varying,
    source_id integer,
    block_name character varying
);

CREATE SEQUENCE public.posts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.posts_id_seq OWNED BY public.posts.id;

CREATE TABLE public.posts_rels (
    id integer NOT NULL,
    "order" integer,
    parent_id integer NOT NULL,
    path character varying NOT NULL,
    topics_id integer,
    sources_id integer
);

CREATE SEQUENCE public.posts_rels_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.posts_rels_id_seq OWNED BY public.posts_rels.id;

CREATE TABLE public.posts_slides (
    _order integer NOT NULL,
    _parent_id integer NOT NULL,
    id character varying NOT NULL,
    title character varying,
    layout public.enum_posts_slides_layout DEFAULT 'stacked'::public.enum_posts_slides_layout
);

CREATE TABLE public.site_settings (
    id integer NOT NULL,
    title character varying DEFAULT 'Human / Computer'::character varying NOT NULL,
    description character varying DEFAULT 'A field journal of interfaces, interactions, and the evidence behind them.'::character varying,
    logo_id integer,
    updated_at timestamp(3) with time zone,
    created_at timestamp(3) with time zone,
    time_zone character varying DEFAULT 'America/Chicago'::character varying NOT NULL
);

CREATE SEQUENCE public.site_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.site_settings_id_seq OWNED BY public.site_settings.id;

CREATE TABLE public.site_settings_navigation (
    _order integer NOT NULL,
    _parent_id integer NOT NULL,
    id character varying NOT NULL,
    label character varying NOT NULL,
    href character varying NOT NULL
);

CREATE TABLE public.snippets (
    id integer NOT NULL,
    title character varying,
    description character varying,
    storage_prefix character varying,
    bundle_version character varying,
    entry_file character varying,
    manifest jsonb,
    updated_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    created_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    _status public.enum_snippets_status DEFAULT 'draft'::public.enum_snippets_status
);

CREATE SEQUENCE public.snippets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.snippets_id_seq OWNED BY public.snippets.id;

CREATE TABLE public.sources (
    id integer NOT NULL,
    title character varying,
    url character varying,
    publisher character varying,
    author character varying,
    published_at timestamp(3) with time zone,
    accessed_at timestamp(3) with time zone,
    archive_u_r_l character varying,
    notes character varying,
    updated_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    created_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    _status public.enum_sources_status DEFAULT 'draft'::public.enum_sources_status
);

CREATE SEQUENCE public.sources_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.sources_id_seq OWNED BY public.sources.id;

CREATE TABLE public.topics (
    id integer NOT NULL,
    title character varying NOT NULL,
    slug character varying NOT NULL,
    description character varying,
    updated_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    created_at timestamp(3) with time zone DEFAULT now() NOT NULL
);

CREATE SEQUENCE public.topics_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.topics_id_seq OWNED BY public.topics.id;

CREATE TABLE public.users (
    id integer NOT NULL,
    name character varying NOT NULL,
    role public.enum_users_role DEFAULT 'editor'::public.enum_users_role NOT NULL,
    updated_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    created_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    email character varying NOT NULL,
    reset_password_token character varying,
    reset_password_expiration timestamp(3) with time zone,
    salt character varying,
    hash character varying,
    reset_password_requested_at timestamp(3) with time zone,
    login_attempts numeric DEFAULT 0,
    lock_until timestamp(3) with time zone
);

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;

CREATE TABLE public.users_sessions (
    _order integer NOT NULL,
    _parent_id integer NOT NULL,
    id character varying NOT NULL,
    created_at timestamp(3) with time zone,
    expires_at timestamp(3) with time zone NOT NULL
);

ALTER TABLE ONLY public._posts_v ALTER COLUMN id SET DEFAULT nextval('public._posts_v_id_seq'::regclass);

ALTER TABLE ONLY public._posts_v_blocks_download ALTER COLUMN id SET DEFAULT nextval('public._posts_v_blocks_download_id_seq'::regclass);

ALTER TABLE ONLY public._posts_v_blocks_embed ALTER COLUMN id SET DEFAULT nextval('public._posts_v_blocks_embed_id_seq'::regclass);

ALTER TABLE ONLY public._posts_v_blocks_image ALTER COLUMN id SET DEFAULT nextval('public._posts_v_blocks_image_id_seq'::regclass);

ALTER TABLE ONLY public._posts_v_blocks_link ALTER COLUMN id SET DEFAULT nextval('public._posts_v_blocks_link_id_seq'::regclass);

ALTER TABLE ONLY public._posts_v_blocks_rich_text ALTER COLUMN id SET DEFAULT nextval('public._posts_v_blocks_rich_text_id_seq'::regclass);

ALTER TABLE ONLY public._posts_v_blocks_video ALTER COLUMN id SET DEFAULT nextval('public._posts_v_blocks_video_id_seq'::regclass);

ALTER TABLE ONLY public._posts_v_rels ALTER COLUMN id SET DEFAULT nextval('public._posts_v_rels_id_seq'::regclass);

ALTER TABLE ONLY public._posts_v_version_slides ALTER COLUMN id SET DEFAULT nextval('public._posts_v_version_slides_id_seq'::regclass);

ALTER TABLE ONLY public._snippets_v ALTER COLUMN id SET DEFAULT nextval('public._snippets_v_id_seq'::regclass);

ALTER TABLE ONLY public._sources_v ALTER COLUMN id SET DEFAULT nextval('public._sources_v_id_seq'::regclass);

ALTER TABLE ONLY public.media ALTER COLUMN id SET DEFAULT nextval('public.media_id_seq'::regclass);

ALTER TABLE ONLY public.payload_kv ALTER COLUMN id SET DEFAULT nextval('public.payload_kv_id_seq'::regclass);

ALTER TABLE ONLY public.payload_locked_documents ALTER COLUMN id SET DEFAULT nextval('public.payload_locked_documents_id_seq'::regclass);

ALTER TABLE ONLY public.payload_locked_documents_rels ALTER COLUMN id SET DEFAULT nextval('public.payload_locked_documents_rels_id_seq'::regclass);

ALTER TABLE ONLY public.payload_migrations ALTER COLUMN id SET DEFAULT nextval('public.payload_migrations_id_seq'::regclass);

ALTER TABLE ONLY public.payload_preferences ALTER COLUMN id SET DEFAULT nextval('public.payload_preferences_id_seq'::regclass);

ALTER TABLE ONLY public.payload_preferences_rels ALTER COLUMN id SET DEFAULT nextval('public.payload_preferences_rels_id_seq'::regclass);

ALTER TABLE ONLY public.posts ALTER COLUMN id SET DEFAULT nextval('public.posts_id_seq'::regclass);

ALTER TABLE ONLY public.posts_rels ALTER COLUMN id SET DEFAULT nextval('public.posts_rels_id_seq'::regclass);

ALTER TABLE ONLY public.site_settings ALTER COLUMN id SET DEFAULT nextval('public.site_settings_id_seq'::regclass);

ALTER TABLE ONLY public.snippets ALTER COLUMN id SET DEFAULT nextval('public.snippets_id_seq'::regclass);

ALTER TABLE ONLY public.sources ALTER COLUMN id SET DEFAULT nextval('public.sources_id_seq'::regclass);

ALTER TABLE ONLY public.topics ALTER COLUMN id SET DEFAULT nextval('public.topics_id_seq'::regclass);

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);

ALTER TABLE ONLY public._posts_v_blocks_download
    ADD CONSTRAINT _posts_v_blocks_download_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public._posts_v_blocks_embed
    ADD CONSTRAINT _posts_v_blocks_embed_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public._posts_v_blocks_image
    ADD CONSTRAINT _posts_v_blocks_image_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public._posts_v_blocks_link
    ADD CONSTRAINT _posts_v_blocks_link_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public._posts_v_blocks_rich_text
    ADD CONSTRAINT _posts_v_blocks_rich_text_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public._posts_v_blocks_video
    ADD CONSTRAINT _posts_v_blocks_video_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public._posts_v
    ADD CONSTRAINT _posts_v_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public._posts_v_rels
    ADD CONSTRAINT _posts_v_rels_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public._posts_v_version_slides
    ADD CONSTRAINT _posts_v_version_slides_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public._snippets_v
    ADD CONSTRAINT _snippets_v_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public._sources_v
    ADD CONSTRAINT _sources_v_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.hci_migration_checksums
    ADD CONSTRAINT hci_migration_checksums_pkey PRIMARY KEY (name);

ALTER TABLE ONLY public.media
    ADD CONSTRAINT media_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.payload_kv
    ADD CONSTRAINT payload_kv_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.payload_locked_documents
    ADD CONSTRAINT payload_locked_documents_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.payload_locked_documents_rels
    ADD CONSTRAINT payload_locked_documents_rels_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.payload_migrations
    ADD CONSTRAINT payload_migrations_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.payload_preferences
    ADD CONSTRAINT payload_preferences_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.payload_preferences_rels
    ADD CONSTRAINT payload_preferences_rels_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.posts_blocks_download
    ADD CONSTRAINT posts_blocks_download_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.posts_blocks_embed
    ADD CONSTRAINT posts_blocks_embed_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.posts_blocks_image
    ADD CONSTRAINT posts_blocks_image_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.posts_blocks_link
    ADD CONSTRAINT posts_blocks_link_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.posts_blocks_rich_text
    ADD CONSTRAINT posts_blocks_rich_text_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.posts_blocks_video
    ADD CONSTRAINT posts_blocks_video_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.posts_rels
    ADD CONSTRAINT posts_rels_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.posts_slides
    ADD CONSTRAINT posts_slides_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.site_settings_navigation
    ADD CONSTRAINT site_settings_navigation_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.site_settings
    ADD CONSTRAINT site_settings_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.snippets
    ADD CONSTRAINT snippets_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.sources
    ADD CONSTRAINT sources_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.topics
    ADD CONSTRAINT topics_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.users_sessions
    ADD CONSTRAINT users_sessions_pkey PRIMARY KEY (id);

CREATE INDEX _posts_v_autosave_idx ON public._posts_v USING btree (autosave);

CREATE INDEX _posts_v_blocks_download_media_idx ON public._posts_v_blocks_download USING btree (media_id);

CREATE INDEX _posts_v_blocks_download_order_idx ON public._posts_v_blocks_download USING btree (_order);

CREATE INDEX _posts_v_blocks_download_parent_id_idx ON public._posts_v_blocks_download USING btree (_parent_id);

CREATE INDEX _posts_v_blocks_download_path_idx ON public._posts_v_blocks_download USING btree (_path);

CREATE INDEX _posts_v_blocks_download_source_idx ON public._posts_v_blocks_download USING btree (source_id);

CREATE INDEX _posts_v_blocks_embed_order_idx ON public._posts_v_blocks_embed USING btree (_order);

CREATE INDEX _posts_v_blocks_embed_parent_id_idx ON public._posts_v_blocks_embed USING btree (_parent_id);

CREATE INDEX _posts_v_blocks_embed_path_idx ON public._posts_v_blocks_embed USING btree (_path);

CREATE INDEX _posts_v_blocks_embed_snippet_idx ON public._posts_v_blocks_embed USING btree (snippet_id);

CREATE INDEX _posts_v_blocks_embed_source_idx ON public._posts_v_blocks_embed USING btree (source_id);

CREATE INDEX _posts_v_blocks_image_media_idx ON public._posts_v_blocks_image USING btree (media_id);

CREATE INDEX _posts_v_blocks_image_order_idx ON public._posts_v_blocks_image USING btree (_order);

CREATE INDEX _posts_v_blocks_image_parent_id_idx ON public._posts_v_blocks_image USING btree (_parent_id);

CREATE INDEX _posts_v_blocks_image_path_idx ON public._posts_v_blocks_image USING btree (_path);

CREATE INDEX _posts_v_blocks_image_source_idx ON public._posts_v_blocks_image USING btree (source_id);

CREATE INDEX _posts_v_blocks_link_order_idx ON public._posts_v_blocks_link USING btree (_order);

CREATE INDEX _posts_v_blocks_link_parent_id_idx ON public._posts_v_blocks_link USING btree (_parent_id);

CREATE INDEX _posts_v_blocks_link_path_idx ON public._posts_v_blocks_link USING btree (_path);

CREATE INDEX _posts_v_blocks_link_source_idx ON public._posts_v_blocks_link USING btree (source_id);

CREATE INDEX _posts_v_blocks_rich_text_order_idx ON public._posts_v_blocks_rich_text USING btree (_order);

CREATE INDEX _posts_v_blocks_rich_text_parent_id_idx ON public._posts_v_blocks_rich_text USING btree (_parent_id);

CREATE INDEX _posts_v_blocks_rich_text_path_idx ON public._posts_v_blocks_rich_text USING btree (_path);

CREATE INDEX _posts_v_blocks_video_media_idx ON public._posts_v_blocks_video USING btree (media_id);

CREATE INDEX _posts_v_blocks_video_order_idx ON public._posts_v_blocks_video USING btree (_order);

CREATE INDEX _posts_v_blocks_video_parent_id_idx ON public._posts_v_blocks_video USING btree (_parent_id);

CREATE INDEX _posts_v_blocks_video_path_idx ON public._posts_v_blocks_video USING btree (_path);

CREATE INDEX _posts_v_blocks_video_poster_idx ON public._posts_v_blocks_video USING btree (poster_id);

CREATE INDEX _posts_v_blocks_video_source_idx ON public._posts_v_blocks_video USING btree (source_id);

CREATE INDEX _posts_v_created_at_idx ON public._posts_v USING btree (created_at);

CREATE INDEX _posts_v_latest_idx ON public._posts_v USING btree (latest);

CREATE INDEX _posts_v_parent_idx ON public._posts_v USING btree (parent_id);

CREATE INDEX _posts_v_rels_order_idx ON public._posts_v_rels USING btree ("order");

CREATE INDEX _posts_v_rels_parent_idx ON public._posts_v_rels USING btree (parent_id);

CREATE INDEX _posts_v_rels_path_idx ON public._posts_v_rels USING btree (path);

CREATE INDEX _posts_v_rels_sources_id_idx ON public._posts_v_rels USING btree (sources_id);

CREATE INDEX _posts_v_rels_topics_id_idx ON public._posts_v_rels USING btree (topics_id);

CREATE INDEX _posts_v_updated_at_idx ON public._posts_v USING btree (updated_at);

CREATE INDEX _posts_v_version_featured_image_version_featured_image_m_idx ON public._posts_v USING btree (version_featured_image_media_id);

CREATE INDEX _posts_v_version_featured_image_version_featured_image_s_idx ON public._posts_v USING btree (version_featured_image_source_id);

CREATE INDEX _posts_v_version_featured_video_version_featured_video_m_idx ON public._posts_v USING btree (version_featured_video_media_id);

CREATE INDEX _posts_v_version_featured_video_version_featured_video_p_idx ON public._posts_v USING btree (version_featured_video_poster_id);

CREATE INDEX _posts_v_version_featured_video_version_featured_video_s_idx ON public._posts_v USING btree (version_featured_video_source_id);

CREATE INDEX _posts_v_version_slides_order_idx ON public._posts_v_version_slides USING btree (_order);

CREATE INDEX _posts_v_version_slides_parent_id_idx ON public._posts_v_version_slides USING btree (_parent_id);

CREATE INDEX _posts_v_version_version__status_idx ON public._posts_v USING btree (version__status);

CREATE INDEX _posts_v_version_version_author_idx ON public._posts_v USING btree (version_author_id);

CREATE INDEX _posts_v_version_version_created_at_idx ON public._posts_v USING btree (version_created_at);

CREATE INDEX _posts_v_version_version_featured_snippet_idx ON public._posts_v USING btree (version_featured_snippet_id);

CREATE INDEX _posts_v_version_version_published_at_idx ON public._posts_v USING btree (version_published_at);

CREATE INDEX _posts_v_version_version_slug_idx ON public._posts_v USING btree (version_slug);

CREATE INDEX _posts_v_version_version_updated_at_idx ON public._posts_v USING btree (version_updated_at);

CREATE INDEX _snippets_v_created_at_idx ON public._snippets_v USING btree (created_at);

CREATE INDEX _snippets_v_latest_idx ON public._snippets_v USING btree (latest);

CREATE INDEX _snippets_v_parent_idx ON public._snippets_v USING btree (parent_id);

CREATE INDEX _snippets_v_updated_at_idx ON public._snippets_v USING btree (updated_at);

CREATE INDEX _snippets_v_version_version__status_idx ON public._snippets_v USING btree (version__status);

CREATE INDEX _snippets_v_version_version_created_at_idx ON public._snippets_v USING btree (version_created_at);

CREATE INDEX _snippets_v_version_version_storage_prefix_idx ON public._snippets_v USING btree (version_storage_prefix);

CREATE INDEX _snippets_v_version_version_updated_at_idx ON public._snippets_v USING btree (version_updated_at);

CREATE INDEX _sources_v_created_at_idx ON public._sources_v USING btree (created_at);

CREATE INDEX _sources_v_latest_idx ON public._sources_v USING btree (latest);

CREATE INDEX _sources_v_parent_idx ON public._sources_v USING btree (parent_id);

CREATE INDEX _sources_v_updated_at_idx ON public._sources_v USING btree (updated_at);

CREATE INDEX _sources_v_version_version__status_idx ON public._sources_v USING btree (version__status);

CREATE INDEX _sources_v_version_version_created_at_idx ON public._sources_v USING btree (version_created_at);

CREATE INDEX _sources_v_version_version_updated_at_idx ON public._sources_v USING btree (version_updated_at);

CREATE INDEX media_created_at_idx ON public.media USING btree (created_at);

CREATE UNIQUE INDEX media_filename_idx ON public.media USING btree (filename);

CREATE INDEX media_sizes_card_sizes_card_filename_idx ON public.media USING btree (sizes_card_filename);

CREATE INDEX media_source_idx ON public.media USING btree (source_id);

CREATE INDEX media_updated_at_idx ON public.media USING btree (updated_at);

CREATE UNIQUE INDEX payload_kv_key_idx ON public.payload_kv USING btree (key);

CREATE INDEX payload_locked_documents_created_at_idx ON public.payload_locked_documents USING btree (created_at);

CREATE INDEX payload_locked_documents_global_slug_idx ON public.payload_locked_documents USING btree (global_slug);

CREATE INDEX payload_locked_documents_rels_media_id_idx ON public.payload_locked_documents_rels USING btree (media_id);

CREATE INDEX payload_locked_documents_rels_order_idx ON public.payload_locked_documents_rels USING btree ("order");

CREATE INDEX payload_locked_documents_rels_parent_idx ON public.payload_locked_documents_rels USING btree (parent_id);

CREATE INDEX payload_locked_documents_rels_path_idx ON public.payload_locked_documents_rels USING btree (path);

CREATE INDEX payload_locked_documents_rels_posts_id_idx ON public.payload_locked_documents_rels USING btree (posts_id);

CREATE INDEX payload_locked_documents_rels_snippets_id_idx ON public.payload_locked_documents_rels USING btree (snippets_id);

CREATE INDEX payload_locked_documents_rels_sources_id_idx ON public.payload_locked_documents_rels USING btree (sources_id);

CREATE INDEX payload_locked_documents_rels_topics_id_idx ON public.payload_locked_documents_rels USING btree (topics_id);

CREATE INDEX payload_locked_documents_rels_users_id_idx ON public.payload_locked_documents_rels USING btree (users_id);

CREATE INDEX payload_locked_documents_updated_at_idx ON public.payload_locked_documents USING btree (updated_at);

CREATE INDEX payload_migrations_created_at_idx ON public.payload_migrations USING btree (created_at);

CREATE INDEX payload_migrations_updated_at_idx ON public.payload_migrations USING btree (updated_at);

CREATE INDEX payload_preferences_created_at_idx ON public.payload_preferences USING btree (created_at);

CREATE INDEX payload_preferences_key_idx ON public.payload_preferences USING btree (key);

CREATE INDEX payload_preferences_rels_order_idx ON public.payload_preferences_rels USING btree ("order");

CREATE INDEX payload_preferences_rels_parent_idx ON public.payload_preferences_rels USING btree (parent_id);

CREATE INDEX payload_preferences_rels_path_idx ON public.payload_preferences_rels USING btree (path);

CREATE INDEX payload_preferences_rels_users_id_idx ON public.payload_preferences_rels USING btree (users_id);

CREATE INDEX payload_preferences_updated_at_idx ON public.payload_preferences USING btree (updated_at);

CREATE INDEX posts__status_idx ON public.posts USING btree (_status);

CREATE INDEX posts_author_idx ON public.posts USING btree (author_id);

CREATE INDEX posts_blocks_download_media_idx ON public.posts_blocks_download USING btree (media_id);

CREATE INDEX posts_blocks_download_order_idx ON public.posts_blocks_download USING btree (_order);

CREATE INDEX posts_blocks_download_parent_id_idx ON public.posts_blocks_download USING btree (_parent_id);

CREATE INDEX posts_blocks_download_path_idx ON public.posts_blocks_download USING btree (_path);

CREATE INDEX posts_blocks_download_source_idx ON public.posts_blocks_download USING btree (source_id);

CREATE INDEX posts_blocks_embed_order_idx ON public.posts_blocks_embed USING btree (_order);

CREATE INDEX posts_blocks_embed_parent_id_idx ON public.posts_blocks_embed USING btree (_parent_id);

CREATE INDEX posts_blocks_embed_path_idx ON public.posts_blocks_embed USING btree (_path);

CREATE INDEX posts_blocks_embed_snippet_idx ON public.posts_blocks_embed USING btree (snippet_id);

CREATE INDEX posts_blocks_embed_source_idx ON public.posts_blocks_embed USING btree (source_id);

CREATE INDEX posts_blocks_image_media_idx ON public.posts_blocks_image USING btree (media_id);

CREATE INDEX posts_blocks_image_order_idx ON public.posts_blocks_image USING btree (_order);

CREATE INDEX posts_blocks_image_parent_id_idx ON public.posts_blocks_image USING btree (_parent_id);

CREATE INDEX posts_blocks_image_path_idx ON public.posts_blocks_image USING btree (_path);

CREATE INDEX posts_blocks_image_source_idx ON public.posts_blocks_image USING btree (source_id);

CREATE INDEX posts_blocks_link_order_idx ON public.posts_blocks_link USING btree (_order);

CREATE INDEX posts_blocks_link_parent_id_idx ON public.posts_blocks_link USING btree (_parent_id);

CREATE INDEX posts_blocks_link_path_idx ON public.posts_blocks_link USING btree (_path);

CREATE INDEX posts_blocks_link_source_idx ON public.posts_blocks_link USING btree (source_id);

CREATE INDEX posts_blocks_rich_text_order_idx ON public.posts_blocks_rich_text USING btree (_order);

CREATE INDEX posts_blocks_rich_text_parent_id_idx ON public.posts_blocks_rich_text USING btree (_parent_id);

CREATE INDEX posts_blocks_rich_text_path_idx ON public.posts_blocks_rich_text USING btree (_path);

CREATE INDEX posts_blocks_video_media_idx ON public.posts_blocks_video USING btree (media_id);

CREATE INDEX posts_blocks_video_order_idx ON public.posts_blocks_video USING btree (_order);

CREATE INDEX posts_blocks_video_parent_id_idx ON public.posts_blocks_video USING btree (_parent_id);

CREATE INDEX posts_blocks_video_path_idx ON public.posts_blocks_video USING btree (_path);

CREATE INDEX posts_blocks_video_poster_idx ON public.posts_blocks_video USING btree (poster_id);

CREATE INDEX posts_blocks_video_source_idx ON public.posts_blocks_video USING btree (source_id);

CREATE INDEX posts_created_at_idx ON public.posts USING btree (created_at);

CREATE INDEX posts_featured_image_featured_image_media_idx ON public.posts USING btree (featured_image_media_id);

CREATE INDEX posts_featured_image_featured_image_source_idx ON public.posts USING btree (featured_image_source_id);

CREATE INDEX posts_featured_snippet_idx ON public.posts USING btree (featured_snippet_id);

CREATE INDEX posts_featured_video_featured_video_media_idx ON public.posts USING btree (featured_video_media_id);

CREATE INDEX posts_featured_video_featured_video_poster_idx ON public.posts USING btree (featured_video_poster_id);

CREATE INDEX posts_featured_video_featured_video_source_idx ON public.posts USING btree (featured_video_source_id);

CREATE INDEX posts_published_at_idx ON public.posts USING btree (published_at);

CREATE INDEX posts_rels_order_idx ON public.posts_rels USING btree ("order");

CREATE INDEX posts_rels_parent_idx ON public.posts_rels USING btree (parent_id);

CREATE INDEX posts_rels_path_idx ON public.posts_rels USING btree (path);

CREATE INDEX posts_rels_sources_id_idx ON public.posts_rels USING btree (sources_id);

CREATE INDEX posts_rels_topics_id_idx ON public.posts_rels USING btree (topics_id);

CREATE INDEX posts_slides_order_idx ON public.posts_slides USING btree (_order);

CREATE INDEX posts_slides_parent_id_idx ON public.posts_slides USING btree (_parent_id);

CREATE UNIQUE INDEX posts_slug_idx ON public.posts USING btree (slug);

CREATE INDEX posts_updated_at_idx ON public.posts USING btree (updated_at);

CREATE INDEX site_settings_logo_idx ON public.site_settings USING btree (logo_id);

CREATE INDEX site_settings_navigation_order_idx ON public.site_settings_navigation USING btree (_order);

CREATE INDEX site_settings_navigation_parent_id_idx ON public.site_settings_navigation USING btree (_parent_id);

CREATE INDEX snippets__status_idx ON public.snippets USING btree (_status);

CREATE INDEX snippets_created_at_idx ON public.snippets USING btree (created_at);

CREATE UNIQUE INDEX snippets_storage_prefix_idx ON public.snippets USING btree (storage_prefix);

CREATE INDEX snippets_updated_at_idx ON public.snippets USING btree (updated_at);

CREATE INDEX sources__status_idx ON public.sources USING btree (_status);

CREATE INDEX sources_created_at_idx ON public.sources USING btree (created_at);

CREATE INDEX sources_updated_at_idx ON public.sources USING btree (updated_at);

CREATE INDEX topics_created_at_idx ON public.topics USING btree (created_at);

CREATE UNIQUE INDEX topics_slug_idx ON public.topics USING btree (slug);

CREATE INDEX topics_updated_at_idx ON public.topics USING btree (updated_at);

CREATE INDEX users_created_at_idx ON public.users USING btree (created_at);

CREATE UNIQUE INDEX users_email_idx ON public.users USING btree (email);

CREATE INDEX users_sessions_order_idx ON public.users_sessions USING btree (_order);

CREATE INDEX users_sessions_parent_id_idx ON public.users_sessions USING btree (_parent_id);

CREATE INDEX users_updated_at_idx ON public.users USING btree (updated_at);

ALTER TABLE ONLY public._posts_v_blocks_download
    ADD CONSTRAINT _posts_v_blocks_download_media_id_media_id_fk FOREIGN KEY (media_id) REFERENCES public.media(id) ON DELETE SET NULL;

ALTER TABLE ONLY public._posts_v_blocks_download
    ADD CONSTRAINT _posts_v_blocks_download_parent_id_fk FOREIGN KEY (_parent_id) REFERENCES public._posts_v(id) ON DELETE CASCADE;

ALTER TABLE ONLY public._posts_v_blocks_download
    ADD CONSTRAINT _posts_v_blocks_download_source_id_sources_id_fk FOREIGN KEY (source_id) REFERENCES public.sources(id) ON DELETE SET NULL;

ALTER TABLE ONLY public._posts_v_blocks_embed
    ADD CONSTRAINT _posts_v_blocks_embed_parent_id_fk FOREIGN KEY (_parent_id) REFERENCES public._posts_v(id) ON DELETE CASCADE;

ALTER TABLE ONLY public._posts_v_blocks_embed
    ADD CONSTRAINT _posts_v_blocks_embed_snippet_id_snippets_id_fk FOREIGN KEY (snippet_id) REFERENCES public.snippets(id) ON DELETE SET NULL;

ALTER TABLE ONLY public._posts_v_blocks_embed
    ADD CONSTRAINT _posts_v_blocks_embed_source_id_sources_id_fk FOREIGN KEY (source_id) REFERENCES public.sources(id) ON DELETE SET NULL;

ALTER TABLE ONLY public._posts_v_blocks_image
    ADD CONSTRAINT _posts_v_blocks_image_media_id_media_id_fk FOREIGN KEY (media_id) REFERENCES public.media(id) ON DELETE SET NULL;

ALTER TABLE ONLY public._posts_v_blocks_image
    ADD CONSTRAINT _posts_v_blocks_image_parent_id_fk FOREIGN KEY (_parent_id) REFERENCES public._posts_v(id) ON DELETE CASCADE;

ALTER TABLE ONLY public._posts_v_blocks_image
    ADD CONSTRAINT _posts_v_blocks_image_source_id_sources_id_fk FOREIGN KEY (source_id) REFERENCES public.sources(id) ON DELETE SET NULL;

ALTER TABLE ONLY public._posts_v_blocks_link
    ADD CONSTRAINT _posts_v_blocks_link_parent_id_fk FOREIGN KEY (_parent_id) REFERENCES public._posts_v(id) ON DELETE CASCADE;

ALTER TABLE ONLY public._posts_v_blocks_link
    ADD CONSTRAINT _posts_v_blocks_link_source_id_sources_id_fk FOREIGN KEY (source_id) REFERENCES public.sources(id) ON DELETE SET NULL;

ALTER TABLE ONLY public._posts_v_blocks_rich_text
    ADD CONSTRAINT _posts_v_blocks_rich_text_parent_id_fk FOREIGN KEY (_parent_id) REFERENCES public._posts_v(id) ON DELETE CASCADE;

ALTER TABLE ONLY public._posts_v_blocks_video
    ADD CONSTRAINT _posts_v_blocks_video_media_id_media_id_fk FOREIGN KEY (media_id) REFERENCES public.media(id) ON DELETE SET NULL;

ALTER TABLE ONLY public._posts_v_blocks_video
    ADD CONSTRAINT _posts_v_blocks_video_parent_id_fk FOREIGN KEY (_parent_id) REFERENCES public._posts_v(id) ON DELETE CASCADE;

ALTER TABLE ONLY public._posts_v_blocks_video
    ADD CONSTRAINT _posts_v_blocks_video_poster_id_media_id_fk FOREIGN KEY (poster_id) REFERENCES public.media(id) ON DELETE SET NULL;

ALTER TABLE ONLY public._posts_v_blocks_video
    ADD CONSTRAINT _posts_v_blocks_video_source_id_sources_id_fk FOREIGN KEY (source_id) REFERENCES public.sources(id) ON DELETE SET NULL;

ALTER TABLE ONLY public._posts_v
    ADD CONSTRAINT _posts_v_parent_id_posts_id_fk FOREIGN KEY (parent_id) REFERENCES public.posts(id) ON DELETE SET NULL;

ALTER TABLE ONLY public._posts_v_rels
    ADD CONSTRAINT _posts_v_rels_parent_fk FOREIGN KEY (parent_id) REFERENCES public._posts_v(id) ON DELETE CASCADE;

ALTER TABLE ONLY public._posts_v_rels
    ADD CONSTRAINT _posts_v_rels_sources_fk FOREIGN KEY (sources_id) REFERENCES public.sources(id) ON DELETE CASCADE;

ALTER TABLE ONLY public._posts_v_rels
    ADD CONSTRAINT _posts_v_rels_topics_fk FOREIGN KEY (topics_id) REFERENCES public.topics(id) ON DELETE CASCADE;

ALTER TABLE ONLY public._posts_v
    ADD CONSTRAINT _posts_v_version_author_id_users_id_fk FOREIGN KEY (version_author_id) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE ONLY public._posts_v
    ADD CONSTRAINT _posts_v_version_featured_image_media_id_media_id_fk FOREIGN KEY (version_featured_image_media_id) REFERENCES public.media(id) ON DELETE SET NULL;

ALTER TABLE ONLY public._posts_v
    ADD CONSTRAINT _posts_v_version_featured_image_source_id_sources_id_fk FOREIGN KEY (version_featured_image_source_id) REFERENCES public.sources(id) ON DELETE SET NULL;

ALTER TABLE ONLY public._posts_v
    ADD CONSTRAINT _posts_v_version_featured_snippet_id_snippets_id_fk FOREIGN KEY (version_featured_snippet_id) REFERENCES public.snippets(id) ON DELETE SET NULL;

ALTER TABLE ONLY public._posts_v
    ADD CONSTRAINT _posts_v_version_featured_video_media_id_media_id_fk FOREIGN KEY (version_featured_video_media_id) REFERENCES public.media(id) ON DELETE SET NULL;

ALTER TABLE ONLY public._posts_v
    ADD CONSTRAINT _posts_v_version_featured_video_poster_id_media_id_fk FOREIGN KEY (version_featured_video_poster_id) REFERENCES public.media(id) ON DELETE SET NULL;

ALTER TABLE ONLY public._posts_v
    ADD CONSTRAINT _posts_v_version_featured_video_source_id_sources_id_fk FOREIGN KEY (version_featured_video_source_id) REFERENCES public.sources(id) ON DELETE SET NULL;

ALTER TABLE ONLY public._posts_v_version_slides
    ADD CONSTRAINT _posts_v_version_slides_parent_id_fk FOREIGN KEY (_parent_id) REFERENCES public._posts_v(id) ON DELETE CASCADE;

ALTER TABLE ONLY public._snippets_v
    ADD CONSTRAINT _snippets_v_parent_id_snippets_id_fk FOREIGN KEY (parent_id) REFERENCES public.snippets(id) ON DELETE SET NULL;

ALTER TABLE ONLY public._sources_v
    ADD CONSTRAINT _sources_v_parent_id_sources_id_fk FOREIGN KEY (parent_id) REFERENCES public.sources(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.media
    ADD CONSTRAINT media_source_id_sources_id_fk FOREIGN KEY (source_id) REFERENCES public.sources(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.payload_locked_documents_rels
    ADD CONSTRAINT payload_locked_documents_rels_media_fk FOREIGN KEY (media_id) REFERENCES public.media(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.payload_locked_documents_rels
    ADD CONSTRAINT payload_locked_documents_rels_parent_fk FOREIGN KEY (parent_id) REFERENCES public.payload_locked_documents(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.payload_locked_documents_rels
    ADD CONSTRAINT payload_locked_documents_rels_posts_fk FOREIGN KEY (posts_id) REFERENCES public.posts(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.payload_locked_documents_rels
    ADD CONSTRAINT payload_locked_documents_rels_snippets_fk FOREIGN KEY (snippets_id) REFERENCES public.snippets(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.payload_locked_documents_rels
    ADD CONSTRAINT payload_locked_documents_rels_sources_fk FOREIGN KEY (sources_id) REFERENCES public.sources(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.payload_locked_documents_rels
    ADD CONSTRAINT payload_locked_documents_rels_topics_fk FOREIGN KEY (topics_id) REFERENCES public.topics(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.payload_locked_documents_rels
    ADD CONSTRAINT payload_locked_documents_rels_users_fk FOREIGN KEY (users_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.payload_preferences_rels
    ADD CONSTRAINT payload_preferences_rels_parent_fk FOREIGN KEY (parent_id) REFERENCES public.payload_preferences(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.payload_preferences_rels
    ADD CONSTRAINT payload_preferences_rels_users_fk FOREIGN KEY (users_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_author_id_users_id_fk FOREIGN KEY (author_id) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.posts_blocks_download
    ADD CONSTRAINT posts_blocks_download_media_id_media_id_fk FOREIGN KEY (media_id) REFERENCES public.media(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.posts_blocks_download
    ADD CONSTRAINT posts_blocks_download_parent_id_fk FOREIGN KEY (_parent_id) REFERENCES public.posts(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.posts_blocks_download
    ADD CONSTRAINT posts_blocks_download_source_id_sources_id_fk FOREIGN KEY (source_id) REFERENCES public.sources(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.posts_blocks_embed
    ADD CONSTRAINT posts_blocks_embed_parent_id_fk FOREIGN KEY (_parent_id) REFERENCES public.posts(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.posts_blocks_embed
    ADD CONSTRAINT posts_blocks_embed_snippet_id_snippets_id_fk FOREIGN KEY (snippet_id) REFERENCES public.snippets(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.posts_blocks_embed
    ADD CONSTRAINT posts_blocks_embed_source_id_sources_id_fk FOREIGN KEY (source_id) REFERENCES public.sources(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.posts_blocks_image
    ADD CONSTRAINT posts_blocks_image_media_id_media_id_fk FOREIGN KEY (media_id) REFERENCES public.media(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.posts_blocks_image
    ADD CONSTRAINT posts_blocks_image_parent_id_fk FOREIGN KEY (_parent_id) REFERENCES public.posts(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.posts_blocks_image
    ADD CONSTRAINT posts_blocks_image_source_id_sources_id_fk FOREIGN KEY (source_id) REFERENCES public.sources(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.posts_blocks_link
    ADD CONSTRAINT posts_blocks_link_parent_id_fk FOREIGN KEY (_parent_id) REFERENCES public.posts(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.posts_blocks_link
    ADD CONSTRAINT posts_blocks_link_source_id_sources_id_fk FOREIGN KEY (source_id) REFERENCES public.sources(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.posts_blocks_rich_text
    ADD CONSTRAINT posts_blocks_rich_text_parent_id_fk FOREIGN KEY (_parent_id) REFERENCES public.posts(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.posts_blocks_video
    ADD CONSTRAINT posts_blocks_video_media_id_media_id_fk FOREIGN KEY (media_id) REFERENCES public.media(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.posts_blocks_video
    ADD CONSTRAINT posts_blocks_video_parent_id_fk FOREIGN KEY (_parent_id) REFERENCES public.posts(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.posts_blocks_video
    ADD CONSTRAINT posts_blocks_video_poster_id_media_id_fk FOREIGN KEY (poster_id) REFERENCES public.media(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.posts_blocks_video
    ADD CONSTRAINT posts_blocks_video_source_id_sources_id_fk FOREIGN KEY (source_id) REFERENCES public.sources(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_featured_image_media_id_media_id_fk FOREIGN KEY (featured_image_media_id) REFERENCES public.media(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_featured_image_source_id_sources_id_fk FOREIGN KEY (featured_image_source_id) REFERENCES public.sources(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_featured_snippet_id_snippets_id_fk FOREIGN KEY (featured_snippet_id) REFERENCES public.snippets(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_featured_video_media_id_media_id_fk FOREIGN KEY (featured_video_media_id) REFERENCES public.media(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_featured_video_poster_id_media_id_fk FOREIGN KEY (featured_video_poster_id) REFERENCES public.media(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_featured_video_source_id_sources_id_fk FOREIGN KEY (featured_video_source_id) REFERENCES public.sources(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.posts_rels
    ADD CONSTRAINT posts_rels_parent_fk FOREIGN KEY (parent_id) REFERENCES public.posts(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.posts_rels
    ADD CONSTRAINT posts_rels_sources_fk FOREIGN KEY (sources_id) REFERENCES public.sources(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.posts_rels
    ADD CONSTRAINT posts_rels_topics_fk FOREIGN KEY (topics_id) REFERENCES public.topics(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.posts_slides
    ADD CONSTRAINT posts_slides_parent_id_fk FOREIGN KEY (_parent_id) REFERENCES public.posts(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.site_settings
    ADD CONSTRAINT site_settings_logo_id_media_id_fk FOREIGN KEY (logo_id) REFERENCES public.media(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.site_settings_navigation
    ADD CONSTRAINT site_settings_navigation_parent_id_fk FOREIGN KEY (_parent_id) REFERENCES public.site_settings(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.users_sessions
    ADD CONSTRAINT users_sessions_parent_id_fk FOREIGN KEY (_parent_id) REFERENCES public.users(id) ON DELETE CASCADE;
