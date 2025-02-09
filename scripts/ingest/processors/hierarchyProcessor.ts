import { PrismaClient } from '@prisma/client'
import { ProcessedContent } from '../types'

export async function processHierarchy(
  prisma: PrismaClient,
  titleNumber: number,
  structure: ProcessedContent['structure']
): Promise<void> {
  const titleId = `title-${titleNumber}`

  // First delete any existing hierarchy for this title
  await deleteExistingHierarchy(prisma, titleId)

  // Process new hierarchy
  for (const chapter of structure.chapters) {
    const dbChapter = await createChapter(prisma, titleId, chapter)
    for (const part of chapter.parts) {
      const dbPart = await createPart(prisma, dbChapter.id, part)
      for (const subpart of part.subparts) {
        const dbSubpart = await createSubpart(prisma, dbPart.id, subpart)
        for (const section of subpart.sections) {
          await createSection(prisma, dbSubpart.id, section)
        }
      }
    }
  }
}

async function deleteExistingHierarchy(
  prisma: PrismaClient,
  titleId: string
): Promise<void> {
  // Delete in reverse order to respect foreign key constraints
  const chapters = await prisma.chapter.findMany({
    where: { titleId },
    include: {
      parts: {
        include: {
          subparts: {
            include: {
              sections: true
            }
          }
        }
      }
    }
  })

  for (const chapter of chapters) {
    for (const part of chapter.parts) {
      for (const subpart of part.subparts) {
        // Delete sections
        await prisma.section.deleteMany({
          where: { subpartId: subpart.id }
        })
      }
      // Delete subparts
      await prisma.subpart.deleteMany({
        where: { partId: part.id }
      })
    }
    // Delete parts
    await prisma.part.deleteMany({
      where: { chapterId: chapter.id }
    })
  }
  // Delete chapters
  await prisma.chapter.deleteMany({
    where: { titleId }
  })
}

async function createChapter(
  prisma: PrismaClient,
  titleId: string,
  chapter: ProcessedContent['structure']['chapters'][0]
) {
  return prisma.chapter.create({
    data: {
      id: `chapter-${titleId}-${chapter.number}`,
      number: chapter.number,
      name: chapter.name,
      titleId
    }
  })
}

async function createPart(
  prisma: PrismaClient,
  chapterId: string,
  part: ProcessedContent['structure']['chapters'][0]['parts'][0]
) {
  return prisma.part.create({
    data: {
      id: `part-${chapterId}-${part.number}`,
      number: part.number,
      name: part.name,
      chapterId
    }
  })
}

async function createSubpart(
  prisma: PrismaClient,
  partId: string,
  subpart: ProcessedContent['structure']['chapters'][0]['parts'][0]['subparts'][0]
) {
  return prisma.subpart.create({
    data: {
      id: `subpart-${partId}-${subpart.name}`,
      name: subpart.name,
      partId
    }
  })
}

async function createSection(
  prisma: PrismaClient,
  subpartId: string,
  section: ProcessedContent['structure']['chapters'][0]['parts'][0]['subparts'][0]['sections'][0]
) {
  return prisma.section.create({
    data: {
      id: `section-${subpartId}-${section.number}`,
      number: section.number,
      name: section.name,
      content: section.content,
      subpartId
    }
  })
}