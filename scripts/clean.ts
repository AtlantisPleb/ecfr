import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    console.log('Cleaning database...')

    // Delete in order to respect foreign key constraints
    console.log('Deleting word counts...')
    await prisma.wordCount.deleteMany()

    console.log('Deleting text metrics...')
    await prisma.textMetrics.deleteMany()

    console.log('Deleting references...')
    await prisma.reference.deleteMany()

    console.log('Deleting activity metrics...')
    await prisma.activityMetrics.deleteMany()

    console.log('Deleting changes...')
    await prisma.change.deleteMany()

    console.log('Deleting versions...')
    await prisma.version.deleteMany()

    console.log('Deleting sections...')
    await prisma.section.deleteMany()

    console.log('Deleting subparts...')
    await prisma.subpart.deleteMany()

    console.log('Deleting parts...')
    await prisma.part.deleteMany()

    console.log('Deleting chapters...')
    await prisma.chapter.deleteMany()

    // Delete agency-title relationships first
    console.log('Deleting agency-title relationships...')
    await prisma.$executeRaw`DELETE FROM "_AgencyTitles";`

    console.log('Deleting titles...')
    await prisma.title.deleteMany()

    console.log('Deleting agencies...')
    await prisma.agency.deleteMany()

    console.log('Database cleaned successfully')
  } catch (error) {
    console.error('Error cleaning database:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

main()