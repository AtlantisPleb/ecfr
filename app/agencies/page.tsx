import prisma from '@/lib/prisma'
import { columns } from "./columns"
import { DataTable } from "./data-table"
import { Agency, Title, WordCount } from '@prisma/client'

type AgencyWithRelations = Agency & {
  titles: Title[];
  wordCounts: WordCount[];
}

export default async function AgenciesPage() {
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
  }) as AgencyWithRelations[]

  return (
    <div className="bg-white/30 p-12 shadow-xl ring-1 ring-gray-900/5 rounded-lg backdrop-blur-lg max-w-7xl mx-auto w-full">
      <div className="space-y-1 mb-4">
        <h2 className="text-xl font-semibold">Federal Agencies</h2>
        <p className="text-sm text-gray-500">
          Showing {agencies.length} federal agencies and their regulations
        </p>
      </div>
      <DataTable columns={columns} data={agencies} />
    </div>
  )
}