import { PrismaClient } from '@prisma/client'
import { CheckpointData } from './types'
import fs from 'fs'
import path from 'path'

const CHECKPOINT_FILE = path.join(process.cwd(), 'checkpoint.json')

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
  agencyId: string, 
  checkpoint: CheckpointData | null,
  prisma: PrismaClient
): Promise<boolean> {
  if (!checkpoint?.lastAgencyId) {
    // No checkpoint, check if we have any data
    const count = await prisma.agency.count()
    if (count === 0) return false // Fresh start
    
    // We have data but no checkpoint, start from beginning
    const firstAgency = await prisma.agency.findFirst({
      orderBy: { name: 'asc' }
    })
    return agencyId !== firstAgency?.id
  }

  // Skip until we reach the last processed agency
  return agencyId !== checkpoint.lastAgencyId
}

export async function shouldSkipTitle(
  titleNumber: number,
  checkpoint: CheckpointData | null
): Promise<boolean> {
  if (!checkpoint?.lastTitleNumber) return false
  return titleNumber <= checkpoint.lastTitleNumber
}