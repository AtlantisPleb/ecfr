import prisma from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { TitleHeader } from './title-header'
import { VersionTimeline } from './version-timeline'
import { StructureTree } from './structure-tree'
import { MetricsDashboard } from './metrics-dashboard'
import { ReferencesList } from './references-list'
import { Agency, Change, Citation, Reference, TextMetrics, Version } from '@prisma/client'

type VersionWithRelations = Version & {
  changes: Change[]
  citations: Citation[]
  textMetrics: TextMetrics[]
  sourceRefs: Reference[]
  targetRefs: Reference[]
}

type TitleWithRelations = {
  id: string
  number: number
  name: string
  type: string
  agencies: Agency[]
  versions: VersionWithRelations[]
  chapters: {
    id: string
    number: number
    name: string
    parts: {
      id: string
      number: number
      name: string
      subparts: {
        id: string
        name: string
        sections: {
          id: string
          number: string
          name: string
          content: string
        }[]
      }[]
    }[]
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
          changes: true,
          citations: true,
          textMetrics: true,
          sourceRefs: true,
          targetRefs: true
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
  }) as TitleWithRelations

  if (!title) {
    notFound()
  }

  const latestVersion = title.versions[0]
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
          <VersionTimeline versions={title.versions} />
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
              count: v.wordCount
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