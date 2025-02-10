import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import Link from 'next/link'

export default function Home() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-2xl space-y-8">
        <h1 className="text-center text-4xl font-medium">
          ChatCFR
        </h1>
        
        <div className="space-y-4">
          <Textarea 
            placeholder="Ask about federal regulations..."
            className="min-h-[100px] resize-none text-lg p-4 focus-visible:ring-offset-2"
          />
          
          <div className="flex justify-center">
            <Link href="/agencies">
              <Button variant="outline">
                Browse agencies →
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}