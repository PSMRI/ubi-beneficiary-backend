--
-- PostgreSQL database dump
--

\restrict LgBdNyofSBRbAXwTEt6wRiiE8F1Nl43VE0CfQ1K0Vow0QLm3g9uxViYpbpP2FBo

-- Dumped from database version 17.5 (Debian 17.5-1.pgdg120+1)
-- Dumped by pg_dump version 17.6

-- Started on 2025-12-15 13:12:27 UTC

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

--
-- TOC entry 8 (class 2615 OID 21068)
-- Name: hdb_catalog; Type: SCHEMA; Schema: -; Owner: uba_user
--

CREATE SCHEMA hdb_catalog;


ALTER SCHEMA hdb_catalog OWNER TO uba_user;

--
-- TOC entry 3 (class 3079 OID 18538)
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- TOC entry 3681 (class 0 OID 0)
-- Dependencies: 3
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- TOC entry 2 (class 3079 OID 17378)
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- TOC entry 3682 (class 0 OID 0)
-- Dependencies: 2
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- TOC entry 301 (class 1255 OID 21069)
-- Name: gen_hasura_uuid(); Type: FUNCTION; Schema: hdb_catalog; Owner: uba_user
--

CREATE FUNCTION hdb_catalog.gen_hasura_uuid() RETURNS uuid
    LANGUAGE sql
    AS $$select gen_random_uuid()$$;


ALTER FUNCTION hdb_catalog.gen_hasura_uuid() OWNER TO uba_user;

--
-- TOC entry 302 (class 1255 OID 54842)
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: uba_user
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW."updatedAt" = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO uba_user;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 242 (class 1259 OID 21091)
-- Name: hdb_action_log; Type: TABLE; Schema: hdb_catalog; Owner: uba_user
--

CREATE TABLE hdb_catalog.hdb_action_log (
    id uuid DEFAULT hdb_catalog.gen_hasura_uuid() NOT NULL,
    action_name text,
    input_payload jsonb NOT NULL,
    request_headers jsonb NOT NULL,
    session_variables jsonb NOT NULL,
    response_payload jsonb,
    errors jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    response_received_at timestamp with time zone,
    status text NOT NULL,
    CONSTRAINT hdb_action_log_status_check CHECK ((status = ANY (ARRAY['created'::text, 'processing'::text, 'completed'::text, 'error'::text])))
);


ALTER TABLE hdb_catalog.hdb_action_log OWNER TO uba_user;

--
-- TOC entry 244 (class 1259 OID 21115)
-- Name: hdb_cron_event_invocation_logs; Type: TABLE; Schema: hdb_catalog; Owner: uba_user
--

