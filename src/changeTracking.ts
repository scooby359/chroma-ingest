import { readFile, writeFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import type { FileInfo } from './fileDiscovery.js';

export interface IngestState {
  files: Record<string, string>; // relativePath -> content hash
}

/**
 * Load the state of previously ingested files
 */
export async function loadState(stateFile: string): Promise<IngestState> {
  if (!existsSync(stateFile)) {
    return { files: {} };
  }

  try {
    const content = await readFile(stateFile, 'utf-8');
    if (!content || content.trim() === '') {
      return { files: {} };
    }
    return JSON.parse(content);
  } catch (error) {
    console.warn(`Failed to load state file: ${error}`);
    return { files: {} };
  }
}

/**
 * Save the state of ingested files
 */
export async function saveState(
  stateFile: string,
  state: IngestState,
): Promise<void> {
  await writeFile(stateFile, JSON.stringify(state, null, 2), 'utf-8');
}

/**
 * Filter files to only those that have changed since last ingest
 */
export function getChangedFiles(
  files: FileInfo[],
  state: IngestState,
): FileInfo[] {
  return files.filter((file) => {
    const lastIngestedHash = state.files[file.relativePath];
    return !lastIngestedHash || file.contentHash !== lastIngestedHash;
  });
}

/**
 * Update state with newly ingested files
 */
export function updateState(
  state: IngestState,
  files: FileInfo[],
): IngestState {
  return {
    files: {
      ...state.files,
      ...Object.fromEntries(files.map((f) => [f.relativePath, f.contentHash])),
    },
  };
}

/**
 * Delete a file with error handling
 */
async function deleteFile(
  filePath: string,
  message: string,
  errorPrefix: string,
): Promise<boolean> {
  try {
    await rm(filePath, { force: true });
    console.log(message);
    return true;
  } catch (error) {
    console.warn(
      `${errorPrefix}: ${error instanceof Error ? error.message : error}`,
    );
    return false;
  }
}

/**
 * Delete a file from the sources folder after successful import
 */
export async function deleteImportedFile(filePath: string): Promise<void> {
  await deleteFile(
    filePath,
    `    Cleaned up: removed ${filePath}`,
    `    ⚠ Failed to delete file ${filePath}`,
  );
}

/**
 * Remove files that have already been imported and have no changes
 */
export async function removeUnchangedImportedFiles(
  files: FileInfo[],
  state: IngestState,
): Promise<number> {
  let removedCount = 0;

  for (const file of files) {
    const lastIngestedHash = state.files[file.relativePath];

    // File is in state and has the same hash (no changes)
    if (lastIngestedHash && file.contentHash === lastIngestedHash) {
      const removed = await deleteFile(
        file.path,
        `  Removed: ${file.relativePath} (already imported, no changes)`,
        `  ⚠ Failed to remove ${file.relativePath}`,
      );
      if (removed) removedCount++;
    }
  }

  return removedCount;
}
