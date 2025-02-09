import prisma from '@/lib/prisma'
import { timeAgo } from '@/lib/utils'
import Image from 'next/image'
import RefreshButton from './refresh-button'
import { Agency } from '@prisma/client'

export default async function Table() {
  const agencies = await prisma.agency.findMany({
    include: {
      titles: true,
      wordCounts: {
        orderBy: {
          date: 'desc'
        },
        take: 1
      }
    }
  })

  return (
    <div className="bg-white/30 p-12 shadow-xl ring-1 ring-gray-900/5 rounded-lg backdrop-blur-lg max-w-xl mx-auto w-full">
      <div className="flex justify-between items-center mb-4">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold">Federal Agencies</h2>
          <p className="text-sm text-gray-500">
            Showing {agencies.length} federal agencies and their regulations
          </p>
        </div>
        <RefreshButton />
      </div>
      <div className="divide-y divide-gray-900/5">
        {agencies.map((agency: Agency) => (
          <div
            key={agency.id}
            className="flex items-center justify-between py-3"
          >
            <div className="flex items-center space-x-4">
              <div className="space-y-1">
                <p className="font-medium leading-none">{agency.name}</p>
                <p className="text-sm text-gray-500">
                  {agency.titles.length} titles
                  {agency.wordCounts[0] && 
                    ` • ${agency.wordCounts[0].count.toLocaleString()} words`
                  }
                </p>
              </div>
            </div>
            <p className="text-sm text-gray-500">
              Created {timeAgo(agency.createdAt)}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}