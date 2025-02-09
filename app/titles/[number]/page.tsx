import prisma from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { TitleHeader } from './title-header'
import { VersionTimeline } from './version-timeline'
import { StructureTree } from './structure-tree'
import { MetricsDashboard } from './metrics-dashboard'
import { ReferencesList } from './references-list'
import { TextMetrics } from '@prisma/client'

type VersionWithRelations = {
  id: string
  titleId: string
  content: string
  wordCount: number
  amendment_date: Date
  effective_date: Date | null
  published_date: Date | null
  authority: string | null
  source: string | null
  createdAt: Date
  updatedAt: Date
  changes: {
    id: string
    description: string
    effective_date: Date | null
  }[]
  citations: {
    id: string
    volume: number
    page: number
    date: Date
    type: string
    url: string | null
  }[]
  textMetrics: TextMetrics | null
  sourceRefs: {
    id: string
    context: string
    type: string
  }[]
  targetRefs: {
    id: string
    context: string
    type: string
  }[]
}

export default async function TitlePage({
  params: { number }
}: {
  params: { number: string }
}) {
  const title = await prisma.title.findUnique({
    where: { number: parseInt(number) },
    include: {
      agencies: true,
      versions: {
        include: {
          changes: {
            select: {
              id: true,
              description: true,
              effective_date: true
            }
          },
          citations: {
            select: {
              id: true,
              volume: true,
              page: true,
              date: true,
              type: true,
              url: true
            }
          },
          textMetrics: true,
          sourceRefs: {
            select: {
              id: true,
              context: true,
              type: true
            }
          },
          targetRefs: {
            select: {
              id: true,
              context: true,
              type: true
            }
          }
        },
        orderBy: {
          amendment_date: 'desc'
        }
      },
      chapters: {
        include: {
          parts: {
            include: {
              subparts: {
                include: {
                  sections: true
                }
              }
            }
          }
        }
      }
    }
  })

  if (!title) {
    notFound()
  }

  const latestVersion = title.versions[0] as VersionWithRelations
  const wordCount = latestVersion?.wordCount ?? 0
  const totalChapters = title.chapters.length
  const totalParts = title.chapters.reduce((acc, chapter) => acc + chapter.parts.length, 0)
  const totalSections = title.chapters.reduce((acc, chapter) => 
    acc + chapter.parts.reduce((pacc, part) => 
      pacc + part.subparts.reduce((sacc, subpart) => 
        sacc + subpart.sections.length, 0), 0), 0)

  return (
    <div className="container mx-auto py-10">
      <div className="flex flex-col gap-8">
        {/* Header */}
        <TitleHeader
          number={title.number}
          name={title.name}
          type={title.type}
          agencies={title.agencies}
          latestVersion={latestVersion}
        />

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <div className="bg-white/30 p-6 rounded-lg shadow-sm">
            <div className="text-2xl font-bold">{wordCount.toLocaleString()}</div>
            <div className="text-sm text-gray-500">Total Words</div>
          </div>
          <div className="bg-white/30 p-6 rounded-lg shadow-sm">
            <div className="text-2xl font-bold">{totalChapters}</div>
            <div className="text-sm text-gray-500">Chapters</div>
          </div>
          <div className="bg-white/30 p-6 rounded-lg shadow-sm">
            <div className="text-2xl font-bold">{totalParts}</div>
            <div className="text-sm text-gray-500">Parts</div>
          </div>
          <div className="bg-white/30 p-6 rounded-lg shadow-sm">
            <div className="text-2xl font-bold">{totalSections}</div>
            <div className="text-sm text-gray-500">Sections</div>
          </div>
        </div>

        {/* Version Timeline */}
        <div className="bg-white/30 p-6 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Version History</h2>
          <VersionTimeline versions={title.versions as VersionWithRelations[]} />
        </div>

        {/* Structure Tree */}
        <div className="bg-white/30 p-6 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Structure</h2>
          <StructureTree chapters={title.chapters} />
        </div>

        {/* Metrics */}
        <div className="bg-white/30 p-6 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Metrics</h2>
          <MetricsDashboard
            wordCounts={title.versions.map(v => ({
              date: v.amendment_date,
              count: v.wordCount ?? 0
            }))}
            changes={title.versions.map(v => ({
              date: v.amendment_date,
              count: v.changes.length
            }))}
            references={title.versions.map(v => ({
              date: v.amendment_date,
              incoming: v.targetRefs.length,
              outgoing: v.sourceRefs.length
            }))}
          />
        </div>

        {/* References */}
        <div className="bg-white/30 p-6 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold mb-4">References</h2>
          <ReferencesList
            incomingRefs={latestVersion?.targetRefs ?? []}
            outgoingRefs={latestVersion?.sourceRefs ?? []}
          />
        </div>
      </div>
    </div>
  )
}