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

  constructor(
    embeddingUrl: string = 'http://localhost:12434/engines/llama.cpp/v1/embeddings',
    model: string = 'ai/embeddinggemma',
  ) {
    this.embeddingUrl = embeddingUrl;
    this.model = model;
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
      const embedding = await this.generateSingle(text);
      embeddings.push(embedding);

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
   * Generate embedding for a single text
   */
  private async generateSingle(text: string): Promise<number[]> {
    const response = await fetch(this.embeddingUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        input: text,
      }),
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
  }
}
