import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Create a sample agency
  const agency = await prisma.agency.upsert({
    where: { id: 'agency-dot' },
    update: {},
    create: {
      id: 'agency-dot',
      name: 'Department of Transportation',
      titles: {
        create: {
          number: 49,
          name: 'Transportation',
          versions: {
            create: {
              content: 'Sample transportation regulation content.',
              wordCount: 4,
              date: new Date(),
              changes: {
                create: {
                  type: 'ADD',
                  section: '1.1',
                  description: 'Initial version'
                }
              }
            }
          }
        }
      },
      wordCounts: {
        create: {
          count: 4,
          date: new Date()
        }
      }
    }
  })

  // Create another sample agency
  const agency2 = await prisma.agency.upsert({
    where: { id: 'agency-epa' },
    update: {},
    create: {
      id: 'agency-epa',
      name: 'Environmental Protection Agency',
      titles: {
        create: {
          number: 40,
          name: 'Protection of Environment',
          versions: {
            create: {
              content: 'Sample environmental protection regulation content.',
              wordCount: 5,
              date: new Date(),
              changes: {
                create: {
                  type: 'ADD',
                  section: '1.1',
                  description: 'Initial version'
                }
              }
            }
          }
        }
      },
      wordCounts: {
        create: {
          count: 5,
          date: new Date()
        }
      }
    }
  })

  console.log({ agency, agency2 })
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })