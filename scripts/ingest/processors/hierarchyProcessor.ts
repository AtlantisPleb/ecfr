import { PrismaClient } from '@prisma/client'
import { ProcessedContent } from '../types'

const prisma = new PrismaClient()

export async function processHierarchy(
  titleId: string,
  structure: ProcessedContent['structure']
): Promise<void> {
  console.log('\nProcessing hierarchy...')
  console.log(`Found ${structure.chapters.length} chapters`)

  // Delete existing hierarchy
  console.log('Cleaning up existing hierarchy...')
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
  console.log('- Deleted existing sections')

  await prisma.subpart.deleteMany({
    where: {
      part: {
        chapter: {
          titleId
        }
      }
    }
  })
  console.log('- Deleted existing subparts')

  await prisma.part.deleteMany({
    where: {
      chapter: {
        titleId
      }
    }
  })
  console.log('- Deleted existing parts')

  await prisma.chapter.deleteMany({
    where: { titleId }
  })
  console.log('- Deleted existing chapters')

  // Create new hierarchy
  console.log('\nCreating new hierarchy...')
  for (const chapter of structure.chapters) {
    console.log(`\nProcessing Chapter ${chapter.number}: ${chapter.name}`)
    const chapterRecord = await prisma.chapter.create({
      data: {
        titleId,
        number: chapter.number,
        name: chapter.name
      }
    })
    console.log(`Created chapter record: ${chapterRecord.id}`)

    console.log(`Found ${chapter.parts.length} parts in chapter ${chapter.number}`)
    for (const part of chapter.parts) {
      console.log(`Processing Part ${part.number}: ${part.name}`)
      const partRecord = await prisma.part.create({
        data: {
          chapterId: chapterRecord.id,
          number: part.number,
          name: part.name
        }
      })
      console.log(`Created part record: ${partRecord.id}`)

      console.log(`Found ${part.subparts.length} subparts in part ${part.number}`)
      for (const subpart of part.subparts) {
        console.log(`Processing Subpart: ${subpart.name}`)
        const subpartRecord = await prisma.subpart.create({
          data: {
            partId: partRecord.id,
            name: subpart.name
          }
        })
        console.log(`Created subpart record: ${subpartRecord.id}`)

        console.log(`Found ${subpart.sections.length} sections in subpart ${subpart.name}`)
        for (const section of subpart.sections) {
          console.log(`Processing Section ${section.number}: ${section.name}`)
          const sectionRecord = await prisma.section.create({
            data: {
              subpartId: subpartRecord.id,
              number: section.number,
              name: section.name,
              content: section.content
            }
          })
          console.log(`Created section record: ${sectionRecord.id}`)
        }
      }
    }
  }

  console.log('\nHierarchy processing complete!')
  console.log('Summary:')
  console.log(`- ${structure.chapters.length} chapters`)
  console.log(`- ${structure.chapters.reduce((sum, ch) => sum + ch.parts.length, 0)} parts`)
  console.log(`- ${structure.chapters.reduce((sum, ch) => 
    sum + ch.parts.reduce((psum, p) => psum + p.subparts.length, 0), 0)} subparts`)
  console.log(`- ${structure.chapters.reduce((sum, ch) => 
    sum + ch.parts.reduce((psum, p) => 
      psum + p.subparts.reduce((ssum, s) => ssum + s.sections.length, 0), 0), 0)} sections`)
}