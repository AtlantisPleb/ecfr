"use client"

import { Version, Change, Citation } from '@prisma/client'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { timeAgo } from '@/lib/utils'

type VersionWithRelations = Version & {
  changes: Change[]
  citations: Citation[]
}

interface VersionTimelineProps {
  versions: VersionWithRelations[]
}

export function VersionTimeline({ versions }: VersionTimelineProps) {
  return (
    <ScrollArea className="h-[400px] pr-4">
      <div className="space-y-8">
        {versions.map((version, i) => (
          <div key={version.id} className="relative">
            {/* Timeline line */}
            {i < versions.length - 1 && (
              <div className="absolute left-2.5 top-10 bottom-0 w-px bg-gray-200" />
            )}
            
            <div className="flex gap-4">
              {/* Timeline dot */}
              <div className="mt-2 w-5 h-5 rounded-full bg-blue-500 flex-shrink-0" />
              
              <div className="flex-grow">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">
                      Version {versions.length - i}
                    </div>
                    <div className="text-sm text-gray-500">
                      {timeAgo(version.date)}
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    View Version
                  </Button>
                </div>

                {/* Changes */}
                {version.changes.length > 0 && (
                  <div className="mt-4">
                    <div className="text-sm font-medium mb-2">Changes:</div>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {version.changes.map(change => (
                        <li key={change.id}>
                          • {change.description}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Citations */}
                {version.citations.length > 0 && (
                  <div className="mt-4">
                    <div className="text-sm font-medium mb-2">Citations:</div>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {version.citations.map(citation => (
                        <li key={citation.id}>
                          • {citation.source}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  )
}