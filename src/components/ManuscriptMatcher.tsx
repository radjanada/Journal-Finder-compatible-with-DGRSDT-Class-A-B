import React from 'react';
import { 
  X, 
  Sparkles, 
  FileText, 
  Send, 
  Award, 
  Clock, 
  DollarSign, 
  CheckCircle2, 
  AlertTriangle, 
  Bookmark, 
  ExternalLink, 
  Upload, 
  RefreshCw,
  Zap,
  ArrowRight
} from 'lucide-react';
import { Journal, ManuscriptAnalysisResult } from '../types';
import { fileToBase64 } from '../utils/fileParser';

interface ManuscriptMatcherProps {
  isOpen: boolean;
  onClose: () => void;
  databaseJournals: Journal[];
  onSelectJournal: (journal: Journal) => void;
  onToggleShortlist: (journal: Journal) => void;
  shortlistedIds: string[];
}

export const ManuscriptMatcher: React.FC<ManuscriptMatcherProps> = ({
  isOpen,
  onClose,
  databaseJournals = [],
  onSelectJournal,
  onToggleShortlist,
  shortlistedIds = []
}) => {
  if (!isOpen) return null;

  const [title, setTitle] = React.useState('');
  const [abstract, setAbstract] = React.useState('');
  const [keywords, setKeywords] = React.useState('');
  const [priorityTier, setPriorityTier] = React.useState<'All' | 'Class A Only' | 'Class B Only' | '100% Waiver Prioritized' | 'Fastest Decision'>('All');
  const [paperUrlInput, setPaperUrlInput] = React.useState('');
  const [isFetchingUrl, setIsFetchingUrl] = React.useState(false);
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);
  const [analysisResult, setAnalysisResult] = React.useState<ManuscriptAnalysisResult | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const fileDocRef = React.useRef<HTMLInputElement | null>(null);

  const handleFetchFromLink = async (urlToFetch?: string) => {
    const targetUrl = urlToFetch || paperUrlInput;
    if (!targetUrl.trim()) {
      setErrorMessage('Please enter an academic paper link, DOI, or arXiv URL.');
      return;
    }

    setIsFetchingUrl(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/extract-link-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetUrl })
      });

      if (!res.ok) {
        throw new Error('Could not resolve content from this link or DOI.');
      }

      const responseData = await res.json();
      if (responseData.data) {
        const d = responseData.data;
        if (d.title) setTitle(d.title);
        if (d.abstract) setAbstract(d.abstract);
        if (d.keywords && Array.isArray(d.keywords)) setKeywords(d.keywords.join(', '));
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Failed to extract manuscript information from URL.');
    } finally {
      setIsFetchingUrl(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    setErrorMessage(null);
    try {
      if (file.name.toLowerCase().endsWith('.pdf')) {
        // Read entire PDF via /api/parse-pdf-document
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
          if (data.data.title) setTitle(data.data.title);
          if (data.data.abstract) setAbstract(data.data.abstract);
          if (Array.isArray(data.data.keywords) && data.data.keywords.length > 0) {
            setKeywords(data.data.keywords.join(', '));
          }
        } else if (data.rawTextPreview) {
          extractTitleAndAbstractFromText(data.rawTextPreview);
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
          extractTitleAndAbstractFromText(data.text || '');
        } else {
          const text = await file.text().catch(() => '');
          extractTitleAndAbstractFromText(text);
        }
      } else {
        const text = await file.text();
        extractTitleAndAbstractFromText(text);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Could not extract text from document. Please paste title and abstract manually.');
    }
  };

  const extractTitleAndAbstractFromText = (text: string) => {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length > 0) {
      setTitle(lines[0].slice(0, 150));
      const abstractIndex = lines.findIndex(l => l.toLowerCase().startsWith('abstract'));
      if (abstractIndex !== -1) {
        setAbstract(lines.slice(abstractIndex, abstractIndex + 10).join(' ').replace(/^abstract:?/i, '').trim());
      } else {
        setAbstract(lines.slice(1, 8).join(' ').trim());
      }
    }
  };

  const handleRunMatcher = async () => {
    if (!title && !abstract) {
      setErrorMessage('Please enter either a manuscript title or abstract to match.');
      return;
    }

    setIsAnalyzing(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/match-manuscript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          abstract,
          keywords,
          userTargetClassification: priorityTier,
          databaseJournals
        })
      });

      if (!res.ok) {
        throw new Error('Failed to analyze manuscript. Please check server connection.');
      }

      const data = await res.json();
      if (data.analysis) {
        setAnalysisResult(data.analysis);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Error running AI manuscript matcher.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleApplyPreset = (preset: 'nanotech' | 'ai_vision' | 'biotech') => {
    if (preset === 'nanotech') {
      setTitle('Engineered 2D MXene-TiO2 Heterojunctions for Solar-Driven Water Splitting and Hydrogen Evolution');
      setAbstract('Herein, we report the atomic-scale engineering of 2D Ti3C2Tx MXene coupled with oxygen-deficient TiO2 nanoparticles. The interfacial charge transfer kinetics demonstrate a 4.8-fold enhancement in photocatalytic hydrogen generation under AM 1.5G simulated sunlight with apparent quantum yield of 14.2%. Stability tests confirm negligible degradation over 100 hours of continuous irradiation.');
      setKeywords('MXene, TiO2, Heterojunction, Photocatalytic Water Splitting, Hydrogen Evolution, 2D Nanomaterials');
      setPriorityTier('100% Waiver Prioritized');
    } else if (preset === 'ai_vision') {
      setTitle('Contrastive Multimodal Transformer for Zero-Shot Medical Anomaly Detection in CT Volumetric Scans');
      setAbstract('Automated volumetric anomaly detection in medical imaging remains challenging due to scarce labeled pathological cases. We introduce a contrastive multimodal vision-language framework pre-trained on paired radiological reports and 3D CT scans, achieving 94.6% AUROC on rare pulmonary lesions.');
      setKeywords('Deep Learning, Medical Image Analysis, Transformers, Zero-Shot, Computer Vision, Anomaly Detection');
      setPriorityTier('Class A Only');
    } else if (preset === 'biotech') {
      setTitle('Continuous Bioprocess Optimization for High-Yield Microbial Production of Biodegradable Polyhydroxyalkanoates from Agro-Industrial Waste');
      setAbstract('This investigation presents a scalable bioreactor fermentation strategy converting enzymatic hydrolysates of sugarcane bagasse into polyhydroxybutyrate (PHB) using engineered Cupriavidus necator, achieving a cell dry weight of 62.4 g/L.');
      setKeywords('Bioprocess, Polyhydroxyalkanoates, Biopolymers, Agro-waste Valorization, Fermentation');
      setPriorityTier('All');
    }
  };

  return (
    <div id="manuscript-matcher-modal" className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-amber-50 to-orange-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-white shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                AI Manuscript Scope & Submission Matcher
              </h2>
              <p className="text-xs text-slate-600">
                Match your research paper with optimal Class A / Class B / Scopus journals & 100% waiver options
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs sm:text-sm">
          {/* Link / DOI / File Import Bar */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="url"
                  placeholder="Paste paper URL, DOI (e.g. 10.1039/...), or arXiv link to auto-fill..."
                  value={paperUrlInput}
                  onChange={(e) => setPaperUrlInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleFetchFromLink()}
                  className="w-full pl-3 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleFetchFromLink()}
                  disabled={isFetchingUrl}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isFetchingUrl ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Fetching Link...</span>
                    </>
                  ) : (
                    <span>Auto-Fill from Link</span>
                  )}
                </button>

                <input
                  ref={fileDocRef}
                  type="file"
                  accept=".docx,.pdf,.txt,.md"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleFileUpload(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileDocRef.current?.click()}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload File</span>
                </button>
              </div>
            </div>

            {/* Quick Presets */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-200/60">
              <span className="text-[11px] font-semibold text-slate-500 mr-1">
                Sample Paper Presets:
              </span>
              <button
                type="button"
                onClick={() => handleApplyPreset('nanotech')}
                className="px-2 py-0.5 bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-800 border border-slate-200 rounded text-[11px] font-medium transition-colors cursor-pointer"
              >
                Nanotech & Materials (RSC 100% Waiver)
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('ai_vision')}
                className="px-2 py-0.5 bg-white hover:bg-indigo-50 text-slate-700 hover:text-indigo-800 border border-slate-200 rounded text-[11px] font-medium transition-colors cursor-pointer"
              >
                AI & Medical Vision (Class A)
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('biotech')}
                className="px-2 py-0.5 bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200 rounded text-[11px] font-medium transition-colors cursor-pointer"
              >
                Biotech & Engineering
              </button>
            </div>
          </div>

          {/* Input Form */}
          <div className="space-y-3">
            <div>
              <label htmlFor="input-manuscript-title" className="block text-xs font-bold text-slate-800 mb-1">
                Manuscript Title:
              </label>
              <input
                id="input-manuscript-title"
                type="text"
                placeholder="e.g. Synthesis of Highly Efficient Visible-Light Photocatalysts for Wastewater Purification..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-1 focus:ring-amber-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label htmlFor="input-manuscript-abstract" className="block text-xs font-bold text-slate-800 mb-1">
                Abstract / Research Summary:
              </label>
              <textarea
                id="input-manuscript-abstract"
                rows={4}
                placeholder="Paste the manuscript abstract or key findings here..."
                value={abstract}
                onChange={(e) => setAbstract(e.target.value)}
                className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-1 focus:ring-amber-500 focus:outline-hidden leading-relaxed"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="input-manuscript-keywords" className="block text-xs font-bold text-slate-800 mb-1">
                  Author Keywords (Optional):
                </label>
                <input
                  id="input-manuscript-keywords"
                  type="text"
                  placeholder="e.g. Nanoparticles, Photocatalysis, RSC Advances, Q1"
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-1 focus:ring-amber-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Target Priority / Constraints:
                </label>
                <select
                  id="select-matcher-priority"
                  value={priorityTier}
                  onChange={(e) => setPriorityTier(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-1 focus:ring-amber-500 focus:outline-hidden font-medium"
                >
                  <option value="All">All High-Match Journals</option>
                  <option value="Class A Only">Prioritize Class A / Top 10% Only</option>
                  <option value="Class B Only">Prioritize Class B Journals</option>
                  <option value="100% Waiver Prioritized">Prioritize 100% Fee Waiver (e.g. RSC / Diamond)</option>
                  <option value="Fastest Decision">Prioritize Fastest Decision Speed (&lt; 25 days)</option>
                </select>
              </div>
            </div>

            {/* Run Button */}
            <div className="flex justify-end pt-1">
              <button
                id="btn-run-manuscript-matcher"
                onClick={handleRunMatcher}
                disabled={isAnalyzing}
                className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isAnalyzing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Evaluating Scope & Calculating Matches...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Find Optimal Target Journals</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Error */}
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs">
              {errorMessage}
            </div>
          )}

          {/* Results Display */}
          {analysisResult && (
            <div id="manuscript-matcher-results" className="space-y-4 pt-4 border-t border-slate-200 animate-in fade-in duration-200">
              {/* Executive Summary */}
              <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200/80 space-y-1.5">
                <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  Submission Strategy & Scope Alignment:
                </span>
                <p className="text-xs sm:text-sm text-amber-950 leading-relaxed">
                  {analysisResult.scopeFitSummary}
                </p>
                {analysisResult.domains && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {analysisResult.domains.map((d, i) => (
                      <span key={i} className="px-2 py-0.5 rounded bg-amber-200/60 text-amber-900 text-[11px] font-semibold">
                        {d}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Recommended Journal Cards */}
              <div className="space-y-3">
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                  Top Recommended Journals ({analysisResult.suggestedJournals.length} Matches)
                </h4>

                <div className="grid grid-cols-1 gap-3">
                  {analysisResult.suggestedJournals.map((sug, idx) => {
                    // Try to match with existing database journal
                    const matchedDbJournal = databaseJournals.find(
                      j => j.title.toLowerCase() === sug.journalTitle.toLowerCase()
                    );
                    const isShortlisted = matchedDbJournal ? shortlistedIds.includes(matchedDbJournal.id) : false;

                    return (
                      <div
                        key={idx}
                        id={`match-recommendation-${idx}`}
                        className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs hover:border-amber-400 transition-all space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                {sug.matchScore}% Match
                              </span>
                              <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-slate-900 text-white">
                                {sug.recommendationTier}
                              </span>
                              {sug.classification && (
                                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                                  sug.classification === 'Class A' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                                }`}>
                                  {sug.classification}
                                </span>
                              )}
                              {sug.quartile && (
                                <span className="px-1.5 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700">
                                  {sug.quartile}
                                </span>
                              )}
                            </div>
                            <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                              {sug.journalTitle}
                            </h3>
                            <p className="text-xs text-slate-500">
                              Publisher: {sug.publisher || 'Academic Society'}
                              {sug.impactFactor && ` | IF: ${sug.impactFactor}`}
                              {sug.timeToFirstDecision && ` | Decision: ${sug.timeToFirstDecision}`}
                            </p>
                          </div>

                          {/* Quick Actions */}
                          <div className="flex items-center gap-1.5 self-end sm:self-auto">
                            {matchedDbJournal && (
                              <button
                                onClick={() => onToggleShortlist(matchedDbJournal)}
                                className={`p-1.5 rounded-lg border text-xs transition-colors cursor-pointer ${
                                  isShortlisted ? 'bg-amber-50 text-amber-600 border-amber-300' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                }`}
                                title="Add to submission target shortlist"
                              >
                                <Bookmark className="w-4 h-4" />
                              </button>
                            )}

                            {matchedDbJournal && (
                              <button
                                onClick={() => onSelectJournal(matchedDbJournal)}
                                className="px-3 py-1.5 bg-slate-900 hover:bg-indigo-600 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                              >
                                View Dossier
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Match Reasons */}
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-1.5 text-xs text-slate-700">
                          <span className="font-bold text-slate-800 block text-[11px] uppercase">
                            Why this journal is a great fit:
                          </span>
                          <ul className="space-y-1 list-disc list-inside">
                            {sug.matchReasons.map((r, rIdx) => (
                              <li key={rIdx} className="leading-relaxed">
                                {r}
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* APC & Waiver advantage */}
                        {sug.apcStatus && (
                          <div className="p-2.5 rounded-lg bg-teal-50 border border-teal-200 text-xs text-teal-900 flex items-center justify-between">
                            <span><strong>APC & Waiver:</strong> {sug.apcStatus}</span>
                            <span className="text-[11px] font-semibold text-teal-700">✓ Verified Policy</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
          <span className="text-slate-500">
            AI grounded with academic editorial benchmarks
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
