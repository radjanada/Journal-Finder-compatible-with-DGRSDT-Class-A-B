import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { Journal, JournalClassification, Quartile, OpenAccessType, UploadBatchSummary } from '../types';

export interface ParseFileInput {
  file: File;
  targetCategory: 'Class A' | 'Class B' | 'Scopus Top 10%' | 'Scopus General' | 'Auto-Detect';
}

export interface ParseResult {
  journals: Journal[];
  summary: UploadBatchSummary;
  rawTextPreview?: string;
}

// Normalize strings for fuzzy matching
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

const findCol = (headers: string[], candidates: string[]): string | undefined => {
  const normCandidates = candidates.map(norm);
  return headers.find(h => normCandidates.includes(norm(h)));
};

export const parseUploadedFile = async (
  file: File,
  targetCategory: 'Class A' | 'Class B' | 'Scopus Top 10%' | 'Scopus General' | 'Auto-Detect' = 'Auto-Detect'
): Promise<ParseResult> => {
  const fileName = file.name;
  const fileExt = fileName.split('.').pop()?.toLowerCase() || '';

  if (fileExt === 'xlsx' || fileExt === 'xls') {
    return parseSpreadsheet(file, targetCategory);
  } else if (fileExt === 'csv') {
    return parseCsv(file, targetCategory);
  } else if (fileExt === 'docx') {
    return parseDocx(file, targetCategory);
  } else if (fileExt === 'txt' || fileExt === 'json') {
    return parseTextOrJson(file, targetCategory);
  } else if (fileExt === 'pdf') {
    return parsePdfFile(file, targetCategory);
  } else {
    // Default try text/csv parser
    return parseCsv(file, targetCategory);
  }
};

const parseSpreadsheet = async (
  file: File,
  targetCategory: 'Class A' | 'Class B' | 'Scopus Top 10%' | 'Scopus General' | 'Auto-Detect'
): Promise<ParseResult> => {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  return convertRowsToJournals(rows, file.name, file.size, targetCategory);
};

const parseCsv = async (
  file: File,
  targetCategory: 'Class A' | 'Class B' | 'Scopus Top 10%' | 'Scopus General' | 'Auto-Detect'
): Promise<ParseResult> => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data as Record<string, unknown>[];
        resolve(convertRowsToJournals(rows, file.name, file.size, targetCategory));
      },
      error: (err) => reject(err)
    });
  });
};

const parseDocx = async (
  file: File,
  targetCategory: 'Class A' | 'Class B' | 'Scopus Top 10%' | 'Scopus General' | 'Auto-Detect'
): Promise<ParseResult> => {
  let text = '';
  try {
    const base64 = await fileToBase64(file);
    const res = await fetch('/api/parse-docx-document', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ base64, fileName: file.name })
    });
    if (res.ok) {
      const data = await res.json();
      text = data.text || '';
    }
  } catch (e) {
    console.warn('Server DOCX parse fallback notice:', e);
  }

  if (!text) {
    text = await file.text().catch(() => '');
  }
  
  // Extract lines and parse simple table/list patterns
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const journals: Journal[] = [];

  let isClassA = targetCategory === 'Class A' || file.name.toLowerCase().includes('class a') || file.name.toLowerCase().includes('class_a');
  let isClassB = targetCategory === 'Class B' || file.name.toLowerCase().includes('class b') || file.name.toLowerCase().includes('class_b');
  let isTop10 = targetCategory === 'Scopus Top 10%' || file.name.toLowerCase().includes('top 10') || file.name.toLowerCase().includes('top10');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.length < 3 || line.startsWith('Page') || line.startsWith('Table') || line.startsWith('Header')) continue;

    // Check if line looks like a journal title or has tabs/commas
    const parts = line.includes('\t') ? line.split('\t') : line.includes(';') ? line.split(';') : [line];
    const title = parts[0]?.trim();
    if (!title || title.length < 3) continue;

    // Check for explicit mention in line
    let classification: JournalClassification = isClassA ? 'Class A' : isClassB ? 'Class B' : 'Unclassified';
    if (line.toLowerCase().includes('class a') || line.toLowerCase().includes('tier a') || line.toLowerCase().includes('a*')) {
      classification = 'Class A';
    } else if (line.toLowerCase().includes('class b') || line.toLowerCase().includes('tier b')) {
      classification = 'Class B';
    }

    const journal: Journal = {
      id: `j-docx-${Date.now()}-${i}`,
      title,
      publisher: parts[1] || 'Academic Publisher',
      classification,
      isWosIndexed: true,
      isScopusIndexed: true,
      isTop10Percent: isTop10,
      quartile: 'Q1',
      impactFactor: 3.5,
      citeScore: 4.8,
      sjr: 0.8,
      subjectCategories: ['Multidisciplinary'],
      keywords: [],
      openAccessType: 'Hybrid',
      apcUSD: null,
      waiverEligible: false,
      timeToFirstDecisionDays: 30,
      sourceFile: file.name,
      lastUpdated: new Date().toISOString().split('T')[0]
    };
    journals.push(journal);
  }

  const summary: UploadBatchSummary = {
    fileName: file.name,
    fileSize: file.size,
    detectedType: isClassA ? 'Class A List' : isClassB ? 'Class B List' : 'Generic Journal Database',
    totalParsed: journals.length,
    newEntries: journals.length,
    updatedEntries: 0,
    classACount: journals.filter(j => j.classification === 'Class A').length,
    classBCount: journals.filter(j => j.classification === 'Class B').length,
    scopusCount: journals.filter(j => j.isScopusIndexed).length,
    wosCount: journals.filter(j => j.isWosIndexed).length,
    columnsDetected: ['Title', 'Extracted from Word document']
  };

  return { journals, summary, rawTextPreview: text.slice(0, 500) };
};

