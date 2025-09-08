--
-- PostgreSQL database dump
--

-- Dumped from database version 17.5 (Debian 17.5-1.pgdg120+1)
-- Dumped by pg_dump version 17.4

-- Started on 2025-09-07 18:43:54 UTC

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


-- Ensure function exists for updatedAt stamp

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_TABLE_NAME IN ('fields','fieldValues') THEN
  NEW."updatedAt" := now();
  END IF;
  RETURN NEW;
END;
$$;

--
-- TOC entry 228 (class 1259 OID 61183)
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.audit_logs OWNER TO postgres;

--
-- TOC entry 229 (class 1259 OID 61188)
-- Name: audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.audit_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.audit_logs_id_seq OWNER TO postgres;

--
-- TOC entry 3648 (class 0 OID 0)
-- Dependencies: 229
-- Name: audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.audit_logs_id_seq OWNED BY public.audit_logs.id;


--
-- TOC entry 230 (class 1259 OID 61189)
-- Name: consent; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.consent (
    id integer NOT NULL,
    user_id uuid NOT NULL,
    purpose character varying(255) NOT NULL,
    purpose_text text NOT NULL,
    accepted boolean NOT NULL,
    consent_date timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.consent OWNER TO postgres;

--
-- TOC entry 231 (class 1259 OID 61195)
-- Name: consent_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.consent_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.consent_id_seq OWNER TO postgres;

--
-- TOC entry 3649 (class 0 OID 0)
-- Dependencies: 231
-- Name: consent_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.consent_id_seq OWNED BY public.consent.id;


--
-- TOC entry 232 (class 1259 OID 61196)
-- Name: fieldValues; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public."fieldValues" OWNER TO postgres;

--
-- TOC entry 3650 (class 0 OID 0)
-- Dependencies: 232
-- Name: TABLE "fieldValues"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public."fieldValues" IS 'Stores the value of each custom field for a specific entity instance. The itemId is a generic reference that can point to a User, Cohort, etc.';


--
-- TOC entry 3651 (class 0 OID 0)
-- Dependencies: 232
-- Name: COLUMN "fieldValues".id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public."fieldValues".id IS 'Unique identifier for the field value (UUID v4 generated automatically on creation)';


--
-- TOC entry 3652 (class 0 OID 0)
-- Dependencies: 232
-- Name: COLUMN "fieldValues"."itemId"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public."fieldValues"."itemId" IS 'Generic entity instance ID (ID of the entity instance e.g., userId, cohortId, etc.)';


--
-- TOC entry 3653 (class 0 OID 0)
-- Dependencies: 232
-- Name: COLUMN "fieldValues"."fieldId"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public."fieldValues"."fieldId" IS 'Reference to the field definition (foreign key to the Field entity)';


--
-- TOC entry 3654 (class 0 OID 0)
-- Dependencies: 232
-- Name: COLUMN "fieldValues".value; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public."fieldValues".value IS 'The field value (the actual value stored for this field instance)';


--
-- TOC entry 3655 (class 0 OID 0)
-- Dependencies: 232
-- Name: COLUMN "fieldValues".metadata; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public."fieldValues".metadata IS 'Additional metadata for the field value (JSON object containing value-specific metadata)';


--
-- TOC entry 233 (class 1259 OID 61204)
-- Name: fields; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.fields OWNER TO postgres;

--
-- TOC entry 3656 (class 0 OID 0)
-- Dependencies: 233
-- Name: TABLE fields; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.fields IS 'Stores the definition/metadata of each custom field that can be associated with various entities like User, Cohort, etc.';


--
-- TOC entry 3657 (class 0 OID 0)
-- Dependencies: 233
-- Name: COLUMN fields."fieldId"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.fields."fieldId" IS 'Unique identifier for the field (UUID v4 generated automatically on creation)';


--
-- TOC entry 3658 (class 0 OID 0)
-- Dependencies: 233
-- Name: COLUMN fields.name; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.fields.name IS 'Internal name of the field (machine-readable name for the field)';


--
-- TOC entry 3659 (class 0 OID 0)
-- Dependencies: 233
-- Name: COLUMN fields.label; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.fields.label IS 'Display label for the field (human-readable label shown in UI)';


--
-- TOC entry 3660 (class 0 OID 0)
-- Dependencies: 233
-- Name: COLUMN fields.type; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.fields.type IS 'Field data type (determines how the field value should be stored and validated)';


--
-- TOC entry 3661 (class 0 OID 0)
-- Dependencies: 233
-- Name: COLUMN fields.context; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.fields.context IS 'Entity context this field belongs to (defines which entity type this field can be associated with)';


--
-- TOC entry 3662 (class 0 OID 0)
-- Dependencies: 233
-- Name: COLUMN fields."contextType"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.fields."contextType" IS 'Context subtype or role (optional subtype for more specific categorization)';


--
-- TOC entry 3663 (class 0 OID 0)
-- Dependencies: 233
-- Name: COLUMN fields.ordering; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.fields.ordering IS 'Display order for the field (used for ordering fields in UI)';


--
-- TOC entry 3664 (class 0 OID 0)
-- Dependencies: 233
-- Name: COLUMN fields."isRequired"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.fields."isRequired" IS 'Whether the field is required (determines if the field must have a value)';


--
-- TOC entry 3665 (class 0 OID 0)
-- Dependencies: 233
-- Name: COLUMN fields."isHidden"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.fields."isHidden" IS 'Whether the field is hidden from UI (controls field visibility in forms)';


--
-- TOC entry 3666 (class 0 OID 0)
-- Dependencies: 233
-- Name: COLUMN fields."fieldParams"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.fields."fieldParams" IS 'Additional field parameters (JSON object containing field-specific configuration)';


--
-- TOC entry 3667 (class 0 OID 0)
-- Dependencies: 233
-- Name: COLUMN fields."fieldAttributes"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.fields."fieldAttributes" IS 'Field attributes and metadata (additional attributes like isEditable, isEncrypted, etc.)';


--
-- TOC entry 3668 (class 0 OID 0)
-- Dependencies: 233
-- Name: COLUMN fields."sourceDetails"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.fields."sourceDetails" IS 'Source details for dynamic fields (information about data source for dynamically populated fields)';


--
-- TOC entry 3669 (class 0 OID 0)
-- Dependencies: 233
-- Name: COLUMN fields."dependsOn"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.fields."dependsOn" IS 'Field dependencies (information about field dependencies and conditional logic)';


--
-- TOC entry 234 (class 1259 OID 61215)
-- Name: roles; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.roles OWNER TO postgres;

--
-- TOC entry 235 (class 1259 OID 61222)
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.roles_id_seq OWNER TO postgres;

--
-- TOC entry 3670 (class 0 OID 0)
-- Dependencies: 235
-- Name: roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;


--
-- TOC entry 236 (class 1259 OID 61223)
-- Name: settings; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.settings OWNER TO postgres;

--
-- TOC entry 237 (class 1259 OID 61230)
-- Name: settings_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.settings_id_seq OWNER TO postgres;

--
-- TOC entry 3671 (class 0 OID 0)
-- Dependencies: 237
-- Name: settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.settings_id_seq OWNED BY public.settings.id;


--
-- TOC entry 238 (class 1259 OID 61231)
-- Name: ubi_network_cache_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.ubi_network_cache_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ubi_network_cache_id_seq OWNER TO postgres;

--
-- TOC entry 239 (class 1259 OID 61232)
-- Name: ubi_network_cache; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.ubi_network_cache OWNER TO postgres;

--
-- TOC entry 240 (class 1259 OID 61239)
-- Name: user_applications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_applications (
    id integer NOT NULL,
    user_id uuid NOT NULL,
    benefit_id character varying(255) NOT NULL,
    internal_application_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    external_application_id character varying(255) NOT NULL,
    status character varying(255) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    benefit_provider_id character varying(255),
    benefit_provider_uri character varying(255),
    application_name text,
    application_data text,
    remark text
);


ALTER TABLE public.user_applications OWNER TO postgres;

--
-- TOC entry 241 (class 1259 OID 61246)
-- Name: user_applications_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_applications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_applications_id_seq OWNER TO postgres;

--
-- TOC entry 3672 (class 0 OID 0)
-- Dependencies: 241
-- Name: user_applications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_applications_id_seq OWNED BY public.user_applications.id;


--
-- TOC entry 242 (class 1259 OID 61247)
-- Name: user_docs; Type: TABLE; Schema: public; Owner: postgres
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
    doc_datatype character varying(100) NOT NULL,
    uploaded_at timestamp with time zone DEFAULT now() NOT NULL,
    doc_verified boolean DEFAULT false NOT NULL,
    verification_result boolean,
    verified_at timestamp with time zone,
    watcher_registered boolean DEFAULT false NOT NULL,
    watcher_email character varying(255),
    watcher_callback_url character varying(500),
    doc_data_link text
);


