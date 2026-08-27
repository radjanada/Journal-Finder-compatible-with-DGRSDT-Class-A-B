import React from 'react';
import { 
  X, 
  Layers, 
  Award, 
  Clock, 
  DollarSign, 
  ShieldCheck, 
  ExternalLink, 
  Bookmark, 
  Trash2,
  Globe
} from 'lucide-react';
import { Journal } from '../types';

interface CompareJournalsModalProps {
  isOpen: boolean;
  onClose: () => void;
  comparedJournals: Journal[];
  onRemoveFromCompare: (journalId: string) => void;
  onClearCompare: () => void;
  onToggleShortlist: (journal: Journal) => void;
  shortlistedIds: string[];
  onViewDetails: (journal: Journal) => void;
  onToggleWaiver?: (journalId: string, isWaived?: boolean) => void;
}

export const CompareJournalsModal: React.FC<CompareJournalsModalProps> = ({
  isOpen,
  onClose,
  comparedJournals = [],
  onRemoveFromCompare,
  onClearCompare,
  onToggleShortlist,
  shortlistedIds = [],
  onViewDetails,
  onToggleWaiver
}) => {
  if (!isOpen) return null;

  return (
    <div id="compare-journals-modal" className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Side-by-Side Journal Comparison ({comparedJournals.length} Selected)
              </h2>
              <p className="text-xs text-slate-500">
                Evaluate metrics, review speed, APC charges, and 100% waiver options
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClearCompare}
              className="text-xs text-rose-600 hover:text-rose-800 font-medium px-2 py-1 transition-colors cursor-pointer"
            >
              Clear All
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-x-auto overflow-y-auto flex-1 text-xs">
          {comparedJournals.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-500">No journals selected for comparison.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse min-w-[700px]">
              <tbody>
                {/* Journal Title & Header */}
                <tr className="border-b border-slate-200 bg-slate-50/50">
                  <td className="p-3 font-bold text-slate-700 w-44 uppercase text-[11px]">Journal</td>
                  {comparedJournals.map(j => {
                    const isShortlisted = shortlistedIds.includes(j.id);
                    return (
                      <td key={j.id} className="p-3 w-64 align-top">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900 text-sm line-clamp-2">{j.title}</span>
                            <button
                              onClick={() => onRemoveFromCompare(j.id)}
                              className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                              title="Remove from comparison"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div className="text-[11px] text-slate-500">{j.publisher}</div>
                          <div className="flex items-center gap-1.5 pt-1">
                            <button
                              onClick={() => onToggleShortlist(j)}
                              className={`px-2 py-1 rounded text-[11px] font-medium border flex items-center gap-1 transition-colors cursor-pointer ${
                                isShortlisted ? 'bg-amber-50 text-amber-700 border-amber-300' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                              }`}
                            >
                              <Bookmark className="w-3 h-3 text-amber-500" />
                              <span>{isShortlisted ? 'Shortlisted' : 'Shortlist'}</span>
                            </button>
                            <button
                              onClick={() => onViewDetails(j)}
                              className="px-2 py-1 rounded text-[11px] font-medium bg-slate-900 hover:bg-indigo-600 text-white transition-colors cursor-pointer"
                            >
                              Dossier
                            </button>
                          </div>
                        </div>
                      </td>
                    );
                  })}
                </tr>

                {/* Classification Tier */}
                <tr className="border-b border-slate-100 hover:bg-slate-50/50">
                  <td className="p-3 font-semibold text-slate-600">Classification</td>
                  {comparedJournals.map(j => (
                    <td key={j.id} className="p-3">
                      {j.classification === 'Class A' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          <Award className="w-3.5 h-3.5 text-emerald-700" />
                          Class A
                        </span>
                      ) : j.classification === 'Class B' ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300">
                          Class B
                        </span>
                      ) : (
                        <span className="text-slate-500 font-medium">Unclassified</span>
                      )}
                    </td>
                  ))}
                </tr>

                {/* Indexing & Quartile */}
                <tr className="border-b border-slate-100 hover:bg-slate-50/50">
                  <td className="p-3 font-semibold text-slate-600">Indexing & Quartile</td>
                  {comparedJournals.map(j => (
                    <td key={j.id} className="p-3 space-y-1">
                      <div className="flex flex-wrap gap-1">
                        <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-900">
                          {j.quartile}
                        </span>
                        {j.isTop10Percent && (
                          <span className="px-2 py-0.5 rounded text-xs font-bold bg-purple-100 text-purple-800">
                            Scopus Top 10%
                          </span>
                        )}
                        {j.isWosIndexed && (
                          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-indigo-50 text-indigo-700">
                            WoS SCIE
                          </span>
                        )}
                      </div>
                    </td>
                  ))}
                </tr>

                {/* Impact Factor & CiteScore */}
                <tr className="border-b border-slate-100 hover:bg-slate-50/50">
                  <td className="p-3 font-semibold text-slate-600">Impact Metrics</td>
                  {comparedJournals.map(j => (
                    <td key={j.id} className="p-3 space-y-0.5">
                      <div><strong>IF (JCR):</strong> {j.impactFactor !== null ? j.impactFactor.toFixed(2) : 'N/A'}</div>
                      <div><strong>CiteScore:</strong> {j.citeScore !== null ? j.citeScore.toFixed(1) : 'N/A'}</div>
                      <div><strong>SJR:</strong> {j.sjr !== null ? j.sjr.toFixed(2) : 'N/A'}</div>
                    </td>
                  ))}
                </tr>

                {/* Speed / First Decision */}
                <tr className="border-b border-slate-100 hover:bg-slate-50/50">
                  <td className="p-3 font-semibold text-slate-600">Time to 1st Decision</td>
                  {comparedJournals.map(j => (
                    <td key={j.id} className="p-3">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-indigo-600" />
                        <span className="font-bold text-slate-900">
                          {j.timeToFirstDecisionDays ? `~${j.timeToFirstDecisionDays} days` : 'N/A'}
                        </span>
                      </div>
                      {j.reviewTimeWeeks && (
                        <div className="text-[11px] text-slate-500 mt-0.5">~{j.reviewTimeWeeks} weeks review</div>
                      )}
                    </td>
                  ))}
                </tr>

                {/* Acceptance Rate */}
                <tr className="border-b border-slate-100 hover:bg-slate-50/50">
                  <td className="p-3 font-semibold text-slate-600">Acceptance Rate</td>
                  {comparedJournals.map(j => (
                    <td key={j.id} className="p-3 font-semibold text-slate-800">
                      {j.acceptanceRate ? `${j.acceptanceRate}%` : 'Selective'}
                    </td>
                  ))}
                </tr>

                {/* Open Access & APC */}
                <tr className="border-b border-slate-100 hover:bg-slate-50/50">
                  <td className="p-3 font-semibold text-slate-600">APC Charge</td>
                  {comparedJournals.map(j => (
                    <td key={j.id} className="p-3 space-y-0.5">
                      <div className="font-bold text-slate-900">
                        {j.apcUSD === 0 || j.openAccessType === 'Diamond (No Fee)'
                          ? '$0 (Diamond OA)'
                          : j.apcUSD !== null
                          ? `$${j.apcUSD.toLocaleString()} USD`
                          : j.openAccessType}
                      </div>
                      <div className="text-[11px] text-slate-500">{j.openAccessType}</div>
                    </td>
                  ))}
                </tr>

                {/* 100% Waiver Policy */}
                <tr className="border-b border-slate-100 hover:bg-slate-50/50 bg-teal-50/30">
                  <td className="p-3 font-semibold text-teal-900">100% Waiver Status</td>
                  {comparedJournals.map(j => (
                    <td key={j.id} className="p-3 space-y-1.5">
                      {j.openAccessType === 'Diamond (No Fee)' || j.apcUSD === 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                          $0 (Diamond OA)
                        </span>
                      ) : (
                        <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs select-none">
                          <input
                            type="checkbox"
                            checked={Boolean(j.waiverEligible)}
                            onChange={(e) => onToggleWaiver?.(j.id, e.target.checked)}
                            className="rounded border-teal-400 text-teal-600 focus:ring-teal-500 w-3.5 h-3.5 cursor-pointer"
                          />
                          <span className={`font-semibold ${j.waiverEligible ? 'text-teal-700 font-bold' : 'text-slate-500'}`}>
                            {j.waiverEligible ? '100% Waived for Me' : 'Standard Fee'}
                          </span>
                        </label>
                      )}
                      {j.waiverDetails && (
                        <p className="text-[10px] text-teal-900 leading-snug">
                          {j.waiverDetails}
                        </p>
                      )}
                    </td>
                  ))}
                </tr>

                {/* Scope Summary */}
                <tr className="border-b border-slate-100 hover:bg-slate-50/50">
                  <td className="p-3 font-semibold text-slate-600">Scope Overview</td>
                  {comparedJournals.map(j => (
                    <td key={j.id} className="p-3 text-slate-700 text-[11px] leading-relaxed">
                      {j.scopeSummary ? j.scopeSummary.slice(0, 160) + '...' : 'General research papers within affiliated subject categories.'}
                    </td>
                  ))}
                </tr>

                {/* Action Links */}
                <tr>
                  <td className="p-3 font-semibold text-slate-600">Links</td>
                  {comparedJournals.map(j => (
                    <td key={j.id} className="p-3">
                      {j.homePageUrl && (
                        <a
                          href={j.homePageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-indigo-600 hover:underline text-xs font-semibold"
                        >
                          <Globe className="w-3.5 h-3.5" />
                          <span>Official Website</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
          <span className="text-slate-500">Select up to 4 journals to compare simultaneously</span>
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
