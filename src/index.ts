import { readFile } from 'node:fs/promises';
import { config as loadEnv } from 'dotenv';
import { type IngestConfig, defaultConfig } from './config.js';
import { discoverMarkdownFiles } from './fileDiscovery.js';
import {
  loadState,
  saveState,
  getChangedFiles,
  updateState,
} from './changeTracking.js';
import { chunkMarkdown } from './chunking.js';
import { EmbeddingGenerator } from './embeddings.js';
import { ChromaDBManager } from './chromadb.js';

// Load environment variables from .env file
loadEnv();

/**
 * Main ingestion function
 */
export async function ingestMarkdownFiles(config: IngestConfig): Promise<void> {
  console.log('Starting markdown ingestion...');
  console.log(`Source folder: ${config.sourceFolder}`);
  console.log(`ChromaDB URL: ${config.chromaUrl}`);
  console.log(`Collection: ${config.collectionName}`);

  // Apply defaults
  const fullConfig = { ...defaultConfig, ...config };

  // Initialize components
  const embeddingGenerator = new EmbeddingGenerator(
    fullConfig.embeddingUrl,
    fullConfig.embeddingModel,
  );
  const chromaManager = new ChromaDBManager(
    fullConfig.chromaUrl,
    fullConfig.collectionName,
  );

  // Get or create collection
  const collection = await chromaManager.getOrCreateCollection();
  console.log(`Using collection: ${fullConfig.collectionName}`);

  // Discover markdown files
  console.log('\nDiscovering markdown files...');
  const allFiles = await discoverMarkdownFiles(fullConfig.sourceFolder);
  console.log(`Found ${allFiles.length} markdown files`);

  // Load state and filter changed files
  let state = await loadState(fullConfig.stateFile!);
  const changedFiles = getChangedFiles(allFiles, state);

  if (changedFiles.length === 0) {
    console.log('No changed files to process');
    return;
  }

  console.log(`Processing ${changedFiles.length} changed files`);

  // Process each file
  for (const file of changedFiles) {
    console.log(`\nProcessing: ${file.relativePath}`);

    try {
      // Read file content
      const content = await readFile(file.path, 'utf-8');

      // Chunk the content
      const chunks = chunkMarkdown(
        content,
        file.relativePath,
        fullConfig.chunkSize,
        fullConfig.chunkOverlap,
      );

      if (chunks.length === 0) {
        console.log('  File is empty, skipping');
        continue;
      }

      console.log(`  Created ${chunks.length} chunks`);

      // Process chunks in batches to manage memory
      const batchSize = fullConfig.batchSize || 50;
      for (let i = 0; i < chunks.length; i += batchSize) {
        const batchChunks = chunks.slice(i, i + batchSize);
        const chunkContents = batchChunks.map((c) => c.content);

        // Generate embeddings for this batch
        console.log(
          `  Generating embeddings for batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(chunks.length / batchSize)}...`,
        );
        const embeddings =
          await embeddingGenerator.generateEmbeddings(chunkContents);

        // Insert batch into ChromaDB
        console.log('  Inserting batch into ChromaDB...');
        await chromaManager.insertChunks(collection, batchChunks, embeddings);
      }

      console.log(`  ✓ Successfully processed ${file.relativePath}`);

      // Update and save state immediately after successful processing
      state = updateState(state, [file]);
      await saveState(fullConfig.stateFile as string, state);
    } catch (error) {
      console.error(`  ✗ Failed to process ${file.relativePath}:`, error);
      // State is not updated for failed files
    }
  }

  console.log('\n✓ Ingestion complete!');
}

// Run when executed directly
const config: IngestConfig = {
  sourceFolder: './sources',
  chromaUrl: 'http://127.0.0.1:8000',
  collectionName: 'ExchangeResearch',
};

try {
  await ingestMarkdownFiles(config);
} catch (error) {
  console.error('Fatal error:', error);
  process.exit(1);
}
