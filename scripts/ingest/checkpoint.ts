import { PrismaClient } from '@prisma/client'
import { CheckpointData } from './types.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const CHECKPOINT_FILE = path.join(__dirname, '../../checkpoint.json')

export async function loadCheckpoint(): Promise<CheckpointData | null> {
  try {
    if (fs.existsSync(CHECKPOINT_FILE)) {
      const data = JSON.parse(fs.readFileSync(CHECKPOINT_FILE, 'utf8'))
      return {
        ...data,
        timestamp: new Date(data.timestamp)
      }
    }
  } catch (error) {
    console.warn('Error loading checkpoint:', error)
  }
  return null
}

export async function saveCheckpoint(data: Partial<CheckpointData>): Promise<void> {
  try {
    const existing = await loadCheckpoint() || {
      lastAgencyId: null,
      lastTitleNumber: null,
      timestamp: new Date(),
      progress: {
        agenciesProcessed: 0,
        titlesProcessed: 0
      }
    }

    const updated: CheckpointData = {
      ...existing,
      ...data,
      timestamp: new Date()
    }

    fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify(updated, null, 2))
  } catch (error) {
    console.error('Error saving checkpoint:', error)
    throw error
  }
}

export async function shouldSkipAgency(
  agencyId: string | undefined, 
  checkpoint: CheckpointData | null,
  prisma: PrismaClient
): Promise<boolean> {
  // Validate agency ID
  if (!agencyId) {
    console.warn('Invalid agency ID, not skipping')
    return false
  }

  // First check if we have any data at all
  const count = await prisma.agency.count()
  if (count === 0) {
    console.log('No data in database, starting fresh')
    return false
  }

  // If we have a checkpoint, use it
  if (checkpoint?.lastAgencyId) {
    const wasProcessed = await prisma.agency.findUnique({
      where: { id: checkpoint.lastAgencyId }
    })
    if (!wasProcessed) {
      console.log('Last processed agency not found, starting fresh')
      return false
    }
    return agencyId !== checkpoint.lastAgencyId
  }

  // No checkpoint but we have data - check if this agency exists
  const exists = await prisma.agency.findUnique({
    where: { id: agencyId }
  })
  return !!exists
}

export async function shouldSkipTitle(
  titleNumber: number,
  checkpoint: CheckpointData | null
): Promise<boolean> {
  if (!checkpoint?.lastTitleNumber) return false
  return titleNumber <= checkpoint.lastTitleNumber
}

export function formatProgress(current: number, total: number): string {
  const percentage = (current / total * 100).toFixed(2)
  const bar = '█'.repeat(Math.floor(current / total * 20)).padEnd(20, '░')
  return `${bar} ${percentage}% (${current}/${total})`
}