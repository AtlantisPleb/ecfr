"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Agency, Title, WordCount } from '@prisma/client'
import { timeAgo } from '@/lib/utils'
import { ArrowUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from 'next/link'

type AgencyWithRelations = Agency & {
  titles: Title[];
  wordCounts: WordCount[];
}

export const columns: ColumnDef<AgencyWithRelations>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Agency Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const name = row.original.name
      const slug = row.original.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
      return (
        <Link 
          href={`/agencies/${slug}`}
          className="text-blue-600 hover:text-blue-800 hover:underline"
        >
          {name}
        </Link>
      )
    },
  },
  {
    id: "titleCount",
    accessorFn: (row) => row.titles.length,
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Titles
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const titles = row.original.titles
      return <div>{titles.length} titles</div>
    },
  },
  {
    id: "wordCount",
    accessorFn: (row) => row.wordCounts[0]?.count ?? 0,
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Word Count
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const wordCounts = row.original.wordCounts
      if (wordCounts.length === 0) return "N/A"
      return <div>{wordCounts[0].count.toLocaleString()} words</div>
    },
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Created
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      return <div>{timeAgo(row.original.createdAt)}</div>
    },
  },
]