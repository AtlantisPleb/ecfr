-- First drop all existing tables
DROP TABLE IF EXISTS "WordCount" CASCADE;
DROP TABLE IF EXISTS "Change" CASCADE;
DROP TABLE IF EXISTS "Version" CASCADE;
DROP TABLE IF EXISTS "Title" CASCADE;
DROP TABLE IF EXISTS "Agency" CASCADE;

-- Now recreate with new schema
CREATE TABLE "Agency" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "short_name" TEXT,
    "display_name" TEXT NOT NULL,
    "sortable_name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "parent_id" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Agency_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Title" (
    "id" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'CFR',
    "chapter" INTEGER,
    "part" INTEGER,
    "subpart" TEXT,
    "section" TEXT,
    "url" TEXT,
    "agencyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Title_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Chapter" (
    "id" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "titleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Chapter_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Part" (
    "id" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Part_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Subpart" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "partId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subpart_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Section" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "subpartId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Section_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Version" (
    "id" TEXT NOT NULL,
    "titleId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "wordCount" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Version_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Change" (
    "id" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Change_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WordCount" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WordCount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TextMetrics" (
    "id" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "wordCount" INTEGER NOT NULL,
    "uniqueWords" INTEGER NOT NULL,
    "avgWordLength" DOUBLE PRECISION NOT NULL,
    "avgSentenceLen" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TextMetrics_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Reference" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "context" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reference_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ActivityMetrics" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "newContent" INTEGER NOT NULL,
    "modifiedContent" INTEGER NOT NULL,
    "deletedContent" INTEGER NOT NULL,
    "totalWords" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityMetrics_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE UNIQUE INDEX "Agency_slug_key" ON "Agency"("slug");

-- Add foreign key constraints
ALTER TABLE "Agency" ADD CONSTRAINT "Agency_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "Agency"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Title" ADD CONSTRAINT "Title_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Chapter" ADD CONSTRAINT "Chapter_titleId_fkey" FOREIGN KEY ("titleId") REFERENCES "Title"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Part" ADD CONSTRAINT "Part_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Subpart" ADD CONSTRAINT "Subpart_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Section" ADD CONSTRAINT "Section_subpartId_fkey" FOREIGN KEY ("subpartId") REFERENCES "Subpart"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Version" ADD CONSTRAINT "Version_titleId_fkey" FOREIGN KEY ("titleId") REFERENCES "Title"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Change" ADD CONSTRAINT "Change_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "Version"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WordCount" ADD CONSTRAINT "WordCount_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TextMetrics" ADD CONSTRAINT "TextMetrics_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "Version"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Reference" ADD CONSTRAINT "Reference_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Version"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Reference" ADD CONSTRAINT "Reference_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "Version"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ActivityMetrics" ADD CONSTRAINT "ActivityMetrics_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;