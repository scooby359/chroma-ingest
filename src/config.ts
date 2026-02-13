export interface IngestConfig {
  // Folder containing markdown files to ingest
  sourceFolder: string;

  // ChromaDB connection settings
  chromaUrl: string;
  collectionName: string;

  // Local embedding model settings
  embeddingUrl?: string;
  embeddingModel?: string;

  // Chunking settings
  chunkSize?: number;
  chunkOverlap?: number;

  // Batch processing settings (for memory efficiency)
  batchSize?: number; // Number of chunks to process at once

  // Change tracking
  stateFile?: string;
}

export const defaultConfig: Partial<IngestConfig> = {
  chromaUrl: 'http://127.0.0.1:8000',
  collectionName: 'ExchangeResearch',
  embeddingUrl: 'http://127.0.0.1:12434/engines/llama.cpp/v1/embeddings',
  embeddingModel: 'ai/embeddinggemma',
  chunkSize: 600,
  chunkOverlap: 150,
  batchSize: 50, // Process 50 chunks at a time to manage memory
  stateFile: '.ingest-state.json',
};
