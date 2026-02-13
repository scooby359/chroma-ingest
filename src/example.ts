import { type IngestConfig } from './config.js';
import { ingestMarkdownFiles } from './index.js';

// Example configuration for custom usage
// You can modify this file or create your own script

const config: IngestConfig = {
  // Path to your markdown files
  sourceFolder: './sources',

  // ChromaDB connection
  chromaUrl: 'http://127.0.0.1:8000',
  collectionName: 'markdown_docs',

  // Local embedding model
  embeddingUrl: 'http://127.0.0.1:12434/engines/llama.cpp/v1/embeddings',
  embeddingModel: 'ai/embeddinggemma',

  // Chunking settings
  chunkSize: 600, // Characters per chunk
  chunkOverlap: 150, // Overlap between chunks

  // Batch processing for memory efficiency
  batchSize: 50, // Process 50 chunks at a time

  // State file for tracking changes
  stateFile: '.ingest-state.json',
};

try {
  await ingestMarkdownFiles(config);
} catch (error) {
  console.error('Fatal error:', error);
  process.exit(1);
}
