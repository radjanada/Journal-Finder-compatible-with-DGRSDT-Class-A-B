import React from 'react';
import { 
  BookOpen, 
  UploadCloud, 
  Sparkles, 
  Layers, 
  Bookmark, 
  Download, 
  Database, 
  CheckCircle2, 
  Award, 
  Percent, 
  Clock, 
  ShieldCheck,
  FileSpreadsheet
} from 'lucide-react';
import { Journal } from '../types';

interface HeaderProps {
  journals?: Journal[];
  totalJournalsCount?: number;
  shortlistCount?: number;
  comparisonCount?: number;
  compareCount?: number;
  onOpenUpload?: () => void;
  onOpenUploadModal?: () => void;
  onOpenMatcher?: () => void;
  onOpenMatcherModal?: () => void;
  onOpenAISearch?: () => void;
  onOpenComparison?: () => void;
  onOpenCompareModal?: () => void;
  onOpenShortlist?: () => void;
  onOpenShortlistModal?: () => void;
  onOpenDatabaseManager?: () => void;
  onOpenDbManagerModal?: () => void;
  onExportExcel: () => void;
  onExportCsv?: () => void;
  onExportCSV?: () => void;
  onExportJson?: () => void;
  onExportJSON?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  journals = [],
  totalJournalsCount,
  shortlistCount = 0,
  comparisonCount,
  compareCount,
  onOpenUpload,
  onOpenUploadModal,
  onOpenMatcher,
  onOpenMatcherModal,
  onOpenAISearch,
  onOpenComparison,
  onOpenCompareModal,
  onOpenShortlist,
  onOpenShortlistModal,
  onOpenDatabaseManager,
  onOpenDbManagerModal,
  onExportExcel,
  onExportCsv,
  onExportCSV,
  onExportJson,
  onExportJSON
}) => {
  const [showExportMenu, setShowExportMenu] = React.useState(false);

  const safeJournals = journals || [];
  const totalJournals = totalJournalsCount ?? safeJournals.length;
  const classACount = safeJournals.filter(j => j.classification === 'Class A').length;
  const classBCount = safeJournals.filter(j => j.classification === 'Class B').length;
  const scopusTop10Count = safeJournals.filter(j => j.isTop10Percent).length;
  const waiverCount = safeJournals.filter(j => j.waiverEligible || j.openAccessType === 'Diamond (No Fee)').length;
  const activeCompareCount = comparisonCount ?? compareCount ?? 0;

  const handleUpload = onOpenUpload || onOpenUploadModal || (() => {});
  const handleMatcher = onOpenMatcher || onOpenMatcherModal || (() => {});
  const handleAISearch = onOpenAISearch || (() => {});
  const handleComparison = onOpenComparison || onOpenCompareModal || (() => {});
  const handleShortlist = onOpenShortlist || onOpenShortlistModal || (() => {});
  const handleDbManager = onOpenDatabaseManager || onOpenDbManagerModal || (() => {});
  const handleCsv = onExportCsv || onExportCSV || (() => {});
  const handleJson = onExportJson || onExportJSON || (() => {});

  return (
    <header id="app-header" className="bg-[#1e293b] text-white border-b border-slate-700 shadow-md sticky top-0 z-30">
      {/* Top Banner with High-Density branding & primary action controls */}
      <div className="w-full px-4 lg:px-6 py-2.5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center font-bold text-lg text-white shadow-sm shrink-0">
            S
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base font-bold tracking-tight text-white">
                ScholarLens AI <span className="text-blue-400 font-normal">| Journal Decision Engine</span>
              </h1>
              <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-900/60 text-blue-300 border border-blue-700/50">
                Live Grounded
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block leading-tight">
              Class A / B Scopus & WoS Analytics • 100% APC Waivers (RSC/Diamond) • Turnaround & JCR Verification
            </p>
          </div>
        </div>

        {/* Action Controls in High-Density styling */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Active Database Status Badge */}
          <div className="hidden xl:flex items-center bg-slate-800 rounded px-2.5 py-1 border border-slate-700 text-xs">
            <span className="text-[10px] text-slate-400 mr-2 uppercase tracking-widest font-semibold">DB Status:</span>
            <span className="text-[11px] font-mono text-emerald-400 font-medium">CLASS-A/B ({totalJournals} Records) Active</span>
          </div>

          {/* Upload Database */}
          <button
            id="btn-upload-database"
            onClick={handleUpload}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase tracking-wider shadow-xs transition-colors cursor-pointer"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            + Upload List
          </button>

          {/* AI Search & Topics */}
          <button
            id="btn-ai-topic-search"
            onClick={handleAISearch}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold uppercase tracking-wider shadow-xs transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            AI Search & Topics
          </button>

          {/* AI Manuscript Matcher */}
          <button
            id="btn-ai-matcher"
            onClick={handleMatcher}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-bold uppercase tracking-wider shadow-xs transition-colors cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5" />
            Journal Finder
          </button>

          {/* Compare */}
          <button
            id="btn-compare-journals"
            onClick={handleComparison}
            disabled={activeCompareCount === 0}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-semibold uppercase tracking-wider border transition-colors cursor-pointer ${
              activeCompareCount > 0
                ? 'bg-slate-800 text-slate-200 border-slate-600 hover:bg-slate-700'
                : 'bg-slate-800/40 text-slate-500 border-slate-750 cursor-not-allowed opacity-50'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Compare ({activeCompareCount})
          </button>

          {/* Shortlist */}
          <button
            id="btn-view-shortlist"
            onClick={handleShortlist}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-200 text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer"
          >
            <Bookmark className="w-3.5 h-3.5 text-amber-400" />
            Shortlist ({shortlistCount})
          </button>

          {/* Database Manager */}
          <button
            id="btn-database-manager"
            onClick={handleDbManager}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-200 text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer"
            title="Manage Class A, Class B & Scopus databases"
          >
            <Database className="w-3.5 h-3.5 text-slate-400" />
            Databases
          </button>

          {/* Export Dropdown */}
          <div className="relative">
            <button
              id="btn-export-dropdown"
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-200 text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Export
            </button>

            {showExportMenu && (
              <div 
                id="export-dropdown-menu"
                className="absolute right-0 mt-1.5 w-44 bg-slate-900 rounded-lg shadow-xl border border-slate-700 py-1 z-40"
              >
                <button
                  id="btn-export-excel"
                  onClick={() => { onExportExcel(); setShowExportMenu(false); }}
                  className="w-full text-left px-3.5 py-2 text-xs text-slate-200 hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  Excel (.xlsx)
                </button>
                <button
                  id="btn-export-csv"
                  onClick={() => { handleCsv(); setShowExportMenu(false); }}
                  className="w-full text-left px-3.5 py-2 text-xs text-slate-200 hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4 text-blue-400" />
                  CSV (.csv)
                </button>
                <button
                  id="btn-export-json"
                  onClick={() => { handleJson(); setShowExportMenu(false); }}
                  className="w-full text-left px-3.5 py-2 text-xs text-slate-200 hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
                >
                  <Database className="w-4 h-4 text-indigo-400" />
                  JSON (.json)
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* High-Density Metric Strip */}
      <div className="bg-[#0f172a] border-t border-slate-800/90 px-4 lg:px-6 py-1.5">
        <div className="w-full flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-3 text-slate-300 text-[11px]">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 uppercase tracking-wider text-[10px] font-bold">Total:</span>
              <span className="font-mono font-bold text-white bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
                {totalJournals}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <Award className="w-3 h-3 text-emerald-400" />
              <span className="text-slate-400 uppercase tracking-wider text-[10px] font-bold">Class A:</span>
              <span className="font-mono font-bold text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/60">
                {classACount}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3 h-3 text-blue-400" />
              <span className="text-slate-400 uppercase tracking-wider text-[10px] font-bold">Class B:</span>
              <span className="font-mono font-bold text-blue-300 bg-blue-950/60 px-1.5 py-0.5 rounded border border-blue-800/60">
                {classBCount}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <Percent className="w-3 h-3 text-purple-400" />
              <span className="text-slate-400 uppercase tracking-wider text-[10px] font-bold">Scopus Top 10%:</span>
              <span className="font-mono font-bold text-purple-300 bg-purple-950/60 px-1.5 py-0.5 rounded border border-purple-800/60">
                {scopusTop10Count}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3 h-3 text-teal-400" />
              <span className="text-slate-400 uppercase tracking-wider text-[10px] font-bold">100% Waiver:</span>
              <span className="font-mono font-bold text-teal-300 bg-teal-950/60 px-1.5 py-0.5 rounded border border-teal-800/60">
                {waiverCount}
              </span>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-2 text-[10px] text-slate-400 font-mono">
            <Clock className="w-3 h-3 text-slate-500" />
            <span>GEMINI LIVE GROUNDING • JCR & SCOPUS VERIFICATION READY</span>
          </div>
        </div>
      </div>
    </header>
  );
};

