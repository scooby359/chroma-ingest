import { ChromaClient, type Collection } from 'chromadb';
import type { Chunk } from './chunking.js';

export class ChromaDBManager {
  private readonly client: ChromaClient;
  private readonly collectionName: string;

  constructor(chromaUrl: string, collectionName: string) {
    const url = new URL(chromaUrl);
    this.client = new ChromaClient({
      host: url.hostname,
      port: Number(url.port) || (url.protocol === 'https:' ? 443 : 80),
      ssl: url.protocol === 'https:',
    });
    this.collectionName = collectionName;
  }

  /**
   * Delete the collection if it exists
   */
  async deleteCollection(): Promise<void> {
    try {
      await this.client.deleteCollection({ name: this.collectionName });
      console.log(`Deleted collection: ${this.collectionName}`);
    } catch (error) {
      // Collection might not exist, that's okay
      console.warn(`Could not delete collection: ${error}`);
    }
  }

  /**
   * Get or create the collection
   */
  async getOrCreateCollection(): Promise<Collection> {
    const collection = await this.client.getOrCreateCollection({
      name: this.collectionName,
    });

    return collection;
  }

  /**
   * Insert chunks with embeddings into ChromaDB
   */
  async insertChunks(
    collection: Collection,
    chunks: Chunk[],
    embeddings: number[][],
  ): Promise<Collection> {
    if (chunks.length === 0) return collection;

    const ids = chunks.map(
      (chunk) => `${chunk.metadata.source}_chunk_${chunk.metadata.chunkIndex}`,
    );

    const documents = chunks.map((chunk) => chunk.content);
    const metadatas = chunks.map((chunk) => ({
      source: chunk.metadata.source,
      chunk_index: chunk.metadata.chunkIndex,
      total_chunks: chunk.metadata.totalChunks,
    }));

    await collection.add({
      ids,
      embeddings,
      documents,
      metadatas,
    });

    console.log(`Inserted ${chunks.length} chunks into ChromaDB`);
    return collection;
  }
}
