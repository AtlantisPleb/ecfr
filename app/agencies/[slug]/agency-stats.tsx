"use client"

import { Agency, Title, WordCount, Version } from '@prisma/client'

type TitleWithVersion = Title & {
  versions: Pick<Version, 'wordCount' | 'date'>[]
}

type AgencyWithRelations = Agency & {
  titles: TitleWithVersion[];
  wordCounts: WordCount[];
}

interface AgencyStatsProps {
  agency: AgencyWithRelations
}

export function AgencyStats({ agency }: AgencyStatsProps) {
  // Calculate average words per title
  const avgWordsPerTitle = agency.titles.reduce((acc, title) => {
    const wordCount = title.versions[0]?.wordCount ?? 0
    return acc + wordCount
  }, 0) / agency.titles.length

  // Find most updated title (title with most versions)
  const mostUpdatedTitle = agency.titles.reduce((prev, current) => {
    const prevUpdates = prev.versions.length
    const currentUpdates = current.versions.length
    return currentUpdates > prevUpdates ? current : prev
  }, agency.titles[0])

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h2 className="text-lg font-semibold mb-2">Statistics</h2>
      <dl className="grid grid-cols-1 gap-4">
        <div>
          <dt className="text-sm text-gray-500">Average Words per Title</dt>
          <dd className="text-xl font-medium">
            {Math.round(avgWordsPerTitle).toLocaleString()}
          </dd>
        </div>
        <div>
          <dt className="text-sm text-gray-500">Most Updated Title</dt>
          <dd className="text-xl font-medium">
            {mostUpdatedTitle ? mostUpdatedTitle.name : "N/A"}
          </dd>
        </div>
      </dl>
    </div>
  )
}