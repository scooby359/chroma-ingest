import { ChromaClient } from 'chromadb';
import { config as loadEnv } from 'dotenv';

loadEnv();

const chromaUrl = process.env.CHROMA_URL || 'http://localhost:8000';
const collectionName = process.env.COLLECTION_NAME || 'ExchangeResearch';

async function inspectChromaDB() {
  const url = new URL(chromaUrl);
  const client = new ChromaClient({
    host: url.hostname,
    port: Number(url.port) || (url.protocol === 'https:' ? 443 : 80),
    ssl: url.protocol === 'https:',
  });

  try {
    console.log(`Connecting to ChromaDB at ${chromaUrl}...\n`);

    // List all collections
    const collections = await client.listCollections();
    console.log(`📚 Total Collections: ${collections.length}`);
    collections.forEach((col) => {
      console.log(`   - ${col.name}`);
    });
    console.log();

    // Get the specific collection
    try {
      const collection = await client.getCollection({ name: collectionName });
      console.log(`🔍 Inspecting collection: "${collectionName}"\n`);

      // Get all documents (with a reasonable limit)
      const results = await collection.get({
        limit: 100000,
      });

      const totalChunks = results.ids.length;
      console.log(`📊 Statistics:`);
      console.log(`   Total chunks: ${totalChunks}`);

      // Group by source file
      const fileStats = new Map<string, number>();
      results.metadatas?.forEach((metadata) => {
        if (metadata && 'source' in metadata) {
          const source = metadata.source as string;
          fileStats.set(source, (fileStats.get(source) || 0) + 1);
        }
      });

      console.log(`   Source files: ${fileStats.size}`);
      console.log();

      // Show file breakdown
      console.log(`📄 Files ingested:`);
      Array.from(fileStats.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .forEach(([file, count]) => {
          console.log(`   ${file}: ${count} chunks`);
        });
      console.log();

      // Show sample chunks
      const samplesToShow = Math.min(3, totalChunks);
      if (samplesToShow > 0) {
        console.log(
          `📝 Sample chunks (showing ${samplesToShow} of ${totalChunks}):\n`,
        );

        for (let i = 0; i < samplesToShow; i++) {
          const metadata = results.metadatas?.[i];
          const document = results.documents?.[i];

          console.log(`--- Chunk ${i + 1} ---`);
          if (metadata) {
            console.log(`Source: ${metadata.source || 'unknown'}`);
            const chunkIndex =
              typeof metadata.chunk_index === 'number'
                ? metadata.chunk_index
                : 0;
            console.log(
              `Position: ${chunkIndex + 1} of ${metadata.total_chunks || '?'}`,
            );
          }
          if (document) {
            const preview =
              document.length > 200
                ? document.substring(0, 200) + '...'
                : document;
            console.log(`Content: ${preview}`);
          }
          console.log();
        }
      }

      // Show embedding info
      if (results.embeddings && results.embeddings.length > 0) {
        const embeddingDim = results.embeddings[0]?.length || 0;
        console.log(`🔢 Embedding dimension: ${embeddingDim}`);
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error(
          `❌ Collection "${collectionName}" not found or error accessing it`,
        );
        console.error(`   ${error.message}`);
      }
      console.log('\nTip: Run "npm run dev" to ingest documents first');
    }
  } catch (error) {
    console.error('❌ Failed to connect to ChromaDB');
    if (error instanceof Error) {
      console.error(`   ${error.message}`);
    }
    console.error('\nMake sure ChromaDB is running on', chromaUrl);
    process.exit(1);
  }
}

await inspectChromaDB();
