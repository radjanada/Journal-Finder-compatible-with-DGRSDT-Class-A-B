import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";

dotenv.config();

// Helper to safely extract text and page count from PDF buffer
async function extractTextFromPdf(pdfBuffer: Buffer): Promise<{ text: string; pageCount: number }> {
  try {
    const parser = new PDFParse({ data: new Uint8Array(pdfBuffer) });
    const textResult = await parser.getText();
    const text = textResult?.text || "";
    const pageCount = textResult?.pages?.length || 1;
    try {
      await parser.destroy();
    } catch {}
    return { text, pageCount };
  } catch (err) {
    console.warn("PDF parser notice, relying on multimodal fallback:", err);
    return { text: "", pageCount: 1 };
  }
}

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Server-side Gemini AI client initialization
const getAiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set. Please configure it in your secrets panel.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
};

// Health Check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// API: Live Search & Enrich Journal via Google Search Grounding
app.post("/api/enrich-journal", async (req, res) => {
  try {
    const title = req.body.title || req.body.journalTitle;
    const publisher = req.body.publisher;
    const issn = req.body.issn;
    if (!title) {
      return res.status(400).json({ error: "Journal title is required" });
    }

    const ai = getAiClient();
    const prompt = `You are an expert academic publishing database assistant. Search the live web to find the most accurate, up-to-date authoritative data for the academic journal:
Journal Title: "${title}"
Publisher: "${publisher || 'Unknown'}"
ISSN: "${issn || 'N/A'}"

Find and report authoritative details:
1. Official journal homepage URL (direct link) and author submission portal / guide URL.
2. Current latest Impact Factor (Clarivate JCR), 5-Year Impact Factor, Scopus CiteScore, and SCImago Journal Rank (SJR).
3. Quartile ranking (Q1, Q2, Q3, Q4).
4. Open Access model (Gold Open Access, Hybrid, Diamond (No Fee), or Subscription).
5. Exact Article Processing Charge (APC) in USD (or converted to USD).
6. 100% APC Waiver availability (e.g. Research4Life Group A and Group B eligible countries, Royal Society of Chemistry RSC 100% waiver programs, Diamond OA zero fee, low-income country discounts).
7. Average time to first decision (in days) and typical review speed / turnaround notes.
8. Acceptance rate (percentage if available, e.g. 25%).
9. Brief 2-3 sentence scope and editorial aims summary.
10. Key subject categories and relevant research topics.

Format your response strictly as a valid JSON object matching this schema (with NO markdown code blocks, just raw parseable JSON):
{
  "title": "${title}",
  "publisher": "string",
  "homePageUrl": "string",
  "submissionPortalUrl": "string",
  "impactFactor": number or null,
  "fiveYearIF": number or null,
  "citeScore": number or null,
  "sjr": number or null,
  "quartile": "Q1" | "Q2" | "Q3" | "Q4" | "N/A",
  "openAccessType": "Gold Open Access" | "Hybrid" | "Diamond (No Fee)" | "Subscription",
  "apcUSD": number or null,
  "apcDetails": "string",
  "waiverEligible": boolean,
  "waiverDetails": "string",
  "timeToFirstDecisionDays": number or null,
  "reviewTimeWeeks": number or null,
  "publicationSpeedNotes": "string",
  "acceptanceRate": number or null,
  "scopeSummary": "string",
  "subjectCategories": ["string"],
  "keywords": ["string"]
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 0.1
      }
    });

    const text = response.text || "{}";
    
    // Extract grounding sources
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const enrichmentSources = chunks
      .map((c: any) => c.web ? { title: c.web.title || 'Source', uri: c.web.uri || '' } : null)
      .filter((c: any) => c && c.uri);

    // Clean JSON text
    let parsedData: any = {};
    try {
      const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
      parsedData = JSON.parse(cleanJson);
    } catch {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsedData = JSON.parse(jsonMatch[0]);
        } catch {
          parsedData = { scopeSummary: text.slice(0, 300) };
        }
      }
    }

    res.json({
      success: true,
      enrichedData: parsedData,
      journalData: parsedData,
      sources: enrichmentSources,
      enrichmentSources,
      rawSummary: text
    });
  } catch (error: any) {
    console.error("Error enriching journal:", error);
    res.status(500).json({ error: error.message || "Failed to search journal details" });
  }
});

// API: Batch Automated Metric Fetching & Updating for multiple journals
app.post("/api/batch-enrich-journals", async (req, res) => {
  try {
    const { journals } = req.body;
    if (!journals || !Array.isArray(journals) || journals.length === 0) {
      return res.status(400).json({ error: "journals array is required" });
    }

    const ai = getAiClient();
    const batchSlice = journals.slice(0, 8); // Max 8 per batch to ensure deep grounded search

    const prompt = `You are an academic indexing and journal metrics research tool. Search and retrieve the latest authoritative metrics for the following ${batchSlice.length} journals:
${JSON.stringify(batchSlice.map(j => ({ id: j.id, title: j.title, publisher: j.publisher, issn: j.issn })), null, 2)}

For each journal, search for and provide:
1. Impact Factor (Clarivate JCR latest), 5-Year IF, Scopus CiteScore, SJR, Quartile (Q1-Q4).
2. Time to first decision (days), average peer-review time (weeks).
3. Acceptance rate (%).
4. Open access model & Article Processing Charge (APC in USD).
5. 100% APC Waiver availability (e.g. RSC 100% waivers, Research4Life Group A/B eligibility, Diamond OA no-fee).
6. Official homepage URL and author submission portal URL.

Return strictly a JSON object with a "results" array matching this format (no markdown outside JSON):
{
  "results": [
    {
      "id": "string (matching input id)",
      "title": "string",
      "impactFactor": number or null,
      "fiveYearIF": number or null,
      "citeScore": number or null,
      "sjr": number or null,
      "quartile": "Q1" | "Q2" | "Q3" | "Q4",
      "openAccessType": "Gold Open Access" | "Hybrid" | "Diamond (No Fee)" | "Subscription",
      "apcUSD": number or null,
      "apcDetails": "string",
      "waiverEligible": boolean,
      "waiverDetails": "string",
      "timeToFirstDecisionDays": number or null,
      "reviewTimeWeeks": number or null,
      "publicationSpeedNotes": "string",
      "acceptanceRate": number or null,
      "homePageUrl": "string",
      "submissionPortalUrl": "string",
      "scopeSummary": "string"
    }
  ]
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 0.1
      }
    });

    const text = response.text || "{}";
    let parsedData: any = { results: [] };
    try {
      const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
      parsedData = JSON.parse(cleanJson);
    } catch {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsedData = JSON.parse(jsonMatch[0]);
        } catch {
          parsedData = { results: [] };
        }
      }
    }

    res.json({
      success: true,
      results: parsedData.results || []
    });
  } catch (error: any) {
    console.error("Error in batch enrichment:", error);
    res.status(500).json({ error: error.message || "Failed to batch enrich journals" });
  }
});

// API: Extract Content from Paper URL (DOI, arXiv, PubMed, ScienceDirect, or Web Link)
app.post("/api/extract-link-content", async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: "URL or DOI is required" });
    }

    const ai = getAiClient();
    const prompt = `You are an expert academic librarian and manuscript parsing engine.
A user provided the following academic link, DOI, or webpage URL:
URL: "${url}"

Please access the live web or resolve this link / DOI / arXiv identifier / PubMed ID / paper to extract:
1. Exact Paper or Manuscript Title
2. Complete or structured Abstract / Research Summary
3. Main scientific domains / disciplinary fields (e.g., Chemistry, Machine Learning, Materials Science, Medicine)
4. Extracted technical keywords (4-8 keywords)
5. Published Journal / Venue name (if already published or hosted)
6. Methodology and core scientific innovation in 2 sentences.

Respond strictly as a JSON object (no markdown code blocks, just raw parseable JSON):
{
  "title": "string",
  "abstract": "string",
  "keywords": ["string"],
  "domains": ["string"],
  "journalOrVenue": "string or null",
  "methodology": "string",
  "extractedSuccessfully": true
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 0.1
      }
    });

    const text = response.text || "{}";
    let parsedData: any = {};
    try {
      const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
      parsedData = JSON.parse(cleanJson);
    } catch {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedData = JSON.parse(jsonMatch[0]);
      }
    }

    res.json({
      success: true,
      data: parsedData
    });
  } catch (error: any) {
    console.error("Error extracting link content:", error);
    res.status(500).json({ error: error.message || "Failed to extract content from link" });
  }
});

// API: Fetch Remote Dataset from URL (e.g. public CSV, Google Sheet published CSV, raw JSON)
app.post("/api/fetch-url-dataset", async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch dataset from URL. HTTP Status: ${response.status}`);
    }

    const content = await response.text();
    res.json({
      success: true,
      content
    });
  } catch (error: any) {
    console.error("Error fetching URL dataset:", error);
    res.status(500).json({ error: error.message || "Failed to download dataset from URL" });
  }
});

