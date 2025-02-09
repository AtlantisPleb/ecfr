import { PrismaClient } from '@prisma/client'
import { ECFRAgency } from '../types'

const prisma = new PrismaClient()

function generateSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
}

function generateSortableName(name: string): string {
  return name
    .toLowerCase()
    .replace(/^the\s+/i, '') // Remove leading "The"
    .replace(/[^a-z0-9\s]/g, '') // Remove special chars
    .trim()
}

export async function processAgency(agency: ECFRAgency): Promise<string> {
  if (!agency.slug) {
    throw new Error(`Agency missing slug: ${agency.name}`)
  }

  const displayName = agency.display_name || agency.name
  const slug = generateSlug(displayName)
  const sortableName = generateSortableName(displayName)

  try {
    // Create or update agency
    const dbAgency = await prisma.agency.upsert({
      where: { slug },
      create: {
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
        parent_id: agency.parent_id
      }
    })

    return dbAgency.id
  } catch (error) {
    console.error('Error processing agency:', error)
    throw error
  }
}

export async function getAgencyBySlug(slug: string) {
  return prisma.agency.findUnique({
    where: { slug },
    include: {
      titles: true,
      wordCounts: {
        orderBy: {
          date: 'desc'
        },
        take: 1
      }
    }
  })
}

export async function deleteAgency(id: string): Promise<void> {
  await prisma.agency.delete({
    where: { id }
  })
}