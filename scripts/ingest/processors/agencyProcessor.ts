import { PrismaClient } from '@prisma/client'
import { ECFRAgency } from '../types'

function generateSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
}

function generateSortableName(name: string): string {
  return name
    .toLowerCase()
    .replace(/^the\\s+/i, '') // Remove leading "The"
    .replace(/[^a-z0-9\\s]/g, '') // Remove special chars
    .trim()
}

export async function processAgency(
  prisma: PrismaClient,
  agency: ECFRAgency
): Promise<string> {
  if (!agency.slug) {
    throw new Error(`Agency missing slug: ${agency.name}`)
  }

  const displayName = agency.display_name || agency.name
  const slug = generateSlug(displayName)
  const sortableName = generateSortableName(displayName)

  // Create or update agency
  const dbAgency = await prisma.agency.upsert({
    where: { id: agency.slug },
    create: {
      id: agency.slug,
      name: agency.name,
      short_name: agency.short_name,
      display_name: displayName,
      sortable_name: sortableName,
      slug,
      parent_id: agency.parent_id
    },
    update: {
      name: agency.name,
      short_name: agency.short_name,
      display_name: displayName,
      sortable_name: sortableName,
      slug,
      parent_id: agency.parent_id
    }
  }).catch(error => {
    console.error('Database error creating/updating agency:', error)
    throw error
  })

  return dbAgency.id
}