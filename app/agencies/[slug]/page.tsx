import { notFound } from 'next/navigation'
import prisma from '@/lib/prisma'
import { timeAgo } from '@/lib/utils'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { TitleList } from './title-list'
import { WordCountChart } from './word-count-chart'
import { AgencyStats } from './agency-stats'

export default async function AgencyPage({
  params,
}: {
  params: { slug: string }
}) {
  const agency = await prisma.agency.findUnique({
    where: {
      slug: params.slug
    },
    include: {
      titles: {
        include: {
          versions: {
            orderBy: {
              date: 'desc'
            },
            take: 1,
            select: {
              wordCount: true,
              date: true
            }
          }
        }
      },
      wordCounts: {
        orderBy: {
          date: 'desc'
        }
      }
    }
  })

  if (!agency) {
    notFound()
  }

  const latestWordCount = agency.wordCounts[0]?.count ?? 0
  const totalTitles = agency.titles.length

  return (
    <div className="bg-white/30 p-12 shadow-xl ring-1 ring-gray-900/5 rounded-lg backdrop-blur-lg max-w-7xl mx-auto w-full">
      <div className="mb-8">
        <Link
          href="/agencies"
          className="text-blue-600 hover:text-blue-800 flex items-center gap-1 mb-4"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Agencies
        </Link>
        
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">{agency.name}</h1>
          <p className="text-sm text-gray-500">
            Created {timeAgo(agency.createdAt)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="p-6 bg-white rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-2">Overview</h2>
          <dl className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-sm text-gray-500">Total Titles</dt>
              <dd className="text-2xl font-medium">{totalTitles}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Word Count</dt>
              <dd className="text-2xl font-medium">
                {latestWordCount.toLocaleString()}
              </dd>
            </div>
          </dl>
        </div>

        <AgencyStats agency={agency} />
      </div>

      <div className="space-y-8">
        <div>
          <h2 className="text-lg font-semibold mb-4">Word Count History</h2>
          <WordCountChart wordCounts={agency.wordCounts} />
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-4">Titles</h2>
          <TitleList titles={agency.titles} />
        </div>
      </div>
    </div>
  )
}