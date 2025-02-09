import prisma from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { AgencyStats } from './agency-stats'
import { WordCountChart } from './word-count-chart'
import { TitleList } from './title-list'

export default async function AgencyPage({
  params: { slug }
}: {
  params: { slug: string }
}) {
  const agency = await prisma.agency.findUnique({
    where: { slug },
    include: {
      titles: {
        include: {
          versions: {
            orderBy: {
              amendment_date: 'desc'
            },
            take: 1,
            select: {
              wordCount: true,
              amendment_date: true
            }
          }
        }
      },
      wordCounts: {
        orderBy: {
          date: 'desc'
        },
        take: 1
      }
    }
  })

  if (!agency) {
    notFound()
  }

  const latestWordCount = agency.wordCounts[0]?.count ?? 0
  const totalTitles = agency.titles.length

  return (
    <div className="container mx-auto py-10">
      <div className="flex flex-col gap-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {agency.display_name}
          </h1>
          <div className="flex items-center gap-4 mt-2">
            <div className="text-sm text-gray-500">
              {totalTitles} Title{totalTitles === 1 ? '' : 's'}
            </div>
            <div className="text-sm text-gray-500">
              {latestWordCount.toLocaleString()} Words
            </div>
          </div>
        </div>

        {/* Stats */}
        <AgencyStats agency={agency} />

        {/* Charts */}
        <div className="grid gap-8 md:grid-cols-2">
          <WordCountChart wordCounts={agency.wordCounts} />
        </div>

        {/* Title List */}
        <div>
          <TitleList titles={agency.titles} />
        </div>
      </div>
    </div>
  )
}