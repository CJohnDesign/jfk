import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream';
import { promisify } from 'util';
import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';

const streamPipeline = promisify(pipeline);

interface NARADocument {
  recordNumber: string;
  releaseDate: string;
  pdfUrl: string;
}

interface FirecrawlResponse {
  url: string;
  title?: string;
  text?: string;
  metadata?: {
    author?: string;
    creationDate?: string;
    modificationDate?: string;
    producer?: string;
    pageCount?: number;
  };
  error?: string;
}

interface DocumentMetadata {
  recordNumber: string;
  url: string;
  processedAt: string;
  content?: {
    title?: string;
    text?: string;
  };
  pdfMetadata?: {
    author?: string;
    creationDate?: string;
    modificationDate?: string;
    producer?: string;
    pageCount?: number;
  };
  error?: string;
}

class NARAJFKScraper {
  private baseUrl = 'https://www.archives.gov';
  private releasePath = '/files/research/jfk/releases/2025/0318/';
  private listingUrl = 'https://www.archives.gov/research/jfk/release-2025';
  private outputDir: string;
  private apiKey: string;
  private firecrawlUrl = 'https://api.firecrawl.dev/v0/scrape';

  constructor(outputDir: string, apiKey: string) {
    this.outputDir = outputDir;
    this.apiKey = apiKey;
    this.ensureDirectories();
  }

  private ensureDirectories() {
    const dirs = [
      this.outputDir,
      path.join(this.outputDir, 'raw'),
      path.join(this.outputDir, 'processed'),
      path.join(this.outputDir, 'metadata')
    ];

    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  private async fetchDocumentList(): Promise<NARADocument[]> {
    try {
      console.log('Fetching document list from NARA website...');
      const response = await fetch(this.listingUrl);
      const html = await response.text();
      const dom = new JSDOM(html);
      const document = dom.window.document;

      // Find all PDF links in the table
      const pdfLinks = Array.from(document.querySelectorAll('table a[href$=".pdf"]'));
      
      const documents: NARADocument[] = pdfLinks.map(link => {
        const href = (link as HTMLAnchorElement).href;
        const recordNumber = href.split('/').pop()?.replace('.pdf', '') || '';
        return {
          recordNumber,
          releaseDate: '03/18/2025',
          pdfUrl: `${this.baseUrl}${this.releasePath}${recordNumber}.pdf`
        };
      });

      // Save the full list for reference
      const listPath = path.join(this.outputDir, 'document_list.json');
      await fs.promises.writeFile(listPath, JSON.stringify(documents, null, 2));

      console.log(`Found ${documents.length} documents in total`);
      return documents;
    } catch (error) {
      console.error('Error fetching document list:', error);
      throw error;
    }
  }

  private async downloadPDF(pdfUrl: string, outputPath: string): Promise<void> {
    try {
      const response = await fetch(pdfUrl);
      if (!response.ok) throw new Error(`Failed to download PDF: ${response.statusText}`);
      await streamPipeline(response.body, fs.createWriteStream(outputPath));
      console.log(`Successfully downloaded: ${outputPath}`);
    } catch (error) {
      console.error(`Error downloading ${pdfUrl}:`, error);
      throw error;
    }
  }

  private async processPDFWithFirecrawl(pdfUrl: string): Promise<FirecrawlResponse> {
    try {
      const response = await fetch(this.firecrawlUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          url: pdfUrl,
          pageOptions: {
            parsePDF: true,
            onlyMainContent: true
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Firecrawl API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Error processing PDF with Firecrawl: ${error}`);
      throw error;
    }
  }

  private async saveMetadata(recordNumber: string, metadata: DocumentMetadata): Promise<void> {
    const metadataPath = path.join(this.outputDir, 'metadata', `${recordNumber}.json`);
    await fs.promises.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
  }

  public async scrapeDocument(doc: NARADocument): Promise<void> {
    const pdfPath = path.join(this.outputDir, 'raw', `${doc.recordNumber}.pdf`);
    const processedPath = path.join(this.outputDir, 'processed', `${doc.recordNumber}.json`);
    
    // Skip if already processed
    if (fs.existsSync(processedPath)) {
      console.log(`Skipping ${doc.recordNumber} - already processed`);
      return;
    }

    try {
      // Download PDF if not exists
      if (!fs.existsSync(pdfPath)) {
        await this.downloadPDF(doc.pdfUrl, pdfPath);
      }

      // Process with Firecrawl
      const processedContent = await this.processPDFWithFirecrawl(doc.pdfUrl);

      // Save processed content
      await fs.promises.writeFile(processedPath, JSON.stringify(processedContent, null, 2));

      // Save metadata
      await this.saveMetadata(doc.recordNumber, {
        recordNumber: doc.recordNumber,
        url: doc.pdfUrl,
        processedAt: new Date().toISOString(),
        content: {
          title: processedContent.title,
          text: processedContent.text
        },
        pdfMetadata: processedContent.metadata,
        error: processedContent.error
      });

    } catch (error) {
      console.error(`Error processing ${doc.recordNumber}:`, error);
      // Log failed documents for retry
      const errorLog = path.join(this.outputDir, 'failed_downloads.txt');
      await fs.promises.appendFile(errorLog, `${doc.recordNumber},${doc.pdfUrl}\n`);
    }
  }

  public async scrapeAllDocuments(): Promise<void> {
    // Fetch all document numbers from the NARA website
    const documents = await this.fetchDocumentList();
    
    console.log(`Starting to process ${documents.length} documents`);
    console.log('Documents will be saved to:', this.outputDir);

    // Process documents with concurrency control
    const concurrency = 5;
    let processed = 0;

    for (let i = 0; i < documents.length; i += concurrency) {
      const batch = documents.slice(i, i + concurrency);
      await Promise.all(batch.map(doc => this.scrapeDocument(doc)));
      
      processed += batch.length;
      console.log(`Progress: ${processed}/${documents.length} documents (${Math.round(processed/documents.length*100)}%)`);
      
      // Add delay between batches to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('Scraping completed!');
    console.log('Total documents processed:', processed);
    console.log('Check failed_downloads.txt for any errors');
  }

  public async listAllPDFUrls(): Promise<void> {
    const documents = await this.fetchDocumentList();
    const urls = documents.map(doc => ({
      recordNumber: doc.recordNumber,
      url: doc.pdfUrl
    }));
    
    // Save URLs to a JSON file
    const urlsPath = path.join(this.outputDir, 'pdf_urls.json');
    await fs.promises.writeFile(urlsPath, JSON.stringify(urls, null, 2));
    console.log(`Found ${urls.length} PDF URLs. Saved to ${urlsPath}`);
    
    // Also print first few URLs as preview
    console.log('\nFirst 5 URLs as preview:');
    urls.slice(0, 5).forEach(({recordNumber, url}) => {
      console.log(`${recordNumber}: ${url}`);
    });
  }
}

// Main execution
async function main() {
  const outputDir = path.join(process.cwd(), 'public', 'PDFs');
  const apiKey = process.env.FIRECRAWL_API_KEY;

  if (!apiKey) {
    throw new Error('FIRECRAWL_API_KEY environment variable is required');
  }

  const scraper = new NARAJFKScraper(outputDir, apiKey);
  
  // List all PDF URLs
  await scraper.listAllPDFUrls();
}

// Run the script
main().catch(console.error); 