ALTER TABLE public.user_docs OWNER TO postgres;

--
-- TOC entry 3673 (class 0 OID 0)
-- Dependencies: 242
-- Name: COLUMN user_docs.watcher_registered; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_docs.watcher_registered IS 'Indicates if a watcher is registered for this document';


--
-- TOC entry 3674 (class 0 OID 0)
-- Dependencies: 242
-- Name: COLUMN user_docs.watcher_email; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_docs.watcher_email IS 'Email address used for watcher registration';


--
-- TOC entry 3675 (class 0 OID 0)
-- Dependencies: 242
-- Name: COLUMN user_docs.watcher_callback_url; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_docs.watcher_callback_url IS 'Callback URL for watcher notifications';


--
-- TOC entry 3676 (class 0 OID 0)
-- Dependencies: 242
-- Name: COLUMN user_docs.doc_data_link; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_docs.doc_data_link IS 'Link to the document data, if applicable';


--
-- TOC entry 243 (class 1259 OID 61256)
-- Name: user_docs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_docs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_docs_id_seq OWNER TO postgres;

--
-- TOC entry 3677 (class 0 OID 0)
-- Dependencies: 243
-- Name: user_docs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_docs_id_seq OWNED BY public.user_docs.id;


--
-- TOC entry 244 (class 1259 OID 61257)
-- Name: user_info; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.user_info OWNER TO postgres;

