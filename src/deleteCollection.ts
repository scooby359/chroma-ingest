import { ChromaClient } from 'chromadb';
import { config as loadEnv } from 'dotenv';

loadEnv();

const chromaUrl = process.env.CHROMA_URL || 'http://127.0.0.1:8000';
const collectionName = process.env.COLLECTION_NAME || 'ExchangeResearch';

async function deleteCollection() {
  const url = new URL(chromaUrl);
  const client = new ChromaClient({
    host: url.hostname,
    port: Number(url.port) || (url.protocol === 'https:' ? 443 : 80),
    ssl: url.protocol === 'https:',
  });

  try {
    console.log(
      `Deleting collection: "${collectionName}" from ${chromaUrl}...\n`,
    );

    await client.deleteCollection({ name: collectionName });

    console.log(`✓ Successfully deleted collection: ${collectionName}`);
  } catch (error) {
    if (error instanceof Error) {
      console.error(`✗ Failed to delete collection: ${error.message}`);
    } else {
      console.error('✗ Failed to delete collection');
    }
    process.exit(1);
  }
}

deleteCollection();
