import { PrismaClient } from '@prisma/client'
import { ECFRTitle, ProcessedContent } from '../types'
import { fetchTitleContent } from '../api'
import { processHierarchy } from './hierarchyProcessor'

function formatProgress(current: number, total: number): string {
  const adjustedCurrent = Math.min(current, total)
  const percentage = Math.round((adjustedCurrent / total) * 100)
  const width = 50
  const filled = Math.round((width * adjustedCurrent) / total)
  const empty = Math.max(0, width - filled)
  const bar = '█'.repeat(filled) + '░'.repeat(empty)
  return `${bar} ${percentage}% (${adjustedCurrent}/${total})`
}

export async function ensureTitleExists(
  prisma: PrismaClient,
  title: ECFRTitle,
  current: number,
  total: number
): Promise<void> {
  try {
    process.stdout.write(`\\rProcessing title ${title.number}: ${title.name} - ${formatProgress(current, total)}`)
    
    const existing = await prisma.title.findUnique({
      where: { number: title.number }
    })

    if (!existing) {
      await prisma.title.create({
        data: {
          id: `title-${title.number}`,
          number: title.number,
          name: title.name,
          type: 'CFR'
        }
      })
      process.stdout.write(` - Created`)
    } else if (existing.name !== title.name) {
      await prisma.title.update({
        where: { number: title.number },
        data: { name: title.name }
      })
      process.stdout.write(` - Updated`)
    } else {
      process.stdout.write(` - No changes`)
    }

    // If this is the last title, add a newline
    if (current === total) {
      process.stdout.write('\\n')
    }
  } catch (error) {
    // Add newline before error for clean output
    process.stdout.write('\\n')
    console.error(`Error ensuring title ${title.number} exists:`, error)
    throw error
  }
}

export async function processTitleContent(
  prisma: PrismaClient,
  titleNumber: number,
  agencyId: string
): Promise<void> {
  const result = await fetchTitleContent(titleNumber)
  if (!result) {
    console.log(`No content found for title ${titleNumber}, skipping`)
    return
  }

  const { content, wordCount, textMetrics, references, structure } = result

  // Connect agency to title (many-to-many)
  await prisma.agency.update({
    where: { id: agencyId },
    data: {
      titles: {
        connect: { number: titleNumber }
      }
    }
  }).catch(error => {
    console.error('Database error connecting agency to title:', error)
    throw error
  })

  // Process hierarchical structure
  await processHierarchy(prisma, titleNumber, structure)

  // Check for changes and create new version if needed
  const latestVersion = await prisma.version.findFirst({
    where: { titleId: `title-${titleNumber}` },
    orderBy: { date: 'desc' }
  })

  if (!latestVersion || latestVersion.content !== content) {
    const newVersion = await prisma.version.create({
      data: {
        titleId: `title-${titleNumber}`,
        content,
        wordCount,
        date: new Date(),
        changes: {
          create: {
            type: latestVersion ? 'MODIFY' : 'ADD',
            section: 'full',
            description: latestVersion ? 'Content updated' : 'Initial version'
          }
        },
        textMetrics: {
          create: textMetrics
        }
      }
    })

    // Create references
    for (const ref of references) {
      await prisma.reference.create({
        data: {
          sourceId: newVersion.id,
          targetId: newVersion.id, // For now, reference itself
          context: ref.context,
          type: ref.type
        }
      }).catch(error => {
        console.error('Database error creating reference:', error)
      })
    }

    // Create word count
    await prisma.wordCount.create({
      data: {
        agencyId,
        count: wordCount,
        date: new Date()
      }
    })

    // Calculate activity metrics if this is an update
    if (latestVersion) {
      await prisma.activityMetrics.create({
        data: {
          agencyId,
          date: new Date(),
          newContent: textMetrics.wordCount - latestVersion.wordCount,
          modifiedContent: Math.abs(textMetrics.wordCount - latestVersion.wordCount),
          deletedContent: Math.max(0, latestVersion.wordCount - textMetrics.wordCount),
          totalWords: textMetrics.wordCount
        }
      }).catch(error => {
        console.error('Database error creating activity metrics:', error)
      })
    }
  }
}