// API: Parse DOCX Document (Database lists, Manuscripts, or Raw Text)
app.post("/api/parse-docx-document", async (req, res) => {
  try {
    const { base64, fileName = "document.docx" } = req.body;
    if (!base64) {
      return res.status(400).json({ error: "DOCX base64 data is required" });
    }

    const docxBuffer = Buffer.from(base64, "base64");
    const result = await mammoth.extractRawText({ buffer: docxBuffer });
    const text = result.value || "";

    res.json({
      success: true,
      text,
      fileName
    });
  } catch (error: any) {
    console.error("Error parsing DOCX document:", error);
    res.status(500).json({ error: error.message || "Failed to parse DOCX document" });
  }
});

// API: Parse & Reorganize Whole PDF Files (Database Lists or Manuscripts)
app.post("/api/parse-pdf-document", async (req, res) => {
  try {
    const { base64, fileName = "document.pdf", mode = "database", targetCategory = "Auto-Detect" } = req.body;
    if (!base64) {
      return res.status(400).json({ error: "PDF base64 data is required" });
    }

    const pdfBuffer = Buffer.from(base64, "base64");
    const { text: rawPdfText, pageCount } = await extractTextFromPdf(pdfBuffer);

    if (mode === "raw") {
      return res.json({
        success: true,
        text: rawPdfText,
        pageCount
      });
    }

    const ai = getAiClient();

    if (mode === "manuscript") {
      // Parse entire research paper manuscript PDF
      const prompt = `You are an expert academic research manuscript analyzer.
Read the provided research paper PDF (Filename: "${fileName}", Pages: ${pageCount}).

Content excerpt / text:
"""
${rawPdfText.slice(0, 45000)}
"""

Extract and reorganize the document's academic structure:
1. Exact Paper / Manuscript Title
2. Complete, structured Abstract (Context, Methodology, Results, Conclusion)
3. 5-8 Precise Technical Keywords
4. Primary and secondary Scientific Disciplines (e.g. Materials Chemistry, Deep Learning, Biomedical Engineering)
5. Core Methodology & Scientific Innovation (2-3 concise sentences)
6. Target Journal Scope recommendations.

Respond strictly as a JSON object (no markdown outside JSON):
{
  "title": "string",
  "abstract": "string",
  "keywords": ["string"],
  "domains": ["string"],
  "methodology": "string",
  "scopeRecommendation": "string"
}`;

      const contents: any[] = [];
      // If we have base64 and buffer is under 15MB, also provide inlineData for high fidelity
      if (base64.length < 15 * 1024 * 1024) {
        contents.push({
          inlineData: {
            mimeType: "application/pdf",
            data: base64
          }
        });
      }
      contents.push(prompt);

      const response = await ai.models.generateContent({
        model: "gemini-3.7-flash",
        contents,
        config: {
          temperature: 0.1
        }
      });

      const text = response.text || "{}";
      let parsedData: any = {};
      try {
        const cleanJson = text.replace(/```json/g, "").replace(/```/g, "").trim();
        parsedData = JSON.parse(cleanJson);
      } catch {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) parsedData = JSON.parse(jsonMatch[0]);
      }

      return res.json({
        success: true,
        data: parsedData,
        rawTextPreview: rawPdfText.slice(0, 1000),
        pageCount
      });
    }

    // mode === 'database': Reorganize whole PDF table / journal catalog into searchable structured journals
    const prompt = `You are an expert academic catalog structuring engine.
The user uploaded a PDF file containing a journal list, ranking database, or institutional catalog:
Filename: "${fileName}" (Total Pages: ${pageCount})
Target category preference: "${targetCategory}"

Document Text Extracted:
"""
${rawPdfText.slice(0, 50000)}
"""

Thoroughly read and reorganize the WHOLE PDF document into clean, standardized, search-ready journal records.
Even if the PDF layout has columns, tables, headers, footers, or broken OCR lines, reconstruct every journal item accurately.

For each journal entry:
1. "title": Exact official full journal name.
2. "publisher": Publisher name (e.g., Elsevier, Springer Nature, Wiley, Royal Society of Chemistry, IEEE, MDPI, etc.). If unknown, infer from journal domain.
3. "issn": ISSN or e-ISSN if present or known.
4. "classification": Must be "Class A", "Class B", or "Unclassified". (If user target preference is "${targetCategory}" or document indicates Class A/Tier 1, tag accordingly).
5. "quartile": "Q1", "Q2", "Q3", or "Q4".
6. "isScopusIndexed": boolean (true by default unless stated otherwise).
7. "isWosIndexed": boolean (true by default unless stated otherwise).
8. "isTop10Percent": boolean (true if in Scopus Top 10% or Q1 top decile).
9. "impactFactor": number or null (e.g. 4.8).
10. "citeScore": number or null (e.g. 6.5).
11. "sjr": number or null (e.g. 1.1).
12. "openAccessType": "Gold Open Access" | "Hybrid" | "Diamond (No Fee)" | "Subscription".
13. "apcUSD": number or null (e.g. 2800, 0 if diamond).
14. "waiverEligible": boolean (true if 100% fee waiver, RSC waiver, Research4Life, or diamond).
15. "waiverDetails": string explaining waiver/fee terms.
16. "timeToFirstDecisionDays": number (e.g. 28).
17. "subjectCategories": array of 2-4 subject areas (e.g. ["Materials Science", "Renewable Energy"]).
18. "keywords": array of 4-6 search keywords for instant searching.
19. "scopeSummary": 1-2 sentences on what papers this journal accepts.

Return strictly a JSON object:
{
  "detectedType": "string describing the list (e.g. Class A List, Royal Society of Chemistry Catalog, Scopus Top 10% Index)",
  "totalParsed": number,
  "journals": [
    {
      "title": "string",
      "publisher": "string",
      "issn": "string or null",
      "classification": "Class A" | "Class B" | "Unclassified",
      "quartile": "Q1" | "Q2" | "Q3" | "Q4",
      "isScopusIndexed": true,
      "isWosIndexed": true,
      "isTop10Percent": false,
      "impactFactor": 4.5,
      "citeScore": 5.8,
      "sjr": 0.9,
      "openAccessType": "Hybrid",
      "apcUSD": null,
      "waiverEligible": true,
      "waiverDetails": "string",
      "timeToFirstDecisionDays": 30,
      "subjectCategories": ["string"],
      "keywords": ["string"],
      "scopeSummary": "string"
    }
  ]
}`;

    const contents: any[] = [];
    if (base64.length < 15 * 1024 * 1024) {
      contents.push({
        inlineData: {
          mimeType: "application/pdf",
          data: base64
        }
      });
    }
    contents.push(prompt);

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents,
      config: {
        temperature: 0.1
      }
    });

    const text = response.text || "{}";
    let parsedData: any = {};
    try {
      const cleanJson = text.replace(/```json/g, "").replace(/```/g, "").trim();
      parsedData = JSON.parse(cleanJson);
    } catch {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) parsedData = JSON.parse(jsonMatch[0]);
    }

    const journalsList = (parsedData.journals || []).map((j: any, index: number) => ({
      id: `j-pdf-${Date.now()}-${index}`,
      title: j.title || `Journal Entry ${index + 1}`,
      publisher: j.publisher || "Academic Publisher",
      issn: j.issn || null,
      classification: (j.classification === "Class A" || j.classification === "Class B") ? j.classification : (targetCategory === "Class A" ? "Class A" : targetCategory === "Class B" ? "Class B" : "Unclassified"),
      isWosIndexed: j.isWosIndexed !== undefined ? j.isWosIndexed : true,
      isScopusIndexed: j.isScopusIndexed !== undefined ? j.isScopusIndexed : true,
      isTop10Percent: j.isTop10Percent !== undefined ? j.isTop10Percent : targetCategory === "Scopus Top 10%",
      quartile: j.quartile || "Q1",
      impactFactor: j.impactFactor || null,
      citeScore: j.citeScore || null,
      sjr: j.sjr || null,
      subjectCategories: Array.isArray(j.subjectCategories) && j.subjectCategories.length > 0 ? j.subjectCategories : ["Multidisciplinary"],
      keywords: Array.isArray(j.keywords) ? j.keywords : [],
      openAccessType: j.openAccessType || "Hybrid",
      apcUSD: j.apcUSD !== undefined ? j.apcUSD : null,
      waiverEligible: j.waiverEligible === true || j.openAccessType === "Diamond (No Fee)" || j.apcUSD === 0,
      waiverDetails: j.waiverDetails || (j.waiverEligible ? "Waiver policy available" : undefined),
      timeToFirstDecisionDays: j.timeToFirstDecisionDays || 30,
      scopeSummary: j.scopeSummary || "High-impact peer-reviewed research journal.",
      sourceFile: fileName,
      lastUpdated: new Date().toISOString().split("T")[0]
    }));

    res.json({
      success: true,
      detectedType: parsedData.detectedType || (targetCategory !== "Auto-Detect" ? targetCategory : "PDF Journal Database"),
      totalParsed: journalsList.length,
      journals: journalsList,
      rawTextPreview: rawPdfText.slice(0, 1000),
      pageCount
    });
  } catch (error: any) {
    console.error("Error parsing PDF document:", error);
    res.status(500).json({ error: error.message || "Failed to process PDF document" });
  }
});

