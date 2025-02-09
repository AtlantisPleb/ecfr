"use client"

import { Chart } from '@/components/ui/chart'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

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
  const sortedChanges = [...changes].sort((a, b) => a.date.getTime() - b.date.getTime())
  const sortedRefs = [...references].sort((a, b) => a.date.getTime() - b.date.getTime())

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
            <Chart
              type="line"
              data={{
                labels: sortedWordCounts.map(d => d.date.toLocaleDateString()),
                datasets: [{
                  label: 'Word Count',
                  data: sortedWordCounts.map(d => d.count),
                  borderColor: 'rgb(59, 130, 246)',
                  tension: 0.1
                }]
              }}
              options={{
                responsive: true,
                plugins: {
                  legend: {
                    position: 'top' as const,
                  },
                  title: {
                    display: false
                  }
                },
                scales: {
                  y: {
                    beginAtZero: true
                  }
                }
              }}
            />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="changes">
        <Card>
          <CardHeader>
            <CardTitle>Changes Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <Chart
              type="bar"
              data={{
                labels: sortedChanges.map(d => d.date.toLocaleDateString()),
                datasets: [{
                  label: 'Number of Changes',
                  data: sortedChanges.map(d => d.count),
                  backgroundColor: 'rgba(59, 130, 246, 0.5)',
                  borderColor: 'rgb(59, 130, 246)',
                  borderWidth: 1
                }]
              }}
              options={{
                responsive: true,
                plugins: {
                  legend: {
                    position: 'top' as const,
                  },
                  title: {
                    display: false
                  }
                },
                scales: {
                  y: {
                    beginAtZero: true
                  }
                }
              }}
            />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="references">
        <Card>
          <CardHeader>
            <CardTitle>References Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <Chart
              type="line"
              data={{
                labels: sortedRefs.map(d => d.date.toLocaleDateString()),
                datasets: [
                  {
                    label: 'Incoming References',
                    data: sortedRefs.map(d => d.incoming),
                    borderColor: 'rgb(59, 130, 246)',
                    tension: 0.1
                  },
                  {
                    label: 'Outgoing References',
                    data: sortedRefs.map(d => d.outgoing),
                    borderColor: 'rgb(234, 88, 12)',
                    tension: 0.1
                  }
                ]
              }}
              options={{
                responsive: true,
                plugins: {
                  legend: {
                    position: 'top' as const,
                  },
                  title: {
                    display: false
                  }
                },
                scales: {
                  y: {
                    beginAtZero: true
                  }
                }
              }}
            />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}