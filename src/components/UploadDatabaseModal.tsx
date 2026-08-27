import React from 'react';
import { 
  X, 
  UploadCloud, 
  FileSpreadsheet, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Award, 
  Percent, 
  Database, 
  Sparkles,
  ArrowRight,
  Info,
  Globe,
  Link as LinkIcon,
  RefreshCw
} from 'lucide-react';
import { parseUploadedFile, parseRawContent, ParseResult } from '../utils/fileParser';
import { Journal, UploadBatchSummary } from '../types';
import { findAndMergeDuplicates } from '../utils/duplicateUtils';

interface UploadDatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportJournals: (journals: Journal[], action: 'merge' | 'replace', summary: UploadBatchSummary) => void;
  onLoadPresetSample: (sampleType: 'classA_classB' | 'scopus_top10' | 'rsc_waivers') => void;
}

export const UploadDatabaseModal: React.FC<UploadDatabaseModalProps> = ({
  isOpen,
  onClose,
  onImportJournals,
  onLoadPresetSample
}) => {
  if (!isOpen) return null;

  const [inputMode, setInputMode] = React.useState<'file' | 'url'>('file');
  const [datasetUrl, setDatasetUrl] = React.useState('');
  const [isDragging, setIsDragging] = React.useState(false);
  const [targetCategory, setTargetCategory] = React.useState<'Class A' | 'Class B' | 'Scopus Top 10%' | 'Scopus General' | 'Auto-Detect'>('Auto-Detect');
  const [importAction, setImportAction] = React.useState<'merge' | 'replace'>('merge');
  const [isParsing, setIsParsing] = React.useState(false);
  const [parsingStatus, setParsingStatus] = React.useState<string>('');
  const [parseResult, setParseResult] = React.useState<ParseResult | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const handleFileSelect = async (filesInput: FileList | File[]) => {
    const files = Array.from(filesInput);
    if (files.length === 0) return;

    setIsParsing(true);
    setErrorMessage(null);
    setParseResult(null);
    setParsingStatus(`Parsing ${files.length} selected file(s) and merging records...`);

    try {
      const allJournals: Journal[] = [];
      let totalSize = 0;
      const fileNames: string[] = [];
      const columnsDetectedSet = new Set<string>();

      for (const file of files) {
        fileNames.push(file.name);
        totalSize += file.size;
        const res = await parseUploadedFile(file, targetCategory);
        if (res.journals && res.journals.length > 0) {
          allJournals.push(...res.journals);
        }
        if (res.summary?.columnsDetected) {
          res.summary.columnsDetected.forEach(c => columnsDetectedSet.add(c));
        }
      }

      if (allJournals.length === 0) {
        setErrorMessage('Could not extract any valid journal entries from the selected files.');
        return;
      }

      // Run duplicate detection and merge across files
      const { mergedJournals, duplicatesCount, mergedSummaryText } = findAndMergeDuplicates(allJournals);

      const combinedSummary: UploadBatchSummary = {
        fileName: fileNames.join(', '),
        fileSize: totalSize,
        detectedType: files.length > 1 ? 'Generic Journal Database' : (files[0].name.toLowerCase().includes('class a') ? 'Class A List' : 'Scopus General List'),
        totalParsed: mergedJournals.length,
        newEntries: mergedJournals.length,
        updatedEntries: duplicatesCount,
        classACount: mergedJournals.filter(j => j.classification === 'Class A').length,
        classBCount: mergedJournals.filter(j => j.classification === 'Class B').length,
        scopusCount: mergedJournals.filter(j => j.isScopusIndexed).length,
        wosCount: mergedJournals.filter(j => j.isWosIndexed).length,
        columnsDetected: Array.from(columnsDetectedSet)
      };

      setParseResult({
        journals: mergedJournals,
        summary: combinedSummary,
        rawTextPreview: mergedSummaryText
      });
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Error parsing uploaded files. Please verify format.');
    } finally {
      setIsParsing(false);
    }
  };

  const handleFetchFromUrl = async () => {
    if (!datasetUrl.trim()) {
      setErrorMessage('Please enter a valid dataset or CSV link.');
      return;
    }

    setIsParsing(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/fetch-url-dataset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: datasetUrl })
      });

      if (!res.ok) {
        throw new Error('Failed to fetch dataset from the provided link. Please ensure it is publicly accessible.');
      }

      const data = await res.json();
      if (!data.content) {
        throw new Error('No content returned from URL.');
      }

      const result = await parseRawContent(data.content, datasetUrl, targetCategory);
      if (result.journals.length === 0) {
        setErrorMessage('Could not extract any journal entries from this URL. Please verify CSV or text format.');
      } else {
        setParseResult(result);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Failed to fetch or parse dataset from URL.');
    } finally {
      setIsParsing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleConfirmImport = () => {
    if (parseResult) {
      onImportJournals(parseResult.journals, importAction, parseResult.summary);
      onClose();
    }
  };

  return (
    <div id="upload-database-modal" className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600">
              <UploadCloud className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Upload & Ingest Journal Database
              </h2>
              <p className="text-xs text-slate-500">
                Import from local files (Excel, CSV, Word, PDF) or web dataset URLs
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

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs sm:text-sm">
          {/* Input Mode Selector */}
          <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200">
            <button
              type="button"
              onClick={() => setInputMode('file')}
              className={`flex-1 py-1.5 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                inputMode === 'file' ? 'bg-white shadow-xs text-indigo-700' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Upload Local File</span>
            </button>
            <button
              type="button"
              onClick={() => setInputMode('url')}
              className={`flex-1 py-1.5 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                inputMode === 'url' ? 'bg-white shadow-xs text-indigo-700' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Import from Web Link / URL</span>
            </button>
          </div>

          {/* Target List Classification Selection */}
          <div className="space-y-2">
            <label className="font-semibold text-slate-800 text-xs block">
              1. What type of list or file are you uploading?
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { id: 'Auto-Detect', label: 'Auto-Detect', desc: 'From columns & file' },
                { id: 'Class A', label: 'Class A List', desc: 'Reference Class A database' },
                { id: 'Class B', label: 'Class B List', desc: 'Reference Class B database' },
                { id: 'Scopus Top 10%', label: 'Scopus Top 10%', desc: 'Top decile CiteScore/SJR' },
                { id: 'Scopus General', label: 'Scopus Master', desc: 'General Scopus index' }
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  id={`btn-target-type-${item.id.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                  onClick={() => setTargetCategory(item.id as any)}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    targetCategory === item.id
                      ? 'bg-indigo-50/80 border-indigo-400 ring-2 ring-indigo-500/20 text-indigo-950 font-semibold'
                      : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="font-bold text-xs">{item.label}</div>
                  <div className="text-[10px] text-slate-500 font-normal">{item.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* File Upload Mode */}
          {inputMode === 'file' && (
            <div
              id="dropzone-file-upload"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-indigo-500 bg-indigo-50/60'
                  : 'border-slate-300 hover:border-indigo-400 bg-slate-50/50 hover:bg-slate-50'
              }`}
            >
              <input
                ref={fileInputRef}
                id="file-input-element"
                type="file"
                multiple
                accept=".xlsx,.xls,.csv,.docx,.pdf,.txt,.json"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleFileSelect(e.target.files);
                  }
                }}
                className="hidden"
              />
              <div className="w-12 h-12 rounded-full bg-indigo-100/70 text-indigo-600 flex items-center justify-center mx-auto mb-2">
                <UploadCloud className="w-6 h-6" />
              </div>
              <p className="font-bold text-slate-800 text-xs sm:text-sm">
                Click to select or drag & drop journal file here
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Supports Excel (.xlsx, .xls), CSV, Word (.docx), PDF, JSON, or plain text lists
              </p>
            </div>
          )}

          {/* Web URL Mode */}
          {inputMode === 'url' && (
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <label className="block text-xs font-bold text-slate-800">
                Enter Public Dataset URL (CSV / JSON / Google Sheets link):
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="url"
                    placeholder="https://example.com/journals-list.csv or raw GitHub dataset link"
                    value={datasetUrl}
                    onChange={(e) => setDatasetUrl(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleFetchFromUrl()}
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleFetchFromUrl}
                  disabled={isParsing}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5 whitespace-nowrap"
                >
                  {isParsing ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Fetching...</span>
                    </>
                  ) : (
                    <span>Fetch & Parse</span>
                  )}
                </button>
              </div>
              <p className="text-[11px] text-slate-500">
                Tip: Paste any direct link to a CSV table, TSV export, or raw JSON endpoint.
              </p>
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Loading Indicator */}
          {isParsing && (
            <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100 text-center text-xs text-indigo-700 flex items-center justify-center gap-2.5">
              <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="font-semibold">{parsingStatus || 'Parsing document and extracting journal records...'}</span>
            </div>
          )}

          {/* Parsed Summary Preview */}
          {parseResult && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Successfully Parsed Data Preview
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">
                  {parseResult.summary.totalParsed} Journals Extracted
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="p-2 bg-white rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 block uppercase">Class A</span>
                  <span className="font-bold text-emerald-700">{parseResult.summary.classACount}</span>
                </div>
                <div className="p-2 bg-white rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 block uppercase">Class B</span>
                  <span className="font-bold text-blue-700">{parseResult.summary.classBCount}</span>
                </div>
                <div className="p-2 bg-white rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 block uppercase">Scopus Indexed</span>
                  <span className="font-bold text-purple-700">{parseResult.summary.scopusCount}</span>
                </div>
                <div className="p-2 bg-white rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 block uppercase">WoS Indexed</span>
                  <span className="font-bold text-indigo-700">{parseResult.summary.wosCount}</span>
                </div>
              </div>

              {/* Sample list of first 3 journals */}
              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-slate-500 uppercase">First extracted titles:</span>
                <div className="max-h-24 overflow-y-auto space-y-1 text-xs">
                  {parseResult.journals.slice(0, 3).map((j, i) => (
                    <div key={i} className="p-1.5 bg-white rounded border border-slate-200 flex items-center justify-between">
                      <span className="font-medium text-slate-800 truncate max-w-xs">{j.title}</span>
                      <span className="text-[10px] text-slate-500 font-semibold">{j.classification}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Import Action (Merge vs Replace) */}
              <div className="pt-2 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-700">Database Action:</span>
                <div className="flex items-center gap-3 text-xs">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="importAction"
                      checked={importAction === 'merge'}
                      onChange={() => setImportAction('merge')}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Merge with existing</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="importAction"
                      checked={importAction === 'replace'}
                      onChange={() => setImportAction('replace')}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-rose-700 font-medium">Replace database</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Instant 1-Click Benchmark Presets */}
          <div className="pt-3 border-t border-slate-200 space-y-2">
            <span className="text-xs font-semibold text-slate-600 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Or Load Standard Benchmark Datasets:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => { onLoadPresetSample('rsc_waivers'); onClose(); }}
                className="p-2.5 rounded-xl border border-teal-200 bg-teal-50/50 hover:bg-teal-100/60 text-left transition-colors cursor-pointer"
              >
                <div className="font-bold text-teal-900 text-xs flex items-center gap-1">
                  <span>RSC 100% Waiver List</span>
                </div>
                <div className="text-[10px] text-teal-700 mt-0.5">
                  OA journals with verified zero-cost waivers
                </div>
              </button>

              <button
                type="button"
                onClick={() => { onLoadPresetSample('classA_classB'); onClose(); }}
                className="p-2.5 rounded-xl border border-blue-200 bg-blue-50/50 hover:bg-blue-100/60 text-left transition-colors cursor-pointer"
              >
                <div className="font-bold text-blue-900 text-xs flex items-center gap-1">
                  <span>Class A / Class B</span>
                </div>
                <div className="text-[10px] text-blue-700 mt-0.5">
                  High-impact institutional classification
                </div>
              </button>

              <button
                type="button"
                onClick={() => { onLoadPresetSample('scopus_top10'); onClose(); }}
                className="p-2.5 rounded-xl border border-purple-200 bg-purple-50/50 hover:bg-purple-100/60 text-left transition-colors cursor-pointer"
              >
                <div className="font-bold text-purple-900 text-xs flex items-center gap-1">
                  <span>Scopus Top 10%</span>
                </div>
                <div className="text-[10px] text-purple-700 mt-0.5">
                  Top decile CiteScore & SJR journals
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            id="btn-confirm-database-import"
            disabled={!parseResult || isParsing}
            onClick={handleConfirmImport}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
          >
            <span>Import {parseResult ? `${parseResult.journals.length} Journals` : 'Database'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
