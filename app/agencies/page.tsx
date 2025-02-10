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
    <div className="container mx-auto py-8 px-4">
      <div className="space-y-1 mb-8">
        <h2 className="text-2xl font-semibold">Federal Agencies</h2>
        <p className="text-sm text-muted-foreground">
          Showing {agencies.length} federal agencies and their regulations
        </p>
      </div>
      <div className="rounded-lg border bg-card">
        <DataTable columns={columns} data={agencies} />
      </div>
    </div>
  )
}