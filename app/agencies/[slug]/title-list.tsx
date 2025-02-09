import { Version } from '@prisma/client'
import { timeAgo } from '@/lib/utils'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import Link from 'next/link'

type TitleWithVersion = {
  id: string
  number: number
  name: string
  versions: Pick<Version, 'wordCount' | 'amendment_date'>[]
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
                <TableCell>
                  <Link
                    href={`/titles/${title.number}`}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    {title.name}
                  </Link>
                </TableCell>
                <TableCell>
                  {latestVersion?.wordCount?.toLocaleString() ?? 'N/A'}
                </TableCell>
                <TableCell>
                  {latestVersion?.amendment_date
                    ? timeAgo(latestVersion.amendment_date)
                    : 'Never'}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}