CREATE TABLE hdb_catalog.hdb_cron_event_invocation_logs (
    id text DEFAULT hdb_catalog.gen_hasura_uuid() NOT NULL,
    event_id text,
    status integer,
    request json,
    response json,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE hdb_catalog.hdb_cron_event_invocation_logs OWNER TO uba_user;

--
-- TOC entry 243 (class 1259 OID 21101)
-- Name: hdb_cron_events; Type: TABLE; Schema: hdb_catalog; Owner: uba_user
--

CREATE TABLE hdb_catalog.hdb_cron_events (
    id text DEFAULT hdb_catalog.gen_hasura_uuid() NOT NULL,
    trigger_name text NOT NULL,
    scheduled_time timestamp with time zone NOT NULL,
    status text DEFAULT 'scheduled'::text NOT NULL,
    tries integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    next_retry_at timestamp with time zone,
    CONSTRAINT valid_status CHECK ((status = ANY (ARRAY['scheduled'::text, 'locked'::text, 'delivered'::text, 'error'::text, 'dead'::text])))
);


ALTER TABLE hdb_catalog.hdb_cron_events OWNER TO uba_user;

--
-- TOC entry 241 (class 1259 OID 21081)
-- Name: hdb_metadata; Type: TABLE; Schema: hdb_catalog; Owner: uba_user
--

CREATE TABLE hdb_catalog.hdb_metadata (
    id integer NOT NULL,
    metadata json NOT NULL,
    resource_version integer DEFAULT 1 NOT NULL
);


ALTER TABLE hdb_catalog.hdb_metadata OWNER TO uba_user;

--
-- TOC entry 246 (class 1259 OID 21143)
-- Name: hdb_scheduled_event_invocation_logs; Type: TABLE; Schema: hdb_catalog; Owner: uba_user
--

CREATE TABLE hdb_catalog.hdb_scheduled_event_invocation_logs (
    id text DEFAULT hdb_catalog.gen_hasura_uuid() NOT NULL,
    event_id text,
    status integer,
    request json,
    response json,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE hdb_catalog.hdb_scheduled_event_invocation_logs OWNER TO uba_user;

--
-- TOC entry 245 (class 1259 OID 21130)
-- Name: hdb_scheduled_events; Type: TABLE; Schema: hdb_catalog; Owner: uba_user
--

CREATE TABLE hdb_catalog.hdb_scheduled_events (
    id text DEFAULT hdb_catalog.gen_hasura_uuid() NOT NULL,
    webhook_conf json NOT NULL,
    scheduled_time timestamp with time zone NOT NULL,
    retry_conf json,
    payload json,
    header_conf json,
    status text DEFAULT 'scheduled'::text NOT NULL,
    tries integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    next_retry_at timestamp with time zone,
    comment text,
    CONSTRAINT valid_status CHECK ((status = ANY (ARRAY['scheduled'::text, 'locked'::text, 'delivered'::text, 'error'::text, 'dead'::text])))
);


ALTER TABLE hdb_catalog.hdb_scheduled_events OWNER TO uba_user;

--
-- TOC entry 247 (class 1259 OID 21157)
-- Name: hdb_schema_notifications; Type: TABLE; Schema: hdb_catalog; Owner: uba_user
--

CREATE TABLE hdb_catalog.hdb_schema_notifications (
    id integer NOT NULL,
    notification json NOT NULL,
    resource_version integer DEFAULT 1 NOT NULL,
    instance_id uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT hdb_schema_notifications_id_check CHECK ((id = 1))
);


ALTER TABLE hdb_catalog.hdb_schema_notifications OWNER TO uba_user;

--
-- TOC entry 240 (class 1259 OID 21070)
-- Name: hdb_version; Type: TABLE; Schema: hdb_catalog; Owner: uba_user
--

CREATE TABLE hdb_catalog.hdb_version (
    hasura_uuid uuid DEFAULT hdb_catalog.gen_hasura_uuid() NOT NULL,
    version text NOT NULL,
    upgraded_on timestamp with time zone NOT NULL,
    cli_state jsonb DEFAULT '{}'::jsonb NOT NULL,
    console_state jsonb DEFAULT '{}'::jsonb NOT NULL,
    ee_client_id text,
    ee_client_secret text
);


ALTER TABLE hdb_catalog.hdb_version OWNER TO uba_user;

--
-- TOC entry 220 (class 1259 OID 18640)
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: uba_user
--

CREATE TABLE public.audit_logs (
    id integer NOT NULL,
    "timestamp" timestamp with time zone NOT NULL,
    user_type character varying(50) NOT NULL,
    user_id uuid NOT NULL,
    action character varying(255) NOT NULL,
    action_data jsonb NOT NULL,
    old_data jsonb,
    new_data jsonb,
    log_transaction_text text,
    template text
);


ALTER TABLE public.audit_logs OWNER TO uba_user;

--
-- TOC entry 221 (class 1259 OID 18645)
-- Name: audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: uba_user
--

CREATE SEQUENCE public.audit_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.audit_logs_id_seq OWNER TO uba_user;

--
-- TOC entry 3683 (class 0 OID 0)
-- Dependencies: 221
-- Name: audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: uba_user
--

ALTER SEQUENCE public.audit_logs_id_seq OWNED BY public.audit_logs.id;


--
-- TOC entry 222 (class 1259 OID 18646)
-- Name: consent; Type: TABLE; Schema: public; Owner: uba_user
--

CREATE TABLE public.consent (
    id integer NOT NULL,
    user_id uuid NOT NULL,
    purpose character varying(255) NOT NULL,
    purpose_text text NOT NULL,
    accepted boolean NOT NULL,
    consent_date timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.consent OWNER TO uba_user;

--
-- TOC entry 223 (class 1259 OID 18652)
-- Name: consent_id_seq; Type: SEQUENCE; Schema: public; Owner: uba_user
--

CREATE SEQUENCE public.consent_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.consent_id_seq OWNER TO uba_user;

--
-- TOC entry 3684 (class 0 OID 0)
-- Dependencies: 223
-- Name: consent_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: uba_user
--

ALTER SEQUENCE public.consent_id_seq OWNED BY public.consent.id;


--
-- TOC entry 252 (class 1259 OID 462113)
-- Name: cron_state; Type: TABLE; Schema: public; Owner: uba_user
--

CREATE TABLE public.cron_state (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    cron_name character varying(100) NOT NULL,
    last_processed_to timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.cron_state OWNER TO uba_user;

--
-- TOC entry 3685 (class 0 OID 0)
-- Dependencies: 252
-- Name: TABLE cron_state; Type: COMMENT; Schema: public; Owner: uba_user
--

COMMENT ON TABLE public.cron_state IS 'Stores state for cron jobs including last processed timestamp';


--
-- TOC entry 251 (class 1259 OID 54821)
-- Name: fieldValues; Type: TABLE; Schema: public; Owner: uba_user
--

CREATE TABLE public."fieldValues" (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "itemId" uuid NOT NULL,
    "fieldId" uuid NOT NULL,
    value text,
    metadata jsonb,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public."fieldValues" OWNER TO uba_user;

--
-- TOC entry 3686 (class 0 OID 0)
-- Dependencies: 251
-- Name: TABLE "fieldValues"; Type: COMMENT; Schema: public; Owner: uba_user
--

COMMENT ON TABLE public."fieldValues" IS 'Stores the value of each custom field for a specific entity instance. The itemId is a generic reference that can point to a User, Cohort, etc.';


--
-- TOC entry 3687 (class 0 OID 0)
-- Dependencies: 251
-- Name: COLUMN "fieldValues".id; Type: COMMENT; Schema: public; Owner: uba_user
--

COMMENT ON COLUMN public."fieldValues".id IS 'Unique identifier for the field value (UUID v4 generated automatically on creation)';


--
-- TOC entry 3688 (class 0 OID 0)
-- Dependencies: 251
-- Name: COLUMN "fieldValues"."itemId"; Type: COMMENT; Schema: public; Owner: uba_user
--

COMMENT ON COLUMN public."fieldValues"."itemId" IS 'Generic entity instance ID (ID of the entity instance e.g., userId, cohortId, etc.)';


--
-- TOC entry 3689 (class 0 OID 0)
-- Dependencies: 251
-- Name: COLUMN "fieldValues"."fieldId"; Type: COMMENT; Schema: public; Owner: uba_user
--

COMMENT ON COLUMN public."fieldValues"."fieldId" IS 'Reference to the field definition (foreign key to the Field entity)';


--
-- TOC entry 3690 (class 0 OID 0)
-- Dependencies: 251
-- Name: COLUMN "fieldValues".value; Type: COMMENT; Schema: public; Owner: uba_user
--

COMMENT ON COLUMN public."fieldValues".value IS 'The field value (the actual value stored for this field instance)';


--
-- TOC entry 3691 (class 0 OID 0)
-- Dependencies: 251
-- Name: COLUMN "fieldValues".metadata; Type: COMMENT; Schema: public; Owner: uba_user
--

COMMENT ON COLUMN public."fieldValues".metadata IS 'Additional metadata for the field value (JSON object containing value-specific metadata)';


--
-- TOC entry 250 (class 1259 OID 54808)
-- Name: fields; Type: TABLE; Schema: public; Owner: uba_user
--

CREATE TABLE public.fields (
    "fieldId" uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    label character varying(255) NOT NULL,
    type character varying(50) NOT NULL,
    context character varying(50) NOT NULL,
    "contextType" character varying(100),
    ordering integer DEFAULT 0 NOT NULL,
    "isRequired" boolean DEFAULT false NOT NULL,
    "isHidden" boolean DEFAULT false NOT NULL,
    "fieldParams" jsonb,
    "fieldAttributes" jsonb,
    "sourceDetails" jsonb,
    "dependsOn" jsonb,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.fields OWNER TO uba_user;

--
-- TOC entry 3692 (class 0 OID 0)
-- Dependencies: 250
-- Name: TABLE fields; Type: COMMENT; Schema: public; Owner: uba_user
--

COMMENT ON TABLE public.fields IS 'Stores the definition/metadata of each custom field that can be associated with various entities like User, Cohort, etc.';


--
-- TOC entry 3693 (class 0 OID 0)
-- Dependencies: 250
-- Name: COLUMN fields."fieldId"; Type: COMMENT; Schema: public; Owner: uba_user
--

COMMENT ON COLUMN public.fields."fieldId" IS 'Unique identifier for the field (UUID v4 generated automatically on creation)';


--
-- TOC entry 3694 (class 0 OID 0)
-- Dependencies: 250
-- Name: COLUMN fields.name; Type: COMMENT; Schema: public; Owner: uba_user
--

COMMENT ON COLUMN public.fields.name IS 'Internal name of the field (machine-readable name for the field)';


--
-- TOC entry 3695 (class 0 OID 0)
-- Dependencies: 250
-- Name: COLUMN fields.label; Type: COMMENT; Schema: public; Owner: uba_user
--

COMMENT ON COLUMN public.fields.label IS 'Display label for the field (human-readable label shown in UI)';


--
-- TOC entry 3696 (class 0 OID 0)
-- Dependencies: 250
-- Name: COLUMN fields.type; Type: COMMENT; Schema: public; Owner: uba_user
--

COMMENT ON COLUMN public.fields.type IS 'Field data type (determines how the field value should be stored and validated)';


--
-- TOC entry 3697 (class 0 OID 0)
-- Dependencies: 250
-- Name: COLUMN fields.context; Type: COMMENT; Schema: public; Owner: uba_user
--

COMMENT ON COLUMN public.fields.context IS 'Entity context this field belongs to (defines which entity type this field can be associated with)';


--
-- TOC entry 3698 (class 0 OID 0)
-- Dependencies: 250
-- Name: COLUMN fields."contextType"; Type: COMMENT; Schema: public; Owner: uba_user
--

COMMENT ON COLUMN public.fields."contextType" IS 'Context subtype or role (optional subtype for more specific categorization)';


--
-- TOC entry 3699 (class 0 OID 0)
-- Dependencies: 250
-- Name: COLUMN fields.ordering; Type: COMMENT; Schema: public; Owner: uba_user
--

COMMENT ON COLUMN public.fields.ordering IS 'Display order for the field (used for ordering fields in UI)';


--
-- TOC entry 3700 (class 0 OID 0)
-- Dependencies: 250
-- Name: COLUMN fields."isRequired"; Type: COMMENT; Schema: public; Owner: uba_user
--

COMMENT ON COLUMN public.fields."isRequired" IS 'Whether the field is required (determines if the field must have a value)';


--
-- TOC entry 3701 (class 0 OID 0)
-- Dependencies: 250
-- Name: COLUMN fields."isHidden"; Type: COMMENT; Schema: public; Owner: uba_user
--

COMMENT ON COLUMN public.fields."isHidden" IS 'Whether the field is hidden from UI (controls field visibility in forms)';


--
-- TOC entry 3702 (class 0 OID 0)
-- Dependencies: 250
-- Name: COLUMN fields."fieldParams"; Type: COMMENT; Schema: public; Owner: uba_user
--

COMMENT ON COLUMN public.fields."fieldParams" IS 'Additional field parameters (JSON object containing field-specific configuration)';


--
-- TOC entry 3703 (class 0 OID 0)
-- Dependencies: 250
-- Name: COLUMN fields."fieldAttributes"; Type: COMMENT; Schema: public; Owner: uba_user
--

COMMENT ON COLUMN public.fields."fieldAttributes" IS 'Field attributes and metadata (additional attributes like isEditable, isEncrypted, etc.)';


--
-- TOC entry 3704 (class 0 OID 0)
-- Dependencies: 250
-- Name: COLUMN fields."sourceDetails"; Type: COMMENT; Schema: public; Owner: uba_user
--

COMMENT ON COLUMN public.fields."sourceDetails" IS 'Source details for dynamic fields (information about data source for dynamically populated fields)';


--
-- TOC entry 3705 (class 0 OID 0)
-- Dependencies: 250
-- Name: COLUMN fields."dependsOn"; Type: COMMENT; Schema: public; Owner: uba_user
--

COMMENT ON COLUMN public.fields."dependsOn" IS 'Field dependencies (information about field dependencies and conditional logic)';


--
-- TOC entry 224 (class 1259 OID 18653)
-- Name: roles; Type: TABLE; Schema: public; Owner: uba_user
--

CREATE TABLE public.roles (
    id integer NOT NULL,
    role_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    role_name character varying(100) NOT NULL,
    slug character varying(100) NOT NULL,
    actions jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone
);


ALTER TABLE public.roles OWNER TO uba_user;

--
-- TOC entry 225 (class 1259 OID 18660)
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: uba_user
--

CREATE SEQUENCE public.roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.roles_id_seq OWNER TO uba_user;

--
-- TOC entry 3706 (class 0 OID 0)
-- Dependencies: 225
-- Name: roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: uba_user
--

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;


--
-- TOC entry 249 (class 1259 OID 32439)
-- Name: settings; Type: TABLE; Schema: public; Owner: uba_user
--

CREATE TABLE public.settings (
    id integer NOT NULL,
    key character varying(255) NOT NULL,
    value jsonb NOT NULL,
    created timestamp with time zone DEFAULT now() NOT NULL,
    "lastUpdated" timestamp with time zone DEFAULT now() NOT NULL,
    "createdBy" character varying(255) NOT NULL,
    "updatedBy" character varying(255) NOT NULL
);


ALTER TABLE public.settings OWNER TO uba_user;

--
-- TOC entry 248 (class 1259 OID 32438)
-- Name: settings_id_seq; Type: SEQUENCE; Schema: public; Owner: uba_user
--

CREATE SEQUENCE public.settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.settings_id_seq OWNER TO uba_user;

--
-- TOC entry 3707 (class 0 OID 0)
-- Dependencies: 248
-- Name: settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: uba_user
--

ALTER SEQUENCE public.settings_id_seq OWNED BY public.settings.id;


--
-- TOC entry 226 (class 1259 OID 18661)
-- Name: ubi_network_cache_id_seq; Type: SEQUENCE; Schema: public; Owner: uba_user
--

CREATE SEQUENCE public.ubi_network_cache_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ubi_network_cache_id_seq OWNER TO uba_user;

--
-- TOC entry 227 (class 1259 OID 18662)
-- Name: ubi_network_cache; Type: TABLE; Schema: public; Owner: uba_user
--

CREATE TABLE public.ubi_network_cache (
    title text,
    description text,
    url text,
    "enrollmentEndDate" timestamp with time zone DEFAULT now(),
    bpp_id text,
    unique_id text,
    bpp_uri text,
    item_id text,
    credits text,
    instructors text,
    "offeringInstitute" jsonb,
    provider_id text,
    provider_name text,
    id integer DEFAULT nextval('public.ubi_network_cache_id_seq'::regclass) NOT NULL,
    item json,
    descriptor json,
    categories json,
    fulfillments json
);


ALTER TABLE public.ubi_network_cache OWNER TO uba_user;

--
-- TOC entry 228 (class 1259 OID 18669)
-- Name: user_applications; Type: TABLE; Schema: public; Owner: uba_user
--

CREATE TABLE public.user_applications (
    id integer NOT NULL,
    user_id uuid NOT NULL,
    benefit_id character varying(255) NOT NULL,
    internal_application_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    bpp_application_id character varying(255),
    status character varying(255) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    benefit_provider_id character varying(255),
    benefit_provider_uri character varying(255),
    application_name text,
    application_data text,
    remark text,
    order_id character varying(100),
    transaction_id character varying(100)
);


ALTER TABLE public.user_applications OWNER TO uba_user;

--
-- TOC entry 229 (class 1259 OID 18676)
-- Name: user_applications_id_seq; Type: SEQUENCE; Schema: public; Owner: uba_user
--

CREATE SEQUENCE public.user_applications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_applications_id_seq OWNER TO uba_user;

--
-- TOC entry 3708 (class 0 OID 0)
-- Dependencies: 229
-- Name: user_applications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: uba_user
--

ALTER SEQUENCE public.user_applications_id_seq OWNED BY public.user_applications.id;


--
-- TOC entry 230 (class 1259 OID 18677)
-- Name: user_docs; Type: TABLE; Schema: public; Owner: uba_user
--

CREATE TABLE public.user_docs (
    id integer NOT NULL,
    doc_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    doc_type character varying(50) NOT NULL,
    doc_subtype character varying(255) NOT NULL,
    doc_name character varying(255) NOT NULL,
    imported_from character varying(255) NOT NULL,
    doc_path character varying(255),
    doc_data text,
    doc_datatype character varying(100),
    uploaded_at timestamp with time zone DEFAULT now() NOT NULL,
    doc_verified boolean DEFAULT false,
    verification_result boolean,
    verified_at timestamp with time zone,
    watcher_registered boolean DEFAULT false NOT NULL,
    watcher_email character varying(255),
    watcher_callback_url character varying(500),
    doc_data_link text,
    issuer character varying(50),
    issuance_callback_registered boolean DEFAULT false NOT NULL,
    vc_public_id character varying(255),
    vc_status character varying(50) DEFAULT NULL::character varying,
    vc_status_updated_at timestamp with time zone,
    CONSTRAINT chk_vc_status CHECK (((vc_status IS NULL) OR ((vc_status)::text = ANY ((ARRAY['pending'::character varying, 'issued'::character varying, 'revoked'::character varying, 'deleted'::character varying])::text[]))))
);


ALTER TABLE public.user_docs OWNER TO uba_user;

--
-- TOC entry 3709 (class 0 OID 0)
-- Dependencies: 230
-- Name: COLUMN user_docs.verified_at; Type: COMMENT; Schema: public; Owner: uba_user
--

COMMENT ON COLUMN public.user_docs.verified_at IS 'Timestamp when document was verified by verification API';


--
-- TOC entry 3710 (class 0 OID 0)
-- Dependencies: 230
-- Name: COLUMN user_docs.watcher_registered; Type: COMMENT; Schema: public; Owner: uba_user
--

COMMENT ON COLUMN public.user_docs.watcher_registered IS 'Indicates if a watcher is registered for this document';


--
-- TOC entry 3711 (class 0 OID 0)
-- Dependencies: 230
-- Name: COLUMN user_docs.watcher_email; Type: COMMENT; Schema: public; Owner: uba_user
--

COMMENT ON COLUMN public.user_docs.watcher_email IS 'Email address used for watcher registration';


--
-- TOC entry 3712 (class 0 OID 0)
-- Dependencies: 230
-- Name: COLUMN user_docs.watcher_callback_url; Type: COMMENT; Schema: public; Owner: uba_user
--

COMMENT ON COLUMN public.user_docs.watcher_callback_url IS 'Callback URL for watcher notifications';


--
-- TOC entry 3713 (class 0 OID 0)
-- Dependencies: 230
-- Name: COLUMN user_docs.doc_data_link; Type: COMMENT; Schema: public; Owner: uba_user
--

COMMENT ON COLUMN public.user_docs.doc_data_link IS 'Link to the document data, if applicable';


--
-- TOC entry 3714 (class 0 OID 0)
-- Dependencies: 230
-- Name: COLUMN user_docs.issuer; Type: COMMENT; Schema: public; Owner: uba_user
--

COMMENT ON COLUMN public.user_docs.issuer IS 'VC issuer type (e.g., dhiway, sunbird, sunbirdrc)';


--
-- TOC entry 3715 (class 0 OID 0)
-- Dependencies: 230
-- Name: COLUMN user_docs.issuance_callback_registered; Type: COMMENT; Schema: public; Owner: uba_user
--

COMMENT ON COLUMN public.user_docs.issuance_callback_registered IS 'Indicates if document needs issuance callback processing (true for VC creation, false for direct upload)';


--
-- TOC entry 3716 (class 0 OID 0)
-- Dependencies: 230
-- Name: COLUMN user_docs.vc_public_id; Type: COMMENT; Schema: public; Owner: uba_user
--

COMMENT ON COLUMN public.user_docs.vc_public_id IS 'Public ID (UUID) from VC issuance platform for callback processing';


--
-- TOC entry 3717 (class 0 OID 0)
-- Dependencies: 230
-- Name: COLUMN user_docs.vc_status; Type: COMMENT; Schema: public; Owner: uba_user
--

COMMENT ON COLUMN public.user_docs.vc_status IS 'Current status of VC: pending (draft awaiting issuer action), issued (credential issued), revoked (credential revoked), deleted (draft/credential deleted), or null for non-VC documents';


--
-- TOC entry 3718 (class 0 OID 0)
-- Dependencies: 230
-- Name: COLUMN user_docs.vc_status_updated_at; Type: COMMENT; Schema: public; Owner: uba_user
--

COMMENT ON COLUMN public.user_docs.vc_status_updated_at IS 'Timestamp when vc_status was last updated by callback';


--
-- TOC entry 231 (class 1259 OID 18685)
-- Name: user_docs_id_seq; Type: SEQUENCE; Schema: public; Owner: uba_user
--

CREATE SEQUENCE public.user_docs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_docs_id_seq OWNER TO uba_user;

--
-- TOC entry 3719 (class 0 OID 0)
-- Dependencies: 231
-- Name: user_docs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: uba_user
--

ALTER SEQUENCE public.user_docs_id_seq OWNED BY public.user_docs.id;


--
-- TOC entry 232 (class 1259 OID 18686)
-- Name: user_info; Type: TABLE; Schema: public; Owner: uba_user
--

CREATE TABLE public.user_info (
    id integer NOT NULL,
    user_id uuid,
    "fatherName" character varying(100),
    "samagraId" character varying(50),
    "currentSchoolName" character varying(150),
    "currentSchoolAddress" text,
    "currentSchoolDistrict" character varying(100),
    class integer,
    "studentType" character varying(50),
    aadhaar character varying(255),
    caste character varying(50),
    "annualIncome" numeric(10,2),
    gender character varying(10),
    age integer,
    "disabilityStatus" character varying(100),
    status character varying(10),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "previousYearMarks" character varying(255),
    application_data jsonb,
    fields_verified boolean,
    fields_verified_data json,
    fields_verified_at timestamp with time zone,
    "bankAccountHolderName" character varying(50),
    "bankName" character varying(50),
    "bankAccountNumber" character varying(255),
    "bankIfscCode" character varying(50),
    "motherName" character varying(50),
    dob date,
    state character varying(255),
    "bankAddress" character varying(255),
    "branchCode" character varying(50),
    udid character varying(255),
    "disabilityType" character varying(255),
    "disabilityRange" character varying(50),
    "nspOtr" character varying(255),
    "tuitionAndAdminFeePaid" integer,
    "miscFeePaid" integer
);


ALTER TABLE public.user_info OWNER TO uba_user;

--
-- TOC entry 233 (class 1259 OID 18693)
-- Name: user_info_id_seq; Type: SEQUENCE; Schema: public; Owner: uba_user
--

CREATE SEQUENCE public.user_info_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_info_id_seq OWNER TO uba_user;

--
-- TOC entry 3720 (class 0 OID 0)
-- Dependencies: 233
-- Name: user_info_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: uba_user
--

ALTER SEQUENCE public.user_info_id_seq OWNED BY public.user_info.id;


--
-- TOC entry 234 (class 1259 OID 18694)
-- Name: user_roles; Type: TABLE; Schema: public; Owner: uba_user
--

CREATE TABLE public.user_roles (
    id integer NOT NULL,
    role_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role_slug character varying(100) NOT NULL,
    status boolean NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone
);


ALTER TABLE public.user_roles OWNER TO uba_user;

--
-- TOC entry 235 (class 1259 OID 18698)
-- Name: user_roles_id_seq; Type: SEQUENCE; Schema: public; Owner: uba_user
--

CREATE SEQUENCE public.user_roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_roles_id_seq OWNER TO uba_user;

--
-- TOC entry 3721 (class 0 OID 0)
-- Dependencies: 235
-- Name: user_roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: uba_user
--

ALTER SEQUENCE public.user_roles_id_seq OWNED BY public.user_roles.id;


--
-- TOC entry 236 (class 1259 OID 18699)
-- Name: user_wallets; Type: TABLE; Schema: public; Owner: uba_user
--

CREATE TABLE public.user_wallets (
    id integer NOT NULL,
    user_id uuid NOT NULL,
    wallet_provider character varying(100) NOT NULL,
    wallet_id character varying(100) NOT NULL,
    wallet_token text NOT NULL,
    status boolean NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone
);


ALTER TABLE public.user_wallets OWNER TO uba_user;

--
-- TOC entry 237 (class 1259 OID 18705)
-- Name: user_wallets_id_seq; Type: SEQUENCE; Schema: public; Owner: uba_user
--

CREATE SEQUENCE public.user_wallets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_wallets_id_seq OWNER TO uba_user;

--
-- TOC entry 3722 (class 0 OID 0)
-- Dependencies: 237
-- Name: user_wallets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: uba_user
--

ALTER SEQUENCE public.user_wallets_id_seq OWNED BY public.user_wallets.id;


--
-- TOC entry 238 (class 1259 OID 18706)
-- Name: users; Type: TABLE; Schema: public; Owner: uba_user
--

CREATE TABLE public.users (
    id integer NOT NULL,
    user_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "firstName" character varying(50),
    "middleName" character varying(50),
    "lastName" character varying(50),
    email character varying(100),
    "phoneNumber" character varying(100),
    dob date,
    sso_provider character varying(255) NOT NULL,
    sso_id character varying(255) NOT NULL,
    image character varying(255),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    "fieldsVerified" boolean,
    "fieldsVerifiedAt" timestamp with time zone,
    "fieldsVerificationData" json,
    "walletToken" text,
    name character varying(255)
);


ALTER TABLE public.users OWNER TO uba_user;

--
-- TOC entry 239 (class 1259 OID 18713)
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: uba_user
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO uba_user;

--
-- TOC entry 3723 (class 0 OID 0)
-- Dependencies: 239
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: uba_user
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- TOC entry 254 (class 1259 OID 462125)
-- Name: vc_event_processing_log; Type: TABLE; Schema: public; Owner: uba_user
--

CREATE TABLE public.vc_event_processing_log (
    id integer NOT NULL,
    vc_public_id character varying(255) NOT NULL,
    status_processed character varying(20) NOT NULL,
    error_message text,
    processed_at timestamp with time zone DEFAULT now() NOT NULL,
    batch_from timestamp with time zone NOT NULL,
    batch_to timestamp with time zone NOT NULL,
    type character varying(50),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT vc_event_processing_log_status_processed_check CHECK (((status_processed)::text = ANY ((ARRAY['success'::character varying, 'failed'::character varying])::text[])))
);


ALTER TABLE public.vc_event_processing_log OWNER TO uba_user;

--
-- TOC entry 3724 (class 0 OID 0)
-- Dependencies: 254
-- Name: TABLE vc_event_processing_log; Type: COMMENT; Schema: public; Owner: uba_user
--

COMMENT ON TABLE public.vc_event_processing_log IS 'Logs VC event processing results for audit trail and idempotency checks';


--
-- TOC entry 3725 (class 0 OID 0)
-- Dependencies: 254
-- Name: COLUMN vc_event_processing_log.vc_public_id; Type: COMMENT; Schema: public; Owner: uba_user
--

COMMENT ON COLUMN public.vc_event_processing_log.vc_public_id IS 'Public ID (UUID) of the VC record being processed';


--
-- TOC entry 3726 (class 0 OID 0)
-- Dependencies: 254
-- Name: COLUMN vc_event_processing_log.status_processed; Type: COMMENT; Schema: public; Owner: uba_user
--

COMMENT ON COLUMN public.vc_event_processing_log.status_processed IS 'Processing status: success or failed';


--
-- TOC entry 3727 (class 0 OID 0)
-- Dependencies: 254
-- Name: COLUMN vc_event_processing_log.batch_from; Type: COMMENT; Schema: public; Owner: uba_user
--

COMMENT ON COLUMN public.vc_event_processing_log.batch_from IS 'Start timestamp of the processing batch window';


--
-- TOC entry 3728 (class 0 OID 0)
-- Dependencies: 254
-- Name: COLUMN vc_event_processing_log.batch_to; Type: COMMENT; Schema: public; Owner: uba_user
--

COMMENT ON COLUMN public.vc_event_processing_log.batch_to IS 'End timestamp of the processing batch window';


--
-- TOC entry 3729 (class 0 OID 0)
-- Dependencies: 254
-- Name: COLUMN vc_event_processing_log.type; Type: COMMENT; Schema: public; Owner: uba_user
--

COMMENT ON COLUMN public.vc_event_processing_log.type IS 'Dhiway Analytics type (record_anchored, record_revoked, record_deleted) stored when first processed';


--
-- TOC entry 253 (class 1259 OID 462124)
-- Name: vc_event_processing_log_id_seq; Type: SEQUENCE; Schema: public; Owner: uba_user
--

CREATE SEQUENCE public.vc_event_processing_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.vc_event_processing_log_id_seq OWNER TO uba_user;

--
-- TOC entry 3730 (class 0 OID 0)
-- Dependencies: 253
-- Name: vc_event_processing_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: uba_user
--

ALTER SEQUENCE public.vc_event_processing_log_id_seq OWNED BY public.vc_event_processing_log.id;


--
-- TOC entry 3360 (class 2604 OID 18714)
-- Name: audit_logs id; Type: DEFAULT; Schema: public; Owner: uba_user
--

ALTER TABLE ONLY public.audit_logs ALTER COLUMN id SET DEFAULT nextval('public.audit_logs_id_seq'::regclass);


--
-- TOC entry 3361 (class 2604 OID 18715)
-- Name: consent id; Type: DEFAULT; Schema: public; Owner: uba_user
--

ALTER TABLE ONLY public.consent ALTER COLUMN id SET DEFAULT nextval('public.consent_id_seq'::regclass);


--
-- TOC entry 3363 (class 2604 OID 18716)
-- Name: roles id; Type: DEFAULT; Schema: public; Owner: uba_user
--

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);


--
-- TOC entry 3408 (class 2604 OID 32442)
-- Name: settings id; Type: DEFAULT; Schema: public; Owner: uba_user
--

ALTER TABLE ONLY public.settings ALTER COLUMN id SET DEFAULT nextval('public.settings_id_seq'::regclass);


--
-- TOC entry 3368 (class 2604 OID 18717)
-- Name: user_applications id; Type: DEFAULT; Schema: public; Owner: uba_user
--

ALTER TABLE ONLY public.user_applications ALTER COLUMN id SET DEFAULT nextval('public.user_applications_id_seq'::regclass);


--
-- TOC entry 3371 (class 2604 OID 18718)
-- Name: user_docs id; Type: DEFAULT; Schema: public; Owner: uba_user
--

ALTER TABLE ONLY public.user_docs ALTER COLUMN id SET DEFAULT nextval('public.user_docs_id_seq'::regclass);


--
-- TOC entry 3378 (class 2604 OID 18719)
-- Name: user_info id; Type: DEFAULT; Schema: public; Owner: uba_user
--

ALTER TABLE ONLY public.user_info ALTER COLUMN id SET DEFAULT nextval('public.user_info_id_seq'::regclass);


--
-- TOC entry 3381 (class 2604 OID 18720)
-- Name: user_roles id; Type: DEFAULT; Schema: public; Owner: uba_user
--

ALTER TABLE ONLY public.user_roles ALTER COLUMN id SET DEFAULT nextval('public.user_roles_id_seq'::regclass);


--
-- TOC entry 3383 (class 2604 OID 18721)
-- Name: user_wallets id; Type: DEFAULT; Schema: public; Owner: uba_user
--

ALTER TABLE ONLY public.user_wallets ALTER COLUMN id SET DEFAULT nextval('public.user_wallets_id_seq'::regclass);


--
-- TOC entry 3385 (class 2604 OID 18722)
-- Name: users id; Type: DEFAULT; Schema: public; Owner: uba_user
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- TOC entry 3423 (class 2604 OID 462128)
-- Name: vc_event_processing_log id; Type: DEFAULT; Schema: public; Owner: uba_user
--

ALTER TABLE ONLY public.vc_event_processing_log ALTER COLUMN id SET DEFAULT nextval('public.vc_event_processing_log_id_seq'::regclass);


--
-- TOC entry 3478 (class 2606 OID 21100)
-- Name: hdb_action_log hdb_action_log_pkey; Type: CONSTRAINT; Schema: hdb_catalog; Owner: uba_user
--

ALTER TABLE ONLY hdb_catalog.hdb_action_log
    ADD CONSTRAINT hdb_action_log_pkey PRIMARY KEY (id);


--
-- TOC entry 3485 (class 2606 OID 21123)
-- Name: hdb_cron_event_invocation_logs hdb_cron_event_invocation_logs_pkey; Type: CONSTRAINT; Schema: hdb_catalog; Owner: uba_user
--

ALTER TABLE ONLY hdb_catalog.hdb_cron_event_invocation_logs
    ADD CONSTRAINT hdb_cron_event_invocation_logs_pkey PRIMARY KEY (id);


--
-- TOC entry 3481 (class 2606 OID 21112)
-- Name: hdb_cron_events hdb_cron_events_pkey; Type: CONSTRAINT; Schema: hdb_catalog; Owner: uba_user
--

ALTER TABLE ONLY hdb_catalog.hdb_cron_events
    ADD CONSTRAINT hdb_cron_events_pkey PRIMARY KEY (id);


--
-- TOC entry 3474 (class 2606 OID 21088)
-- Name: hdb_metadata hdb_metadata_pkey; Type: CONSTRAINT; Schema: hdb_catalog; Owner: uba_user
--

ALTER TABLE ONLY hdb_catalog.hdb_metadata
    ADD CONSTRAINT hdb_metadata_pkey PRIMARY KEY (id);


--
-- TOC entry 3476 (class 2606 OID 21090)
-- Name: hdb_metadata hdb_metadata_resource_version_key; Type: CONSTRAINT; Schema: hdb_catalog; Owner: uba_user
--

ALTER TABLE ONLY hdb_catalog.hdb_metadata
    ADD CONSTRAINT hdb_metadata_resource_version_key UNIQUE (resource_version);


--
-- TOC entry 3490 (class 2606 OID 21151)
-- Name: hdb_scheduled_event_invocation_logs hdb_scheduled_event_invocation_logs_pkey; Type: CONSTRAINT; Schema: hdb_catalog; Owner: uba_user
--

ALTER TABLE ONLY hdb_catalog.hdb_scheduled_event_invocation_logs
    ADD CONSTRAINT hdb_scheduled_event_invocation_logs_pkey PRIMARY KEY (id);


--
-- TOC entry 3488 (class 2606 OID 21141)
-- Name: hdb_scheduled_events hdb_scheduled_events_pkey; Type: CONSTRAINT; Schema: hdb_catalog; Owner: uba_user
--

ALTER TABLE ONLY hdb_catalog.hdb_scheduled_events
    ADD CONSTRAINT hdb_scheduled_events_pkey PRIMARY KEY (id);


--
-- TOC entry 3492 (class 2606 OID 21166)
-- Name: hdb_schema_notifications hdb_schema_notifications_pkey; Type: CONSTRAINT; Schema: hdb_catalog; Owner: uba_user
--

ALTER TABLE ONLY hdb_catalog.hdb_schema_notifications
    ADD CONSTRAINT hdb_schema_notifications_pkey PRIMARY KEY (id);


--
-- TOC entry 3472 (class 2606 OID 21079)
-- Name: hdb_version hdb_version_pkey; Type: CONSTRAINT; Schema: hdb_catalog; Owner: uba_user
--

ALTER TABLE ONLY hdb_catalog.hdb_version
    ADD CONSTRAINT hdb_version_pkey PRIMARY KEY (hasura_uuid);


--
-- TOC entry 3434 (class 2606 OID 18742)
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: uba_user
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- TOC entry 3436 (class 2606 OID 18744)
-- Name: consent consent_pkey; Type: CONSTRAINT; Schema: public; Owner: uba_user
--

ALTER TABLE ONLY public.consent
    ADD CONSTRAINT consent_pkey PRIMARY KEY (id);


--
-- TOC entry 3508 (class 2606 OID 462122)
-- Name: cron_state cron_state_cron_name_key; Type: CONSTRAINT; Schema: public; Owner: uba_user
--

ALTER TABLE ONLY public.cron_state
    ADD CONSTRAINT cron_state_cron_name_key UNIQUE (cron_name);


--
-- TOC entry 3510 (class 2606 OID 462120)
-- Name: cron_state cron_state_pkey; Type: CONSTRAINT; Schema: public; Owner: uba_user
--

ALTER TABLE ONLY public.cron_state
    ADD CONSTRAINT cron_state_pkey PRIMARY KEY (id);


--
-- TOC entry 3506 (class 2606 OID 54830)
-- Name: fieldValues fieldValues_pkey; Type: CONSTRAINT; Schema: public; Owner: uba_user
--

ALTER TABLE ONLY public."fieldValues"
    ADD CONSTRAINT "fieldValues_pkey" PRIMARY KEY (id);


--
-- TOC entry 3501 (class 2606 OID 54820)
-- Name: fields fields_pkey; Type: CONSTRAINT; Schema: public; Owner: uba_user
--

ALTER TABLE ONLY public.fields
    ADD CONSTRAINT fields_pkey PRIMARY KEY ("fieldId");


--
-- TOC entry 3438 (class 2606 OID 18746)
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: uba_user
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- TOC entry 3440 (class 2606 OID 18748)
-- Name: roles roles_role_id_key; Type: CONSTRAINT; Schema: public; Owner: uba_user
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_role_id_key UNIQUE (role_id);


--
-- TOC entry 3442 (class 2606 OID 18750)
-- Name: roles roles_slug_key; Type: CONSTRAINT; Schema: public; Owner: uba_user
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_slug_key UNIQUE (slug);


--
-- TOC entry 3494 (class 2606 OID 32450)
-- Name: settings settings_key_key; Type: CONSTRAINT; Schema: public; Owner: uba_user
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_key_key UNIQUE (key);


--
-- TOC entry 3496 (class 2606 OID 32448)
-- Name: settings settings_pkey; Type: CONSTRAINT; Schema: public; Owner: uba_user
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_pkey PRIMARY KEY (id);


--
-- TOC entry 3444 (class 2606 OID 18752)
-- Name: ubi_network_cache ubi_network_cache_pkey; Type: CONSTRAINT; Schema: public; Owner: uba_user
--

ALTER TABLE ONLY public.ubi_network_cache
    ADD CONSTRAINT ubi_network_cache_pkey PRIMARY KEY (id);


--
-- TOC entry 3446 (class 2606 OID 18754)
-- Name: user_applications unique_user_benefit; Type: CONSTRAINT; Schema: public; Owner: uba_user
--

ALTER TABLE ONLY public.user_applications
    ADD CONSTRAINT unique_user_benefit UNIQUE (user_id, benefit_id);


--
-- TOC entry 3448 (class 2606 OID 18756)
-- Name: user_applications user_applications_internal_application_id_key; Type: CONSTRAINT; Schema: public; Owner: uba_user
--

ALTER TABLE ONLY public.user_applications
    ADD CONSTRAINT user_applications_internal_application_id_key UNIQUE (internal_application_id);


--
-- TOC entry 3450 (class 2606 OID 18758)
-- Name: user_applications user_applications_pkey; Type: CONSTRAINT; Schema: public; Owner: uba_user
--

ALTER TABLE ONLY public.user_applications
    ADD CONSTRAINT user_applications_pkey PRIMARY KEY (id);


--
-- TOC entry 3457 (class 2606 OID 18760)
-- Name: user_docs user_docs_doc_id_key; Type: CONSTRAINT; Schema: public; Owner: uba_user
--

ALTER TABLE ONLY public.user_docs
    ADD CONSTRAINT user_docs_doc_id_key UNIQUE (doc_id);


--
-- TOC entry 3459 (class 2606 OID 18762)
-- Name: user_docs user_docs_pkey; Type: CONSTRAINT; Schema: public; Owner: uba_user
--

ALTER TABLE ONLY public.user_docs
    ADD CONSTRAINT user_docs_pkey PRIMARY KEY (id);


--
-- TOC entry 3461 (class 2606 OID 18764)
-- Name: user_info user_info_pkey; Type: CONSTRAINT; Schema: public; Owner: uba_user
--

ALTER TABLE ONLY public.user_info
    ADD CONSTRAINT user_info_pkey PRIMARY KEY (id);


--
-- TOC entry 3463 (class 2606 OID 18766)
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: uba_user
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- TOC entry 3465 (class 2606 OID 18768)
-- Name: user_wallets user_wallets_pkey; Type: CONSTRAINT; Schema: public; Owner: uba_user
--

ALTER TABLE ONLY public.user_wallets
    ADD CONSTRAINT user_wallets_pkey PRIMARY KEY (id);


--
-- TOC entry 3467 (class 2606 OID 18770)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: uba_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 3469 (class 2606 OID 18772)
-- Name: users users_user_id_key; Type: CONSTRAINT; Schema: public; Owner: uba_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_user_id_key UNIQUE (user_id);


--
-- TOC entry 3518 (class 2606 OID 462136)
-- Name: vc_event_processing_log vc_event_processing_log_pkey; Type: CONSTRAINT; Schema: public; Owner: uba_user
--

ALTER TABLE ONLY public.vc_event_processing_log
    ADD CONSTRAINT vc_event_processing_log_pkey PRIMARY KEY (id);


--
-- TOC entry 3483 (class 1259 OID 21129)
-- Name: hdb_cron_event_invocation_event_id; Type: INDEX; Schema: hdb_catalog; Owner: uba_user
--

CREATE INDEX hdb_cron_event_invocation_event_id ON hdb_catalog.hdb_cron_event_invocation_logs USING btree (event_id);


--
-- TOC entry 3479 (class 1259 OID 21113)
-- Name: hdb_cron_event_status; Type: INDEX; Schema: hdb_catalog; Owner: uba_user
--

CREATE INDEX hdb_cron_event_status ON hdb_catalog.hdb_cron_events USING btree (status);


--
-- TOC entry 3482 (class 1259 OID 21114)
-- Name: hdb_cron_events_unique_scheduled; Type: INDEX; Schema: hdb_catalog; Owner: uba_user
--

CREATE UNIQUE INDEX hdb_cron_events_unique_scheduled ON hdb_catalog.hdb_cron_events USING btree (trigger_name, scheduled_time) WHERE (status = 'scheduled'::text);


--
-- TOC entry 3486 (class 1259 OID 21142)
-- Name: hdb_scheduled_event_status; Type: INDEX; Schema: hdb_catalog; Owner: uba_user
--

CREATE INDEX hdb_scheduled_event_status ON hdb_catalog.hdb_scheduled_events USING btree (status);


--
-- TOC entry 3470 (class 1259 OID 21080)
-- Name: hdb_version_one_row; Type: INDEX; Schema: hdb_catalog; Owner: uba_user
--

CREATE UNIQUE INDEX hdb_version_one_row ON hdb_catalog.hdb_version USING btree (((version IS NOT NULL)));


--
-- TOC entry 3502 (class 1259 OID 54839)
-- Name: IDX_fieldValues_fieldId; Type: INDEX; Schema: public; Owner: uba_user
--

CREATE INDEX "IDX_fieldValues_fieldId" ON public."fieldValues" USING btree ("fieldId");


--
-- TOC entry 3503 (class 1259 OID 54841)
-- Name: IDX_fieldValues_fieldId_itemId; Type: INDEX; Schema: public; Owner: uba_user
--

CREATE INDEX "IDX_fieldValues_fieldId_itemId" ON public."fieldValues" USING btree ("fieldId", "itemId");


--
-- TOC entry 3504 (class 1259 OID 54840)
-- Name: IDX_fieldValues_itemId; Type: INDEX; Schema: public; Owner: uba_user
--

CREATE INDEX "IDX_fieldValues_itemId" ON public."fieldValues" USING btree ("itemId");


--
-- TOC entry 3497 (class 1259 OID 54836)
-- Name: IDX_fields_context; Type: INDEX; Schema: public; Owner: uba_user
--

CREATE INDEX "IDX_fields_context" ON public.fields USING btree (context);


--
-- TOC entry 3498 (class 1259 OID 54837)
-- Name: IDX_fields_context_contextType; Type: INDEX; Schema: public; Owner: uba_user
--

CREATE INDEX "IDX_fields_context_contextType" ON public.fields USING btree (context, "contextType");


--
-- TOC entry 3499 (class 1259 OID 54838)
-- Name: IDX_fields_name_context_unique; Type: INDEX; Schema: public; Owner: uba_user
--

CREATE UNIQUE INDEX "IDX_fields_name_context_unique" ON public.fields USING btree (name, context);


--
-- TOC entry 3511 (class 1259 OID 462123)
-- Name: idx_cron_state_name; Type: INDEX; Schema: public; Owner: uba_user
--

CREATE INDEX idx_cron_state_name ON public.cron_state USING btree (cron_name);


--
-- TOC entry 3451 (class 1259 OID 354431)
-- Name: idx_user_docs_imported_from; Type: INDEX; Schema: public; Owner: uba_user
--

CREATE INDEX idx_user_docs_imported_from ON public.user_docs USING btree (imported_from);


--
-- TOC entry 3452 (class 1259 OID 462105)
-- Name: idx_user_docs_vc_public_id; Type: INDEX; Schema: public; Owner: uba_user
--

CREATE INDEX idx_user_docs_vc_public_id ON public.user_docs USING btree (vc_public_id);


--
-- TOC entry 3453 (class 1259 OID 462108)
-- Name: idx_user_docs_vc_status; Type: INDEX; Schema: public; Owner: uba_user
--

CREATE INDEX idx_user_docs_vc_status ON public.user_docs USING btree (vc_status);


--
-- TOC entry 3454 (class 1259 OID 462109)
-- Name: idx_user_docs_verified_at; Type: INDEX; Schema: public; Owner: uba_user
--

CREATE INDEX idx_user_docs_verified_at ON public.user_docs USING btree (verified_at) WHERE (verified_at IS NOT NULL);


--
-- TOC entry 3455 (class 1259 OID 354430)
-- Name: idx_user_docs_watcher_registered; Type: INDEX; Schema: public; Owner: uba_user
--

CREATE INDEX idx_user_docs_watcher_registered ON public.user_docs USING btree (watcher_registered);


--
-- TOC entry 3512 (class 1259 OID 462139)
-- Name: idx_vc_log_batch; Type: INDEX; Schema: public; Owner: uba_user
--

CREATE INDEX idx_vc_log_batch ON public.vc_event_processing_log USING btree (batch_from, batch_to);


--
-- TOC entry 3513 (class 1259 OID 462140)
-- Name: idx_vc_log_processed_at; Type: INDEX; Schema: public; Owner: uba_user
--

CREATE INDEX idx_vc_log_processed_at ON public.vc_event_processing_log USING btree (processed_at);


--
-- TOC entry 3514 (class 1259 OID 462138)
-- Name: idx_vc_log_status; Type: INDEX; Schema: public; Owner: uba_user
--

CREATE INDEX idx_vc_log_status ON public.vc_event_processing_log USING btree (status_processed);


--
-- TOC entry 3515 (class 1259 OID 462141)
-- Name: idx_vc_log_type; Type: INDEX; Schema: public; Owner: uba_user
--

CREATE INDEX idx_vc_log_type ON public.vc_event_processing_log USING btree (type);


--
-- TOC entry 3516 (class 1259 OID 462137)
-- Name: idx_vc_log_vc_public_id; Type: INDEX; Schema: public; Owner: uba_user
--

CREATE INDEX idx_vc_log_vc_public_id ON public.vc_event_processing_log USING btree (vc_public_id);


--
-- TOC entry 3529 (class 2620 OID 54843)
-- Name: fields update_fields_updated_at; Type: TRIGGER; Schema: public; Owner: uba_user
--

CREATE TRIGGER update_fields_updated_at BEFORE UPDATE ON public.fields FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- TOC entry 3530 (class 2620 OID 54844)
-- Name: fieldValues update_fieldvalues_updated_at; Type: TRIGGER; Schema: public; Owner: uba_user
--

CREATE TRIGGER update_fieldvalues_updated_at BEFORE UPDATE ON public."fieldValues" FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- TOC entry 3526 (class 2606 OID 21124)
-- Name: hdb_cron_event_invocation_logs hdb_cron_event_invocation_logs_event_id_fkey; Type: FK CONSTRAINT; Schema: hdb_catalog; Owner: uba_user
--

ALTER TABLE ONLY hdb_catalog.hdb_cron_event_invocation_logs
    ADD CONSTRAINT hdb_cron_event_invocation_logs_event_id_fkey FOREIGN KEY (event_id) REFERENCES hdb_catalog.hdb_cron_events(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3527 (class 2606 OID 21152)
-- Name: hdb_scheduled_event_invocation_logs hdb_scheduled_event_invocation_logs_event_id_fkey; Type: FK CONSTRAINT; Schema: hdb_catalog; Owner: uba_user
--

ALTER TABLE ONLY hdb_catalog.hdb_scheduled_event_invocation_logs
    ADD CONSTRAINT hdb_scheduled_event_invocation_logs_event_id_fkey FOREIGN KEY (event_id) REFERENCES hdb_catalog.hdb_scheduled_events(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3528 (class 2606 OID 54831)
-- Name: fieldValues FK_fieldValues_fieldId; Type: FK CONSTRAINT; Schema: public; Owner: uba_user
--

ALTER TABLE ONLY public."fieldValues"
    ADD CONSTRAINT "FK_fieldValues_fieldId" FOREIGN KEY ("fieldId") REFERENCES public.fields("fieldId") ON DELETE CASCADE;


--
-- TOC entry 3519 (class 2606 OID 18788)
-- Name: audit_logs audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: uba_user
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id);


--
-- TOC entry 3520 (class 2606 OID 18793)
-- Name: consent consent_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: uba_user
--

ALTER TABLE ONLY public.consent
    ADD CONSTRAINT consent_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id);


--
-- TOC entry 3521 (class 2606 OID 18798)
-- Name: user_applications user_applications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: uba_user
--

ALTER TABLE ONLY public.user_applications
    ADD CONSTRAINT user_applications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id);


--
-- TOC entry 3522 (class 2606 OID 18808)
-- Name: user_info user_info_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: uba_user
--

ALTER TABLE ONLY public.user_info
    ADD CONSTRAINT user_info_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id);


--
-- TOC entry 3523 (class 2606 OID 18813)
-- Name: user_roles user_roles_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: uba_user
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(role_id);


--
-- TOC entry 3524 (class 2606 OID 18818)
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: uba_user
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id);


--
-- TOC entry 3525 (class 2606 OID 18823)
-- Name: user_wallets user_wallets_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: uba_user
--

ALTER TABLE ONLY public.user_wallets
    ADD CONSTRAINT user_wallets_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id);


-- Completed on 2025-12-15 13:12:27 UTC

--
-- PostgreSQL database dump complete
--

\unrestrict LgBdNyofSBRbAXwTEt6wRiiE8F1Nl43VE0CfQ1K0Vow0QLm3g9uxViYpbpP2FBo
