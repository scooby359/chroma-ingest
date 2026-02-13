import { glob } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { join, relative } from 'node:path';
import { createHash } from 'node:crypto';

export interface FileInfo {
  path: string;
  relativePath: string;
  contentHash: string;
}

/**
 * Calculate SHA-256 hash of a file without loading it all into memory
 */
async function hashFile(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    const stream = createReadStream(filePath, { encoding: 'utf-8' });

    stream.on('data', (chunk) => {
      hash.update(chunk);
    });
    stream.on('error', reject);
    stream.on('end', () => {
      resolve(hash.digest('hex'));
    });
  });
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
    // Use path.relative to properly compute relative path regardless of whether sourceFolder is relative or absolute
    const relativePath = relative(sourceFolder, filePath).replaceAll('\\', '/');
    const contentHash = await hashFile(filePath);

    fileInfos.push({
      path: filePath,
      relativePath,
      contentHash,
    });
  }

  return fileInfos;
}
