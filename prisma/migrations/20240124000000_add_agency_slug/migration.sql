-- First, add the column as nullable
ALTER TABLE "Agency" ADD COLUMN "slug" TEXT;

-- Update existing rows with generated slugs
UPDATE "Agency" 
SET "slug" = LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9]+', '-', 'g'));

-- Add unique constraint and make the column required
ALTER TABLE "Agency" ALTER COLUMN "slug" SET NOT NULL;
ALTER TABLE "Agency" ADD CONSTRAINT "Agency_slug_key" UNIQUE ("slug");