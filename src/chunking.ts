export interface Chunk {
  content: string;
  metadata: {
    source: string;
    chunkIndex: number;
    totalChunks: number;
  };
}

/**
 * Split markdown content into overlapping chunks
 */
export function chunkMarkdown(
  content: string,
  filePath: string,
  chunkSize: number = 1000,
  overlap: number = 200,
): Chunk[] {
  const chunks: Chunk[] = [];

  // Remove excessive whitespace but preserve paragraph breaks
  const cleanContent = content.trim();

  if (cleanContent.length === 0) {
    return chunks;
  }

  let start = 0;
  let chunkIndex = 0;

  while (start < cleanContent.length) {
    let end = start + chunkSize;

    // If this isn't the last chunk, try to break at a natural boundary
    if (end < cleanContent.length) {
      // Look for paragraph break (double newline)
      const paragraphBreak = cleanContent.lastIndexOf('\n\n', end);
      if (paragraphBreak > start + chunkSize / 2) {
        end = paragraphBreak + 2;
      } else {
        // Fall back to sentence break
        const sentenceBreak = cleanContent.lastIndexOf('. ', end);
        if (sentenceBreak > start + chunkSize / 2) {
          end = sentenceBreak + 2;
        } else {
          // Fall back to word break
          const wordBreak = cleanContent.lastIndexOf(' ', end);
          if (wordBreak > start) {
            end = wordBreak + 1;
          }
        }
      }
    }

    const chunkContent = cleanContent.substring(start, end).trim();

    if (chunkContent.length > 0) {
      chunks.push({
        content: chunkContent,
        metadata: {
          source: filePath,
          chunkIndex,
          totalChunks: 0, // Will be updated after all chunks are created
        },
      });
      chunkIndex++;
    }

    // Move start position forward, accounting for overlap
    start = end - overlap;
    if (start >= cleanContent.length) break;
  }

  // Update total chunks count
  chunks.forEach((chunk) => {
    chunk.metadata.totalChunks = chunks.length;
  });

  return chunks;
}
