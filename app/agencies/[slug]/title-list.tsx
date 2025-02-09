"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Title, WordCount } from '@prisma/client'
import { timeAgo } from '@/lib/utils'

type TitleWithWordCount = Title & {
  wordCounts: WordCount[];
}

interface TitleListProps {
  titles: TitleWithWordCount[]
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
          {titles.map((title) => (
            <TableRow key={title.id}>
              <TableCell>{title.number}</TableCell>
              <TableCell>{title.name}</TableCell>
              <TableCell>
                {title.wordCounts[0]
                  ? title.wordCounts[0].count.toLocaleString()
                  : "N/A"}
              </TableCell>
              <TableCell>
                {title.updatedAt ? timeAgo(title.updatedAt) : "Never"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}