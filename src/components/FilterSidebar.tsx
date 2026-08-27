import React from 'react';
import { 
  Search, 
  RotateCcw, 
  Check, 
  Zap, 
  Clock, 
  Award, 
  DollarSign, 
  Filter,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { JournalFilters, Quartile, OpenAccessType } from '../types';

interface FilterSidebarProps {
  filters: JournalFilters;
  onFilterChange: (filters: JournalFilters) => void;
  onResetFilters: () => void;
  availablePublishers: string[];
  availableCategories: string[];
  totalMatches: number;
}

export const FilterSidebar: React.FC<FilterSidebarProps> = ({
  filters,
  onFilterChange,
  onResetFilters,
  availablePublishers = [],
  availableCategories = [],
  totalMatches
}) => {
  const [collapsedSections, setCollapsedSections] = React.useState<Record<string, boolean>>({});
  const [publisherSearchQuery, setPublisherSearchQuery] = React.useState('');

  const quartilesList = filters.quartiles || [];
  const publishersList = filters.publishers || [];
  const categoriesList = filters.subjectCategories || [];
  const oaTypesList = filters.openAccessTypes || [];
  const safePublishers = availablePublishers || [];
  const safeCategories = availableCategories || [];

  const toggleSection = (key: string) => {
    setCollapsedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleClassificationChange = (classification: JournalFilters['classification']) => {
    onFilterChange({ ...filters, classification });
  };

  const handleQuartileToggle = (q: Quartile) => {
    const next = quartilesList.includes(q)
      ? quartilesList.filter(item => item !== q)
      : [...quartilesList, q];
    onFilterChange({ ...filters, quartiles: next });
  };

  const handlePublisherToggle = (pub: string) => {
    const next = publishersList.includes(pub)
      ? publishersList.filter(p => p !== pub)
      : [...publishersList, pub];
    onFilterChange({ ...filters, publishers: next });
  };

  const handleCategoryToggle = (cat: string) => {
    const next = categoriesList.includes(cat)
      ? categoriesList.filter(c => c !== cat)
      : [...categoriesList, cat];
    onFilterChange({ ...filters, subjectCategories: next });
  };

  const handleOaTypeToggle = (oa: OpenAccessType) => {
    const next = oaTypesList.includes(oa)
      ? oaTypesList.filter(t => t !== oa)
      : [...oaTypesList, oa];
    onFilterChange({ ...filters, openAccessTypes: next });
  };

  return (
    <aside id="filter-sidebar" className="w-full lg:w-64 bg-white border border-slate-200 rounded-lg shadow-xs p-3.5 flex flex-col gap-4.5 shrink-0">
      {/* Search Header & Reset */}
      <div className="flex items-center justify-between pb-2.5 border-b border-slate-200">
        <div className="flex items-center gap-1.5">
          <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            Global Filters
          </h2>
          <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded font-mono font-semibold">
            {totalMatches}
          </span>
        </div>
        <button
          id="btn-reset-filters"
          onClick={onResetFilters}
          className="text-[11px] text-slate-400 hover:text-blue-600 flex items-center gap-1 transition-colors cursor-pointer"
          title="Reset all filters"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Reset</span>
        </button>
      </div>

      {/* Global Keyword / Title Search */}
      <div className="space-y-1">
        <label htmlFor="filter-search-input" className="text-[11px] font-semibold text-slate-700 block">
          Keyword / Title / ISSN
        </label>
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
          <input
            id="filter-search-input"
            type="text"
            placeholder="Search journals, ISSN..."
            value={filters.searchQuery}
            onChange={(e) => onFilterChange({ ...filters, searchQuery: e.target.value })}
            className="w-full pl-7.5 pr-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* Classification: Class A / Class B / All */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-semibold text-slate-700 flex items-center gap-1">
          <Award className="w-3 h-3 text-emerald-600" />
          <span>Classification Tier</span>
        </label>
        <div className="grid grid-cols-2 gap-1">
          {(['All', 'Class A', 'Class B', 'Class A & B', 'Unclassified'] as const).map((cls) => {
            const isSelected = filters.classification === cls;
            return (
              <button
                key={cls}
                id={`filter-class-${cls.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                onClick={() => handleClassificationChange(cls)}
                className={`text-[11px] px-2 py-1 rounded border font-medium transition-all text-left flex items-center justify-between cursor-pointer ${
                  isSelected
                    ? cls === 'Class A' 
                      ? 'bg-slate-900 text-white border-slate-900 font-bold'
                      : cls === 'Class B'
                      ? 'bg-blue-100 text-blue-800 border-blue-300 font-bold'
                      : 'bg-blue-600 text-white border-blue-600 font-bold'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span className="truncate">{cls}</span>
                {isSelected && <Check className="w-3 h-3 shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Indexing Badges */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-semibold text-slate-700 block">
          Indexing & Top Lists
        </label>
        <div className="space-y-1 text-xs">
          <label className="flex items-center gap-2 cursor-pointer text-slate-700 hover:text-slate-900 text-[11px]">
            <input
              id="filter-wos-checkbox"
              type="checkbox"
              checked={filters.indexing.wosOnly}
              onChange={(e) => onFilterChange({
                ...filters,
                indexing: { ...filters.indexing, wosOnly: e.target.checked }
              })}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
            />
            <span>Web of Science (WoS/SCIE)</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer text-slate-700 hover:text-slate-900 text-[11px]">
            <input
              id="filter-scopus-checkbox"
              type="checkbox"
              checked={filters.indexing.scopusOnly}
              onChange={(e) => onFilterChange({
                ...filters,
                indexing: { ...filters.indexing, scopusOnly: e.target.checked }
              })}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
            />
            <span>Scopus Indexed</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer text-slate-700 hover:text-slate-900 text-[11px]">
            <input
              id="filter-top10-checkbox"
              type="checkbox"
              checked={filters.indexing.top10Only}
              onChange={(e) => onFilterChange({
                ...filters,
                indexing: { ...filters.indexing, top10Only: e.target.checked }
              })}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
            />
            <span className="flex items-center gap-1">
              <span>Scopus Top 10%</span>
              <span className="px-1 py-0.2 bg-purple-100 text-purple-700 rounded text-[9px] font-bold">Top Decile</span>
            </span>
          </label>
        </div>
      </div>

      {/* Quartile Rank Buttons */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-semibold text-slate-700">Quartile Rank</label>
          <span className="text-[10px] text-slate-400 font-mono">
            {quartilesList.length ? quartilesList.join(', ') : 'All Q'}
          </span>
        </div>
        <div className="flex gap-1">
          {(['Q1', 'Q2', 'Q3', 'Q4'] as Quartile[]).map((q) => {
            const isSelected = quartilesList.includes(q);
            return (
              <button
                key={q}
                id={`filter-q-${q.toLowerCase()}`}
                onClick={() => handleQuartileToggle(q)}
                className={`flex-1 py-1 text-[10px] rounded border transition-colors cursor-pointer font-bold ${
                  isSelected
                    ? 'bg-blue-100 text-blue-700 border-blue-300'
                    : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {q}
              </button>
            );
          })}
        </div>
      </div>

      {/* Min Impact Factor Slider */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-semibold text-slate-700 flex items-center gap-1">
            <Zap className="w-3 h-3 text-amber-500" />
            <span>Min. Impact Factor</span>
          </label>
          <span className="text-[11px] font-mono text-blue-600 font-bold">
            {filters.minImpactFactor ? filters.minImpactFactor.toFixed(1) : '0.0'}
          </span>
        </div>
        <input
          id="filter-if-slider"
          type="range"
          min="0"
          max="20"
          step="0.5"
          value={filters.minImpactFactor ?? 0}
          onChange={(e) => {
            const val = parseFloat(e.target.value);
            onFilterChange({
              ...filters,
              minImpactFactor: val === 0 ? null : val
            });
          }}
          className="w-full accent-blue-600 cursor-pointer"
        />
        <div className="flex justify-between text-[10px] text-slate-400 font-mono">
          <span>0</span>
          <span>5.0</span>
          <span>20.0+</span>
        </div>
      </div>

      {/* Decision Speed Slider */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-semibold text-slate-700 flex items-center gap-1">
            <Clock className="w-3 h-3 text-blue-600" />
            <span>Decision Speed</span>
          </label>
          <span className="text-[10px] text-slate-600 font-mono font-medium">
            {filters.maxTimeToFirstDecisionDays ? `≤ ${filters.maxTimeToFirstDecisionDays}d` : 'Any'}
          </span>
        </div>
        <input
          id="filter-speed-slider"
          type="range"
          min="10"
          max="90"
          step="5"
          value={filters.maxTimeToFirstDecisionDays ?? 90}
          onChange={(e) => {
            const val = parseInt(e.target.value);
            onFilterChange({
              ...filters,
              maxTimeToFirstDecisionDays: val >= 90 ? null : val
            });
          }}
          className="w-full accent-blue-600 cursor-pointer"
        />
        <div className="flex justify-between text-[10px] text-slate-400 font-mono">
          <span>&lt; 14d</span>
          <span>30d</span>
          <span>Any</span>
        </div>
      </div>

      {/* APC & 100% Waiver Toggle */}
      <div className="p-2.5 rounded bg-emerald-50/80 border border-emerald-200/90 space-y-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            id="filter-waiver-toggle"
            type="checkbox"
            checked={filters.waiverOnly}
            onChange={(e) => onFilterChange({ ...filters, waiverOnly: e.target.checked })}
            className="rounded border-emerald-400 text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
          />
          <span className="text-[11px] font-bold text-emerald-900 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            100% Waiver / Free APC Only
          </span>
        </label>
        <p className="text-[10px] text-emerald-700 leading-tight">
          Isolates RSC waivers for Research4Life/eligible countries & Diamond ($0 APC) journals.
        </p>
      </div>

      {/* Publisher Multi-Select Accordion */}
      {safePublishers.length > 0 && (
        <div className="space-y-1.5 border-t border-slate-100 pt-2.5">
          <button
            id="toggle-publisher-filter"
            onClick={() => toggleSection('publishers')}
            className="w-full flex items-center justify-between text-[11px] font-semibold text-slate-700 uppercase tracking-wider cursor-pointer"
          >
            <span>Publisher ({publishersList.length ? `${publishersList.length}` : 'All'})</span>
            {collapsedSections['publishers'] ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
          </button>

          {!collapsedSections['publishers'] && (
            <div className="space-y-1.5 pt-1">
              <div className="relative">
                <Search className="w-3 h-3 absolute left-2 top-2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search publishers..."
                  value={publisherSearchQuery}
                  onChange={(e) => setPublisherSearchQuery(e.target.value)}
                  className="w-full pl-6 pr-2 py-0.5 text-[11px] bg-slate-50 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="max-h-28 overflow-y-auto space-y-1 pr-1 text-[11px]">
                {safePublishers
                  .filter(pub => pub.toLowerCase().includes(publisherSearchQuery.toLowerCase()))
                  .map((pub) => {
                    const isChecked = publishersList.includes(pub);
                    return (
                      <label key={pub} className="flex items-center gap-2 text-slate-700 hover:text-slate-900 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handlePublisherToggle(pub)}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3 h-3"
                        />
                        <span className="truncate">{pub}</span>
                      </label>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Research Areas / Subject Categories Accordion */}
      {safeCategories.length > 0 && (
        <div className="space-y-1 border-t border-slate-100 pt-2.5">
          <button
            id="toggle-categories-filter"
            onClick={() => toggleSection('categories')}
            className="w-full flex items-center justify-between text-[11px] font-semibold text-slate-700 uppercase tracking-wider cursor-pointer"
          >
            <span>Categories ({categoriesList.length ? `${categoriesList.length}` : 'All'})</span>
            {collapsedSections['categories'] ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
          </button>

          {!collapsedSections['categories'] && (
            <div className="max-h-32 overflow-y-auto space-y-1 pr-1 text-[11px] pt-1">
              {safeCategories.map((cat) => {
                const isChecked = categoriesList.includes(cat);
                return (
                  <label key={cat} className="flex items-center gap-2 text-slate-700 hover:text-slate-900 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleCategoryToggle(cat)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3 h-3"
                    />
                    <span className="truncate">{cat}</span>
                  </label>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* AI Analysis Presets matching High-Density theme */}
      <div className="mt-auto pt-3 border-t border-slate-200 space-y-2">
        <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
          AI Analysis Presets
        </h3>
        
        <button 
          onClick={() => onFilterChange({ ...filters, maxTimeToFirstDecisionDays: 28 })}
          className="w-full text-left p-2 rounded bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
        >
          <p className="text-xs font-bold text-slate-800">Fast Decision Tracking</p>
          <p className="text-[10px] text-slate-500">Prioritizes &lt; 4 weeks to 1st dec.</p>
        </button>

        <button 
          onClick={() => onFilterChange({ ...filters, waiverOnly: true })}
          className="w-full text-left p-2 rounded bg-blue-50 hover:bg-blue-100/70 border border-blue-200 transition-colors cursor-pointer"
        >
          <p className="text-xs font-bold text-blue-900">APC Waiver Matcher</p>
          <p className="text-[10px] text-blue-700">For Research4Life / RSC 100% OA</p>
        </button>
      </div>
    </aside>
  );
};

