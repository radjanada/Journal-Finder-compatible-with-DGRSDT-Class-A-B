export type JournalClassification = 'Class A' | 'Class B' | 'Unclassified';
export type Quartile = 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'N/A';
export type OpenAccessType = 'Gold Open Access' | 'Hybrid' | 'Diamond (No Fee)' | 'Subscription';

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface Journal {
  id: string;
  title: string;
  issn?: string;
  eIssn?: string;
  publisher: string;
  classification: JournalClassification;
  isWosIndexed: boolean;
  wosCollection?: 'SCIE' | 'SSCI' | 'AHCI' | 'ESCI' | 'All WoS' | 'N/A';
  isScopusIndexed: boolean;
  isTop10Percent: boolean;
  quartile: Quartile;
  impactFactor: number | null;
  fiveYearIF?: number | null;
  citeScore: number | null;
  sjr: number | null;
  snip?: number | null;
  citationsCount?: number | null;
  hIndex?: number | null;
  publicationYear?: number | null;
  subjectCategories: string[];
  keywords: string[];
  openAccessType: OpenAccessType;
  apcUSD: number | null;
  apcDetails?: string;
  waiverEligible: boolean;
  waiverDetails?: string;
  userWaiverOverride?: boolean;
  timeToFirstDecisionDays: number | null; // e.g. 21 days
  reviewTimeWeeks?: number | null;
  publicationSpeedNotes?: string;
  acceptanceRate?: number | null; // percentage e.g. 28%
  homePageUrl?: string;
  submissionPortalUrl?: string;
  scopeSummary?: string;
  sourceFile?: string;
  lastUpdated?: string;
  isEnriched?: boolean;
  enrichmentSources?: GroundingSource[];
  submissionStatus?: 'Considering' | 'Shortlisted' | 'Submitted' | 'Under Review' | 'Accepted' | 'Rejected';
  userNotes?: string;
}

export interface JournalFilters {
  searchQuery: string;
  classification: 'All' | 'Class A' | 'Class B' | 'Class A & B' | 'Unclassified';
  indexing: {
    wosOnly: boolean;
    scopusOnly: boolean;
    top10Only: boolean;
  };
  quartiles: Quartile[];
  publishers: string[];
  subjectCategories: string[];
  minImpactFactor: number | null;
  maxImpactFactor: number | null;
  minCiteScore: number | null;
  minSjr: number | null;
  maxTimeToFirstDecisionDays: number | null;
  openAccessTypes: OpenAccessType[];
  waiverOnly: boolean;
  freeApcOnly: boolean;
  maxApcUSD: number | null;
  publicationYearRange: [number, number] | null;
}

export interface ManuscriptAnalysisResult {
  title: string;
  extractedAbstract: string;
  extractedKeywords: string[];
  domains: string[];
  scopeFitSummary: string;
  suggestedJournals: {
    journalId?: string;
    journalTitle: string;
    publisher?: string;
    classification?: JournalClassification;
    quartile?: Quartile;
    impactFactor?: number | null;
    citeScore?: number | null;
    timeToFirstDecision?: string;
    apcStatus?: string;
    waiverInfo?: string;
    matchScore: number; // 0 to 100
    matchReasons: string[];
    potentialRisks: string[];
    recommendationTier: 'Top Class A Match' | 'Class B Strong Fit' | 'Fast Turnaround' | '100% Fee Waiver Option';
    homePageUrl?: string;
  }[];
}

export interface UploadBatchSummary {
  fileName: string;
  fileSize: number;
  detectedType: 'Class A List' | 'Class B List' | 'Scopus Top 10%' | 'Scopus General List' | 'WoS Master List' | 'Generic Journal Database' | 'Manuscript Document';
  totalParsed: number;
  newEntries: number;
  updatedEntries: number;
  classACount: number;
  classBCount: number;
  scopusCount: number;
  wosCount: number;
  columnsDetected: string[];
}

export const INITIAL_FILTERS: JournalFilters = {
  searchQuery: '',
  classification: 'All',
  indexing: {
    wosOnly: false,
    scopusOnly: false,
    top10Only: false
  },
  quartiles: [],
  publishers: [],
  subjectCategories: [],
  minImpactFactor: null,
  maxImpactFactor: null,
  minCiteScore: null,
  minSjr: null,
  maxTimeToFirstDecisionDays: null,
  openAccessTypes: [],
  waiverOnly: false,
  freeApcOnly: false,
  maxApcUSD: null,
  publicationYearRange: null
};