--
-- TOC entry 245 (class 1259 OID 61264)
-- Name: user_info_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_info_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_info_id_seq OWNER TO postgres;

--
-- TOC entry 3678 (class 0 OID 0)
-- Dependencies: 245
-- Name: user_info_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_info_id_seq OWNED BY public.user_info.id;


--
-- TOC entry 246 (class 1259 OID 61265)
-- Name: user_roles; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.user_roles OWNER TO postgres;

--
-- TOC entry 247 (class 1259 OID 61269)
-- Name: user_roles_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_roles_id_seq OWNER TO postgres;

--
-- TOC entry 3679 (class 0 OID 0)
-- Dependencies: 247
-- Name: user_roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_roles_id_seq OWNED BY public.user_roles.id;


--
-- TOC entry 248 (class 1259 OID 61270)
-- Name: user_wallets; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.user_wallets OWNER TO postgres;

--
-- TOC entry 249 (class 1259 OID 61276)
-- Name: user_wallets_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_wallets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_wallets_id_seq OWNER TO postgres;

--
-- TOC entry 3680 (class 0 OID 0)
-- Dependencies: 249
-- Name: user_wallets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_wallets_id_seq OWNED BY public.user_wallets.id;


--
-- TOC entry 250 (class 1259 OID 61277)
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    user_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "firstName" character varying(50) NOT NULL,
    "middleName" character varying(50),
    "lastName" character varying(50) NOT NULL,
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
    "walletToken" text
);


ALTER TABLE public.users OWNER TO postgres;

--
-- TOC entry 251 (class 1259 OID 61284)
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- TOC entry 3681 (class 0 OID 0)
-- Dependencies: 251
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- TOC entry 3371 (class 2604 OID 61285)
-- Name: audit_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs ALTER COLUMN id SET DEFAULT nextval('public.audit_logs_id_seq'::regclass);


--
-- TOC entry 3372 (class 2604 OID 61286)
-- Name: consent id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.consent ALTER COLUMN id SET DEFAULT nextval('public.consent_id_seq'::regclass);


--
-- TOC entry 3383 (class 2604 OID 61287)
-- Name: roles id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);


--
-- TOC entry 3386 (class 2604 OID 61288)
-- Name: settings id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.settings ALTER COLUMN id SET DEFAULT nextval('public.settings_id_seq'::regclass);


--
-- TOC entry 3391 (class 2604 OID 61289)
-- Name: user_applications id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_applications ALTER COLUMN id SET DEFAULT nextval('public.user_applications_id_seq'::regclass);


--
-- TOC entry 3394 (class 2604 OID 61290)
-- Name: user_docs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_docs ALTER COLUMN id SET DEFAULT nextval('public.user_docs_id_seq'::regclass);


--
-- TOC entry 3399 (class 2604 OID 61291)
-- Name: user_info id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_info ALTER COLUMN id SET DEFAULT nextval('public.user_info_id_seq'::regclass);


