"use client"

import { WordCount } from '@prisma/client'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { 
  Line,
  LineChart,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer 
} from "recharts"

interface WordCountChartProps {
  wordCounts: WordCount[]
}

export function WordCountChart({ wordCounts }: WordCountChartProps) {
  const sortedCounts = [...wordCounts].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  )

  const data = sortedCounts.map(count => ({
    date: new Date(count.date).toLocaleDateString(),
    count: count.count
  }))

  const chartConfig = {
    wordCount: {
      label: "Word Count",
      color: "rgb(59, 130, 246)"
    }
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow h-[300px]">
      <ChartContainer config={chartConfig}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="date"
            tickFormatter={(value) => new Date(value).toLocaleDateString()}
          />
          <YAxis 
            tickFormatter={(value) => value.toLocaleString()}
          />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Line
            type="monotone"
            dataKey="count"
            name="wordCount"
            stroke="var(--color-wordCount)"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ChartContainer>
    </div>
  )
}