const parseTextOrJson = async (
  file: File,
  targetCategory: 'Class A' | 'Class B' | 'Scopus Top 10%' | 'Scopus General' | 'Auto-Detect'
): Promise<ParseResult> => {
  const text = await file.text();
  if (file.name.endsWith('.json')) {
    try {
      const data = JSON.parse(text);
      const rows = Array.isArray(data) ? data : data.journals || [data];
      return convertRowsToJournals(rows, file.name, file.size, targetCategory);
    } catch {
      // Fallback
    }
  }

  // Treat as CSV or newline list
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length > 0 && (lines[0].includes(',') || lines[0].includes('\t'))) {
    return new Promise((resolve) => {
      Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          resolve(convertRowsToJournals(results.data as Record<string, unknown>[], file.name, file.size, targetCategory));
        }
      });
    });
  }

  // Simple line by line journal titles
  const isClassA = targetCategory === 'Class A' || file.name.toLowerCase().includes('class a');
  const isClassB = targetCategory === 'Class B' || file.name.toLowerCase().includes('class b');
  const journals: Journal[] = lines.map((line, idx) => ({
    id: `j-txt-${Date.now()}-${idx}`,
    title: line,
    publisher: 'Academic Publisher',
    classification: isClassA ? 'Class A' : isClassB ? 'Class B' : 'Unclassified',
    isWosIndexed: true,
    isScopusIndexed: true,
    isTop10Percent: targetCategory === 'Scopus Top 10%',
    quartile: 'Q1',
    impactFactor: null,
    citeScore: null,
    sjr: null,
    subjectCategories: ['General Science'],
    keywords: [],
    openAccessType: 'Hybrid',
    apcUSD: null,
    waiverEligible: false,
    timeToFirstDecisionDays: null,
    sourceFile: file.name,
    lastUpdated: new Date().toISOString().split('T')[0]
  }));

  const summary: UploadBatchSummary = {
    fileName: file.name,
    fileSize: file.size,
    detectedType: isClassA ? 'Class A List' : isClassB ? 'Class B List' : 'Generic Journal Database',
    totalParsed: journals.length,
    newEntries: journals.length,
    updatedEntries: 0,
    classACount: journals.filter(j => j.classification === 'Class A').length,
    classBCount: journals.filter(j => j.classification === 'Class B').length,
    scopusCount: journals.filter(j => j.isScopusIndexed).length,
    wosCount: journals.filter(j => j.isWosIndexed).length,
    columnsDetected: ['Title List']
  };

  return { journals, summary, rawTextPreview: text.slice(0, 500) };
};

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64);
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
};

