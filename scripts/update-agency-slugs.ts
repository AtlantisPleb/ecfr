import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  console.log('Starting agency slug update...')
  
  const agencies = await prisma.agency.findMany()
  console.log(`Found ${agencies.length} agencies to update`)
  
  for (const agency of agencies) {
    const slug = agency.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    console.log(`Updating "${agency.name}" with slug "${slug}"`)
    
    await prisma.agency.update({
      where: { id: agency.id },
      data: { slug }
    })
  }
  
  console.log('Finished updating agency slugs')
}

main()
  .catch((e) => {
    console.error('Error updating agency slugs:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })