import os
from typing import List, Dict, Any
import aiohttp
import asyncio
from dotenv import load_dotenv
from langchain.agents import initialize_agent, Tool
from langchain.memory import ConversationBufferMemory
from langchain.chat_models import ChatOpenRouter
from langchain.chains import LLMChain
from langchain.prompts import PromptTemplate
import PyPDF2
import io

load_dotenv()

class InvestigativeAgent:
    def __init__(self):
        self.api_key = os.getenv("OPENROUTER_API_KEY")
        if not self.api_key:
            raise ValueError("OPENROUTER_API_KEY environment variable not set")
            
        self.llm = ChatOpenRouter(
            api_key=self.api_key,
            model="anthropic/claude-3-opus",
            temperature=0.7
        )
        
        self.memory = ConversationBufferMemory(
            memory_key="chat_history",
            return_messages=True
        )
        
        # Initialize the chains
        self.document_chain = LLMChain(
            llm=self.llm,
            prompt=PromptTemplate(
                template="Analyze the following document from an investigative perspective, focusing on geopolitical implications: {document}",
                input_variables=["document"]
            )
        )
        
        self.analysis_chain = LLMChain(
            llm=self.llm,
            prompt=PromptTemplate(
                template="Based on the document analysis, identify key findings and geopolitical implications. Focus on international relations, political motivations, and historical context: {analysis}",
                input_variables=["analysis"]
            )
        )
        
        self.report_chain = LLMChain(
            llm=self.llm,
            prompt=PromptTemplate(
                template="Generate a detailed investigative report summarizing the findings. Include sections for: Executive Summary, Key Findings, Geopolitical Implications, and Areas for Further Investigation: {findings}",
                input_variables=["findings"]
            )
        )
        
        # Initialize tools
        self.tools = [
            Tool(
                name="document_analyzer",
                func=self.analyze_document,
                description="Analyzes a document from an investigative perspective"
            ),
            Tool(
                name="connection_finder",
                func=self.find_connections,
                description="Identifies connections between documents and events"
            ),
            Tool(
                name="report_generator",
                func=self.generate_report,
                description="Generates investigative reports based on findings"
            )
        ]
        
        # Initialize the agent
        self.agent = initialize_agent(
            tools=self.tools,
            llm=self.llm,
            agent="chat-conversational-react-description",
            memory=self.memory,
            verbose=True
        )
    
    async def fetch_pdf(self, url: str) -> str:
        """Fetch and extract text from a PDF URL."""
        async with aiohttp.ClientSession() as session:
            async with session.get(url) as response:
                if response.status != 200:
                    raise Exception(f"Failed to fetch PDF from {url}")
                
                pdf_content = await response.read()
                pdf_file = io.BytesIO(pdf_content)
                
                try:
                    pdf_reader = PyPDF2.PdfReader(pdf_file)
                    text = ""
                    for page in pdf_reader.pages:
                        text += page.extract_text()
                    return text
                except Exception as e:
                    raise Exception(f"Failed to extract text from PDF: {str(e)}")
    
    async def analyze_document(self, document_text: str) -> Dict[str, Any]:
        """Analyze a single document using the document chain."""
        analysis = await self.document_chain.arun(document=document_text)
        return await self.analysis_chain.arun(analysis=analysis)
    
    async def find_connections(self, documents: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Find connections between multiple documents."""
        documents_str = "\n\n".join([str(doc) for doc in documents])
        return await self.agent.arun(
            f"Analyze these documents and identify connections, patterns, and relationships between them: {documents_str}"
        )
    
    async def generate_report(self, findings: List[Dict[str, Any]]) -> str:
        """Generate a comprehensive report from the findings."""
        findings_str = "\n\n".join([str(finding) for finding in findings])
        return await self.report_chain.arun(findings=findings_str)
    
    async def process_batch(self, pdf_urls: List[str]) -> Dict[str, Any]:
        """Process a batch of PDF documents."""
        # Process documents in batches of 3
        findings = []
        for i in range(0, len(pdf_urls), 3):
            batch = pdf_urls[i:i+3]
            
            # Process each document in the batch
            batch_results = []
            for url in batch:
                try:
                    # Fetch and extract text from PDF
                    document_text = await self.fetch_pdf(url)
                    
                    # Analyze the document
                    analysis = await self.analyze_document(document_text)
                    batch_results.append(analysis)
                except Exception as e:
                    print(f"Error processing document {url}: {str(e)}")
                    continue
            
            # Find connections between documents in the batch
            if batch_results:
                connections = await self.find_connections(batch_results)
                findings.append({
                    "batch_results": batch_results,
                    "connections": connections
                })
        
        # Generate final report
        if findings:
            return await self.generate_report(findings)
        else:
            return {"error": "No documents were successfully processed"}

async def main():
    """Main function to demonstrate usage."""
    # Initialize the agent
    investigator = InvestigativeAgent()
    
    # Example usage with a batch of PDFs
    pdf_urls = [
        "https://www.archives.gov/files/research/jfk/releases/2025/0318/104-10003-10041.pdf",
        "https://www.archives.gov/files/research/jfk/releases/2025/0318/104-10004-10143.pdf",
        "https://www.archives.gov/files/research/jfk/releases/2025/0318/104-10004-10156.pdf"
    ]
    
    report = await investigator.process_batch(pdf_urls)
    print(report)

if __name__ == "__main__":
    asyncio.run(main())