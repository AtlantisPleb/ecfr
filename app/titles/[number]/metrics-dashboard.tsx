"use client"

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ChartContainer, ChartTooltip } from '@/components/ui/chart'
import { Line, Bar, LineChart, BarChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'

interface MetricsDashboardProps {
  wordCounts: Array<{
    date: Date
    count: number
  }>
  changes: Array<{
    date: Date
    count: number
  }>
  references: Array<{
    date: Date
    incoming: number
    outgoing: number
  }>
}

export function MetricsDashboard({
  wordCounts,
  changes,
  references
}: MetricsDashboardProps) {
  // Sort data by date
  const sortedWordCounts = [...wordCounts].sort((a, b) => a.date.getTime() - b.date.getTime())
    .map(d => ({ date: d.date.toLocaleDateString(), count: d.count }))
  
  const sortedChanges = [...changes].sort((a, b) => a.date.getTime() - b.date.getTime())
    .map(d => ({ date: d.date.toLocaleDateString(), count: d.count }))
  
  const sortedRefs = [...references].sort((a, b) => a.date.getTime() - b.date.getTime())
    .map(d => ({ 
      date: d.date.toLocaleDateString(), 
      incoming: d.incoming,
      outgoing: d.outgoing
    }))

  return (
    <Tabs defaultValue="wordCount" className="w-full">
      <TabsList>
        <TabsTrigger value="wordCount">Word Count</TabsTrigger>
        <TabsTrigger value="changes">Changes</TabsTrigger>
        <TabsTrigger value="references">References</TabsTrigger>
      </TabsList>

      <TabsContent value="wordCount">
        <Card>
          <CardHeader>
            <CardTitle>Word Count Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              className="h-[300px]"
              config={{
                count: {
                  color: "rgb(59, 130, 246)",
                  label: "Word Count"
                }
              }}
            >
              <LineChart data={sortedWordCounts}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="count" stroke="rgb(59, 130, 246)" />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="changes">
        <Card>
          <CardHeader>
            <CardTitle>Changes Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              className="h-[300px]"
              config={{
                count: {
                  color: "rgb(59, 130, 246)",
                  label: "Number of Changes"
                }
              }}
            >
              <BarChart data={sortedChanges}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="rgb(59, 130, 246)" />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="references">
        <Card>
          <CardHeader>
            <CardTitle>References Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              className="h-[300px]"
              config={{
                incoming: {
                  color: "rgb(59, 130, 246)",
                  label: "Incoming References"
                },
                outgoing: {
                  color: "rgb(234, 88, 12)",
                  label: "Outgoing References"
                }
              }}
            >
              <LineChart data={sortedRefs}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="incoming" stroke="rgb(59, 130, 246)" />
                <Line type="monotone" dataKey="outgoing" stroke="rgb(234, 88, 12)" />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}