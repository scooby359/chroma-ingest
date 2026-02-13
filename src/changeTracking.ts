import { readFile, writeFile } from 'node:fs/promises';
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
