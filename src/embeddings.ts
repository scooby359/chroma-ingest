interface EmbeddingResponse {
  object: string;
  data: Array<{
    object: string;
    embedding: number[];
    index: number;
  }>;
  model: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

export class EmbeddingGenerator {
  private readonly embeddingUrl: string;
  private readonly model: string;
  private readonly delayMs: number;
  private readonly maxRetries: number;

  constructor(
    embeddingUrl: string = 'http://localhost:12434/engines/llama.cpp/v1/embeddings',
    model: string = 'ai/embeddinggemma',
    delayMs: number = 500,
    maxRetries: number = 3,
  ) {
    this.embeddingUrl = embeddingUrl;
    this.model = model;
    this.delayMs = delayMs;
    this.maxRetries = maxRetries;
  }

  /**
   * Delay execution for a specified number of milliseconds
   */
  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Generate embeddings for a batch of texts
   */
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    const embeddings: number[][] = [];

    // Process one at a time for local model (can adjust if batch supported)
    for (let i = 0; i < texts.length; i += 1) {
      const text = texts[i];
      if (!text) continue;

      try {
        const embedding = await this.generateSingle(text);
        embeddings.push(embedding);
      } catch (error) {
        console.error(
          `    ✗ Failed to generate embedding for chunk ${i + 1}/${texts.length}`,
        );
        console.error(`      Text preview: ${text.substring(0, 100)}...`);
        throw error;
      }

      // Add delay between requests to avoid overwhelming the endpoint
      if (i < texts.length - 1) {
        await this.delay(this.delayMs);
      }

      // Log progress
      if ((i + 1) % 10 === 0 || i === texts.length - 1) {
        console.log(
          `  Generated embeddings for ${i + 1}/${texts.length} chunks`,
        );
      }
    }

    return embeddings;
  }

  /**
   * Generate embedding for a single text with retry logic
   */
  private async generateSingle(text: string): Promise<number[]> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await this.fetchEmbedding(text);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < this.maxRetries) {
          // Exponential backoff: 1s, 2s, 4s
          const backoffMs = Math.pow(2, attempt - 1) * 1000;
          console.warn(
            `    ⚠ Embedding request failed (attempt ${attempt}/${this.maxRetries}), retrying in ${backoffMs}ms...`,
          );
          await this.delay(backoffMs);
        }
      }
    }

    throw lastError || new Error('Failed to generate embedding after retries');
  }

  /**
   * Fetch embedding from the API
   */
  private async fetchEmbedding(text: string): Promise<number[]> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    try {
      const response = await fetch(this.embeddingUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          input: text,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Embedding API error: ${response.status} - ${error}`);
      }

      const data = (await response.json()) as EmbeddingResponse;

      if (!data.data || data.data.length === 0) {
        throw new Error('No embedding returned from API');
      }

      const firstEmbedding = data.data[0];
      if (!firstEmbedding?.embedding) {
        throw new Error('Invalid embedding data received');
      }
      return firstEmbedding.embedding;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(
          `Embedding API request timed out after 30s. Text preview: ${text.substring(0, 100)}...`,
        );
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
