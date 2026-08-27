import React from 'react';
import { 
  X, 
  Sparkles, 
  Search, 
  Link as LinkIcon, 
  FileText, 
  BookOpen, 
  ArrowRight, 
  RefreshCw, 
  Bookmark, 
  ExternalLink, 
  CheckCircle2, 
  Award, 
  Clock, 
  DollarSign, 
  ShieldCheck, 
  Download,
  Filter,
  Upload,
  Globe,
  FileCheck,
  AlertCircle
} from 'lucide-react';
import { Journal } from '../types';
import { exportJournalsToExcel } from '../utils/exportUtils';
import { fileToBase64 } from '../utils/fileParser';

interface AISearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  databaseJournals: Journal[];
  onSelectJournal: (journal: Journal) => void;
  onToggleShortlist: (journal: Journal) => void;
  shortlistedIds: string[];
  onApplyJournalFilter?: (journalTitles: string[]) => void;
}

interface AIQueryResult {
  sourceType?: 'text' | 'link' | 'file';
  extractedTitle?: string | null;
  extractedAbstract?: string | null;
  queryAnalysis: string;
  extractedKeywords: string[];
  suggestedResearchPaperTopics: Array<{
    paperTitle: string;
    relevantJournal: string;
    summary: string;
  }>;
  matchedJournals: Array<{
    journalId?: string | null;
    journalTitle: string;
    publisher?: string;
    classification?: 'Class A' | 'Class B' | 'Unclassified';
    quartile?: 'Q1' | 'Q2' | 'Q3' | 'Q4';
    impactFactor?: number | null;
    sjr?: number | null;
    matchScore: number;
    scopeMatchReason: string;
    apcAndWaiverSummary?: string;
    decisionSpeedSummary?: string;
  }>;
}

