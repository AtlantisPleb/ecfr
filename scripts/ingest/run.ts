import { ingest } from './index'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { IngestionDepth } from './types'

async function run() {
  try {
    // Parse command line arguments
    const argv = await yargs(hideBin(process.argv))
      .option('depth', {
        alias: 'd',
        description: 'Control how deep to process',
        choices: ['titles', 'chapters', 'parts', 'full'] as const,
        default: 'full'
      })
      .option('skip-hierarchy', {
        alias: 's',
        description: 'Skip processing of parts/sections/subparts',
        type: 'boolean',
        default: false
      })
      .option('agency', {
        alias: 'a',
        description: 'Process specific agency only (by slug)',
        type: 'string'
      })
      .option('batch-size', {
        alias: 'b',
        description: 'Control how many items to process at once',
        type: 'number'
      })
      .help()
      .alias('help', 'h')
      .example([
        ['$0 --depth=titles', 'Quick agency + title relationships only'],
        ['$0 --agency=department-of-agriculture', 'Process specific agency with full depth'],
        ['$0 --skip-hierarchy', 'Process everything but skip deep hierarchy'],
        ['$0 --depth=chapters --batch-size=10', 'Process up to chapters level with batch size of 10']
      ])
      .argv

    console.log('Starting script with options:', {
      depth: argv.depth,
      skipHierarchy: argv['skip-hierarchy'],
      agency: argv.agency || 'all',
      batchSize: argv['batch-size'] || 'unlimited'
    })

    await ingest({
      depth: argv.depth as IngestionDepth,
      skipHierarchy: argv['skip-hierarchy'],
      agencySlug: argv.agency,
      batchSize: argv['batch-size']
    })
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