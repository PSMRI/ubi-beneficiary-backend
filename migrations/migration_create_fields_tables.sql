-- Migration: Create fields and fieldValues tables
-- Run this SQL script to create the missing tables for custom fields functionality

-- Create enum types for field types and contexts
CREATE TYPE field_type_enum AS ENUM (
    'text', 'textarea', 'numeric', 'date', 'datetime', 'drop_down', 
    'multi_select', 'checkbox', 'radio', 'email', 'phone', 'url', 
    'file', 'json', 'currency', 'percent', 'rating'
);

CREATE TYPE field_context_enum AS ENUM (
    'USERS', 'COHORTS', 'APPLICATIONS'
);

-- Create fields table
CREATE TABLE fields (
    "fieldId" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    label VARCHAR(255) NOT NULL,
    type field_type_enum NOT NULL,
    context field_context_enum NOT NULL,
    "contextType" VARCHAR(100),
    ordering INTEGER DEFAULT 0,
    "isRequired" BOOLEAN DEFAULT FALSE,
    "isHidden" BOOLEAN DEFAULT FALSE,
    "fieldParams" JSONB,
    "fieldAttributes" JSONB,
    "sourceDetails" JSONB,
    "dependsOn" JSONB,
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Create fieldValues table
CREATE TABLE "fieldValues" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "fieldId" UUID NOT NULL,
    "itemId" UUID NOT NULL,
    value TEXT,
    metadata JSONB,
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY ("fieldId") REFERENCES fields("fieldId") ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX idx_fields_context ON fields(context);
CREATE INDEX idx_fields_context_type ON fields(context, "contextType");
CREATE INDEX idx_fields_ordering ON fields(ordering);
CREATE INDEX idx_fields_name_context ON fields(name, context);
CREATE INDEX idx_field_values_field_id ON "fieldValues"("fieldId");
CREATE INDEX idx_field_values_item_id ON "fieldValues"("itemId");
CREATE INDEX idx_field_values_field_item ON "fieldValues"("fieldId", "itemId");

-- Add comments for documentation
COMMENT ON TABLE fields IS 'Stores the definition/metadata of each custom field that can be associated with various entities';
COMMENT ON TABLE "fieldValues" IS 'Stores the value of each custom field for a specific entity instance';
COMMENT ON COLUMN fields."fieldId" IS 'Unique identifier for the field';
COMMENT ON COLUMN fields.name IS 'Internal name of the field';
COMMENT ON COLUMN fields.label IS 'Display label for the field';
COMMENT ON COLUMN fields.type IS 'Field data type';
COMMENT ON COLUMN fields.context IS 'Entity context this field belongs to';
COMMENT ON COLUMN fields."contextType" IS 'Context subtype or role';
COMMENT ON COLUMN fields.ordering IS 'Display order for the field';
COMMENT ON COLUMN fields."isRequired" IS 'Whether the field is required';
COMMENT ON COLUMN fields."isHidden" IS 'Whether the field is hidden from UI';
COMMENT ON COLUMN fields."fieldParams" IS 'Additional field parameters';
COMMENT ON COLUMN fields."fieldAttributes" IS 'Field attributes and metadata';
COMMENT ON COLUMN fields."sourceDetails" IS 'Source details for dynamic fields';
COMMENT ON COLUMN fields."dependsOn" IS 'Field dependencies';
COMMENT ON COLUMN "fieldValues".id IS 'Unique identifier for the field value';
COMMENT ON COLUMN "fieldValues"."fieldId" IS 'Reference to the field definition';
COMMENT ON COLUMN "fieldValues"."itemId" IS 'Generic entity instance ID';
COMMENT ON COLUMN "fieldValues".value IS 'The field value';
COMMENT ON COLUMN "fieldValues".metadata IS 'Additional metadata for the field value'; 