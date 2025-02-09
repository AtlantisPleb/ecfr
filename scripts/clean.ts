import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const CHECKPOINT_FILE = path.join(__dirname, '../checkpoint.json')

async function cleanDatabase() {
  const prisma = new PrismaClient()
  
  try {
    console.log('Cleaning database...')

    // Delete in correct order to handle foreign key constraints
    console.log('Deleting word counts...')
    await prisma.wordCount.deleteMany()
    
    console.log('Deleting changes...')
    await prisma.change.deleteMany()
    
    console.log('Deleting versions...')
    await prisma.version.deleteMany()
    
    console.log('Deleting titles...')
    await prisma.title.deleteMany()
    
    console.log('Deleting agencies...')
    await prisma.agency.deleteMany()

    // Remove checkpoint file if it exists
    if (fs.existsSync(CHECKPOINT_FILE)) {
      console.log('Removing checkpoint file...')
      fs.unlinkSync(CHECKPOINT_FILE)
    }

    console.log('Database cleaned successfully')
  } catch (error) {
    console.error('Error cleaning database:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
cleanDatabase()