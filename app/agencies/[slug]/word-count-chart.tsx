"use client"

import { WordCount } from '@prisma/client'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
)

interface WordCountChartProps {
  wordCounts: WordCount[]
}

export function WordCountChart({ wordCounts }: WordCountChartProps) {
  const sortedCounts = [...wordCounts].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  )

  const data = {
    labels: sortedCounts.map(count => 
      new Date(count.date).toLocaleDateString()
    ),
    datasets: [
      {
        label: 'Word Count',
        data: sortedCounts.map(count => count.count),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
      }
    ]
  }

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      }
    }
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <Line options={options} data={data} />
    </div>
  )
}