--
-- TOC entry 3402 (class 2604 OID 61292)
-- Name: user_roles id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_roles ALTER COLUMN id SET DEFAULT nextval('public.user_roles_id_seq'::regclass);


--
-- TOC entry 3404 (class 2604 OID 61293)
-- Name: user_wallets id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_wallets ALTER COLUMN id SET DEFAULT nextval('public.user_wallets_id_seq'::regclass);


--
-- TOC entry 3406 (class 2604 OID 61294)
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- TOC entry 3414 (class 2606 OID 61296)
-- Name: hdb_action_log hdb_action_log_pkey; Type: CONSTRAINT; Schema: hdb_catalog; Owner: postgres
--

ALTER TABLE ONLY hdb_catalog.hdb_action_log
    ADD CONSTRAINT hdb_action_log_pkey PRIMARY KEY (id);


--
-- TOC entry 3417 (class 2606 OID 61298)
-- Name: hdb_cron_event_invocation_logs hdb_cron_event_invocation_logs_pkey; Type: CONSTRAINT; Schema: hdb_catalog; Owner: postgres
--

ALTER TABLE ONLY hdb_catalog.hdb_cron_event_invocation_logs
    ADD CONSTRAINT hdb_cron_event_invocation_logs_pkey PRIMARY KEY (id);


--
-- TOC entry 3420 (class 2606 OID 61300)
-- Name: hdb_cron_events hdb_cron_events_pkey; Type: CONSTRAINT; Schema: hdb_catalog; Owner: postgres
--

ALTER TABLE ONLY hdb_catalog.hdb_cron_events
    ADD CONSTRAINT hdb_cron_events_pkey PRIMARY KEY (id);


--
-- TOC entry 3423 (class 2606 OID 61302)
-- Name: hdb_metadata hdb_metadata_pkey; Type: CONSTRAINT; Schema: hdb_catalog; Owner: postgres
--

ALTER TABLE ONLY hdb_catalog.hdb_metadata
    ADD CONSTRAINT hdb_metadata_pkey PRIMARY KEY (id);


--
-- TOC entry 3425 (class 2606 OID 61304)
-- Name: hdb_metadata hdb_metadata_resource_version_key; Type: CONSTRAINT; Schema: hdb_catalog; Owner: postgres
--

ALTER TABLE ONLY hdb_catalog.hdb_metadata
    ADD CONSTRAINT hdb_metadata_resource_version_key UNIQUE (resource_version);


--
-- TOC entry 3427 (class 2606 OID 61306)
-- Name: hdb_scheduled_event_invocation_logs hdb_scheduled_event_invocation_logs_pkey; Type: CONSTRAINT; Schema: hdb_catalog; Owner: postgres
--

ALTER TABLE ONLY hdb_catalog.hdb_scheduled_event_invocation_logs
    ADD CONSTRAINT hdb_scheduled_event_invocation_logs_pkey PRIMARY KEY (id);


--
-- TOC entry 3430 (class 2606 OID 61308)
-- Name: hdb_scheduled_events hdb_scheduled_events_pkey; Type: CONSTRAINT; Schema: hdb_catalog; Owner: postgres
--

ALTER TABLE ONLY hdb_catalog.hdb_scheduled_events
    ADD CONSTRAINT hdb_scheduled_events_pkey PRIMARY KEY (id);


--
-- TOC entry 3432 (class 2606 OID 61310)
-- Name: hdb_schema_notifications hdb_schema_notifications_pkey; Type: CONSTRAINT; Schema: hdb_catalog; Owner: postgres
--

ALTER TABLE ONLY hdb_catalog.hdb_schema_notifications
    ADD CONSTRAINT hdb_schema_notifications_pkey PRIMARY KEY (id);


--
-- TOC entry 3435 (class 2606 OID 61312)
-- Name: hdb_version hdb_version_pkey; Type: CONSTRAINT; Schema: hdb_catalog; Owner: postgres
--

ALTER TABLE ONLY hdb_catalog.hdb_version
    ADD CONSTRAINT hdb_version_pkey PRIMARY KEY (hasura_uuid);


--
-- TOC entry 3437 (class 2606 OID 61314)
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- TOC entry 3439 (class 2606 OID 61316)
-- Name: consent consent_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.consent
    ADD CONSTRAINT consent_pkey PRIMARY KEY (id);


