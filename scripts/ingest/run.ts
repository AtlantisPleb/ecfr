import { ingest } from './index'

async function run() {
  try {
    console.log('Starting script...')
    await ingest()
  } catch (error) {
    console.error('=== TOP LEVEL ERROR ===')
    console.error(error)
    if (error instanceof Error) {
      console.error('Stack:', error.stack)
    }
    console.error('Full error:', JSON.stringify(error, null, 2))
    process.exit(1)
  }
}

run()