// API: AI-Driven Keyword, Topic, Link or File Search on Journal Database
app.post("/api/ai-search-topics", async (req, res) => {
  try {
    const { 
      query, 
      url, 
      fileText, 
      fileName, 
      searchMode = 'text',
      databaseJournals, 
      filterClassification, 
      filterQuartile 
    } = req.body;

    if (!query && !url && !fileText) {
      return res.status(400).json({ error: "Please provide a search topic, web link/DOI, or file content." });
    }

    const ai = getAiClient();
    const journalsSample = (databaseJournals || []).slice(0, 50).map((j: any) => ({
      id: j.id,
      title: j.title,
      publisher: j.publisher,
      classification: j.classification,
      quartile: j.quartile,
      impactFactor: j.impactFactor,
      citeScore: j.citeScore,
      sjr: j.sjr,
      openAccessType: j.openAccessType,
      apcUSD: j.apcUSD,
      waiverEligible: j.waiverEligible,
      timeToFirstDecisionDays: j.timeToFirstDecisionDays,
      subjectCategories: j.subjectCategories,
      scopeSummary: j.scopeSummary
    }));

    let queryDescription = "";
    if (searchMode === 'link' || url) {
      queryDescription = `The user provided an online paper/journal Link or DOI: "${url}".
Additional notes or queries: "${query || 'Find optimal database journals that match this article or scope.'}"
Please use live Google Search grounding to inspect this link/paper, extract its scientific novelty, methodologies, and topics, and match it against the catalog.`;
    } else if (searchMode === 'file' || fileText) {
      queryDescription = `The user uploaded a manuscript document / abstract file "${fileName || 'Document'}":
Excerpt/Extracted Text:
"""
${(fileText || '').slice(0, 3000)}
"""
User prompt: "${query || 'Match this uploaded manuscript to suitable journals in the database.'}"`;
    } else {
      queryDescription = `User Search Query: "${query}"`;
    }

    const prompt = `You are an intelligent academic research & journal discovery assistant.
${queryDescription}

Active Target Filters: Classification="${filterClassification || 'All'}", Quartile="${filterQuartile || 'All'}"

Here is the current catalog of journals in the researcher's database:
${JSON.stringify(journalsSample, null, 2)}

Your task:
1. Extract and analyze the semantic intent, disciplinary domain, and research methodology behind the user's input.
2. If a URL or file was provided, extract the clean paper title, abstract, and core keywords.
3. From the catalog and academic domain knowledge, identify and rank the best-fit journals (incorporating Class A, Class B, Scopus Top 10%, Quartile, and 100% Fee Waiver advantages where applicable).
4. Suggest 3-4 representative recent research paper topics / sample published papers that align with this research domain.
5. Extract 4-6 key technical keywords.
6. Provide a matching score (0 to 100) and specific scope justification for each suggested journal.

Return strictly a JSON object with this structure (no markdown outside JSON):
{
  "sourceType": "${searchMode}",
  "extractedTitle": "string or null",
  "extractedAbstract": "string or null",
  "queryAnalysis": "2-3 sentences explaining the research domain, methodology, and optimal publishing strategy for this topic.",
  "extractedKeywords": ["string", "string", "string"],
  "suggestedResearchPaperTopics": [
    {
      "paperTitle": "string",
      "relevantJournal": "string",
      "summary": "string"
    }
  ],
  "matchedJournals": [
    {
      "journalId": "string or null",
      "journalTitle": "string",
      "publisher": "string",
      "classification": "Class A" | "Class B" | "Unclassified",
      "quartile": "Q1" | "Q2" | "Q3" | "Q4",
      "impactFactor": number or null,
      "sjr": number or null,
      "matchScore": number,
      "scopeMatchReason": "string",
      "apcAndWaiverSummary": "string",
      "decisionSpeedSummary": "string"
    }
  ]
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 0.2
      }
    });

    const text = response.text || "{}";
    let parsedData: any = {};
    try {
      const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
      parsedData = JSON.parse(cleanJson);
    } catch {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedData = JSON.parse(jsonMatch[0]);
      }
    }

    res.json({
      success: true,
      results: parsedData
    });
  } catch (error: any) {
    console.error("Error in AI topic search:", error);
    res.status(500).json({ error: error.message || "Failed to execute AI search" });
  }
});

// API: AI Manuscript Matcher & Submission Advisor
app.post("/api/match-manuscript", async (req, res) => {
  try {
    const { title, abstract, keywords, userTargetClassification, databaseJournals } = req.body;
    if (!title && !abstract) {
      return res.status(400).json({ error: "Please provide either a manuscript title or abstract" });
    }

    const ai = getAiClient();
    const journalTitlesSample = (databaseJournals || []).slice(0, 40).map((j: any) => ({
      id: j.id,
      title: j.title,
      publisher: j.publisher,
      classification: j.classification,
      quartile: j.quartile,
      if: j.impactFactor,
      apc: j.apcUSD,
      waiver: j.waiverEligible,
      speedDays: j.timeToFirstDecisionDays,
      categories: j.subjectCategories
    }));

    const prompt = `You are a senior academic publishing consultant and peer-review strategist.
A researcher wants to find the best academic journals for submitting their manuscript.

Manuscript Details:
- Title: "${title || 'Untitled Research'}"
- Abstract: "${abstract || 'No abstract provided'}"
- Keywords: "${keywords || 'None'}"
- Preferred Category Filter: "${userTargetClassification || 'All'}"

Here is the current database of available journals in the user's workspace:
${JSON.stringify(journalTitlesSample, null, 2)}

Your task:
1. Analyze the manuscript's research discipline, methodology, scientific novelty, and target audience.
2. Select and rank the top 4-6 most suitable journals from the user's database or high-standard recognized journals (Class A, Class B, Scopus Q1/Q2, WoS indexed, RSC journals with 100% waivers, fast turnaround journals).
3. For each recommended journal, provide:
   - Match Score (0 to 100)
   - 3 specific reasons why the manuscript fits this journal's scope
   - Potential peer-review risks/challenges to prepare for
   - Classification tier: 'Top Class A Match' | 'Class B Strong Fit' | 'Fast Turnaround' | '100% Fee Waiver Option'
   - Expected speed and APC / waiver advantages (e.g., mention RSC Advances 100% waiver if chemistry/materials/nanotech).

Return strictly a JSON object with this structure (no markdown formatting outside JSON):
{
  "title": "${title || 'Manuscript Analysis'}",
  "extractedAbstract": "${(abstract || '').slice(0, 200)}",
  "extractedKeywords": ["string", "string"],
  "domains": ["string", "string"],
  "scopeFitSummary": "2-3 sentences explaining the overarching disciplinary fit and submission strategy.",
  "suggestedJournals": [
    {
      "journalId": "string or null",
      "journalTitle": "string",
      "publisher": "string",
      "classification": "Class A" | "Class B" | "Unclassified",
      "quartile": "Q1" | "Q2" | "Q3" | "Q4",
      "impactFactor": number,
      "citeScore": number,
      "timeToFirstDecision": "e.g. ~24 days",
      "apcStatus": "e.g. $1,950 / 100% Waiver for Research4Life",
      "waiverInfo": "string",
      "matchScore": 95,
      "matchReasons": ["string", "string", "string"],
      "potentialRisks": ["string"],
      "recommendationTier": "Top Class A Match" | "Class B Strong Fit" | "Fast Turnaround" | "100% Fee Waiver Option",
      "homePageUrl": "string"
    }
  ]
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 0.3
      }
    });

    const text = response.text || "{}";
    let parsedData = {};
    try {
      const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
      parsedData = JSON.parse(cleanJson);
    } catch {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedData = JSON.parse(jsonMatch[0]);
      }
    }

    res.json({
      success: true,
      analysis: parsedData
    });
  } catch (error: any) {
    console.error("Error matching manuscript:", error);
    res.status(500).json({ error: error.message || "Failed to analyze manuscript" });
  }
});

