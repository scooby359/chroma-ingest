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
  let end = Math.min(start + chunkSize, cleanContent.length);

  // Early exit if we're at or near the end
  if (end === cleanContent.length) {
    return end;
  }

  const minBreakPoint = start + Math.ceil(chunkSize / 2);

  // Try paragraph break (most natural boundary)
  let paragraphBreak = cleanContent.lastIndexOf('\n\n', end);
  if (paragraphBreak > minBreakPoint) {
    end = paragraphBreak + 2;
  } else {
    // Try sentence break
    let sentenceBreak = cleanContent.lastIndexOf('. ', end);
    if (sentenceBreak > minBreakPoint) {
      end = sentenceBreak + 2;
    } else {
      // Try line break (important for URL-heavy content)
      let lineBreak = cleanContent.lastIndexOf('\n', end);
      if (lineBreak > minBreakPoint) {
        end = lineBreak + 1;
      } else {
        // Try word boundary
        let wordBreak = cleanContent.lastIndexOf(' ', end);
        if (wordBreak > minBreakPoint) {
          end = wordBreak + 1;
        }
      }
    }
  }

  // Fallback: if no good break point found, just split at chunkSize
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
  let iterations = 0;
  const maxIterations =
    cleanContent.length / Math.max(chunkSize - overlap, 1) + 100; // Safety limit

  while (start < cleanContent.length && iterations < maxIterations) {
    const end = getChunkEnd(cleanContent, start, chunkSize);
    const chunkContent = cleanContent.substring(start, end).trim();

    if (chunkContent.length > 0) {
      count += 1;
    }

    // Ensure we always make forward progress
    const nextStart = Math.max(start + 1, end - overlap);
    if (nextStart === start) {
      // Prevent infinite loop: if we're not making progress, jump to end
      break;
    }

    start = nextStart;
    iterations += 1;

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

  const resolvedTotal =
    totalChunks ?? countMarkdownChunks(content, chunkSize, overlap);
  let start = 0;
  let chunkIndex = 0;
  let iterations = 0;
  const maxIterations =
    cleanContent.length / Math.max(chunkSize - overlap, 1) + 100; // Safety limit

  while (start < cleanContent.length && iterations < maxIterations) {
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

    // Ensure we always make forward progress
    const nextStart = Math.max(start + 1, end - overlap);
    if (nextStart === start) {
      // Prevent infinite loop: if we're not making progress, jump to end
      break;
    }

    start = nextStart;
    iterations += 1;

    if (start >= cleanContent.length) break;
  }
}
