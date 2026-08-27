import React from 'react';
import { 
  X, 
  Award, 
  ExternalLink, 
  Clock, 
  DollarSign, 
  Sparkles, 
  Globe, 
  FileText, 
  CheckCircle2, 
  ShieldCheck, 
  Bookmark, 
  Send, 
  RefreshCw,
  Layers,
  Edit3,
  Save,
  ArrowRight
} from 'lucide-react';
import { Journal, JournalClassification, Quartile, OpenAccessType } from '../types';

interface JournalDetailModalProps {
  journal: Journal | null;
  onClose: () => void;
  onEnrich: (journal: Journal) => Promise<void>;
  isEnriching: boolean;
  onSaveNotes: (journalId: string, status: Journal['submissionStatus'], notes: string) => void;
  onToggleCompare: (journalId: string) => void;
  isCompared: boolean;
  onToggleWaiver: (journalId: string, isWaived: boolean) => void;
  onUpdateJournal?: (updated: Journal) => void;
}

export const JournalDetailModal: React.FC<JournalDetailModalProps> = ({
  journal,
  onClose,
  onEnrich,
  isEnriching,
  onSaveNotes,
  onToggleCompare,
  isCompared,
  onToggleWaiver,
  onUpdateJournal
}) => {
  if (!journal) return null;

  const [notes, setNotes] = React.useState(journal.userNotes || '');
  const [status, setStatus] = React.useState<Journal['submissionStatus']>(journal.submissionStatus || 'Considering');
  const [savedSuccess, setSavedSuccess] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);

  // Edit form states
  const [editTitle, setEditTitle] = React.useState(journal.title);
  const [editPublisher, setEditPublisher] = React.useState(journal.publisher);
  const [editIssn, setEditIssn] = React.useState(journal.issn || '');
  const [editClassification, setEditClassification] = React.useState<JournalClassification>(journal.classification);
  const [editQuartile, setEditQuartile] = React.useState<Quartile>(journal.quartile);
  const [editIf, setEditIf] = React.useState(journal.impactFactor !== null ? String(journal.impactFactor) : '');
  const [editCiteScore, setEditCiteScore] = React.useState(journal.citeScore !== null ? String(journal.citeScore) : '');
  const [editSjr, setEditSjr] = React.useState(journal.sjr !== null ? String(journal.sjr) : '');
  const [editApc, setEditApc] = React.useState(journal.apcUSD !== null ? String(journal.apcUSD) : '');
  const [editDecisionDays, setEditDecisionDays] = React.useState(journal.timeToFirstDecisionDays !== null ? String(journal.timeToFirstDecisionDays) : '');
  const [editHomePage, setEditHomePage] = React.useState(journal.homePageUrl || '');
  const [editPortal, setEditPortal] = React.useState(journal.submissionPortalUrl || '');
  const [editScope, setEditScope] = React.useState(journal.scopeSummary || '');

  React.useEffect(() => {
    if (journal) {
      setNotes(journal.userNotes || '');
      setStatus(journal.submissionStatus || 'Considering');
      setEditTitle(journal.title);
      setEditPublisher(journal.publisher);
      setEditIssn(journal.issn || '');
      setEditClassification(journal.classification);
      setEditQuartile(journal.quartile);
      setEditIf(journal.impactFactor !== null ? String(journal.impactFactor) : '');
      setEditCiteScore(journal.citeScore !== null ? String(journal.citeScore) : '');
      setEditSjr(journal.sjr !== null ? String(journal.sjr) : '');
      setEditApc(journal.apcUSD !== null ? String(journal.apcUSD) : '');
      setEditDecisionDays(journal.timeToFirstDecisionDays !== null ? String(journal.timeToFirstDecisionDays) : '');
      setEditHomePage(journal.homePageUrl || '');
      setEditPortal(journal.submissionPortalUrl || '');
      setEditScope(journal.scopeSummary || '');
      setIsEditing(false);
    }
  }, [journal]);

  const handleSave = () => {
    onSaveNotes(journal.id, status, notes);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleSaveEdits = () => {
    if (!onUpdateJournal) return;
    const updated: Journal = {
      ...journal,
      title: editTitle.trim() || journal.title,
      publisher: editPublisher.trim() || 'Academic Publisher',
      issn: editIssn.trim() || undefined,
      classification: editClassification,
      quartile: editQuartile,
      impactFactor: editIf !== '' ? parseFloat(editIf) : null,
      citeScore: editCiteScore !== '' ? parseFloat(editCiteScore) : null,
      sjr: editSjr !== '' ? parseFloat(editSjr) : null,
      apcUSD: editApc !== '' ? parseFloat(editApc) : null,
      timeToFirstDecisionDays: editDecisionDays !== '' ? parseInt(editDecisionDays) : null,
      homePageUrl: editHomePage.trim() || undefined,
      submissionPortalUrl: editPortal.trim() || undefined,
      scopeSummary: editScope.trim() || undefined,
      lastUpdated: new Date().toISOString().split('T')[0]
    };
    onUpdateJournal(updated);
    setIsEditing(false);
  };

  return (
    <div id="journal-detail-modal" className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-start justify-between bg-slate-900 text-white gap-4">
          <div className="space-y-1 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              {journal.classification === 'Class A' ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-white text-slate-900 uppercase tracking-wider">
                  <Award className="w-3 h-3 text-amber-500" />
                  Class A
                </span>
              ) : journal.classification === 'Class B' ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500 text-white uppercase tracking-wider">
                  Class B
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-700 text-slate-300">
                  Unclassified
                </span>
              )}

              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${
                journal.quartile === 'Q1'
                  ? 'bg-blue-600 text-white'
                  : journal.quartile === 'Q2'
                  ? 'bg-amber-400 text-slate-900'
                  : 'bg-slate-700 text-slate-200'
              }`}>
                {journal.quartile}
              </span>

              {journal.isTop10Percent && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-500/30 text-purple-200 border border-purple-400/40">
                  Scopus Top 10%
                </span>
              )}

              {journal.isWosIndexed && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                  WoS {journal.wosCollection || 'SCIE'}
                </span>
              )}
            </div>

            <h2 className="text-base sm:text-lg font-bold text-white leading-tight">
              {journal.title}
            </h2>
            <p className="text-[11px] text-slate-300">
              Publisher: <strong className="text-white font-semibold">{journal.publisher}</strong>
              {journal.issn && ` | ISSN: ${journal.issn}`}
              {journal.eIssn && ` | E-ISSN: ${journal.eIssn}`}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                isEditing ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
              }`}
              title="Edit journal info if online retrieval was wrong"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{isEditing ? 'Viewing Mode' : 'Edit Info'}</span>
            </button>
            <button
              id="btn-modal-close"
              onClick={onClose}
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="px-6 py-5 overflow-y-auto space-y-6 flex-1 text-xs sm:text-sm">
          {/* EDIT FORM MODE */}
          {isEditing ? (
            <div className="p-4 rounded-xl bg-indigo-50/50 border border-indigo-200 space-y-4">
              <div className="flex items-center justify-between border-b border-indigo-200 pb-2">
                <h3 className="font-bold text-indigo-950 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Edit3 className="w-4 h-4 text-indigo-600" />
                  Manual Journal Information Editor (Override AI / Online Data)
                </h3>
                <button
                  onClick={handleSaveEdits}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save All Changes</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">Journal Title</label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg bg-white border border-slate-300 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">Publisher</label>
                  <input
                    type="text"
                    value={editPublisher}
                    onChange={(e) => setEditPublisher(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg bg-white border border-slate-300 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">ISSN</label>
                  <input
                    type="text"
                    value={editIssn}
                    onChange={(e) => setEditIssn(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg bg-white border border-slate-300 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">Classification Tier</label>
                  <select
                    value={editClassification}
                    onChange={(e) => setEditClassification(e.target.value as JournalClassification)}
                    className="w-full text-xs p-2 rounded-lg bg-white border border-slate-300 focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="Class A">Class A</option>
                    <option value="Class B">Class B</option>
                    <option value="Unclassified">Unclassified</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">Quartile Rank</label>
                  <select
                    value={editQuartile}
                    onChange={(e) => setEditQuartile(e.target.value as Quartile)}
                    className="w-full text-xs p-2 rounded-lg bg-white border border-slate-300 focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="Q1">Q1</option>
                    <option value="Q2">Q2</option>
                    <option value="Q3">Q3</option>
                    <option value="Q4">Q4</option>
                    <option value="N/A">N/A</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">Impact Factor (IF)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editIf}
                    onChange={(e) => setEditIf(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg bg-white border border-slate-300 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">CiteScore</label>
                  <input
                    type="number"
                    step="0.1"
                    value={editCiteScore}
                    onChange={(e) => setEditCiteScore(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg bg-white border border-slate-300 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">SCImago SJR</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editSjr}
                    onChange={(e) => setEditSjr(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg bg-white border border-slate-300 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">APC Fee ($ USD)</label>
                  <input
                    type="number"
                    value={editApc}
                    onChange={(e) => setEditApc(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg bg-white border border-slate-300 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">Time to 1st Decision (Days)</label>
                  <input
                    type="number"
                    value={editDecisionDays}
                    onChange={(e) => setEditDecisionDays(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg bg-white border border-slate-300 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">Homepage URL</label>
                  <input
                    type="url"
                    value={editHomePage}
                    onChange={(e) => setEditHomePage(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg bg-white border border-slate-300 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">Submission Portal URL</label>
                  <input
                    type="url"
                    value={editPortal}
                    onChange={(e) => setEditPortal(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg bg-white border border-slate-300 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">Aims & Scope Summary</label>
                  <textarea
                    rows={3}
                    value={editScope}
                    onChange={(e) => setEditScope(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg bg-white border border-slate-300 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 rounded-lg text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdits}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save All Changes</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Action Ribbon: AI Live Search & Links */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-indigo-50/70 border border-indigo-100">
                <div className="flex items-center gap-2">
                  <button
                    id="btn-modal-enrich"
                    onClick={() => onEnrich(journal)}
                    disabled={isEnriching}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-70"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isEnriching ? 'animate-spin' : ''}`} />
                    <span>{isEnriching ? 'Searching Google...' : 'Live Search Web Data'}</span>
                  </button>
                  <span className="text-[11px] text-indigo-700">
                    Grounding with latest 2025/2026 APC fees & policies
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onToggleCompare(journal.id)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                      isCompared ? 'bg-indigo-100 text-indigo-800 border-indigo-300' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>{isCompared ? 'Added to Compare' : 'Add to Compare'}</span>
                  </button>

                  {journal.homePageUrl && (
                    <a
                      id="link-journal-homepage"
                      href={journal.homePageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 rounded-lg text-xs font-medium shadow-2xs transition-colors"
                    >
                      <Globe className="w-3.5 h-3.5 text-slate-500" />
                      <span>Homepage</span>
                      <ExternalLink className="w-3 h-3 text-slate-400" />
                    </a>
                  )}

                  {journal.submissionPortalUrl && (
                    <a
                      id="link-journal-submission-portal"
                      href={journal.submissionPortalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium shadow-2xs transition-colors"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Submit Paper</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>

              {/* Section 1: Metrics Grid */}
              <div className="space-y-2">
                <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  Journal Impact & Ranking Metrics
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[11px] text-slate-500 block">Impact Factor (IF)</span>
                    <span className="text-base sm:text-lg font-bold text-slate-900">
                      {journal.impactFactor !== null ? journal.impactFactor.toFixed(2) : 'N/A'}
                    </span>
                    {journal.fiveYearIF && (
                      <span className="text-[10px] text-slate-400 block mt-0.5">5-Yr: {journal.fiveYearIF.toFixed(2)}</span>
                    )}
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[11px] text-slate-500 block">Scopus CiteScore</span>
                    <span className="text-base sm:text-lg font-bold text-slate-900">
                      {journal.citeScore !== null ? journal.citeScore.toFixed(1) : 'N/A'}
                    </span>
                    <span className="text-[10px] text-purple-600 block mt-0.5">
                      {journal.isTop10Percent ? 'Top 10% Decile' : 'Scopus Indexed'}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[11px] text-slate-500 block">SCImago SJR</span>
                    <span className="text-base sm:text-lg font-bold text-slate-900">
                      {journal.sjr !== null ? journal.sjr.toFixed(2) : 'N/A'}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      Quartile: {journal.quartile}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[11px] text-slate-500 block">H-Index & Citations</span>
                    <span className="text-base sm:text-lg font-bold text-slate-900">
                      {journal.hIndex ? `h-${journal.hIndex}` : 'Indexed'}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      {journal.citationsCount ? `${journal.citationsCount.toLocaleString()} cites` : 'Active Journal'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Section 2: Speed & Review Turnaround */}
              <div className="space-y-2">
                <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-600" />
                  Review Speed & Editorial Timeline
                </h3>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <span className="text-[11px] text-slate-500 block">Time to 1st Decision:</span>
                      <span className="font-bold text-slate-900 text-sm sm:text-base text-emerald-700">
                        {journal.timeToFirstDecisionDays ? `~${journal.timeToFirstDecisionDays} days` : 'Standard Academic Peer Review'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 block">Full Review Cycle:</span>
                      <span className="font-semibold text-slate-800 text-sm">
                        {journal.reviewTimeWeeks ? `~${journal.reviewTimeWeeks} weeks` : '4-8 weeks average'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 block">Acceptance Rate:</span>
                      <span className="font-semibold text-slate-800 text-sm">
                        {journal.acceptanceRate ? `${journal.acceptanceRate}%` : 'Selective'}
                      </span>
                    </div>
                  </div>
                  {journal.publicationSpeedNotes && (
                    <p className="text-xs text-slate-600 pt-1 border-t border-slate-200">
                      {journal.publicationSpeedNotes}
                    </p>
                  )}
                </div>
              </div>

              {/* Section 3: Open Access, APC & 100% Waiver Details */}
              <div className="space-y-2">
                <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-teal-600" />
                  Article Processing Charges (APC) & 100% Waivers
                </h3>
                <div className="p-4 rounded-xl bg-teal-50/70 border border-teal-200 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="text-[11px] text-teal-800 block font-medium">Publishing Model</span>
                      <span className="text-sm font-bold text-teal-950">{journal.openAccessType}</span>
                    </div>
                    <div>
                      <span className="text-[11px] text-teal-800 block font-medium">Standard APC Fee</span>
                      <span className="text-sm font-bold text-teal-950">
                        {journal.apcUSD === 0 || journal.openAccessType === 'Diamond (No Fee)'
                          ? '$0 USD (Diamond Free Open Access)'
                          : journal.apcUSD !== null
                          ? `$${journal.apcUSD.toLocaleString()} USD`
                          : 'Subscription / Check Publisher'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-teal-800 block font-medium">100% Waiver Status</span>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        journal.waiverEligible 
                          ? 'bg-teal-200 text-teal-900 border border-teal-300' 
                          : 'bg-slate-200 text-slate-700'
                      }`}>
                        <ShieldCheck className={`w-3.5 h-3.5 ${journal.waiverEligible ? 'text-teal-800' : 'text-slate-500'}`} />
                        {journal.waiverEligible ? '100% Waived (Active)' : 'Standard Fee (Not Waived)'}
                      </span>
                    </div>
                  </div>

                  {/* Interactive User Waiver Checkbox */}
                  {journal.openAccessType !== 'Diamond (No Fee)' && journal.apcUSD !== 0 && (
                    <div className="p-3 bg-white rounded-lg border border-teal-200 shadow-sm flex items-start gap-3">
                      <input
                        id={`modal-waiver-checkbox-${journal.id}`}
                        type="checkbox"
                        checked={Boolean(journal.waiverEligible)}
                        onChange={(e) => onToggleWaiver(journal.id, e.target.checked)}
                        className="mt-0.5 rounded border-teal-400 text-teal-600 focus:ring-teal-500 w-4 h-4 cursor-pointer"
                      />
                      <div className="flex-1">
                        <label 
                          htmlFor={`modal-waiver-checkbox-${journal.id}`}
                          className="text-xs font-bold text-teal-950 cursor-pointer flex items-center gap-1.5 select-none"
                        >
                          <ShieldCheck className="w-4 h-4 text-teal-700" />
                          {journal.waiverEligible 
                            ? '100% APC Waiver Active for You (Checked)' 
                            : 'Mark as 100% APC Waived for Me / Eligible'}
                        </label>
                        <p className="text-[11px] text-teal-700 mt-0.5 leading-relaxed">
                          {journal.waiverEligible
                            ? 'Saved! This journal is marked as 100% waived for you and included in waiver-filtered searches.'
                            : 'Check this box if you have a 100% APC waiver (e.g. Research4Life, institutional agreement, or author grant).'}
                        </p>
                      </div>
                    </div>
                  )}

                  {journal.waiverDetails && (
                    <div className="p-2.5 rounded-lg bg-white/80 border border-teal-200 text-xs text-teal-900 leading-relaxed">
                      <strong>Waiver Policy:</strong> {journal.waiverDetails}
                    </div>
                  )}
                </div>
              </div>

              {/* Section 4: Scope & Research Disciplines */}
              <div className="space-y-2">
                <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-indigo-600" />
                  Aims & Scope Summary
                </h3>
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  {journal.scopeSummary || 'Covers comprehensive research articles, reviews, and communications within the affiliated disciplines.'}
                </p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {journal.subjectCategories.map((cat, idx) => (
                    <span key={idx} className="px-2.5 py-1 rounded-lg text-xs bg-slate-100 text-slate-700 border border-slate-200">
                      {cat}
                    </span>
                  ))}
                </div>
              </div>

              {/* Section 5: Web Grounding Sources */}
              {journal.enrichmentSources && journal.enrichmentSources.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-slate-200">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                    Verified Web Grounding Sources:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {journal.enrichmentSources.map((source, idx) => (
                      <a
                        key={idx}
                        href={source.uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] bg-slate-100 hover:bg-indigo-50 text-indigo-700 hover:text-indigo-900 transition-colors border border-slate-200"
                      >
                        <Globe className="w-3 h-3 text-slate-400" />
                        <span className="truncate max-w-xs">{source.title || source.uri}</span>
                        <ExternalLink className="w-2.5 h-2.5 text-slate-400" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Section 6: User Submission Notes & Pipeline Tracker */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <Bookmark className="w-3.5 h-3.5 text-amber-500" />
                    Submission Planning & Private Notes
                  </h4>
                  {savedSuccess && (
                    <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1 animate-pulse">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Saved!
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-600 font-medium block mb-1">
                      Submission Status
                    </label>
                    <select
                      id="select-journal-status"
                      value={status}
                      onChange={(e) => setStatus(e.target.value as Journal['submissionStatus'])}
                      className="w-full text-xs p-2 rounded-lg bg-white border border-slate-300 focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="Considering">Considering</option>
                      <option value="Shortlisted">Target Shortlist</option>
                      <option value="Submitted">Manuscript Submitted</option>
                      <option value="Under Review">Under Review</option>
                      <option value="Accepted">Accepted / Published</option>
                      <option value="Rejected">Rejected / Revise</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-[11px] text-slate-600 font-medium block mb-1">
                      Notes (e.g. Cover letter angle, waiver claim, reviewer suggestions)
                    </label>
                    <input
                      id="input-journal-notes"
                      type="text"
                      placeholder="e.g. Eligible for RSC 100% waiver, suggest Prof. Davis as reviewer..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full text-xs p-2 rounded-lg bg-white border border-slate-300 focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    id="btn-save-journal-notes"
                    onClick={handleSave}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Save Status & Notes
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
          <span className="text-slate-500">
            Last checked: {journal.lastUpdated || 'Recently updated'}
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
