import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
  log: ['error']
})

export async function connectDB(): Promise<void> {
  try {
    await prisma.$connect()
  } catch (error) {
    console.error('Database connection failed:', error)
    throw error
  }
}

export async function disconnectDB(): Promise<void> {
  await prisma.$disconnect()
}

export { prisma }