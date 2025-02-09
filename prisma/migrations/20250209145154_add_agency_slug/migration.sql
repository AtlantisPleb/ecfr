-- First, add the column as nullable
ALTER TABLE "Agency" ADD COLUMN "slug" TEXT;

-- Update existing rows with a slug based on the name
UPDATE "Agency" 
SET "slug" = LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9]+', '-', 'g'));

-- Add the unique constraint
CREATE UNIQUE INDEX "Agency_slug_key" ON "Agency"("slug");

-- Make the column required
ALTER TABLE "Agency" ALTER COLUMN "slug" SET NOT NULL;