"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Title, Version } from '@prisma/client'
import { timeAgo } from '@/lib/utils'

type TitleWithVersion = Title & {
  versions: Pick<Version, 'wordCount' | 'date'>[]
}

interface TitleListProps {
  titles: TitleWithVersion[]
}

export function TitleList({ titles }: TitleListProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Number</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Word Count</TableHead>
            <TableHead>Last Updated</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {titles.map((title) => {
            const latestVersion = title.versions[0]
            return (
              <TableRow key={title.id}>
                <TableCell>{title.number}</TableCell>
                <TableCell>{title.name}</TableCell>
                <TableCell>
                  {latestVersion
                    ? latestVersion.wordCount.toLocaleString()
                    : "N/A"}
                </TableCell>
                <TableCell>
                  {latestVersion
                    ? timeAgo(latestVersion.date)
                    : "Never"}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}