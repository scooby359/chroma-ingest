export interface Chunk {
  content: string;
  metadata: {
    source: string;
    chunkIndex: number;
    totalChunks: number;
  };
}

/**
 * Compute the next chunk end position using natural boundaries
 */
function getChunkEnd(
  cleanContent: string,
  start: number,
  chunkSize: number,
): number {
  let end = start + chunkSize;

  if (end < cleanContent.length) {
    const paragraphBreak = cleanContent.lastIndexOf('\n\n', end);
    if (paragraphBreak > start + chunkSize / 2) {
      end = paragraphBreak + 2;
    } else {
      const sentenceBreak = cleanContent.lastIndexOf('. ', end);
      if (sentenceBreak > start + chunkSize / 2) {
        end = sentenceBreak + 2;
      } else {
        const wordBreak = cleanContent.lastIndexOf(' ', end);
        if (wordBreak > start) {
          end = wordBreak + 1;
        }
      }
    }
  }

  return end;
}

/**
 * Count chunks without allocating them
 */
export function countMarkdownChunks(
  content: string,
  chunkSize: number = 1000,
  overlap: number = 200,
): number {
  const cleanContent = content.trim();
  if (cleanContent.length === 0) return 0;

  let start = 0;
  let count = 0;

  while (start < cleanContent.length) {
    const end = getChunkEnd(cleanContent, start, chunkSize);
    const chunkContent = cleanContent.substring(start, end).trim();
    if (chunkContent.length > 0) {
      count += 1;
    }
    start = end - overlap;
    if (start >= cleanContent.length) break;
  }

  return count;
}

/**
 * Stream markdown chunks without keeping the full chunk list in memory
 */
export function* chunkMarkdownGenerator(
  content: string,
  filePath: string,
  chunkSize: number = 1000,
  overlap: number = 200,
  totalChunks?: number,
): Generator<Chunk> {
  const cleanContent = content.trim();
  if (cleanContent.length === 0) return;

  const resolvedTotal = totalChunks ?? countMarkdownChunks(content, chunkSize, overlap);
  let start = 0;
  let chunkIndex = 0;

  while (start < cleanContent.length) {
    const end = getChunkEnd(cleanContent, start, chunkSize);
    const chunkContent = cleanContent.substring(start, end).trim();

    if (chunkContent.length > 0) {
      yield {
        content: chunkContent,
        metadata: {
          source: filePath,
          chunkIndex,
          totalChunks: resolvedTotal,
        },
      };
      chunkIndex += 1;
    }

    start = end - overlap;
    if (start >= cleanContent.length) break;
  }
}
