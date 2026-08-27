import React from 'react';
import { 
  X, 
  Bookmark, 
  Trash2, 
  Download, 
  ExternalLink, 
  Send, 
  Award, 
  Clock, 
  DollarSign, 
  CheckCircle2,
  FileEdit
} from 'lucide-react';
import { Journal } from '../types';
import { exportJournalsToExcel } from '../utils/exportUtils';

interface TargetShortlistModalProps {
  isOpen: boolean;
  onClose: () => void;
  shortlistedJournals: Journal[];
  onRemoveFromShortlist: (journalId: string) => void;
  onUpdateJournalStatus: (journalId: string, status: Journal['submissionStatus'], notes: string) => void;
  onViewDetails: (journal: Journal) => void;
}

export const TargetShortlistModal: React.FC<TargetShortlistModalProps> = ({
  isOpen,
  onClose,
  shortlistedJournals = [],
  onRemoveFromShortlist,
  onUpdateJournalStatus,
  onViewDetails
}) => {
  if (!isOpen) return null;

  const safeJournals = shortlistedJournals || [];
  const classACount = safeJournals.filter(j => j.classification === 'Class A').length;
  const classBCount = safeJournals.filter(j => j.classification === 'Class B').length;
  const waiverCount = safeJournals.filter(j => j.waiverEligible || j.openAccessType === 'Diamond (No Fee)').length;

  return (
    <div id="target-shortlist-modal" className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-white">
              <Bookmark className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Manuscript Target Submission Shortlist ({shortlistedJournals.length})
              </h2>
              <p className="text-xs text-slate-500">
                Track candidate journals, deadlines, notes, and submission statuses
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {shortlistedJournals.length > 0 && (
              <button
                onClick={() => exportJournalsToExcel(shortlistedJournals, 'Target_Journals_Submission_Plan.xlsx')}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Plan</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Shortlist Stats Summary */}
        <div className="px-6 py-2.5 bg-amber-50/60 border-b border-amber-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4 text-amber-900 font-medium">
            <span>Class A Targets: <strong className="font-bold">{classACount}</strong></span>
            <span>Class B Targets: <strong className="font-bold">{classBCount}</strong></span>
            <span>100% Waiver Eligible: <strong className="font-bold">{waiverCount}</strong></span>
          </div>
          <span className="text-[11px] text-amber-700">Ready for manuscript submission workflow</span>
        </div>

        {/* Shortlisted Items List */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
          {shortlistedJournals.length === 0 ? (
            <div className="text-center py-16 space-y-2">
              <Bookmark className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="font-bold text-slate-700 text-sm">Your target shortlist is empty</h3>
              <p className="text-slate-500 max-w-sm mx-auto">
                Bookmark potential journals from the main table or AI Matcher to track submission progress here.
              </p>
            </div>
          ) : (
            shortlistedJournals.map((journal) => (
              <div
                key={journal.id}
                id={`shortlist-item-${journal.id}`}
                className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3 hover:border-slate-300 transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {journal.classification === 'Class A' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                          <Award className="w-3 h-3 text-emerald-700" />
                          Class A
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                          Class B
                        </span>
                      )}
                      <span className="px-1.5 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-900">
                        {journal.quartile}
                      </span>
                      {journal.impactFactor && (
                        <span className="font-semibold text-slate-700">IF: {journal.impactFactor}</span>
                      )}
                      {journal.timeToFirstDecisionDays && (
                        <span className="text-slate-500">~{journal.timeToFirstDecisionDays} days decision</span>
                      )}
                    </div>

                    <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                      {journal.title}
                    </h3>
                    <p className="text-slate-500 text-xs">
                      {journal.publisher} {journal.issn && `• ISSN: ${journal.issn}`}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 self-end sm:self-auto">
                    <button
                      onClick={() => onViewDetails(journal)}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-medium transition-colors cursor-pointer"
                    >
                      Dossier
                    </button>
                    {journal.submissionPortalUrl && (
                      <a
                        href={journal.submissionPortalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-medium transition-colors"
                      >
                        <Send className="w-3 h-3" />
                        <span>Submit</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                    <button
                      onClick={() => onRemoveFromShortlist(journal.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Remove from target list"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Status & Notes Editing in place */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-100">
                  <div>
                    <span className="text-[11px] text-slate-500 block mb-0.5">Pipeline Status:</span>
                    <select
                      value={journal.submissionStatus || 'Considering'}
                      onChange={(e) => onUpdateJournalStatus(
                        journal.id, 
                        e.target.value as Journal['submissionStatus'], 
                        journal.userNotes || ''
                      )}
                      className="w-full p-1.5 rounded-lg border border-slate-300 bg-slate-50 text-xs font-semibold text-slate-800"
                    >
                      <option value="Considering">Considering</option>
                      <option value="Shortlisted">Shortlisted (Target #1)</option>
                      <option value="Submitted">Submitted (Waiting)</option>
                      <option value="Under Review">Under Review</option>
                      <option value="Accepted">Accepted</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <span className="text-[11px] text-slate-500 block mb-0.5">Author Notes:</span>
                    <input
                      type="text"
                      placeholder="Add personal notes (e.g. waiver requirements, cover letter notes)..."
                      value={journal.userNotes || ''}
                      onChange={(e) => onUpdateJournalStatus(
                        journal.id,
                        journal.submissionStatus || 'Considering',
                        e.target.value
                      )}
                      className="w-full p-1.5 rounded-lg border border-slate-300 bg-slate-50 text-xs text-slate-800 focus:bg-white"
                    />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
          <span className="text-slate-500">Shortlisted journals are saved in your current session workspace</span>
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
