"use client"

import { Agency, Version } from '@prisma/client'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import Link from 'next/link'

interface TitleHeaderProps {
  number: number
  name: string
  type: string
  agencies: Agency[]
  latestVersion: Version | undefined
}

export function TitleHeader({
  number,
  name,
  type,
  agencies,
  latestVersion
}: TitleHeaderProps) {
  return (
    <div>
      <div className="flex items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight">
          Title {number}: {name}
        </h1>
        <Badge variant="secondary">{type}</Badge>
      </div>

      <div className="flex items-center gap-4 mt-4">
        <div className="text-sm text-gray-500">
          {agencies.length} {agencies.length === 1 ? 'Agency' : 'Agencies'}:
        </div>
        <div className="flex flex-wrap gap-2">
          {agencies.map(agency => (
            <Link
              key={agency.id}
              href={`/agencies/${agency.slug}`}
              className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
            >
              {agency.name}
            </Link>
          ))}
        </div>
      </div>

      {latestVersion && (
        <div className="text-sm text-gray-500 mt-2">
          Last updated {format(latestVersion.amendment_date, 'MMMM d, yyyy')}
        </div>
      )}
    </div>
  )
}