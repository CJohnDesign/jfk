# JFK Investigation Document Scraper

## Overview
This documentation outlines the PDF scraping component of the JFK investigator project. The system is designed to collect, store, and process declassified documents related to the JFK assassination investigation, utilizing Firecrawl for efficient PDF scraping and processing.

## Document Sources
The scraper will target the following primary sources:
- National Archives (NARA) JFK Collection
- Mary Ferrell Foundation Digital Archive
- Government Attic FOIA Documents
- CIA Reading Room JFK Collection

## Technical Architecture

### Dependencies
```bash
# Core dependencies
npm install @mendableai/firecrawl-js
npm install clsx lucide-react tailwind-merge tailwindcss-animate class-variance-authority
```

### PDF Scraper Component
```typescript
import { FireCrawlLoader } from "langchain/document_loaders/web/firecrawl";

interface DocumentMetadata {
  id: string;
  title: string;
  date: string;
  source: string;
  agency: string;
  pageCount: number;
  fileSize: number;
  classification: string;
  documentType: string;
}

interface ScrapedDocument {
  metadata: DocumentMetadata;
  pdfUrl: string;
  localPath: string;
  downloadStatus: 'pending' | 'complete' | 'failed';
  processingStatus: 'queued' | 'processing' | 'completed' | 'error';
}

interface FirecrawlConfig {
  apiKey: string;
  mode: 'scrape' | 'crawl';
  params: {
    crawlerOptions?: {
      includes?: string[];
      excludes?: string[];
      maxDepth?: number;
      limit?: number;
      returnOnlyUrls: boolean;
    };
    pageOptions: {
      parsePDF: boolean;
      onlyMainContent: boolean;
    };
  };
}
```

### Storage Structure
```
public/
└── PDFs/
    ├── raw/                 # Original downloaded PDFs
    ├── processed/           # OCR-processed PDFs
    └── metadata/            # JSON files with document metadata
```

## Implementation Steps

1. **Firecrawl Integration**
   - Set up Firecrawl API configuration
   - Configure PDF parsing options
   - Implement source-specific crawling rules
   - Set up rate limiting and concurrent processing

2. **Document Source Analysis**
   - Map available document repositories
   - Define URL patterns for each source
   - Configure source-specific crawl patterns
   - Document API endpoints and access patterns

3. **Scraper Development**
   - Implement Firecrawl-based scrapers for each source
   - Configure PDF parsing and extraction
   - Set up metadata extraction
   - Implement validation and error handling

4. **Storage and Processing Pipeline**
   - Implement file storage system
   - Set up metadata indexing
   - Configure OCR processing (if needed as fallback)
   - Implement deduplication logic

## Usage

```typescript
// Example scraper usage with Firecrawl
const scraper = new JFKDocumentScraper({
  firecrawl: {
    apiKey: process.env.FIRECRAWL_API_KEY,
    mode: 'crawl',
    params: {
      crawlerOptions: {
        includes: ['/pdf/', '/documents/'],
        maxDepth: 3,
        limit: 100,
        returnOnlyUrls: false
      },
      pageOptions: {
        parsePDF: true,
        onlyMainContent: true
      }
    }
  },
  sources: ['NARA', 'MaryFerrell'],
  outputDir: 'public/PDFs',
  concurrency: 2
});

await scraper.initialize();
await scraper.startScraping();

// Example single PDF processing
const loader = new FireCrawlLoader({
  url: "https://www.archives.gov/files/research/jfk/releases/docid-32112745.pdf",
  apiKey: process.env.FIRECRAWL_API_KEY,
  mode: "scrape",
  params: {
    pageOptions: {
      parsePDF: true
    }
  }
});

const document = await loader.load();
```

## Best Practices

1. **Firecrawl Configuration**
   - Use environment variables for API keys
   - Configure appropriate rate limits
   - Set up proper error handling
   - Implement retry mechanisms

2. **Data Validation**
   - Verify PDF parsing results
   - Validate metadata extraction
   - Check for duplicate documents
   - Implement content validation

3. **Error Handling**
   - Log failed downloads
   - Implement retry mechanisms
   - Track parsing errors
   - Monitor API rate limits

4. **Storage Management**
   - Implement file deduplication
   - Use consistent naming conventions
   - Maintain metadata relationships
   - Set up proper backup procedures

## Next Steps

1. Set up Firecrawl API integration
2. Implement source-specific crawl configurations
3. Create metadata extraction pipeline
4. Set up document storage and indexing
5. Implement search and retrieval interface
6. Add monitoring and logging system 