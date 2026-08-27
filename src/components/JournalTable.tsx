import React from 'react';
import { 
  Award, 
  Sparkles, 
  ExternalLink, 
  Clock, 
  Layers, 
  Bookmark, 
  BookmarkCheck, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  LayoutGrid, 
  Table as TableIcon, 
  Check, 
  DollarSign, 
  Globe, 
  RefreshCw,
  Info,
  ShieldCheck
} from 'lucide-react';
import { Journal, Quartile } from '../types';

interface JournalTableProps {
  journals: Journal[];
  selectedForCompare: string[];
  shortlistedIds: string[];
  enrichingJournalId: string | null;
  onToggleCompare: (journalId: string) => void;
  onToggleShortlist: (journal: Journal) => void;
  onViewJournalDetails: (journal: Journal) => void;
  onEnrichJournal: (journal: Journal) => void;
  onClearFilters: () => void;
  onToggleWaiver?: (journalId: string, isWaived?: boolean) => void;
}

type SortField = 'title' | 'publisher' | 'classification' | 'impactFactor' | 'citeScore' | 'sjr' | 'timeToFirstDecisionDays' | 'apcUSD' | 'quartile';
type SortOrder = 'asc' | 'desc';

export const JournalTable: React.FC<JournalTableProps> = ({
  journals = [],
  selectedForCompare = [],
  shortlistedIds = [],
  enrichingJournalId,
  onToggleCompare,
  onToggleShortlist,
  onViewJournalDetails,
  onEnrichJournal,
  onClearFilters,
  onToggleWaiver
}) => {
  const [viewMode, setViewMode] = React.useState<'table' | 'grid'>('table');
  const [sortField, setSortField] = React.useState<SortField>('impactFactor');
  const [sortOrder, setSortOrder] = React.useState<SortOrder>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const sortedJournals = React.useMemo(() => {
    return [...journals].sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];

      // Handle nulls
      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;

      // Special string/quartile sorting
      if (sortField === 'quartile') {
        const order: Record<Quartile, number> = { 'Q1': 1, 'Q2': 2, 'Q3': 3, 'Q4': 4, 'N/A': 5 };
        valA = order[a.quartile] || 99;
        valB = order[b.quartile] || 99;
      } else if (sortField === 'classification') {
        const classOrder: Record<string, number> = { 'Class A': 1, 'Class B': 2, 'Unclassified': 3 };
        valA = classOrder[a.classification] || 99;
        valB = classOrder[b.classification] || 99;
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [journals, sortField, sortOrder]);

  const classAMatches = journals.filter(j => j.classification === 'Class A').length;
  const classBMatches = journals.filter(j => j.classification === 'Class B').length;

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />;
    return sortOrder === 'asc' 
      ? <ArrowUp className="w-3 h-3 text-blue-600" />
      : <ArrowDown className="w-3 h-3 text-blue-600" />;
  };

  return (
    <div id="journal-results-container" className="flex-1 flex flex-col min-w-0">
      {/* Top High-Density Status Header Bar */}
      <div className="bg-white px-3.5 py-2.5 rounded-lg border border-slate-200 shadow-xs mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-slate-800">
            {sortedJournals.length} Matching Results
          </span>
          <span className="text-xs text-slate-300">|</span>
          <div className="flex items-center gap-1.5 text-[11px] font-medium">
            <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-mono font-semibold">
              {classAMatches} Class A
            </span>
            <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-mono font-semibold">
              {classBMatches} Class B
            </span>
          </div>
        </div>

        {/* View mode toggle & sorting reminder */}
        <div className="flex items-center gap-2">
          <span className="hidden md:inline text-[11px] text-slate-400 font-mono">
            Sorted by {sortField} ({sortOrder})
          </span>
          <div className="flex items-center bg-slate-100 rounded p-0.5 border border-slate-200">
            <button
              id="btn-view-table"
              onClick={() => setViewMode('table')}
              className={`px-2 py-1 rounded text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                viewMode === 'table' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Table View"
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline uppercase text-[10px] tracking-wider">Table</span>
            </button>
            <button
              id="btn-view-grid"
              onClick={() => setViewMode('grid')}
              className={`px-2 py-1 rounded text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                viewMode === 'grid' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Card Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline uppercase text-[10px] tracking-wider">Cards</span>
            </button>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {sortedJournals.length === 0 && (
        <div id="journal-empty-state" className="bg-white rounded-lg border border-slate-200 p-10 text-center my-auto shadow-xs">
          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400 mb-2.5">
            <Info className="w-5 h-5" />
          </div>
          <h3 className="text-xs font-bold text-slate-800 mb-1">No journals match current filters</h3>
          <p className="text-[11px] text-slate-500 max-w-md mx-auto mb-3">
            Try loosening filter parameters, searching with broader keywords, or clearing classification restrictions.
          </p>
          <button
            id="btn-clear-empty-filters"
            onClick={onClearFilters}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
          >
            Clear Filters
          </button>
        </div>
      )}

      {/* High-Density Table View */}
      {viewMode === 'table' && sortedJournals.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table id="journals-table-view" className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-[10px] uppercase tracking-wider text-slate-500 font-bold border-b border-slate-200">
                  <th className="py-2.5 px-2 w-8 text-center" title="Compare Checkbox">Cmp</th>
                  <th className="py-2.5 px-3 cursor-pointer hover:bg-slate-200/60 transition-colors" onClick={() => handleSort('title')}>
                    <div className="flex items-center gap-1">
                      <span>Journal Name</span>
                      {renderSortIcon('title')}
                    </div>
                  </th>
                  <th className="py-2.5 px-2.5 cursor-pointer hover:bg-slate-200/60 transition-colors" onClick={() => handleSort('publisher')}>
                    <span>Publisher</span>
                  </th>
                  <th className="py-2.5 px-2 text-center cursor-pointer hover:bg-slate-200/60 transition-colors" onClick={() => handleSort('impactFactor')}>
                    <div className="flex items-center justify-center gap-1">
                      <span>IF</span>
                      {renderSortIcon('impactFactor')}
                    </div>
                  </th>
                  <th className="py-2.5 px-2 text-center cursor-pointer hover:bg-slate-200/60 transition-colors" onClick={() => handleSort('sjr')}>
                    <div className="flex items-center justify-center gap-1">
                      <span>SJR</span>
                      {renderSortIcon('sjr')}
                    </div>
                  </th>
                  <th className="py-2.5 px-2 text-center cursor-pointer hover:bg-slate-200/60 transition-colors" onClick={() => handleSort('quartile')}>
                    <div className="flex items-center justify-center gap-1">
                      <span>Q</span>
                      {renderSortIcon('quartile')}
                    </div>
                  </th>
                  <th className="py-2.5 px-2.5 cursor-pointer hover:bg-slate-200/60 transition-colors" onClick={() => handleSort('timeToFirstDecisionDays')}>
                    <div className="flex items-center gap-1">
                      <span>Decision</span>
                      {renderSortIcon('timeToFirstDecisionDays')}
                    </div>
                  </th>
                  <th className="py-2.5 px-2.5 cursor-pointer hover:bg-slate-200/60 transition-colors" onClick={() => handleSort('apcUSD')}>
                    <div className="flex items-center gap-1">
                      <span>APC Status</span>
                      {renderSortIcon('apcUSD')}
                    </div>
                  </th>
                  <th className="py-2.5 px-3 text-right cursor-pointer hover:bg-slate-200/60 transition-colors" onClick={() => handleSort('classification')}>
                    <div className="flex items-center justify-end gap-1">
                      <span>Category</span>
                      {renderSortIcon('classification')}
                    </div>
                  </th>
                  <th className="py-2.5 px-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="text-xs text-slate-700 divide-y divide-slate-100">
                {sortedJournals.map((journal) => {
                  const isCompared = selectedForCompare.includes(journal.id);
                  const isShortlisted = shortlistedIds.includes(journal.id);
                  const isEnriching = enrichingJournalId === journal.id;

                  return (
                    <tr 
                      key={journal.id} 
                      id={`journal-row-${journal.id}`}
                      className={`hover:bg-blue-50/60 transition-colors ${
                        isCompared ? 'bg-blue-50/80' : ''
                      }`}
                    >
                      {/* Compare Checkbox */}
                      <td className="py-2.5 px-2 text-center">
                        <input
                          id={`chk-compare-${journal.id}`}
                          type="checkbox"
                          checked={isCompared}
                          onChange={() => onToggleCompare(journal.id)}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer"
                          title="Select for comparison"
                        />
                      </td>

                      {/* Title & Micro details */}
                      <td className="py-2.5 px-3">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <button
                              id={`btn-title-${journal.id}`}
                              onClick={() => onViewJournalDetails(journal)}
                              className="font-bold text-blue-600 hover:text-blue-800 text-left text-xs transition-colors block cursor-pointer"
                            >
                              {journal.title}
                            </button>
                            {journal.homePageUrl && (
                              <a
                                href={journal.homePageUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-slate-400 hover:text-blue-600 p-0.5 rounded hover:bg-slate-100 transition-colors"
                                title="Open Journal Homepage"
                              >
                                <Globe className="w-3 h-3" />
                              </a>
                            )}
                            {journal.submissionPortalUrl && (
                              <a
                                href={journal.submissionPortalUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-slate-400 hover:text-emerald-600 p-0.5 rounded hover:bg-slate-100 transition-colors"
                                title="Open Author Submission Portal"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-400 font-mono">
                            {journal.issn && <span>ISSN: {journal.issn}</span>}
                            {journal.isTop10Percent && (
                              <span className="px-1 py-0.2 rounded font-sans font-bold bg-purple-50 text-purple-700 border border-purple-200">
                                Top 10%
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Publisher */}
                      <td className="py-2.5 px-2.5 text-slate-600 text-xs">
                        <span className="truncate max-w-[120px] block" title={journal.publisher}>
                          {journal.publisher}
                        </span>
                      </td>

                      {/* Impact Factor */}
                      <td className="py-2.5 px-2 text-center font-mono font-bold text-slate-900">
                        {journal.impactFactor !== null ? journal.impactFactor.toFixed(1) : <span className="text-slate-400 font-normal font-sans text-[11px]">N/A</span>}
                      </td>

                      {/* SJR */}
                      <td className="py-2.5 px-2 text-center font-mono text-slate-500">
                        {journal.sjr !== null ? journal.sjr.toFixed(2) : <span className="text-slate-400 font-sans text-[11px]">-</span>}
                      </td>

                      {/* Quartile */}
                      <td className="py-2.5 px-2 text-center">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          journal.quartile === 'Q1'
                            ? 'bg-blue-100 text-blue-700'
                            : journal.quartile === 'Q2'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {journal.quartile}
                        </span>
                      </td>

                      {/* Decision Speed */}
                      <td className="py-2.5 px-2.5">
                        {journal.timeToFirstDecisionDays !== null ? (
                          <span className={`text-[11px] font-medium ${
                            journal.timeToFirstDecisionDays <= 24 ? 'text-emerald-600' : journal.timeToFirstDecisionDays <= 40 ? 'text-amber-600' : 'text-slate-500'
                          }`}>
                            ~{journal.timeToFirstDecisionDays} days
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">-</span>
                        )}
                      </td>

                      {/* APC Status / 100% Waiver */}
                      <td className="py-2.5 px-2.5">
                        <div className="flex flex-col gap-1 items-start">
                          {journal.openAccessType === 'Diamond (No Fee)' || journal.apcUSD === 0 ? (
                            <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200 font-bold">
                              <ShieldCheck className="w-3 h-3 text-emerald-600 shrink-0" />
                              <span>$0 (Diamond OA)</span>
                            </span>
                          ) : (
                            <>
                              <span className="text-slate-600 font-mono text-[11px]">
                                {journal.apcUSD !== null && journal.apcUSD > 0
                                  ? `$${journal.apcUSD.toLocaleString()} USD`
                                  : journal.openAccessType}
                              </span>
                              <label 
                                id={`waiver-toggle-row-${journal.id}`}
                                className={`inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded border text-[10px] cursor-pointer transition-colors select-none ${
                                  journal.waiverEligible 
                                    ? 'bg-teal-50 border-teal-200 text-teal-700 font-bold' 
                                    : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700'
                                }`}
                                title="Click to mark 100% APC Waived for you"
                              >
                                <input
                                  id={`chk-waiver-row-${journal.id}`}
                                  type="checkbox"
                                  checked={Boolean(journal.waiverEligible)}
                                  onChange={(e) => onToggleWaiver?.(journal.id, e.target.checked)}
                                  className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 w-3 h-3 cursor-pointer"
                                />
                                <span>{journal.waiverEligible ? '100% Waived' : '100% Waiver?'}</span>
                              </label>
                            </>
                          )}
                        </div>
                      </td>

                      {/* Classification Category Badge */}
                      <td className="py-2.5 px-3 text-right">
                        {journal.classification === 'Class A' ? (
                          <span className="text-[10px] font-bold bg-slate-900 text-white px-2 py-1 rounded inline-block uppercase tracking-wider">
                            CLASS A
                          </span>
                        ) : journal.classification === 'Class B' ? (
                          <span className="text-[10px] font-bold bg-slate-300 text-slate-700 px-2 py-1 rounded inline-block uppercase tracking-wider">
                            CLASS B
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium bg-slate-100 text-slate-500 px-2 py-0.5 rounded inline-block">
                            UNCLASSIFIED
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-2.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          {/* Live AI Search */}
                          <button
                            id={`btn-enrich-${journal.id}`}
                            onClick={() => onEnrichJournal(journal)}
                            disabled={isEnriching}
                            className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                            title="Live Search Google for latest IF, turnaround & APC"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${isEnriching ? 'animate-spin text-blue-600' : ''}`} />
                          </button>

                          {/* Shortlist Target */}
                          <button
                            id={`btn-shortlist-${journal.id}`}
                            onClick={() => onToggleShortlist(journal)}
                            className={`p-1 rounded transition-colors cursor-pointer ${
                              isShortlisted 
                                ? 'text-amber-500 bg-amber-50' 
                                : 'text-slate-400 hover:text-amber-500 hover:bg-slate-100'
                            }`}
                            title={isShortlisted ? 'In Submission Shortlist' : 'Add to Submission Shortlist'}
                          >
                            {isShortlisted ? <BookmarkCheck className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
                          </button>

                          {/* Detail Dossier */}
                          <button
                            id={`btn-detail-${journal.id}`}
                            onClick={() => onViewJournalDetails(journal)}
                            className="px-2 py-0.5 bg-slate-800 hover:bg-blue-600 text-white rounded text-[11px] font-bold uppercase transition-colors cursor-pointer"
                          >
                            Dossier
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Grid Card View */}
      {viewMode === 'grid' && sortedJournals.length > 0 && (
        <div id="journals-grid-view" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {sortedJournals.map((journal) => {
            const isCompared = selectedForCompare.includes(journal.id);
            const isShortlisted = shortlistedIds.includes(journal.id);
            const isEnriching = enrichingJournalId === journal.id;

            return (
              <div
                key={journal.id}
                id={`journal-card-${journal.id}`}
                className={`bg-white rounded-lg border p-3.5 shadow-xs flex flex-col justify-between transition-all hover:border-blue-300 ${
                  isCompared ? 'border-blue-500 ring-1 ring-blue-500/30' : 'border-slate-200'
                }`}
              >
                <div>
                  {/* Card Header with Badges */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {journal.classification === 'Class A' ? (
                        <span className="text-[10px] font-bold bg-slate-900 text-white px-2 py-0.5 rounded uppercase tracking-wider">
                          CLASS A
                        </span>
                      ) : journal.classification === 'Class B' ? (
                        <span className="text-[10px] font-bold bg-slate-300 text-slate-700 px-2 py-0.5 rounded uppercase tracking-wider">
                          CLASS B
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                          Unclassified
                        </span>
                      )}

                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        journal.quartile === 'Q1'
                          ? 'bg-blue-100 text-blue-700'
                          : journal.quartile === 'Q2'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {journal.quartile}
                      </span>

                      {journal.isTop10Percent && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-100 text-purple-700">
                          Top 10%
                        </span>
                      )}
                    </div>

                    {/* Compare & Shortlist Icons */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onToggleShortlist(journal)}
                        className={`p-1 rounded transition-colors cursor-pointer ${
                          isShortlisted ? 'text-amber-500 bg-amber-50' : 'text-slate-400 hover:text-amber-500'
                        }`}
                        title="Add to Submission Shortlist"
                      >
                        <Bookmark className="w-3.5 h-3.5" />
                      </button>

                      <label className="flex items-center p-1 text-slate-400 hover:text-blue-600 cursor-pointer" title="Compare">
                        <input
                          type="checkbox"
                          checked={isCompared}
                          onChange={() => onToggleCompare(journal.id)}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                        />
                      </label>
                    </div>
                  </div>

                  {/* Title & Publisher */}
                  <div className="flex items-start justify-between gap-1.5 mb-1">
                    <h4 
                      onClick={() => onViewJournalDetails(journal)}
                      className="font-bold text-blue-600 hover:text-blue-800 transition-colors text-xs line-clamp-2 cursor-pointer"
                    >
                      {journal.title}
                    </h4>
                    <div className="flex items-center gap-1 shrink-0">
                      {journal.homePageUrl && (
                        <a
                          href={journal.homePageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-slate-400 hover:text-blue-600 p-0.5 rounded hover:bg-slate-100 transition-colors"
                          title="Journal Homepage"
                        >
                          <Globe className="w-3.5 h-3.5" />
                        </a>
                      )}
                      {journal.submissionPortalUrl && (
                        <a
                          href={journal.submissionPortalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-slate-400 hover:text-emerald-600 p-0.5 rounded hover:bg-slate-100 transition-colors"
                          title="Author Submission Portal"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium mb-2.5">
                    {journal.publisher} {journal.issn && `• ${journal.issn}`}
                  </p>

                  {/* Key Metrics Bento */}
                  <div className="grid grid-cols-3 gap-1.5 bg-slate-50 p-2 rounded border border-slate-200 mb-2.5 text-center text-xs">
                    <div>
                      <span className="text-[9px] text-slate-400 block uppercase font-bold">IF</span>
                      <span className="font-mono font-bold text-slate-900 text-xs">
                        {journal.impactFactor !== null ? journal.impactFactor.toFixed(1) : 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 block uppercase font-bold">CiteScore</span>
                      <span className="font-mono font-semibold text-slate-800 text-xs">
                        {journal.citeScore !== null ? journal.citeScore.toFixed(1) : 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 block uppercase font-bold">SJR</span>
                      <span className="font-mono font-semibold text-slate-800 text-xs">
                        {journal.sjr !== null ? journal.sjr.toFixed(2) : 'N/A'}
                      </span>
                    </div>
                  </div>

                  {/* Speed & APC Info */}
                  <div className="space-y-1 text-[11px] text-slate-600 mb-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Decision:</span>
                      <span className="font-medium text-slate-800">
                        {journal.timeToFirstDecisionDays ? `~${journal.timeToFirstDecisionDays} days` : 'N/A'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">APC Fee:</span>
                      <span className="font-semibold text-slate-900">
                        {journal.openAccessType === 'Diamond (No Fee)' || journal.apcUSD === 0
                          ? '$0 (Diamond OA)'
                          : journal.apcUSD !== null
                          ? `$${journal.apcUSD.toLocaleString()} USD`
                          : journal.openAccessType}
                      </span>
                    </div>

                    {journal.openAccessType !== 'Diamond (No Fee)' && journal.apcUSD !== 0 && (
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-slate-400">100% Waiver:</span>
                        <label 
                          id={`waiver-toggle-grid-${journal.id}`}
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-[10px] cursor-pointer select-none transition-colors ${
                            journal.waiverEligible 
                              ? 'bg-teal-50 border-teal-200 text-teal-700 font-bold' 
                              : 'bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-700'
                          }`}
                        >
                          <input
                            id={`chk-waiver-grid-${journal.id}`}
                            type="checkbox"
                            checked={Boolean(journal.waiverEligible)}
                            onChange={(e) => onToggleWaiver?.(journal.id, e.target.checked)}
                            className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 w-3 h-3 cursor-pointer"
                          />
                          <span>{journal.waiverEligible ? '100% Waived for Me' : 'Mark Waived'}</span>
                        </label>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 gap-2">
                  <button
                    onClick={() => onEnrichJournal(journal)}
                    disabled={isEnriching}
                    className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 font-bold cursor-pointer"
                  >
                    <RefreshCw className={`w-3 h-3 ${isEnriching ? 'animate-spin' : ''}`} />
                    <span>AI Verify</span>
                  </button>

                  <button
                    onClick={() => onViewJournalDetails(journal)}
                    className="px-2.5 py-1 bg-slate-900 hover:bg-blue-600 text-white rounded text-[11px] font-bold uppercase transition-colors cursor-pointer"
                  >
                    Dossier
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

