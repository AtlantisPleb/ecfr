-- AlterTable
ALTER TABLE "Version" 
  ADD COLUMN "amendment_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "effective_date" TIMESTAMP(3),
  ADD COLUMN "published_date" TIMESTAMP(3),
  ADD COLUMN "authority" TEXT,
  ADD COLUMN "source" TEXT,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Change"
  ADD COLUMN "amendment_part" TEXT,
  ADD COLUMN "effective_date" TIMESTAMP(3),
  ADD COLUMN "url" TEXT,
  ADD COLUMN "fr_volume" INTEGER,
  ADD COLUMN "fr_page" INTEGER,
  ADD COLUMN "fr_date" TIMESTAMP(3),
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "Citation" (
  "id" TEXT NOT NULL,
  "versionId" TEXT NOT NULL,
  "volume" INTEGER NOT NULL,
  "page" INTEGER NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "type" TEXT NOT NULL,
  "url" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Citation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Citation_volume_page_key" ON "Citation"("volume", "page");

-- AddForeignKey
ALTER TABLE "Citation" ADD CONSTRAINT "Citation_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "Version"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Update existing Version records to set amendment_date
UPDATE "Version" SET "amendment_date" = "date" WHERE "amendment_date" IS NULL;

-- Drop old date column after migration
ALTER TABLE "Version" DROP COLUMN "date";