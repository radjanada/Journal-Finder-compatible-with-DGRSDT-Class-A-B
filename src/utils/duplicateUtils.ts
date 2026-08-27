import { Journal, JournalClassification, Quartile, OpenAccessType } from '../types';

// Normalize title for fuzzy matching (handling abbreviations like "RSC Adv." vs "RSC Advances")
export const normalizeJournalTitle = (title: string): string => {
  if (!title) return '';
  let s = title.toLowerCase()
    .replace(/\badv\b/g, 'advances')
    .replace(/\btrans\b/g, 'transactions')
    .replace(/\bj\b/g, 'journal')
    .replace(/\bint\b/g, 'international')
    .replace(/\bchem\b/g, 'chemistry')
    .replace(/\bmat\b/g, 'materials')
    .replace(/\bphys\b/g, 'physics')
    .replace(/\beng\b/g, 'engineering')
    .replace(/\bsci\b/g, 'science')
    .replace(/[^a-z0-9]/g, '');
  return s;
};

export interface DuplicateMergeResult {
  mergedJournals: Journal[];
  duplicatesCount: number;
  mergedSummaryText: string;
}

export const findAndMergeDuplicates = (journals: Journal[]): DuplicateMergeResult => {
  const map = new Map<string, Journal>();
  let duplicatesCount = 0;

  for (const j of journals) {
    if (!j || !j.title) continue;
    
    // Create key based on normalized title or primary ISSN
    const normTitle = normalizeJournalTitle(j.title);
    const cleanIssn = j.issn ? j.issn.replace(/[^0-9x]/gi, '').toLowerCase() : '';
    const key = cleanIssn.length >= 8 ? cleanIssn : normTitle;

    if (!key || key.length < 3) {
      // Fallback unique key
      map.set(j.id, j);
      continue;
    }

    if (map.has(key)) {
      duplicatesCount++;
      const existing = map.get(key)!;
      
      // Merge properties intelligently
      const merged: Journal = {
        ...existing,
        // Prefer longer/official title if available
        title: existing.title.length >= j.title.length ? existing.title : j.title,
        publisher: existing.publisher && existing.publisher !== 'Academic Publisher' ? existing.publisher : j.publisher,
        issn: existing.issn || j.issn,
        eIssn: existing.eIssn || j.eIssn,
        
        // Combine Classifications (if either is Class A, result is Class A, else Class B or Unclassified)
        classification: (existing.classification === 'Class A' || j.classification === 'Class A') 
          ? 'Class A' 
          : (existing.classification === 'Class B' || j.classification === 'Class B') 
          ? 'Class B' 
          : 'Unclassified',

        isWosIndexed: existing.isWosIndexed || j.isWosIndexed,
        wosCollection: existing.wosCollection !== 'N/A' ? existing.wosCollection : j.wosCollection,
        isScopusIndexed: existing.isScopusIndexed || j.isScopusIndexed,
        isTop10Percent: existing.isTop10Percent || j.isTop10Percent,

        // Best Quartile
        quartile: getBestQuartile(existing.quartile, j.quartile),

        // Maximum / Best Metrics
        impactFactor: Math.max(existing.impactFactor || 0, j.impactFactor || 0) || null,
        citeScore: Math.max(existing.citeScore || 0, j.citeScore || 0) || null,
        sjr: Math.max(existing.sjr || 0, j.sjr || 0) || null,
        hIndex: Math.max(existing.hIndex || 0, j.hIndex || 0) || null,

        // Unique Union of Subject Categories
        subjectCategories: Array.from(new Set([...(existing.subjectCategories || []), ...(existing.subjectCategories || []), ...(j.subjectCategories || [])])),
        keywords: Array.from(new Set([...(existing.keywords || []), ...(j.keywords || [])])),

        openAccessType: existing.openAccessType !== 'Subscription' ? existing.openAccessType : j.openAccessType,
        apcUSD: existing.apcUSD !== null ? existing.apcUSD : j.apcUSD,
        waiverEligible: existing.waiverEligible || j.waiverEligible,
        timeToFirstDecisionDays: existing.timeToFirstDecisionDays !== null && existing.timeToFirstDecisionDays > 0 
          ? existing.timeToFirstDecisionDays 
          : j.timeToFirstDecisionDays,

        homePageUrl: existing.homePageUrl || j.homePageUrl,
        submissionPortalUrl: existing.submissionPortalUrl || j.submissionPortalUrl,
        scopeSummary: existing.scopeSummary || j.scopeSummary,
        sourceFile: existing.sourceFile && j.sourceFile ? `${existing.sourceFile}, ${j.sourceFile}` : (existing.sourceFile || j.sourceFile),
        userNotes: existing.userNotes || j.userNotes,
        submissionStatus: existing.submissionStatus || j.submissionStatus
      };

      map.set(key, merged);
    } else {
      map.set(key, j);
    }
  }

  const mergedJournals = Array.from(map.values());
  const summaryText = duplicatesCount > 0 
    ? `Successfully identified and merged ${duplicatesCount} duplicate journal entries (combining abbreviation variants, classifications, and metrics into a unified database).`
    : `No duplicate journals detected. All ${mergedJournals.length} entries are unique.`;

  return {
    mergedJournals,
    duplicatesCount,
    mergedSummaryText: summaryText
  };
};

const getBestQuartile = (q1: Quartile, q2: Quartile): Quartile => {
  const rank: Record<Quartile, number> = { 'Q1': 4, 'Q2': 3, 'Q3': 2, 'Q4': 1, 'N/A': 0 };
  const r1 = rank[q1] || 0;
  const r2 = rank[q2] || 0;
  return r1 >= r2 ? q1 : q2;
};
