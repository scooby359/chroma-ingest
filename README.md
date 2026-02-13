# Markdown to ChromaDB Ingestion Tool

This tool ingests markdown documents into a ChromaDB instance with embeddings generated using a local embedding model.

## Features

- 🔍 **Recursive file discovery**: Automatically finds all markdown files in a folder
- ✂️ **Smart chunking**: Splits documents into overlapping chunks with natural boundaries
- 🔄 **Change tracking**: Only processes files that have changed since last run
- 🤖 **Local embeddings**: Uses a local embedding model (embeddinggemma via llama.cpp)
- 💾 **ChromaDB storage**: Stores chunks with embeddings in ChromaDB for retrieval

## Prerequisites

- Node.js 18+
- ChromaDB running locally (default: http://localhost:8000)
- Local embedding server running (default: http://localhost:12434)

```bash
npm install
```

## Configuration

The tool uses sensible defaults configured in [src/config.ts](src/config.ts). Most use cases require no additional configuration.

## Usage

### Step 1: Start Required Services

**ChromaDB:**

```bash
docker run -p 8000:8000 chromadb/chroma
```

**Local Embedding Server:**
Make sure your embedding server is running on http://localhost:12434

### Step 2: Check ChromaDB Connection

First, verify that ChromaDB is running and accessible:

```bash
npm run check-chroma
```

### Step 3: Run Ingestion

Run with default configuration (processes `./sources` folder):

```bash
npm run dev
```

Or use the example script:

```bash
npm run example
```

### Custom Configuration

Edit [src/index.ts](src/index.ts) or create your own script based on [src/example.ts](src/example.ts):

```typescript
const config: IngestConfig = {
  sourceFolder: './sources', // Path to markdown files
  chromaUrl: 'http://localhost:8000', // ChromaDB URL
  collectionName: 'ExchangeResearch', // Collection name
  embeddingUrl: 'http://localhost:12434/engines/llama.cpp/v1/embeddings', // Local embedding server
  embeddingModel: 'ai/embeddinggemma', // Local embedding model
  chunkSize: 600, // Characters per chunk
  chunkOverlap: 150, // Overlap between chunks
  batchSize: 50, // Number of chunks to process at once (for memory efficiency)
  stateFile: '.ingest-state.json', // State tracking file
};
```

### Build and Run

```bash
npm run build
npm start
```

## How It Works

1. **Discovery**: Scans the source folder for all `.md` files
2. **Change Detection**: Compares file modification times with previous run
3. **Chunking**: Splits each changed file into overlapping chunks
4. **Embedding**: Generates embeddings for each chunk using local embedding model
5. **Storage**: Stores chunks and embeddings in ChromaDB
6. **State Tracking**: Saves file timestamps to `.ingest-state.json`

## Re-running

The tool automatically detects which files have changed since the last run. Simply run it again to process only updated files:

```bash
npm run dev
```

To force re-ingestion of all files, delete the state file:

```bash
rm .ingest-state.json
npm run dev
```

## Project Structure

```
src/
├── index.ts           # Main entry point and orchestration
├── config.ts          # Configuration types and defaults
├── fileDiscovery.ts   # Markdown file discovery
├── chunking.ts        # Document chunking logic
├── changeTracking.ts  # File change detection
├── embeddings.ts      # Local embedding model integration
├── chromadb.ts        # ChromaDB operations
├── example.ts         # Example usage script
├── checkChroma.ts     # ChromaDB health check
└── inspect.ts         # ChromaDB collection inspector
```

## Available Scripts

- `npm run dev` - Run ingestion with default configuration
- `npm run example` - Run the example script
- `npm run check-chroma` - Check if ChromaDB is running
- `npm run inspect` - Inspect contents of ChromaDB collection
- `npm run build` - Compile TypeScript to JavaScript
- `npm start` - Run the compiled JavaScript

## License

ISC