const parsePdfFile = async (
  file: File,
  targetCategory: 'Class A' | 'Class B' | 'Scopus Top 10%' | 'Scopus General' | 'Auto-Detect'
): Promise<ParseResult> => {
  try {
    const base64 = await fileToBase64(file);
    
    const response = await fetch('/api/parse-pdf-document', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        base64,
        fileName: file.name,
        mode: 'database',
        targetCategory
      })
    });

    if (!response.ok) {
      throw new Error(`Server returned HTTP ${response.status} when parsing PDF.`);
    }

    const data = await response.json();
    if (!data.journals || data.journals.length === 0) {
      throw new Error('No journal records could be identified in this PDF document.');
    }

    const journals: Journal[] = data.journals;
    const summary: UploadBatchSummary = {
      fileName: file.name,
      fileSize: file.size,
      detectedType: data.detectedType || (targetCategory !== 'Auto-Detect' ? targetCategory : 'PDF Journal Database'),
      totalParsed: journals.length,
      newEntries: journals.length,
      updatedEntries: 0,
      classACount: journals.filter(j => j.classification === 'Class A').length,
      classBCount: journals.filter(j => j.classification === 'Class B').length,
      scopusCount: journals.filter(j => j.isScopusIndexed).length,
      wosCount: journals.filter(j => j.isWosIndexed).length,
      columnsDetected: ['Title', 'Publisher', 'Classification', 'Quartile', 'Scopus Index', 'OA Model', 'Scope Keywords']
    };

    return {
      journals,
      summary,
      rawTextPreview: data.rawTextPreview || `Extracted ${journals.length} journals from ${data.pageCount || 1} PDF pages.`
    };
  } catch (err: any) {
    console.error('PDF parsing error:', err);
    throw new Error(err.message || 'Failed to parse and reorganize PDF file.');
  }
};

