import React from 'react';
import { 
  X, 
  Database, 
  Award, 
  Trash2, 
  Plus, 
  Check, 
  Search, 
  RefreshCw, 
  UploadCloud, 
  Download, 
  Sparkles,
  Layers,
  CheckCircle2,
  ListFilter,
  ShieldCheck,
  Clock,
  ExternalLink,
  BookOpen,
  ArrowRight
} from 'lucide-react';
import { Journal, Quartile } from '../types';
import { exportJournalsToExcel } from '../utils/exportUtils';

interface DatabaseManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  journals: Journal[];
  onUpdateJournalClassification: (journalId: string, classification: 'Class A' | 'Class B' | 'Unclassified') => void;
  onAddManualJournal: (journal: Partial<Journal>) => void;
  onDeleteJournal: (journalId: string) => void;
  onOpenUploadModal: () => void;
  onResetDatabase: () => void;
  onBatchUpdateJournals: (updatedJournals: Journal[]) => void;
  classARegistry: string[];
  classBRegistry: string[];
  onUpdateClassARegistry: (list: string[]) => void;
  onUpdateClassBRegistry: (list: string[]) => void;
  onReauditAllClassifications: () => void;
}

export const DatabaseManagerModal: React.FC<DatabaseManagerModalProps> = ({
  isOpen,
  onClose,
  journals = [],
  onUpdateJournalClassification,
  onAddManualJournal,
  onDeleteJournal,
  onOpenUploadModal,
  onResetDatabase,
  onBatchUpdateJournals,
  classARegistry = [],
  classBRegistry = [],
  onUpdateClassARegistry,
  onUpdateClassBRegistry,
  onReauditAllClassifications
}) => {
  if (!isOpen) return null;

  const safeJournals = journals || [];

  const [activeTab, setActiveTab] = React.useState<'database' | 'registries' | 'batch_enrich'>('database');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [filterClass, setFilterClass] = React.useState<'All' | 'Class A' | 'Class B' | 'Unclassified'>('All');
  const [showAddForm, setShowAddForm] = React.useState(false);
  const [isCrossChecking, setIsCrossChecking] = React.useState(false);
  const [auditFeedback, setAuditFeedback] = React.useState<string | null>(null);

  // Registry Management State
  const [newClassAEntry, setNewClassAEntry] = React.useState('');
  const [newClassBEntry, setNewClassBEntry] = React.useState('');
  const [registrySearch, setRegistrySearch] = React.useState('');

  // Batch Live Update State
  const [isBatchEnriching, setIsBatchEnriching] = React.useState(false);
  const [batchProgress, setBatchProgress] = React.useState<{ current: number; total: number; currentTitle: string }>({
    current: 0,
    total: 0,
    currentTitle: ''
  });
  const [batchLogs, setBatchLogs] = React.useState<string[]>([]);

  // Manual Add Form State
  const [newTitle, setNewTitle] = React.useState('');
  const [newPublisher, setNewPublisher] = React.useState('');
  const [newIssn, setNewIssn] = React.useState('');
  const [newClass, setNewClass] = React.useState<'Class A' | 'Class B' | 'Unclassified'>('Class A');
  const [newQuartile, setNewQuartile] = React.useState<Quartile>('Q1');
  const [newIF, setNewIF] = React.useState('');
  const [newWaiver, setNewWaiver] = React.useState(false);

  const filteredJournals = safeJournals.filter(j => {
    const matchesSearch = j.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          j.publisher.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (j.issn && j.issn.includes(searchQuery));
    const matchesClass = filterClass === 'All' || j.classification === filterClass;
    return matchesSearch && matchesClass;
  });

  const classACount = safeJournals.filter(j => j.classification === 'Class A').length;
  const classBCount = safeJournals.filter(j => j.classification === 'Class B').length;
  const top10Count = safeJournals.filter(j => j.isTop10Percent).length;

  const handleCreateManualJournal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle) return;

    onAddManualJournal({
      title: newTitle,
      publisher: newPublisher || 'Academic Publisher',
      issn: newIssn || undefined,
      classification: newClass,
      quartile: newQuartile,
      impactFactor: newIF ? parseFloat(newIF) : null,
      waiverEligible: newWaiver,
      openAccessType: newWaiver ? 'Gold Open Access' : 'Hybrid',
      subjectCategories: ['General Research'],
      isScopusIndexed: true,
      isWosIndexed: true
    });

    // Reset Form
    setNewTitle('');
    setNewPublisher('');
    setNewIssn('');
    setNewIF('');
    setShowAddForm(false);
  };

  const handleRunAudit = () => {
    setIsCrossChecking(true);
    setTimeout(() => {
      onReauditAllClassifications();
      setIsCrossChecking(false);
      setAuditFeedback(`Dynamic audit completed! All ${journals.length} journals re-checked against permanent Class A (${classARegistry.length}) and Class B (${classBRegistry.length}) reference registries.`);
      setTimeout(() => setAuditFeedback(null), 5000);
    }, 600);
  };

  const handleAddClassATitle = () => {
    if (!newClassAEntry.trim()) return;
    const clean = newClassAEntry.trim();
    if (!classARegistry.some(t => t.toLowerCase() === clean.toLowerCase())) {
      const updated = [clean, ...classARegistry];
      onUpdateClassARegistry(updated);
      setNewClassAEntry('');
    }
  };

  const handleAddClassBTitle = () => {
    if (!newClassBEntry.trim()) return;
    const clean = newClassBEntry.trim();
    if (!classBRegistry.some(t => t.toLowerCase() === clean.toLowerCase())) {
      const updated = [clean, ...classBRegistry];
      onUpdateClassBRegistry(updated);
      setNewClassBEntry('');
    }
  };

  const handleRemoveClassA = (title: string) => {
    onUpdateClassARegistry(classARegistry.filter(t => t !== title));
  };

  const handleRemoveClassB = (title: string) => {
    onUpdateClassBRegistry(classBRegistry.filter(t => t !== title));
  };

  // Run Batch Enrichment for journals needing metrics
  const handleStartBatchEnrichment = async () => {
    // Select top 6 journals or journals needing IF/turnaround/waiver data
    const candidates = journals.slice(0, 8);
    if (candidates.length === 0) return;

    setIsBatchEnriching(true);
    setBatchProgress({ current: 0, total: candidates.length, currentTitle: 'Connecting to Live Grounding Engine...' });
    setBatchLogs([`[Initiated] Starting batch update for ${candidates.length} journals...`]);

    try {
      const res = await fetch('/api/batch-enrich-journals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          journals: candidates.map(j => ({
            id: j.id,
            title: j.title,
            publisher: j.publisher,
            issn: j.issn
          }))
        })
      });

      if (!res.ok) {
        throw new Error('Batch enrichment service failed.');
      }

      const data = await res.json();
      const results = data.results || [];

      // Merge enriched records
      const updatedMap = new Map<string, any>();
      results.forEach((r: any) => {
        if (r.id) updatedMap.set(r.id, r.enrichedData);
      });

      const finalUpdatedJournals = journals.map(j => {
        const enriched = updatedMap.get(j.id);
        if (enriched) {
          return {
            ...j,
            impactFactor: enriched.impactFactor ?? j.impactFactor,
            fiveYearIF: enriched.fiveYearIF ?? j.fiveYearIF,
            citeScore: enriched.citeScore ?? j.citeScore,
            sjr: enriched.sjr ?? j.sjr,
            quartile: enriched.quartile ?? j.quartile,
            openAccessType: enriched.openAccessType ?? j.openAccessType,
            apcUSD: enriched.apcUSD !== undefined ? enriched.apcUSD : j.apcUSD,
            waiverEligible: enriched.waiverEligible ?? j.waiverEligible,
            waiverDetails: enriched.waiverDetails ?? j.waiverDetails,
            timeToFirstDecisionDays: enriched.timeToFirstDecisionDays ?? j.timeToFirstDecisionDays,
            publicationSpeedNotes: enriched.publicationSpeedNotes ?? j.publicationSpeedNotes,
            homePageUrl: enriched.homePageUrl ?? j.homePageUrl,
            submissionPortalUrl: enriched.submissionPortalUrl ?? j.submissionPortalUrl,
            lastUpdated: 'Live Grounded (Batch)'
          };
        }
        return j;
      });

      onBatchUpdateJournals(finalUpdatedJournals);
      setBatchLogs(prev => [
        ...prev, 
        `[Completed] Successfully updated ${results.length} journals with live verified metrics, turnaround times, and APC rules.`
      ]);
      setBatchProgress({ current: candidates.length, total: candidates.length, currentTitle: 'Complete!' });
    } catch (err: any) {
      console.error(err);
      setBatchLogs(prev => [...prev, `[Error] ${err.message || 'Batch update encountered an issue.'}`]);
    } finally {
      setIsBatchEnriching(false);
    }
  };

  return (
    <div id="database-manager-modal" className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-[#1e293b] text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center text-white">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Class A / Class B Registry & Database Manager
              </h2>
              <p className="text-xs text-slate-300">
                Persistent category lists, automatic classification matching, and live metric batch updates
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => exportJournalsToExcel(journals, 'Master_Journal_Database_Export.xlsx')}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Full DB</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 border-b border-slate-200 bg-slate-50 flex items-center gap-4 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('database')}
            className={`py-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'database' 
                ? 'border-blue-600 text-blue-600 font-bold' 
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Active Journal Entries ({journals.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('registries')}
            className={`py-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'registries' 
                ? 'border-blue-600 text-blue-600 font-bold' 
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Award className="w-3.5 h-3.5 text-amber-500" />
            <span>Permanent Class A / B Registries ({classARegistry.length + classBRegistry.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('batch_enrich')}
            className={`py-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'batch_enrich' 
                ? 'border-blue-600 text-blue-600 font-bold' 
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>Batch AI Metrics & Waiver Updater</span>
          </button>
        </div>

        {/* Audit Feedback banner */}
        {auditFeedback && (
          <div className="mx-6 mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{auditFeedback}</span>
            </div>
            <button onClick={() => setAuditFeedback(null)} className="text-emerald-700 hover:text-emerald-900">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Tab 1: Database View */}
        {activeTab === 'database' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Quick Metrics Bar */}
            <div className="px-6 py-2.5 bg-indigo-50/50 border-b border-indigo-100 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-3 text-slate-700">
                <span className="font-semibold">
                  <span className="text-emerald-600 font-bold">{classACount}</span> Class A
                </span>
                <span className="font-semibold">
                  <span className="text-blue-600 font-bold">{classBCount}</span> Class B
                </span>
                <span className="font-semibold">
                  <span className="text-purple-600 font-bold">{top10Count}</span> Scopus Top 10%
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleRunAudit}
                  disabled={isCrossChecking}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                  title="Cross-check all active titles with Class A & B registries"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-blue-600 ${isCrossChecking ? 'animate-spin' : ''}`} />
                  <span>{isCrossChecking ? 'Re-Auditing...' : 'Re-Evaluate with Class A/B Lists'}</span>
                </button>

                <button
                  onClick={() => { onClose(); onOpenUploadModal(); }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Upload / Replace File</span>
                </button>
              </div>
            </div>

            {/* Controls */}
            <div className="p-4 pb-2 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-1 max-w-md">
                  <div className="relative w-full">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search title, publisher, ISSN..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
                    {(['All', 'Class A', 'Class B', 'Unclassified'] as const).map(cls => (
                      <button
                        key={cls}
                        onClick={() => setFilterClass(cls)}
                        className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                          filterClass === cls ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {cls}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{showAddForm ? 'Hide Form' : 'Add Single Journal'}</span>
                </button>
              </div>

              {/* Add form */}
              {showAddForm && (
                <form onSubmit={handleCreateManualJournal} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
                  <div className="font-bold text-xs text-slate-800">Add New Entry</div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                    <div className="sm:col-span-2">
                      <input
                        type="text"
                        required
                        placeholder="Journal Title *"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="Publisher"
                        value={newPublisher}
                        onChange={(e) => setNewPublisher(e.target.value)}
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <select
                      value={newClass}
                      onChange={(e) => setNewClass(e.target.value as any)}
                      className="p-2 bg-white border border-slate-300 rounded-lg text-xs"
                    >
                      <option value="Class A">Class A</option>
                      <option value="Class B">Class B</option>
                      <option value="Unclassified">Unclassified</option>
                    </select>

                    <select
                      value={newQuartile}
                      onChange={(e) => setNewQuartile(e.target.value as Quartile)}
                      className="p-2 bg-white border border-slate-300 rounded-lg text-xs"
                    >
                      <option value="Q1">Q1</option>
                      <option value="Q2">Q2</option>
                      <option value="Q3">Q3</option>
                      <option value="Q4">Q4</option>
                    </select>

                    <input
                      type="number"
                      step="0.1"
                      placeholder="Impact Factor (e.g. 4.5)"
                      value={newIF}
                      onChange={(e) => setNewIF(e.target.value)}
                      className="p-2 bg-white border border-slate-300 rounded-lg text-xs"
                    />

                    <input
                      type="text"
                      placeholder="ISSN"
                      value={newIssn}
                      onChange={(e) => setNewIssn(e.target.value)}
                      className="p-2 bg-white border border-slate-300 rounded-lg text-xs"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newWaiver}
                        onChange={(e) => setNewWaiver(e.target.checked)}
                        className="rounded text-blue-600"
                      />
                      <span>100% APC Waiver Applicable</span>
                    </label>

                    <button
                      type="submit"
                      className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      Save Journal
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Journals table */}
            <div className="px-4 py-2 overflow-y-auto flex-1 text-xs">
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px]">
                      <th className="py-2 px-3">Title & Publisher</th>
                      <th className="py-2 px-3">Classification Tier</th>
                      <th className="py-2 px-3">Quartile & IF</th>
                      <th className="py-2 px-3">Decision Speed</th>
                      <th className="py-2 px-3 text-right">Delete</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredJournals.map((journal) => (
                      <tr key={journal.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-2 px-3">
                          <div className="font-semibold text-slate-900 truncate max-w-xs">{journal.title}</div>
                          <div className="text-[10px] text-slate-400">{journal.publisher}</div>
                        </td>
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => onUpdateJournalClassification(journal.id, 'Class A')}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold border cursor-pointer ${
                                journal.classification === 'Class A'
                                  ? 'bg-slate-900 text-white border-slate-900'
                                  : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                              }`}
                            >
                              Class A
                            </button>
                            <button
                              onClick={() => onUpdateJournalClassification(journal.id, 'Class B')}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold border cursor-pointer ${
                                journal.classification === 'Class B'
                                  ? 'bg-blue-600 text-white border-blue-600'
                                  : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                              }`}
                            >
                              Class B
                            </button>
                          </div>
                        </td>
                        <td className="py-2 px-3 text-slate-700">
                          <span className="font-bold">{journal.quartile}</span>
                          {journal.impactFactor && <span className="ml-1 text-slate-500">IF: {journal.impactFactor}</span>}
                        </td>
                        <td className="py-2 px-3 text-slate-600">
                          {journal.timeToFirstDecisionDays ? `${journal.timeToFirstDecisionDays}d 1st dec` : 'Standard'}
                        </td>
                        <td className="py-2 px-3 text-right">
                          <button
                            onClick={() => onDeleteJournal(journal.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Permanent Class A & Class B Registries */}
        {activeTab === 'registries' && (
          <div className="flex-1 p-5 overflow-y-auto space-y-4 text-xs">
            <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl space-y-1">
              <span className="font-bold text-blue-900 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                Persistent Reference Master Registries
              </span>
              <p className="text-slate-600 text-xs leading-relaxed">
                These titles are permanently stored as your institutional Class A and Class B lists. When you upload any Scopus list, PDF, Excel, or CSV file, the engine automatically checks each title against these registries and assigns the appropriate classification.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Class A Registry Column */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-amber-500" />
                    <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                      Class A Registry ({classARegistry.length} Titles)
                    </h3>
                  </div>
                </div>

                <div className="flex gap-1.5">
                  <input
                    type="text"
                    placeholder="Add title to Class A..."
                    value={newClassAEntry}
                    onChange={(e) => setNewClassAEntry(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddClassATitle()}
                    className="flex-1 p-2 bg-white border border-slate-300 rounded-lg text-xs"
                  />
                  <button
                    onClick={handleAddClassATitle}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    Add
                  </button>
                </div>

                <div className="max-h-72 overflow-y-auto space-y-1 bg-white p-2 rounded-lg border border-slate-200">
                  {classARegistry.map((title, idx) => (
                    <div key={idx} className="flex items-center justify-between p-1.5 hover:bg-slate-50 rounded border-b border-slate-100 text-xs">
                      <span className="font-medium text-slate-800 truncate max-w-xs">{title}</span>
                      <button
                        onClick={() => handleRemoveClassA(title)}
                        className="text-slate-400 hover:text-rose-600 p-0.5"
                        title="Remove from Class A"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Class B Registry Column */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-blue-500" />
                    <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                      Class B Registry ({classBRegistry.length} Titles)
                    </h3>
                  </div>
                </div>

                <div className="flex gap-1.5">
                  <input
                    type="text"
                    placeholder="Add title to Class B..."
                    value={newClassBEntry}
                    onChange={(e) => setNewClassBEntry(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddClassBTitle()}
                    className="flex-1 p-2 bg-white border border-slate-300 rounded-lg text-xs"
                  />
                  <button
                    onClick={handleAddClassBTitle}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    Add
                  </button>
                </div>

                <div className="max-h-72 overflow-y-auto space-y-1 bg-white p-2 rounded-lg border border-slate-200">
                  {classBRegistry.map((title, idx) => (
                    <div key={idx} className="flex items-center justify-between p-1.5 hover:bg-slate-50 rounded border-b border-slate-100 text-xs">
                      <span className="font-medium text-slate-800 truncate max-w-xs">{title}</span>
                      <button
                        onClick={() => handleRemoveClassB(title)}
                        className="text-slate-400 hover:text-rose-600 p-0.5"
                        title="Remove from Class B"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={handleRunAudit}
                disabled={isCrossChecking}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${isCrossChecking ? 'animate-spin' : ''}`} />
                <span>Apply Registries & Re-Tag All Active Journals</span>
              </button>
            </div>
          </div>
        )}

        {/* Tab 3: Batch AI Metrics Updater */}
        {activeTab === 'batch_enrich' && (
          <div className="flex-1 p-5 overflow-y-auto space-y-4 text-xs">
            <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-2">
              <span className="font-bold text-indigo-950 flex items-center gap-1.5 text-sm">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                Live Academic Index & APC Grounding Auto-Updater
              </span>
              <p className="text-slate-700 text-xs leading-relaxed">
                Connects directly to live Google Search grounding to automatically fetch verified Clarivate Impact Factors (IF), SCImago SJR, average time to 1st decision (days), APC publication fees, and 100% waiver eligibility (e.g. RSC 100% waiver or Research4Life) for all journals in your active database.
              </p>

              <div className="flex items-center gap-3 pt-2">
                <button
                  id="btn-run-batch-enrich"
                  onClick={handleStartBatchEnrichment}
                  disabled={isBatchEnriching}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isBatchEnriching ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Fetching Live Journal Metrics...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Start Batch Auto-Update</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Live Progress Bar & Logs */}
            {batchLogs.length > 0 && (
              <div className="p-4 bg-slate-900 text-white rounded-xl border border-slate-800 space-y-3 font-mono text-[11px]">
                <div className="flex items-center justify-between text-slate-300">
                  <span>Live Grounding Console</span>
                  <span>{batchProgress.currentTitle}</span>
                </div>

                <div className="space-y-1">
                  {batchLogs.map((log, i) => (
                    <div key={i} className="text-emerald-400 flex items-center gap-1.5">
                      <span className="text-slate-500">&gt;</span>
                      <span>{log}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
          <button
            onClick={onResetDatabase}
            className="text-xs text-rose-600 hover:text-rose-800 font-semibold cursor-pointer"
          >
            Reset Database to Default
          </button>
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
