import { glob, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

export interface FileInfo {
  path: string;
  relativePath: string;
  contentHash: string;
}

/**
 * Calculate SHA-256 hash of file contents
 */
function hashContent(content: string): string {
  return createHash('sha256').update(content, 'utf-8').digest('hex');
}

/**
 * Discover all markdown files in a folder recursively
 */
export async function discoverMarkdownFiles(
  sourceFolder: string,
): Promise<FileInfo[]> {
  const pattern = join(sourceFolder, '**', '*.md');
  const fileInfos: FileInfo[] = [];

  // Collect all files from the async iterator
  for await (const filePath of glob(pattern)) {
    // Normalize path separators to forward slashes for consistency across platforms
    const relativePath = filePath
      .substring(sourceFolder.length + 1)
      .replaceAll('\\', '/');
    const content = await readFile(filePath, 'utf-8');
    const contentHash = hashContent(content);

    fileInfos.push({
      path: filePath,
      relativePath,
      contentHash,
    });
  }

  return fileInfos;
}
