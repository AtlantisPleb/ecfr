import { QueryBox } from '@/components/chat/QueryBox'

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="relative min-h-screen">
      <div className="pb-24">
        {children}
      </div>
      
      <div className="fixed bottom-0 left-0 right-0 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto max-w-3xl py-4">
          <QueryBox />
        </div>
      </div>
    </div>
  )
}