const convertRowsToJournals = (
  rows: Record<string, unknown>[],
  fileName: string,
  fileSize: number,
  targetCategory: 'Class A' | 'Class B' | 'Scopus Top 10%' | 'Scopus General' | 'Auto-Detect'
): ParseResult => {
  if (!rows || rows.length === 0) {
    return {
      journals: [],
      summary: {
        fileName,
        fileSize,
        detectedType: 'Generic Journal Database',
        totalParsed: 0,
        newEntries: 0,
        updatedEntries: 0,
        classACount: 0,
        classBCount: 0,
        scopusCount: 0,
        wosCount: 0,
        columnsDetected: []
      }
    };
  }

  const sampleRow = rows[0];
  const headers = Object.keys(sampleRow);

  const titleCol = findCol(headers, [
    'Journal', 'Title', 'Journal Title', 'Source Title', 'Publication Title', 'Name', 'Journal Name', 'Source_Title', 'Full Title', 'Publication'
  ]) || headers[0];

  const publisherCol = findCol(headers, [
    'Publisher', 'Publishing House', 'Publisher Name', 'Society', 'Organization', 'Imprint'
  ]);

  const issnCol = findCol(headers, [
    'ISSN', 'Print ISSN', 'ISSN-1', 'ISSN (Print)', 'Print_ISSN', 'Issn'
  ]);

  const eIssnCol = findCol(headers, [
    'E-ISSN', 'Electronic ISSN', 'eISSN', 'Online ISSN', 'E_ISSN', 'Electronic_ISSN'
  ]);

  const ifCol = findCol(headers, [
    'Impact Factor', 'IF', 'JCR IF', '2023 IF', '2024 IF', 'Journal Impact Factor', 'Impact_Factor', 'IF2024', 'IF2023'
  ]);

  const citeScoreCol = findCol(headers, [
    'CiteScore', 'Scopus CiteScore', 'CiteScore 2024', 'CiteScore 2023', 'Cite_Score', 'CS'
  ]);

  const sjrCol = findCol(headers, [
    'SJR', 'SCImago Journal Rank', 'SJR 2024', 'SJR 2023', 'SJR Indicator', 'Sjr'
  ]);

  const snipCol = findCol(headers, [
    'SNIP', 'Source Normalized Impact per Paper', 'Snip'
  ]);

  const quartileCol = findCol(headers, [
    'Quartile', 'Q', 'Quartile Category', 'SJR Quartile', 'JCR Quartile', 'Best Quartile', 'Quartile_2024'
  ]);

  const classCol = findCol(headers, [
    'Class', 'Classification', 'Category', 'Tier', 'Class A/B', 'ABDC', 'UGC Category', 'Journal Class', 'Ranking'
  ]);

  const categoryCol = findCol(headers, [
    'Subject Area', 'Categories', 'Research Area', 'Discipline', 'Sub-Subject Area', 'All Science Journal Classification (ASJC)', 'Field'
  ]);

  const citationsCol = findCol(headers, [
    'Citations', 'Total Citations', 'CitationsCount', 'Citation Count', 'Ref Citations'
  ]);

  const hIndexCol = findCol(headers, [
    'H-Index', 'H Index', 'h_index', 'Hindex'
  ]);

  const yearCol = findCol(headers, [
    'Year', 'Publication Year', 'Coverage', 'Active Year'
  ]);

  const oaCol = findCol(headers, [
    'Open Access', 'OA Type', 'Open_Access', 'OA', 'Access Type', 'Gold OA'
  ]);

  const apcCol = findCol(headers, [
    'APC', 'APC (USD)', 'Article Processing Charge', 'Price USD', 'APC Fee', 'Fee'
  ]);

  const waiverCol = findCol(headers, [
    'Waiver', 'Waiver Policy', 'Waiver Eligible', '100% Waiver', 'Research4Life'
  ]);

  const speedCol = findCol(headers, [
    'Time to First Decision', 'First Decision (days)', 'Speed', 'Turnaround Days', 'Review Time', 'Decision Days'
  ]);

  const urlCol = findCol(headers, [
    'URL', 'Homepage', 'Journal URL', 'Link', 'Website', 'Journal Link'
  ]);

  const journals: Journal[] = [];
  const fileNameLower = fileName.toLowerCase();
  const fileIsClassA = fileNameLower.includes('class a') || fileNameLower.includes('class_a') || fileNameLower.includes('tier 1') || fileNameLower.includes('cl_a');
  const fileIsClassB = fileNameLower.includes('class b') || fileNameLower.includes('class_b') || fileNameLower.includes('tier 2') || fileNameLower.includes('cl_b');
  const fileIsTop10 = fileNameLower.includes('top 10') || fileNameLower.includes('top10') || fileNameLower.includes('top 10%') || fileNameLower.includes('top_10');
  const fileIsScopus = fileNameLower.includes('scopus') || fileIsTop10;
  const fileIsWos = fileNameLower.includes('wos') || fileNameLower.includes('web of science') || fileNameLower.includes('jcr');

  rows.forEach((row, idx) => {
    const rawTitle = String(row[titleCol] || '').trim();
    if (!rawTitle || rawTitle.length < 2) return;

    // Determine classification
    let classification: JournalClassification = 'Unclassified';
    if (targetCategory === 'Class A' || fileIsClassA) {
      classification = 'Class A';
    } else if (targetCategory === 'Class B' || fileIsClassB) {
      classification = 'Class B';
    } else if (classCol && row[classCol]) {
      const val = String(row[classCol]).trim().toUpperCase();
      if (val.includes('A*') || val.includes('A') || val === '1' || val.includes('TOP')) {
        classification = 'Class A';
      } else if (val.includes('B') || val === '2') {
        classification = 'Class B';
      }
    }

    // Determine Quartile
    let quartile: Quartile = 'N/A';
    if (quartileCol && row[quartileCol]) {
      const qVal = String(row[quartileCol]).trim().toUpperCase();
      if (qVal.includes('Q1')) quartile = 'Q1';
      else if (qVal.includes('Q2')) quartile = 'Q2';
      else if (qVal.includes('Q3')) quartile = 'Q3';
      else if (qVal.includes('Q4')) quartile = 'Q4';
    } else if (fileIsTop10) {
      quartile = 'Q1';
    }

    // Numbers
    const parseNum = (val: unknown): number | null => {
      if (val === undefined || val === null || val === '') return null;
      const clean = String(val).replace(/,/g, '').replace(/[^0-9.-]/g, '');
      const num = parseFloat(clean);
      return isNaN(num) ? null : num;
    };

    const impactFactor = ifCol ? parseNum(row[ifCol]) : null;
    const citeScore = citeScoreCol ? parseNum(row[citeScoreCol]) : null;
    const sjr = sjrCol ? parseNum(row[sjrCol]) : null;
    const snip = snipCol ? parseNum(row[snipCol]) : null;
    const citationsCount = citationsCol ? parseNum(row[citationsCol]) : null;
    const hIndex = hIndexCol ? parseNum(row[hIndexCol]) : null;
    const publicationYear = yearCol ? parseNum(row[yearCol]) : 2024;
    const apcUSD = apcCol ? parseNum(row[apcCol]) : null;
    const timeToFirstDecisionDays = speedCol ? parseNum(row[speedCol]) : null;

    // Open Access detection
    let openAccessType: OpenAccessType = 'Hybrid';
    if (oaCol && row[oaCol]) {
      const oaVal = String(row[oaCol]).toLowerCase();
      if (oaVal.includes('gold') || oaVal === 'yes' || oaVal === 'true' || oaVal === 'open access') {
        openAccessType = 'Gold Open Access';
      } else if (oaVal.includes('diamond') || oaVal.includes('no fee') || (apcUSD !== null && apcUSD === 0)) {
        openAccessType = 'Diamond (No Fee)';
      } else if (oaVal.includes('subscript') || oaVal.includes('closed') || oaVal.includes('no')) {
        openAccessType = 'Subscription';
      }
    }

    // Waiver detection - false by default unless explicitly specified in data or Diamond OA
    let waiverEligible = openAccessType === 'Diamond (No Fee)' || (apcUSD !== null && apcUSD === 0);
    let waiverDetails: string | undefined = undefined;
    if (waiverCol && row[waiverCol]) {
      const wVal = String(row[waiverCol]).trim();
      if (wVal) {
        waiverDetails = wVal;
        const wLower = wVal.toLowerCase();
        waiverEligible = wLower.includes('yes') || wLower.includes('true') || wLower.includes('100%') || wLower.includes('waiv') || wLower.includes('free');
      }
    }

    // Subject categories
    let subjectCategories: string[] = ['General'];
    if (categoryCol && row[categoryCol]) {
      const rawCat = String(row[categoryCol]);
      subjectCategories = rawCat.split(/[,;|]/).map(c => c.trim()).filter(Boolean);
    }

    // Top 10%
    const isTop10Percent = targetCategory === 'Scopus Top 10%' || fileIsTop10 || (sjr !== null && sjr >= 2.0) || (citeScore !== null && citeScore >= 12.0);

    const journal: Journal = {
      id: `j-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
      title: rawTitle,
      issn: issnCol ? String(row[issnCol] || '').trim() : undefined,
      eIssn: eIssnCol ? String(row[eIssnCol] || '').trim() : undefined,
      publisher: publisherCol ? String(row[publisherCol] || 'Academic Publisher').trim() : 'Academic Publisher',
      classification,
      isWosIndexed: fileIsWos || true,
      wosCollection: 'SCIE',
      isScopusIndexed: fileIsScopus || true,
      isTop10Percent,
      quartile,
      impactFactor,
      citeScore,
      sjr,
      snip,
      citationsCount,
      hIndex,
      publicationYear,
      subjectCategories,
      keywords: [],
      openAccessType,
      apcUSD,
      apcDetails: apcUSD !== null ? `$${apcUSD.toLocaleString()} USD` : undefined,
      waiverEligible,
      waiverDetails,
      timeToFirstDecisionDays,
      homePageUrl: urlCol ? String(row[urlCol] || '').trim() : undefined,
      sourceFile: fileName,
      lastUpdated: new Date().toISOString().split('T')[0]
    };

    journals.push(journal);
  });

  let detectedType: UploadBatchSummary['detectedType'] = 'Generic Journal Database';
  if (targetCategory === 'Class A' || fileIsClassA) detectedType = 'Class A List';
  else if (targetCategory === 'Class B' || fileIsClassB) detectedType = 'Class B List';
  else if (targetCategory === 'Scopus Top 10%' || fileIsTop10) detectedType = 'Scopus Top 10%';
  else if (fileIsScopus) detectedType = 'Scopus General List';
  else if (fileIsWos) detectedType = 'WoS Master List';

  const summary: UploadBatchSummary = {
    fileName,
    fileSize,
    detectedType,
    totalParsed: journals.length,
    newEntries: journals.length,
    updatedEntries: 0,
    classACount: journals.filter(j => j.classification === 'Class A').length,
    classBCount: journals.filter(j => j.classification === 'Class B').length,
    scopusCount: journals.filter(j => j.isScopusIndexed).length,
    wosCount: journals.filter(j => j.isWosIndexed).length,
    columnsDetected: headers
  };

  return { journals, summary };
};

export const parseRawContent = async (
  content: string,
  sourceName: string = 'URL Dataset',
  targetCategory: 'Class A' | 'Class B' | 'Scopus Top 10%' | 'Scopus General' | 'Auto-Detect' = 'Auto-Detect'
): Promise<ParseResult> => {
  const trimmed = content.trim();
  const byteSize = content.length;

  // Try JSON first
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      const rows = Array.isArray(parsed) ? parsed : (parsed.journals || parsed.data || [parsed]);
      return convertRowsToJournals(rows, sourceName, byteSize, targetCategory);
    } catch {
      // Fall through to CSV
    }
  }

  // Parse as CSV / Delimited
  return new Promise((resolve) => {
    Papa.parse(trimmed, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data as Record<string, unknown>[];
        if (rows && rows.length > 0) {
          resolve(convertRowsToJournals(rows, sourceName, byteSize, targetCategory));
        } else {
          // Fallback to text line parser
          const lines = trimmed.split('\n').filter(l => l.trim().length > 0);
          const plainRows = lines.map(line => ({ Title: line.trim() }));
          resolve(convertRowsToJournals(plainRows, sourceName, byteSize, targetCategory));
        }
      },
      error: () => {
        const lines = trimmed.split('\n').filter(l => l.trim().length > 0);
        const plainRows = lines.map(line => ({ Title: line.trim() }));
        resolve(convertRowsToJournals(plainRows, sourceName, byteSize, targetCategory));
      }
    });
  });
};

