"use client"

import { Reference } from '@prisma/client'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import Link from 'next/link'

interface ReferencesListProps {
  incomingRefs: Pick<Reference, 'id' | 'context' | 'type'>[]
  outgoingRefs: Pick<Reference, 'id' | 'context' | 'type'>[]
}

export function ReferencesList({
  incomingRefs,
  outgoingRefs
}: ReferencesListProps) {
  return (
    <Tabs defaultValue="incoming" className="w-full">
      <TabsList>
        <TabsTrigger value="incoming">Incoming References ({incomingRefs.length})</TabsTrigger>
        <TabsTrigger value="outgoing">Outgoing References ({outgoingRefs.length})</TabsTrigger>
      </TabsList>

      <TabsContent value="incoming">
        <Card>
          <CardHeader>
            <CardTitle>Referenced By</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <div className="space-y-4">
                {incomingRefs.map(ref => (
                  <div key={ref.id} className="p-4 rounded-lg border">
                    <div className="text-sm text-gray-500 mt-1">
                      {ref.context}
                    </div>
                    <div className="text-xs text-gray-400 mt-2">
                      Type: {ref.type}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="outgoing">
        <Card>
          <CardHeader>
            <CardTitle>References To</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <div className="space-y-4">
                {outgoingRefs.map(ref => (
                  <div key={ref.id} className="p-4 rounded-lg border">
                    <div className="text-sm text-gray-500 mt-1">
                      {ref.context}
                    </div>
                    <div className="text-xs text-gray-400 mt-2">
                      Type: {ref.type}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}