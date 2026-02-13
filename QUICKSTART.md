# Quick Start Guide

## 1. Set up your Gemini API Key

Get your API key from: https://aistudio.google.com/app/apikey

Add it to `.env`:

```
GEMINI_API_KEY=your_actual_key_here
```

## 2. Start ChromaDB

Using Docker:

```bash
docker run -p 8000:8000 chromadb/chroma
```

## 3. Verify ChromaDB is Running

```bash
npm run check-chroma
```

## 3. Run Ingestion

```bash
npm run dev
```

## What Happens

1. The tool scans the `./sources` folder for markdown files
2. Reads each file and splits it into chunks (~1000 characters each)
3. Generates embeddings using local embedding model
4. Stores chunks + embeddings in ChromaDB
5. Tracks file timestamps in `.ingest-state.json`

## Re-running

Just run `npm run dev` again - it will only process changed files!

To force re-ingestion of all files:

```bash
rm .ingest-state.json
npm run dev
```

## Changing the Source Folder

Edit [src/index.ts](src/index.ts) line ~115:

```typescript
const config: IngestConfig = {
  sourceFolder: 'C:\\path\\to\\your\\markdown\\files', // Change this
  // ... rest of config
};
```

Or create a custom script based on [src/example.ts](src/example.ts).