--
-- TOC entry 3444 (class 2606 OID 61318)
-- Name: fieldValues fieldValues_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."fieldValues"
    ADD CONSTRAINT "fieldValues_pkey" PRIMARY KEY (id);


--
-- TOC entry 3449 (class 2606 OID 61320)
-- Name: fields fields_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fields
    ADD CONSTRAINT fields_pkey PRIMARY KEY ("fieldId");


--
-- TOC entry 3451 (class 2606 OID 61322)
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- TOC entry 3453 (class 2606 OID 61324)
-- Name: roles roles_role_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_role_id_key UNIQUE (role_id);


--
-- TOC entry 3455 (class 2606 OID 61326)
-- Name: roles roles_slug_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_slug_key UNIQUE (slug);


--
-- TOC entry 3457 (class 2606 OID 61328)
-- Name: settings settings_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_key_key UNIQUE (key);


--
-- TOC entry 3459 (class 2606 OID 61330)
-- Name: settings settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_pkey PRIMARY KEY (id);


--
-- TOC entry 3461 (class 2606 OID 61332)
-- Name: ubi_network_cache ubi_network_cache_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ubi_network_cache
    ADD CONSTRAINT ubi_network_cache_pkey PRIMARY KEY (id);


--
-- TOC entry 3463 (class 2606 OID 61334)
-- Name: user_applications unique_user_benefit; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_applications
    ADD CONSTRAINT unique_user_benefit UNIQUE (user_id, benefit_id);


--
-- TOC entry 3465 (class 2606 OID 61336)
-- Name: user_applications user_applications_internal_application_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_applications
    ADD CONSTRAINT user_applications_internal_application_id_key UNIQUE (internal_application_id);


--
-- TOC entry 3467 (class 2606 OID 61338)
-- Name: user_applications user_applications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_applications
    ADD CONSTRAINT user_applications_pkey PRIMARY KEY (id);


--
-- TOC entry 3471 (class 2606 OID 61340)
-- Name: user_docs user_docs_doc_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_docs
    ADD CONSTRAINT user_docs_doc_id_key UNIQUE (doc_id);


--
-- TOC entry 3473 (class 2606 OID 61342)
-- Name: user_docs user_docs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_docs
    ADD CONSTRAINT user_docs_pkey PRIMARY KEY (id);


--
-- TOC entry 3475 (class 2606 OID 61344)
-- Name: user_info user_info_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_info
    ADD CONSTRAINT user_info_pkey PRIMARY KEY (id);


--
-- TOC entry 3477 (class 2606 OID 61346)
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- TOC entry 3479 (class 2606 OID 61348)
-- Name: user_wallets user_wallets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_wallets
    ADD CONSTRAINT user_wallets_pkey PRIMARY KEY (id);


--
-- TOC entry 3481 (class 2606 OID 61350)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 3483 (class 2606 OID 61352)
-- Name: users users_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_user_id_key UNIQUE (user_id);


--
-- TOC entry 3415 (class 1259 OID 61353)
-- Name: hdb_cron_event_invocation_event_id; Type: INDEX; Schema: hdb_catalog; Owner: postgres
--

CREATE INDEX hdb_cron_event_invocation_event_id ON hdb_catalog.hdb_cron_event_invocation_logs USING btree (event_id);


--
-- TOC entry 3418 (class 1259 OID 61354)
-- Name: hdb_cron_event_status; Type: INDEX; Schema: hdb_catalog; Owner: postgres
--

CREATE INDEX hdb_cron_event_status ON hdb_catalog.hdb_cron_events USING btree (status);


--
-- TOC entry 3421 (class 1259 OID 61355)
-- Name: hdb_cron_events_unique_scheduled; Type: INDEX; Schema: hdb_catalog; Owner: postgres
--

CREATE UNIQUE INDEX hdb_cron_events_unique_scheduled ON hdb_catalog.hdb_cron_events USING btree (trigger_name, scheduled_time) WHERE (status = 'scheduled'::text);


--
-- TOC entry 3428 (class 1259 OID 61356)
-- Name: hdb_scheduled_event_status; Type: INDEX; Schema: hdb_catalog; Owner: postgres
--

CREATE INDEX hdb_scheduled_event_status ON hdb_catalog.hdb_scheduled_events USING btree (status);


--
-- TOC entry 3433 (class 1259 OID 61357)
-- Name: hdb_version_one_row; Type: INDEX; Schema: hdb_catalog; Owner: postgres
--