// API: Batch Cross-Check Scopus List against Class A / Class B
app.post("/api/cross-check-categories", async (req, res) => {
  try {
    const { journalTitles, classADatabaseTitles, classBDatabaseTitles } = req.body;
    if (!journalTitles || !Array.isArray(journalTitles)) {
      return res.status(400).json({ error: "journalTitles array is required" });
    }

    const classASet = new Set<string>((classADatabaseTitles || []).map((t: any) => String(t).toLowerCase().trim()));
    const classBSet = new Set<string>((classBDatabaseTitles || []).map((t: any) => String(t).toLowerCase().trim()));

    const results = (journalTitles || []).map((title: any) => {
      const titleStr = String(title);
      const norm = titleStr.toLowerCase().trim();
      let matchedClassification = 'Unclassified';
      if (classASet.has(norm)) {
        matchedClassification = 'Class A';
      } else if (classBSet.has(norm)) {
        matchedClassification = 'Class B';
      } else {
        // Partial fuzzy search
        for (const aTitle of Array.from(classASet)) {
          if (aTitle.includes(norm) || norm.includes(aTitle)) {
            matchedClassification = 'Class A';
            break;
          }
        }
        if (matchedClassification === 'Unclassified') {
          for (const bTitle of Array.from(classBSet)) {
            if (bTitle.includes(norm) || norm.includes(bTitle)) {
              matchedClassification = 'Class B';
              break;
            }
          }
        }
      }
      return {
        title: titleStr,
        classification: matchedClassification
      };
    });

    res.json({ success: true, results });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Cross check failed" });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Journal Finder server running on port ${PORT}`);
  });
}

startServer();
