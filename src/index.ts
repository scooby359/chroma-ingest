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
import type { Chunk } from './chunking.js';
import { countMarkdownChunks, chunkMarkdownGenerator } from './chunking.js';
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
      const totalChunks = countMarkdownChunks(
        content,
        fullConfig.chunkSize,
        fullConfig.chunkOverlap,
      );

      if (totalChunks === 0) {
        console.log('  File is empty, skipping');
        continue;
      }

      console.log(`  Created ${totalChunks} chunks`);

      // Process chunks in batches to manage memory
      const batchSize = fullConfig.batchSize || 50;
      const batchChunks: Chunk[] = [];
      let batchIndex = 0;

      for (const chunk of chunkMarkdownGenerator(
        content,
        file.relativePath,
        fullConfig.chunkSize,
        fullConfig.chunkOverlap,
        totalChunks,
      )) {
        batchChunks.push(chunk);

        if (batchChunks.length >= batchSize) {
          batchIndex += 1;
          const chunkContents = batchChunks.map((c) => c.content);

          console.log(
            `  Generating embeddings for batch ${batchIndex}/${Math.ceil(totalChunks / batchSize)}...`,
          );
          try {
            const embeddings =
              await embeddingGenerator.generateEmbeddings(chunkContents);

            console.log('  Inserting batch into ChromaDB...');
            await chromaManager.insertChunks(
              collection,
              batchChunks,
              embeddings,
            );
          } catch (error) {
            console.error(
              `  ✗ Batch ${batchIndex} failed with error:`,
              error instanceof Error ? error.message : error,
            );
            console.error(
              `    First chunk preview: ${batchChunks[0]?.content.substring(0, 150)}...`,
            );
            throw error;
          }
          batchChunks.length = 0;
        }
      }

      if (batchChunks.length > 0) {
        batchIndex += 1;
        const chunkContents = batchChunks.map((c) => c.content);

        console.log(
          `  Generating embeddings for batch ${batchIndex}/${Math.ceil(totalChunks / batchSize)}...`,
        );
        try {
          const embeddings =
            await embeddingGenerator.generateEmbeddings(chunkContents);

          console.log('  Inserting batch into ChromaDB...');
          await chromaManager.insertChunks(collection, batchChunks, embeddings);
        } catch (error) {
          console.error(
            `  ✗ Final batch failed with error:`,
            error instanceof Error ? error.message : error,
          );
          console.error(
            `    First chunk preview: ${batchChunks[0]?.content.substring(0, 150)}...`,
          );
          throw error;
        }
        batchChunks.length = 0;
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
