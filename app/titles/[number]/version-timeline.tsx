"use client"

import { Version, Change, Citation } from '@prisma/client'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'

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
                    <div className="text-sm text-gray-500 space-y-1">
                      <div>
                        Published: {version.published_date ? format(version.published_date, 'MMMM d, yyyy') : 'Not published'}
                      </div>
                      <div>
                        Effective: {version.effective_date ? format(version.effective_date, 'MMMM d, yyyy') : format(version.amendment_date, 'MMMM d, yyyy')}
                      </div>
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
                          {change.effective_date && change.effective_date !== version.effective_date && (
                            <span className="text-xs text-gray-400 ml-2">
                              (Effective: {format(change.effective_date, 'MMM d, yyyy')})
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Citations */}
                {version.citations.length > 0 && (
                  <div className="mt-4">
                    <div className="text-sm font-medium mb-2">Federal Register Citations:</div>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {version.citations.map(citation => (
                        <li key={citation.id}>
                          • {citation.volume} FR {citation.page} ({format(citation.date, 'MMM d, yyyy')})
                          {citation.type && <span className="text-xs text-gray-400 ml-2">({citation.type})</span>}
                          {citation.url && (
                            <a 
                              href={citation.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 hover:underline ml-2"
                            >
                              View
                            </a>
                          )}
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