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
  const newState = { ...state };

  for (const file of files) {
    newState.files[file.relativePath] = file.contentHash;
  }

  return newState;
}

/**
 * Delete a file from the sources folder after successful import
 */
export async function deleteImportedFile(filePath: string): Promise<void> {
  try {
    await rm(filePath, { force: true });
    console.log(`    Cleaned up: removed ${filePath}`);
  } catch (error) {
    console.warn(
      `    ⚠ Failed to delete file ${filePath}: ${error instanceof Error ? error.message : error}`,
    );
  }
}

/**
 * Remove files that have already been imported and have no changes
 * Returns the number of files removed
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
      try {
        await rm(file.path, { force: true });
        console.log(
          `  Removed: ${file.relativePath} (already imported, no changes)`,
        );
        removedCount++;
      } catch (error) {
        console.warn(
          `  ⚠ Failed to remove ${file.relativePath}: ${error instanceof Error ? error.message : error}`,
        );
      }
    }
  }

  return removedCount;
}
