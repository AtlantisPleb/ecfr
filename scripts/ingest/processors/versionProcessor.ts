import { PrismaClient } from '@prisma/client'
import { processMetrics, processActivityMetrics } from './metricsProcessor'

export async function processVersion(
  prisma: PrismaClient,
  titleId: string,
  content: string,
  wordCount: number,
  agencyId: string
): Promise<void> {
  // Check for existing version
  const latestVersion = await prisma.version.findFirst({
    where: { titleId },
    orderBy: { date: 'desc' }
  })

  // Only create new version if content has changed
  if (!latestVersion || latestVersion.content !== content) {
    const newVersion = await prisma.version.create({
      data: {
        titleId,
        content,
        wordCount,
        date: new Date(),
        changes: {
          create: {
            type: latestVersion ? 'MODIFY' : 'ADD',
            section: 'full',
            description: latestVersion ? 'Content updated' : 'Initial version'
          }
        }
      }
    })

    // Process metrics for new version
    await processMetrics(prisma, newVersion.id, content, agencyId)

    // Process activity metrics if this is an update
    if (latestVersion) {
      await processActivityMetrics(
        prisma,
        agencyId,
        latestVersion.wordCount,
        wordCount
      )
    }
  }
}