export const AISearchModal: React.FC<AISearchModalProps> = ({
  isOpen,
  onClose,
  databaseJournals = [],
  onSelectJournal,
  onToggleShortlist,
  shortlistedIds = [],
  onApplyJournalFilter
}) => {
  if (!isOpen) return null;

  const [activeSearchMode, setActiveSearchMode] = React.useState<'topic' | 'link' | 'file'>('topic');
  
  // Topic Mode state
  const [topicQuery, setTopicQuery] = React.useState('');
  
  // Link Mode state
  const [linkUrl, setLinkUrl] = React.useState('');
  const [isFetchingLink, setIsFetchingLink] = React.useState(false);
  const [extractedLinkInfo, setExtractedLinkInfo] = React.useState<any>(null);

  // File Mode state
  const [uploadedFile, setUploadedFile] = React.useState<{ name: string; size: string; text: string } | null>(null);
  const [isReadingFile, setIsReadingFile] = React.useState(false);
  const [isDraggingFile, setIsDraggingFile] = React.useState(false);

  // Filter states
  const [filterClassification, setFilterClassification] = React.useState<string>('All');
  const [filterQuartile, setFilterQuartile] = React.useState<string>('All');

  // Search execution states
  const [isSearching, setIsSearching] = React.useState(false);
  const [result, setResult] = React.useState<AIQueryResult | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  // Handle file drop / upload
  const handleFileProcess = async (file: File) => {
    setIsReadingFile(true);
    setErrorMessage(null);
    try {
      let text = '';
      if (file.name.toLowerCase().endsWith('.pdf')) {
        const base64 = await fileToBase64(file);
        const res = await fetch('/api/parse-pdf-document', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            base64,
            fileName: file.name,
            mode: 'manuscript'
          })
        });

        if (!res.ok) {
          throw new Error(`Failed to parse PDF (HTTP ${res.status})`);
        }

        const data = await res.json();
        if (data.data) {
          text = `Title: ${data.data.title || ''}\n\nAbstract: ${data.data.abstract || ''}\n\nKeywords: ${(data.data.keywords || []).join(', ')}\n\nMethodology: ${data.data.methodology || ''}`;
        } else {
          text = data.rawTextPreview || data.text || '';
        }
      } else if (file.name.toLowerCase().endsWith('.docx')) {
        const base64 = await fileToBase64(file);
        const res = await fetch('/api/parse-docx-document', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ base64, fileName: file.name })
        });
        if (res.ok) {
          const data = await res.json();
          text = data.text || '';
        } else {
          text = await file.text().catch(() => '');
        }
      } else {
        text = await file.text();
      }

      if (!text || text.trim().length === 0) {
        throw new Error('File appears empty or could not be decoded.');
      }

      const sizeStr = file.size > 1024 * 1024 
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` 
        : `${Math.round(file.size / 1024)} KB`;

      setUploadedFile({
        name: file.name,
        size: sizeStr,
        text
      });
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Failed to read file contents.');
    } finally {
      setIsReadingFile(false);
    }
  };

  // Run AI Search
  const handleExecuteSearch = async (overrideParams?: { mode?: 'topic' | 'link' | 'file'; query?: string; url?: string; fileText?: string }) => {
    const mode = overrideParams?.mode || activeSearchMode;
    const q = overrideParams?.query !== undefined ? overrideParams.query : topicQuery;
    const url = overrideParams?.url !== undefined ? overrideParams.url : linkUrl;
    const fText = overrideParams?.fileText !== undefined ? overrideParams.fileText : (uploadedFile?.text || '');

    if (mode === 'topic' && !q.trim()) {
      setErrorMessage('Please enter a research topic, query, or keywords to search.');
      return;
    }
    if (mode === 'link' && !url.trim()) {
      setErrorMessage('Please paste a valid academic link, DOI, arXiv, or journal URL.');
      return;
    }
    if (mode === 'file' && !fText.trim()) {
      setErrorMessage('Please upload a manuscript, paper draft, abstract file, or research document.');
      return;
    }

    setIsSearching(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/ai-search-topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          searchMode: mode,
          query: mode === 'topic' ? q : (q || undefined),
          url: mode === 'link' ? url : undefined,
          fileText: mode === 'file' ? fText : undefined,
          fileName: uploadedFile?.name,
          databaseJournals,
          filterClassification,
          filterQuartile
        })
      });

      if (!res.ok) {
        throw new Error('AI search service encountered an error.');
      }

      const data = await res.json();
      if (data.results) {
        setResult(data.results);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Failed to complete AI database search.');
    } finally {
      setIsSearching(false);
    }
  };

  // Preset Sample Links
  const handleApplySampleLink = (sampleUrl: string) => {
    setLinkUrl(sampleUrl);
    setActiveSearchMode('link');
    handleExecuteSearch({ mode: 'link', url: sampleUrl });
  };

  // Preset Sample Topics
  const handleApplySampleTopic = (sampleText: string) => {
    setTopicQuery(sampleText);
    setActiveSearchMode('topic');
    handleExecuteSearch({ mode: 'topic', query: sampleText });
  };

  const handleExportSearchResults = () => {
    if (!result || !result.matchedJournals) return;
    const exportableJournals: Journal[] = result.matchedJournals.map((m, idx) => {
      const dbMatch = databaseJournals.find(
        j => j.title.toLowerCase() === m.journalTitle.toLowerCase()
      );
      if (dbMatch) return dbMatch;

      return {
        id: `ai-search-${idx}`,
        title: m.journalTitle,
        publisher: m.publisher || 'Academic Publisher',
        classification: m.classification || 'Unclassified',
        quartile: m.quartile || 'Q1',
        impactFactor: m.impactFactor ?? null,
        fiveYearIF: null,
        citeScore: null,
        sjr: m.sjr ?? null,
        isTop10Percent: m.quartile === 'Q1',
        isWosIndexed: true,
        isScopusIndexed: true,
        openAccessType: 'Hybrid',
        apcUSD: null,
        waiverEligible: true,
        waiverDetails: m.apcAndWaiverSummary,
        timeToFirstDecisionDays: 28,
        subjectCategories: result.extractedKeywords || [],
        keywords: result.extractedKeywords || [],
        scopeSummary: m.scopeMatchReason,
        lastUpdated: 'AI Search Result'
      };
    });

    exportJournalsToExcel(exportableJournals, `AI_Database_Search_Results.xlsx`);
  };

  const handleApplyFilterToWorkspace = () => {
    if (result?.matchedJournals && onApplyJournalFilter) {
      const titles = result.matchedJournals.map(m => m.journalTitle);
      onApplyJournalFilter(titles);
      onClose();
    }
  };

  return (
    <div id="ai-search-modal" className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/30 border border-blue-400/40 flex items-center justify-center text-blue-200">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                AI Database Search & Discovery Hub
              </h2>
              <p className="text-xs text-blue-200">
                Search journals by research topics, paste online DOI/arXiv links, or upload manuscript files
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Mode Tab Bar */}
        <div className="px-5 bg-slate-100 border-b border-slate-200 flex items-center gap-2 text-xs font-semibold">
          <button
            id="tab-search-topic"
            onClick={() => setActiveSearchMode('topic')}
            className={`py-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeSearchMode === 'topic'
                ? 'border-blue-600 text-blue-700 font-bold bg-white -mb-px rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Search by Topic & Keywords</span>
          </button>

          <button
            id="tab-search-link"
            onClick={() => setActiveSearchMode('link')}
            className={`py-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeSearchMode === 'link'
                ? 'border-blue-600 text-blue-700 font-bold bg-white -mb-px rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <LinkIcon className="w-3.5 h-3.5 text-indigo-600" />
            <span>Search by Web Link / DOI / arXiv</span>
          </button>

          <button
            id="tab-search-file"
            onClick={() => setActiveSearchMode('file')}
            className={`py-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeSearchMode === 'file'
                ? 'border-blue-600 text-blue-700 font-bold bg-white -mb-px rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-emerald-600" />
            <span>Search by Document / File</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1 text-xs sm:text-sm">
          {/* Mode 1: Search by Topic / Keywords */}
          {activeSearchMode === 'topic' && (
            <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <label className="block text-xs font-bold text-slate-800">
                Search by Research Topic, Keywords, or Manuscript Theme:
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="input-ai-search-query"
                    type="text"
                    placeholder="e.g. 2D materials for electrocatalytic hydrogen evolution with 100% waiver in Class A"
                    value={topicQuery}
                    onChange={(e) => setTopicQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleExecuteSearch({ mode: 'topic' })}
                    className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={filterClassification}
                    onChange={(e) => setFilterClassification(e.target.value)}
                    className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-700 focus:outline-hidden"
                  >
                    <option value="All">All Categories</option>
                    <option value="Class A">Class A Only</option>
                    <option value="Class B">Class B Only</option>
                  </select>

                  <button
                    id="btn-trigger-ai-search"
                    onClick={() => handleExecuteSearch({ mode: 'topic' })}
                    disabled={isSearching}
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50 whitespace-nowrap"
                  >
                    {isSearching ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Searching...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Search Database</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Quick Sample Topic Chips */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[11px] font-semibold text-slate-500">Sample Inquiries:</span>
                <button
                  onClick={() => handleApplySampleTopic('Photocatalytic water splitting & green hydrogen with zero APC or 100% waiver in Q1')}
                  className="px-2 py-0.5 bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 rounded text-[11px] font-medium transition-colors cursor-pointer"
                >
                  Green Hydrogen & Photocatalysis (100% Waiver)
                </button>
                <button
                  onClick={() => handleApplySampleTopic('Multimodal vision transformers for medical pathology detection with fast review turnaround')}
                  className="px-2 py-0.5 bg-white hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200 rounded text-[11px] font-medium transition-colors cursor-pointer"
                >
                  Medical AI Vision & Fast Review
                </button>
                <button
                  onClick={() => handleApplySampleTopic('Biorefinery waste valorization and microbial biopolymers in Class A journals')}
                  className="px-2 py-0.5 bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-200 rounded text-[11px] font-medium transition-colors cursor-pointer"
                >
                  Biorefinery & Circular Bioeconomy (Class A)
                </button>
              </div>
            </div>
          )}

          {/* Mode 2: Search by Web Link / DOI / arXiv */}
          {activeSearchMode === 'link' && (
            <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <label className="block text-xs font-bold text-slate-800 flex items-center justify-between">
                <span>Enter Research Paper URL, DOI Link, or Preprint Link:</span>
                <span className="text-[11px] text-slate-500 font-normal">Supports DOI, arXiv, PubMed, ScienceDirect, ResearchGate, Nature, RSC</span>
              </label>

              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Globe className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="input-ai-search-link"
                    type="url"
                    placeholder="e.g. https://doi.org/10.1039/D2RA05241E or https://arxiv.org/abs/2303.08774"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleExecuteSearch({ mode: 'link' })}
                    className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                <button
                  id="btn-trigger-ai-link-search"
                  onClick={() => handleExecuteSearch({ mode: 'link' })}
                  disabled={isSearching}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50 whitespace-nowrap"
                >
                  {isSearching ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Inspecting Link...</span>
                    </>
                  ) : (
                    <>
                      <LinkIcon className="w-4 h-4" />
                      <span>Fetch Link & Search DB</span>
                    </>
                  )}
                </button>
              </div>

              {/* Sample Links */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[11px] font-semibold text-slate-500">Quick Test Links:</span>
                <button
                  onClick={() => handleApplySampleLink('https://doi.org/10.1039/D2RA05241E')}
                  className="px-2 py-0.5 bg-white hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200 rounded text-[11px] font-medium transition-colors cursor-pointer"
                >
                  DOI: RSC Advances (Green Nanomaterials)
                </button>
                <button
                  onClick={() => handleApplySampleLink('https://arxiv.org/abs/2303.08774')}
                  className="px-2 py-0.5 bg-white hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200 rounded text-[11px] font-medium transition-colors cursor-pointer"
                >
                  arXiv: Multimodal Vision Transformers
                </button>
                <button
                  onClick={() => handleApplySampleLink('https://pubmed.ncbi.nlm.nih.gov/36502214/')}
                  className="px-2 py-0.5 bg-white hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200 rounded text-[11px] font-medium transition-colors cursor-pointer"
                >
                  PubMed: Biomaterials & Drug Delivery
                </button>
              </div>
            </div>
          )}

          {/* Mode 3: Search by File Upload */}
          {activeSearchMode === 'file' && (
            <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <label className="block text-xs font-bold text-slate-800">
                Upload Manuscript, Abstract Draft, or Research Document to Search Database:
              </label>

              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.doc,.txt,.bib,.md"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleFileProcess(e.target.files[0]);
                  }
                }}
                className="hidden"
              />

              {!uploadedFile ? (
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDraggingFile(true); }}
                  onDragLeave={() => setIsDraggingFile(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDraggingFile(false);
                    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                      handleFileProcess(e.dataTransfer.files[0]);
                    }
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                    isDraggingFile ? 'border-blue-500 bg-blue-50/50' : 'border-slate-300 hover:border-blue-400 bg-white'
                  }`}
                >
                  <Upload className="w-7 h-7 text-blue-600 mx-auto mb-2" />
                  <p className="font-bold text-slate-900 text-xs sm:text-sm">
                    Drop PDF, Word (.docx), or Text file here, or browse
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Supports .pdf, .docx, .txt, .bib, .md (Extracts title, abstract, and topics automatically)
                  </p>
                </div>
              ) : (
                <div className="p-3.5 bg-white rounded-xl border border-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
                      <FileCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 text-xs">{uploadedFile.name}</div>
                      <div className="text-[11px] text-slate-500">
                        {uploadedFile.size} • {uploadedFile.text.length} characters extracted
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { setUploadedFile(null); }}
                      className="px-2.5 py-1 text-slate-500 hover:text-rose-600 text-xs font-medium cursor-pointer"
                    >
                      Remove
                    </button>

                    <button
                      id="btn-trigger-ai-file-search"
                      onClick={() => handleExecuteSearch({ mode: 'file' })}
                      disabled={isSearching}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {isSearching ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Matching File...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Search Matching Journals</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Error message */}
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Results display */}
          {result && (
            <div id="ai-search-results" className="space-y-5 animate-in fade-in duration-200">
              {/* Extracted Paper Details if from Link or File */}
              {(result.extractedTitle || result.extractedAbstract) && (
                <div className="p-4 rounded-xl bg-slate-900 text-white border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs text-blue-300 font-mono">
                    <span className="flex items-center gap-1.5">
                      <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
                      Extracted Paper Profile ({result.sourceType === 'link' ? 'Web Link' : 'Uploaded File'})
                    </span>
                  </div>
                  {result.extractedTitle && (
                    <h3 className="font-bold text-white text-sm">
                      {result.extractedTitle}
                    </h3>
                  )}
                  {result.extractedAbstract && (
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {result.extractedAbstract}
                    </p>
                  )}
                </div>
              )}

              {/* Executive Strategy Box */}
              <div className="p-4 rounded-xl bg-blue-50/80 border border-blue-200 space-y-2">
                <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  Research Domain & Strategic Publishing Overview:
                </span>
                <p className="text-xs sm:text-sm text-blue-950 leading-relaxed">
                  {result.queryAnalysis}
                </p>

                {result.extractedKeywords && result.extractedKeywords.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[11px] font-semibold text-blue-800 mr-1">Extracted Key Concepts:</span>
                    {result.extractedKeywords.map((kw, i) => (
                      <span key={i} className="px-2 py-0.5 bg-blue-200/70 text-blue-900 rounded font-medium text-[11px]">
                        {kw}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Suggested Research Paper Topics & Benchmark Articles */}
              {result.suggestedResearchPaperTopics && result.suggestedResearchPaperTopics.length > 0 && (
                <div className="space-y-2.5">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                    Relevant Research Paper Themes & Scope Alignment
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {result.suggestedResearchPaperTopics.map((paper, idx) => (
                      <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-bold text-slate-900 text-xs sm:text-sm leading-snug">
                            {paper.paperTitle}
                          </h4>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-relaxed">
                          {paper.summary}
                        </p>
                        <div className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded inline-block">
                          Target Match: {paper.relevantJournal}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Matched Journals */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-amber-500" />
                    Ranked Database Targets ({result.matchedJournals.length} Matches)
                  </h3>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleExportSearchResults}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-slate-500" />
                      <span>Export Results (.xlsx)</span>
                    </button>

                    {onApplyJournalFilter && (
                      <button
                        onClick={handleApplyFilterToWorkspace}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-900 hover:bg-blue-600 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer"
                      >
                        <Filter className="w-3.5 h-3.5" />
                        <span>Filter Workspace by These</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  {result.matchedJournals.map((journal, idx) => {
                    const dbJournal = databaseJournals.find(
                      j => j.title.toLowerCase() === journal.journalTitle.toLowerCase()
                    );
                    const isShortlisted = dbJournal ? shortlistedIds.includes(dbJournal.id) : false;

                    return (
                      <div
                        key={idx}
                        id={`ai-search-card-${idx}`}
                        className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs hover:border-blue-400 transition-all space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-900 border border-blue-300 font-mono">
                                {journal.matchScore}% Match
                              </span>
                              {journal.classification && (
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  journal.classification === 'Class A' ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-700'
                                }`}>
                                  {journal.classification}
                                </span>
                              )}
                              {journal.quartile && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                  {journal.quartile}
                                </span>
                              )}
                              {journal.impactFactor && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-800">
                                  IF: {journal.impactFactor}
                                </span>
                              )}
                              {journal.sjr && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-600 bg-slate-100">
                                  SJR: {journal.sjr}
                                </span>
                              )}
                            </div>

                            <h4 className="font-bold text-slate-900 text-sm sm:text-base">
                              {journal.journalTitle}
                            </h4>
                            <p className="text-xs text-slate-500">
                              Publisher: {journal.publisher || 'Academic Society'}
                            </p>
                          </div>

                          <div className="flex items-center gap-1.5 self-end sm:self-auto">
                            {dbJournal && (
                              <button
                                onClick={() => onToggleShortlist(dbJournal)}
                                className={`p-1.5 rounded-lg border text-xs transition-colors cursor-pointer ${
                                  isShortlisted ? 'bg-amber-50 text-amber-600 border-amber-300' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                }`}
                                title="Add to submission shortlist"
                              >
                                <Bookmark className="w-4 h-4" />
                              </button>
                            )}

                            {dbJournal && (
                              <button
                                onClick={() => onSelectJournal(dbJournal)}
                                className="px-3 py-1.5 bg-slate-900 hover:bg-blue-600 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                              >
                                Dossier
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Scope justification */}
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs text-slate-700 leading-relaxed">
                          <strong>Scope Fit:</strong> {journal.scopeMatchReason}
                        </div>

                        {/* Turnaround & APC summaries */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          {journal.apcAndWaiverSummary && (
                            <div className="p-2 bg-teal-50/70 border border-teal-200 rounded-lg text-teal-900 flex items-center gap-1.5">
                              <ShieldCheck className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                              <span><strong>APC & Waiver:</strong> {journal.apcAndWaiverSummary}</span>
                            </div>
                          )}

                          {journal.decisionSpeedSummary && (
                            <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                              <span><strong>Turnaround:</strong> {journal.decisionSpeedSummary}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
          <span className="text-slate-500">
            Powered by live academic index grounding & Scopus/WoS algorithms
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg font-medium transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
