import { Version } from '@prisma/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatNumber } from '@/lib/format'

type AgencyWithRelations = {
  titles: TitleWithVersion[]
  wordCounts: {
    id: string
    agencyId: string
    count: number
    date: Date
    createdAt: Date
  }[]
}

type TitleWithVersion = {
  id: string
  number: number
  name: string
  versions: Pick<Version, 'wordCount' | 'amendment_date'>[]
}

interface AgencyStatsProps {
  agency: AgencyWithRelations
}

export function AgencyStats({ agency }: AgencyStatsProps) {
  // Calculate total word count across all titles
  const totalWordCount = agency.titles.reduce((sum, title) => {
    const latestVersion = title.versions[0]
    return sum + (latestVersion?.wordCount ?? 0)
  }, 0)

  // Calculate average word count per title
  const avgWordCount = Math.round(totalWordCount / agency.titles.length)

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Titles</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{agency.titles.length}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Words</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatNumber(totalWordCount)}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Average Words per Title</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatNumber(avgWordCount)}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Latest Word Count</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatNumber(agency.wordCounts[0]?.count ?? 0)}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}