CREATE UNIQUE INDEX hdb_version_one_row ON hdb_catalog.hdb_version USING btree (((version IS NOT NULL)));


--
-- TOC entry 3440 (class 1259 OID 61358)
-- Name: IDX_fieldValues_fieldId; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_fieldValues_fieldId" ON public."fieldValues" USING btree ("fieldId");


--
-- TOC entry 3441 (class 1259 OID 61359)
-- Name: IDX_fieldValues_fieldId_itemId; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_fieldValues_fieldId_itemId" ON public."fieldValues" USING btree ("fieldId", "itemId");


--
-- TOC entry 3442 (class 1259 OID 61360)
-- Name: IDX_fieldValues_itemId; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_fieldValues_itemId" ON public."fieldValues" USING btree ("itemId");


--
-- TOC entry 3445 (class 1259 OID 61361)
-- Name: IDX_fields_context; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_fields_context" ON public.fields USING btree (context);


--
-- TOC entry 3446 (class 1259 OID 61362)
-- Name: IDX_fields_context_contextType; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_fields_context_contextType" ON public.fields USING btree (context, "contextType");


--
-- TOC entry 3447 (class 1259 OID 61363)
-- Name: IDX_fields_name_context_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "IDX_fields_name_context_unique" ON public.fields USING btree (name, context);


--
-- TOC entry 3468 (class 1259 OID 61364)
-- Name: idx_user_docs_imported_from; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_docs_imported_from ON public.user_docs USING btree (imported_from);


--
-- TOC entry 3469 (class 1259 OID 61365)
-- Name: idx_user_docs_watcher_registered; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_docs_watcher_registered ON public.user_docs USING btree (watcher_registered);


--
-- TOC entry 3495 (class 2620 OID 61366)
-- Name: fields update_fields_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_fields_updated_at BEFORE UPDATE ON public.fields FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- TOC entry 3494 (class 2620 OID 61367)
-- Name: fieldValues update_fieldvalues_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_fieldvalues_updated_at BEFORE UPDATE ON public."fieldValues" FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- TOC entry 3484 (class 2606 OID 61368)
-- Name: hdb_cron_event_invocation_logs hdb_cron_event_invocation_logs_event_id_fkey; Type: FK CONSTRAINT; Schema: hdb_catalog; Owner: postgres
--

ALTER TABLE ONLY hdb_catalog.hdb_cron_event_invocation_logs
    ADD CONSTRAINT hdb_cron_event_invocation_logs_event_id_fkey FOREIGN KEY (event_id) REFERENCES hdb_catalog.hdb_cron_events(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3485 (class 2606 OID 61373)
-- Name: hdb_scheduled_event_invocation_logs hdb_scheduled_event_invocation_logs_event_id_fkey; Type: FK CONSTRAINT; Schema: hdb_catalog; Owner: postgres
--

ALTER TABLE ONLY hdb_catalog.hdb_scheduled_event_invocation_logs
    ADD CONSTRAINT hdb_scheduled_event_invocation_logs_event_id_fkey FOREIGN KEY (event_id) REFERENCES hdb_catalog.hdb_scheduled_events(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3488 (class 2606 OID 61378)
-- Name: fieldValues FK_fieldValues_fieldId; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."fieldValues"
    ADD CONSTRAINT "FK_fieldValues_fieldId" FOREIGN KEY ("fieldId") REFERENCES public.fields("fieldId") ON DELETE CASCADE;


--
-- TOC entry 3486 (class 2606 OID 61383)
-- Name: audit_logs audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id);


--
-- TOC entry 3487 (class 2606 OID 61388)
-- Name: consent consent_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.consent
    ADD CONSTRAINT consent_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id);


--
-- TOC entry 3489 (class 2606 OID 61393)
-- Name: user_applications user_applications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_applications
    ADD CONSTRAINT user_applications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id);


--
-- TOC entry 3490 (class 2606 OID 61398)
-- Name: user_info user_info_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_info
    ADD CONSTRAINT user_info_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id);


--
-- TOC entry 3491 (class 2606 OID 61403)
-- Name: user_roles user_roles_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(role_id);


--
-- TOC entry 3492 (class 2606 OID 61408)
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id);


--
-- TOC entry 3493 (class 2606 OID 61413)
-- Name: user_wallets user_wallets_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_wallets
    ADD CONSTRAINT user_wallets_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id);


-- Completed on 2025-09-07 18:43:54 UTC

--
-- PostgreSQL database dump complete
--
