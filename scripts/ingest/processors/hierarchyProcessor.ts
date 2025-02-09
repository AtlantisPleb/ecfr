import { PrismaClient } from '@prisma/client'
import { ProcessedContent } from '../types'

const prisma = new PrismaClient()

export async function processHierarchy(
  titleId: string,
  structure: ProcessedContent['structure']
): Promise<void> {
  // Delete existing hierarchy
  await prisma.section.deleteMany({
    where: {
      subpart: {
        part: {
          chapter: {
            titleId
          }
        }
      }
    }
  })

  await prisma.subpart.deleteMany({
    where: {
      part: {
        chapter: {
          titleId
        }
      }
    }
  })

  await prisma.part.deleteMany({
    where: {
      chapter: {
        titleId
      }
    }
  })

  await prisma.chapter.deleteMany({
    where: { titleId }
  })

  // Create new hierarchy
  for (const chapter of structure.chapters) {
    const chapterRecord = await prisma.chapter.create({
      data: {
        titleId,
        number: chapter.number,
        name: chapter.name
      }
    })

    for (const part of chapter.parts) {
      const partRecord = await prisma.part.create({
        data: {
          chapterId: chapterRecord.id,
          number: part.number,
          name: part.name
        }
      })

      for (const subpart of part.subparts) {
        const subpartRecord = await prisma.subpart.create({
          data: {
            partId: partRecord.id,
            name: subpart.name
          }
        })

        for (const section of subpart.sections) {
          await prisma.section.create({
            data: {
              subpartId: subpartRecord.id,
              number: section.number,
              name: section.name,
              content: section.content
            }
          })
        }
      }
    }
  }
}