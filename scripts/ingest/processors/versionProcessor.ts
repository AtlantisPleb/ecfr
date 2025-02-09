import { PrismaClient } from '@prisma/client';
import { 
  ECFRVersion, 
  ECFRCitation,
  ECFRChange,
  VersionProcessingResult,
  ChangeProcessingResult 
} from '../types';

const prisma = new PrismaClient();

export async function processVersion(
  titleId: string,
  version: ECFRVersion
): Promise<VersionProcessingResult> {
  try {
    // Create version record
    const versionRecord = await prisma.version.create({
      data: {
        titleId,
        content: '', // Content will be added separately
        wordCount: 0, // Will be calculated later
        amendment_date: new Date(version.amendment_date),
        effective_date: version.effective_date ? new Date(version.effective_date) : null,
        published_date: version.published_date ? new Date(version.published_date) : null,
        authority: version.authority,
        source: version.source,
        citations: {
          create: version.fr_citations.map(citation => ({
            volume: citation.volume,
            page: citation.page,
            date: new Date(citation.date),
            type: citation.type,
            url: citation.url
          }))
        }
      }
    });

    // Process changes
    const changeResults = await Promise.all(
      version.changes.map(change => processChange(versionRecord.id, change))
    );

    return {
      success: true,
      data: {
        id: versionRecord.id,
        amendment_date: versionRecord.amendment_date,
        changes: changeResults
      }
    };
  } catch (error) {
    console.error('Error processing version:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error processing version'
    };
  }
}

async function processChange(
  versionId: string,
  change: ECFRChange
): Promise<ChangeProcessingResult> {
  try {
    const changeRecord = await prisma.change.create({
      data: {
        versionId,
        type: change.type,
        section: change.section,
        description: change.description,
        amendment_part: change.amendment_part,
        effective_date: change.effective_date ? new Date(change.effective_date) : null,
        url: change.url,
        // Federal Register citation if available
        ...(change.fr_citation && {
          fr_volume: change.fr_citation.volume,
          fr_page: change.fr_citation.page,
          fr_date: new Date(change.fr_citation.date)
        })
      }
    });

    return {
      success: true,
      data: {
        id: changeRecord.id,
        type: changeRecord.type,
        section: changeRecord.section
      }
    };
  } catch (error) {
    console.error('Error processing change:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error processing change'
    };
  }
}

export async function updateVersionContent(
  versionId: string,
  content: string,
  wordCount: number
): Promise<void> {
  await prisma.version.update({
    where: { id: versionId },
    data: {
      content,
      wordCount
    }
  });
}

export async function getLatestVersion(titleId: string) {
  return prisma.version.findFirst({
    where: { titleId },
    orderBy: { amendment_date: 'desc' }
  });
}

export async function deleteVersion(versionId: string): Promise<void> {
  await prisma.version.delete({
    where: { id: versionId }
  });
}

export async function getVersionHistory(titleId: string) {
  return prisma.version.findMany({
    where: { titleId },
    include: {
      changes: true,
      citations: true
    },
    orderBy: { amendment_date: 'desc' }
  });
}