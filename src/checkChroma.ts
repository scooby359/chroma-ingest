import { ChromaClient } from 'chromadb';

const chromaUrl = process.env.CHROMA_URL || 'http://localhost:8000';
const url = new URL(chromaUrl);

console.log(`Checking ChromaDB at ${chromaUrl}...`);

try {
  const client = new ChromaClient({
    host: url.hostname,
    port: Number(url.port),
    ssl: url.protocol === 'https:',
  });
  const heartbeat = await client.heartbeat();
  console.log('✓ ChromaDB is running');
  console.log(`  Heartbeat: ${heartbeat}ms`);

  // List collections
  const collections = await client.listCollections();
  console.log(`\nExisting collections: ${collections.length}`);
  collections.forEach((col) => {
    console.log(`  - ${col.name}`);
  });
} catch (error) {
  console.error('✗ Failed to connect to ChromaDB');
  if (error instanceof Error) {
    console.error(`  Error: ${error.message}`);
  }
  console.error('\nMake sure ChromaDB is running on', chromaUrl);
  console.error(
    'You can start it with: docker run -p 8000:8000 chromadb/chroma',
  );
  process.exit(1);
}
