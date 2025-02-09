try {
  console.log('Starting script...');
  
  // Dynamic import because we're using ES modules
  import('./index.ts').catch(error => {
    console.error('=== IMPORT ERROR ===');
    console.error(error);
    if (error instanceof Error) {
      console.error('Stack:', error.stack);
    }
    console.error('Full error:', JSON.stringify(error, null, 2));
    process.exit(1);
  });
} catch (error) {
  console.error('=== TOP LEVEL ERROR ===');
  console.error(error);
  if (error instanceof Error) {
    console.error('Stack:', error.stack);
  }
  console.error('Full error:', JSON.stringify(error, null, 2));
  process.exit(1);
}