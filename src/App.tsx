import React from 'react';
import { Header } from './components/Header';
import { FilterSidebar } from './components/FilterSidebar';
import { JournalTable } from './components/JournalTable';
import { JournalDetailModal } from './components/JournalDetailModal';
import { UploadDatabaseModal } from './components/UploadDatabaseModal';
import { ManuscriptMatcher } from './components/ManuscriptMatcher';
import { CompareJournalsModal } from './components/CompareJournalsModal';
import { TargetShortlistModal } from './components/TargetShortlistModal';
import { DatabaseManagerModal } from './components/DatabaseManagerModal';
import { AISearchModal } from './components/AISearchModal';
import { 
  SEED_JOURNALS, 
  RSC_WAIVER_PRESET_JOURNALS, 
  SCOPUS_TOP10_PRESET_JOURNALS 
} from './data/initialJournals';
import { 
  Journal, 
  JournalFilters, 
  INITIAL_FILTERS, 
  UploadBatchSummary 
} from './types';
import { 
  exportJournalsToExcel, 
  exportJournalsToCSV, 
  exportJournalsToJSON 
} from './utils/exportUtils';
import { 
  getDbItem, 
  setDbItem, 
  getInitialStorageValue, 
  safeSetLocalStorage 
} from './utils/storage';
import { CheckCircle2, Sparkles, Award, ShieldCheck, Clock, RefreshCw } from 'lucide-react';

const LOCAL_STORAGE_KEY = 'scopus_class_a_b_journals_db_v1';
const SHORTLIST_STORAGE_KEY = 'scopus_shortlist_v1';
const CLASS_A_REGISTRY_KEY = 'academic_class_a_registry_v1';
const CLASS_B_REGISTRY_KEY = 'academic_class_b_registry_v1';

const INITIAL_CLASS_A_TITLES = [
  'RSC Advances',
  'Nanoscale Advances',
  'Chemical Science',
  'Nature Communications',
  'Advanced Materials',
  'ACS Nano',
  'IEEE Transactions on Pattern Analysis and Machine Intelligence',
  'Applied Surface Science',
  'Journal of the American Chemical Society (JACS)',
  'Chemical Engineering Journal',
  'Bioresource Technology',
  'Science Advances',
  'Advanced Energy Materials',
  'Angewandte Chemie International Edition',
  'Nano Energy'
];

const INITIAL_CLASS_B_TITLES = [
  'PLOS ONE',
  'Sensors',
  'Scientific Reports',
  'Heliyon',
  'Journal of Materials Science',
  'IEEE Access',
  'Frontiers in Chemistry',
  'Materials Letters',
  'Applied Sciences',
  'Journal of Cleaner Production'
];

export function App() {
  // 1. Core State with fast synchronous hydration + robust IndexedDB backing
  const [journals, setJournals] = React.useState<Journal[]>(() => {
    return getInitialStorageValue<Journal[]>(LOCAL_STORAGE_KEY, SEED_JOURNALS);
  });

  const [classARegistry, setClassARegistry] = React.useState<string[]>(() => {
    return getInitialStorageValue<string[]>(CLASS_A_REGISTRY_KEY, INITIAL_CLASS_A_TITLES);
  });

  const [classBRegistry, setClassBRegistry] = React.useState<string[]>(() => {
    return getInitialStorageValue<string[]>(CLASS_B_REGISTRY_KEY, INITIAL_CLASS_B_TITLES);
  });

  const [shortlistedIds, setShortlistedIds] = React.useState<string[]>(() => {
    return getInitialStorageValue<string[]>(SHORTLIST_STORAGE_KEY, ['j-rsc-adv', 'j-chem-sci', 'j-nanoscale-adv']);
  });

  // Async hydration from IndexedDB on initial mount (for large catalogs/PDF imports)
  React.useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const storedJournals = await getDbItem<Journal[] | null>(LOCAL_STORAGE_KEY, null);
        if (isMounted && storedJournals && Array.isArray(storedJournals) && storedJournals.length > 0) {
          setJournals(storedJournals);
        }

        const storedClassA = await getDbItem<string[] | null>(CLASS_A_REGISTRY_KEY, null);
        if (isMounted && storedClassA && Array.isArray(storedClassA)) {
          setClassARegistry(storedClassA);
        }

        const storedClassB = await getDbItem<string[] | null>(CLASS_B_REGISTRY_KEY, null);
        if (isMounted && storedClassB && Array.isArray(storedClassB)) {
          setClassBRegistry(storedClassB);
        }

        const storedShortlist = await getDbItem<string[] | null>(SHORTLIST_STORAGE_KEY, null);
        if (isMounted && storedShortlist && Array.isArray(storedShortlist)) {
          setShortlistedIds(storedShortlist);
        }
      } catch (err) {
        console.warn('IndexedDB initial hydration notice:', err);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  const [filters, setFilters] = React.useState<JournalFilters>(INITIAL_FILTERS);
  const [selectedForCompare, setSelectedForCompare] = React.useState<string[]>([]);
  const [activeJournalDetail, setActiveJournalDetail] = React.useState<Journal | null>(null);
  const [enrichingJournalId, setEnrichingJournalId] = React.useState<string | null>(null);
  const [toastMessage, setToastMessage] = React.useState<{ text: string; type: 'success' | 'info' } | null>(null);

  // Modals visibility
  const [isUploadModalOpen, setIsUploadModalOpen] = React.useState(false);
  const [isMatcherModalOpen, setIsMatcherModalOpen] = React.useState(false);
  const [isAISearchModalOpen, setIsAISearchModalOpen] = React.useState(false);
  const [isCompareModalOpen, setIsCompareModalOpen] = React.useState(false);
  const [isShortlistModalOpen, setIsShortlistModalOpen] = React.useState(false);
  const [isDbManagerModalOpen, setIsDbManagerModalOpen] = React.useState(false);

  // Persist to IndexedDB (unlimited quota) + safe localStorage fallback (no quota crash)
  React.useEffect(() => {
    setDbItem(LOCAL_STORAGE_KEY, journals);
    safeSetLocalStorage(LOCAL_STORAGE_KEY, journals);
  }, [journals]);

  React.useEffect(() => {
    setDbItem(CLASS_A_REGISTRY_KEY, classARegistry);
    safeSetLocalStorage(CLASS_A_REGISTRY_KEY, classARegistry);
  }, [classARegistry]);

  React.useEffect(() => {
    setDbItem(CLASS_B_REGISTRY_KEY, classBRegistry);
    safeSetLocalStorage(CLASS_B_REGISTRY_KEY, classBRegistry);
  }, [classBRegistry]);

  React.useEffect(() => {
    setDbItem(SHORTLIST_STORAGE_KEY, shortlistedIds);
    safeSetLocalStorage(SHORTLIST_STORAGE_KEY, shortlistedIds);
  }, [shortlistedIds]);

  const showToast = (text: string, type: 'success' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Dynamic audit helper: checks each journal against permanent Class A and Class B lists
  const evaluateJournalClassification = (
    title: string, 
    existingClass?: 'Class A' | 'Class B' | 'Unclassified'
  ): 'Class A' | 'Class B' | 'Unclassified' => {
    const tNorm = title.trim().toLowerCase();
    const isA = classARegistry.some(a => a.trim().toLowerCase() === tNorm || tNorm.includes(a.trim().toLowerCase()));
    if (isA) return 'Class A';

    const isB = classBRegistry.some(b => b.trim().toLowerCase() === tNorm || tNorm.includes(b.trim().toLowerCase()));
    if (isB) return 'Class B';

    return existingClass || 'Unclassified';
  };

  const handleReauditAllClassifications = () => {
    setJournals(prev => prev.map(j => {
      const newClass = evaluateJournalClassification(j.title, j.classification);
      return {
        ...j,
        classification: newClass
      };
    }));
    showToast('Re-evaluated all journals against permanent Class A & Class B registries.', 'success');
  };

  // Derive unique lists for filters
  const availablePublishers = React.useMemo(() => {
    const pubs = new Set<string>();
    (journals || []).forEach(j => {
      if (j && j.publisher) pubs.add(j.publisher);
    });
    return Array.from(pubs).sort();
  }, [journals]);

  const availableCategories = React.useMemo(() => {
    const cats = new Set<string>();
    (journals || []).forEach(j => {
      if (j && Array.isArray(j.subjectCategories)) {
        j.subjectCategories.forEach(c => cats.add(c));
      }
    });
    return Array.from(cats).sort();
  }, [journals]);

  // Filter journals based on all active criteria
  const filteredJournals = React.useMemo(() => {
    const safeJournals = journals || [];
    return safeJournals.filter(j => {
      if (!j) return false;

      // 1. Text Search (Title, Publisher, ISSN, Scope, Keywords)
      if (filters.searchQuery && filters.searchQuery.trim()) {
        const query = filters.searchQuery.toLowerCase();
        const inTitle = j.title ? j.title.toLowerCase().includes(query) : false;
        const inPub = j.publisher ? j.publisher.toLowerCase().includes(query) : false;
        const inIssn = j.issn ? j.issn.toLowerCase().includes(query) : false;
        const inScope = j.scopeSummary ? j.scopeSummary.toLowerCase().includes(query) : false;
        const inCats = Array.isArray(j.subjectCategories) ? j.subjectCategories.some(c => c.toLowerCase().includes(query)) : false;
        if (!inTitle && !inPub && !inIssn && !inScope && !inCats) {
          return false;
        }
      }

      // 2. Classification
      if (filters.classification === 'Class A' && j.classification !== 'Class A') return false;
      if (filters.classification === 'Class B' && j.classification !== 'Class B') return false;
      if (filters.classification === 'Class A & B' && j.classification !== 'Class A' && j.classification !== 'Class B') return false;
      if (filters.classification === 'Unclassified' && j.classification !== 'Unclassified') return false;

      // 3. Indexing
      if (filters.indexing?.wosOnly && !j.isWosIndexed) return false;
      if (filters.indexing?.scopusOnly && !j.isScopusIndexed) return false;
      if (filters.indexing?.top10Only && !j.isTop10Percent) return false;

      // 4. Quartiles
      const quartilesFilter = filters.quartiles || [];
      if (quartilesFilter.length > 0 && !quartilesFilter.includes(j.quartile)) return false;

      // 5. Impact Factor min/max
      if (filters.minImpactFactor !== null && (j.impactFactor === null || j.impactFactor < filters.minImpactFactor)) {
        return false;
      }
      if (filters.maxImpactFactor !== null && (j.impactFactor !== null && j.impactFactor > filters.maxImpactFactor)) {
        return false;
      }

      // 6. SJR min
      if (filters.minSjr !== null && (j.sjr === null || j.sjr < filters.minSjr)) {
        return false;
      }

      // 7. CiteScore min
      if (filters.minCiteScore !== null && (j.citeScore === null || j.citeScore < filters.minCiteScore)) {
        return false;
      }

      // 8. Time to First Decision
      if (filters.maxTimeToFirstDecisionDays !== null) {
        if (j.timeToFirstDecisionDays === null || j.timeToFirstDecisionDays > filters.maxTimeToFirstDecisionDays) {
          return false;
        }
      }

      // 9. 100% Waiver
      if (filters.waiverOnly) {
        const isFreeDiamond = j.openAccessType === 'Diamond (No Fee)' || j.apcUSD === 0;
        if (!j.waiverEligible && !isFreeDiamond) {
          return false;
        }
      }

      // 10. Open Access Types
      const oaFilter = filters.openAccessTypes || [];
      if (oaFilter.length > 0 && !oaFilter.includes(j.openAccessType)) {
        return false;
      }

      // 11. Publishers
      const pubFilter = filters.publishers || [];
      if (pubFilter.length > 0 && !pubFilter.includes(j.publisher)) {
        return false;
      }

      // 12. Subject Categories
      const catFilter = filters.subjectCategories || [];
      if (catFilter.length > 0) {
        const hasMatchingCat = Array.isArray(j.subjectCategories) && j.subjectCategories.some(c => catFilter.includes(c));
        if (!hasMatchingCat) return false;
      }

      return true;
    });
  }, [journals, filters]);

  // Compare toggles
  const handleToggleCompare = (journalId: string) => {
    setSelectedForCompare(prev => {
      if (prev.includes(journalId)) {
        return prev.filter(id => id !== journalId);
      }
      if (prev.length >= 4) {
        showToast('Maximum 4 journals can be compared simultaneously', 'info');
        return prev;
      }
      return [...prev, journalId];
    });
  };

  // Shortlist toggles
  const handleToggleShortlist = (journal: Journal) => {
    setShortlistedIds(prev => {
      if (prev.includes(journal.id)) {
        showToast(`Removed "${journal.title}" from submission shortlist`, 'info');
        return prev.filter(id => id !== journal.id);
      } else {
        showToast(`Added "${journal.title}" to target submission shortlist!`, 'success');
        return [...prev, journal.id];
      }
    });
  };

  // Live AI Enrichment Handler
  const handleEnrichJournal = async (journal: Journal) => {
    setEnrichingJournalId(journal.id);
    try {
      const res = await fetch('/api/enrich-journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          journalTitle: journal.title,
          issn: journal.issn,
          publisher: journal.publisher
        })
      });

      if (!res.ok) {
        throw new Error('Failed to retrieve live journal data from search.');
      }

      const data = await res.json();
      if (data.enrichedData) {
        const enriched = data.enrichedData;
        const updatedJournal: Journal = {
          ...journal,
          impactFactor: enriched.impactFactor ?? journal.impactFactor,
          fiveYearIF: enriched.fiveYearIF ?? journal.fiveYearIF,
          citeScore: enriched.citeScore ?? journal.citeScore,
          sjr: enriched.sjr ?? journal.sjr,
          quartile: enriched.quartile ?? journal.quartile,
          openAccessType: enriched.openAccessType ?? journal.openAccessType,
          apcUSD: enriched.apcUSD !== undefined ? enriched.apcUSD : journal.apcUSD,
          waiverEligible: enriched.waiverEligible ?? journal.waiverEligible,
          waiverDetails: enriched.waiverDetails ?? journal.waiverDetails,
          timeToFirstDecisionDays: enriched.timeToFirstDecisionDays ?? journal.timeToFirstDecisionDays,
          publicationSpeedNotes: enriched.publicationSpeedNotes ?? journal.publicationSpeedNotes,
          homePageUrl: enriched.homePageUrl ?? journal.homePageUrl,
          submissionPortalUrl: enriched.submissionPortalUrl ?? journal.submissionPortalUrl,
          enrichmentSources: data.sources || journal.enrichmentSources,
          lastUpdated: 'Live Grounded (Today)'
        };

        // Update in state
        setJournals(prev => prev.map(j => j.id === journal.id ? updatedJournal : j));
        
        // If active in modal, update modal view
        if (activeJournalDetail?.id === journal.id) {
          setActiveJournalDetail(updatedJournal);
        }

        showToast(`Updated "${journal.title}" with live Google-grounded metrics & waiver rules!`, 'success');
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Error fetching live journal metrics', 'info');
    } finally {
      setEnrichingJournalId(null);
    }
  };

  // Import uploaded journals with dynamic Class A / Class B matching
  const handleImportJournals = (imported: Journal[], action: 'merge' | 'replace', summary: UploadBatchSummary) => {
    // Process each imported journal to evaluate classification against permanent registries
    const processedJournals = imported.map(j => ({
      ...j,
      classification: evaluateJournalClassification(j.title, j.classification)
    }));

    if (action === 'replace') {
      setJournals(processedJournals);
      showToast(`Replaced database with ${processedJournals.length} parsed journals.`, 'success');
    } else {
      // Merge by title/issn
      setJournals(prev => {
        const titleMap = new Map<string, Journal>();
        prev.forEach(j => titleMap.set(j.title.toLowerCase(), j));
        processedJournals.forEach(j => {
          const existing = titleMap.get(j.title.toLowerCase());
          if (existing) {
            titleMap.set(j.title.toLowerCase(), { ...existing, ...j });
          } else {
            titleMap.set(j.title.toLowerCase(), j);
          }
        });
        return Array.from(titleMap.values());
      });
      showToast(`Merged ${processedJournals.length} journals into active repository (${summary.classACount} Class A, ${summary.classBCount} Class B).`, 'success');
    }
  };

  // Load preset sample dataset
  const handleLoadPresetSample = (sampleType: 'classA_classB' | 'scopus_top10' | 'rsc_waivers') => {
    if (sampleType === 'rsc_waivers') {
      setJournals(RSC_WAIVER_PRESET_JOURNALS);
      showToast('Loaded RSC 100% Waiver & Diamond OA Journal Dataset!', 'success');
    } else if (sampleType === 'scopus_top10') {
      setJournals(SCOPUS_TOP10_PRESET_JOURNALS);
      showToast('Loaded Scopus Top 10% Decile Benchmark Dataset!', 'success');
    } else {
      setJournals(SEED_JOURNALS);
      showToast('Loaded Master Class A & Class B Reference Database!', 'success');
    }
  };

  // Update classification manually
  const handleUpdateJournalClassification = (journalId: string, classification: 'Class A' | 'Class B' | 'Unclassified') => {
    setJournals(prev => prev.map(j => j.id === journalId ? { ...j, classification } : j));
    showToast(`Updated classification to ${classification}`, 'info');
  };

  // Add single journal manually
  const handleAddManualJournal = (newEntry: Partial<Journal>) => {
    const autoClass = evaluateJournalClassification(newEntry.title || '', newEntry.classification);

    const journal: Journal = {
      id: `custom-${Date.now()}`,
      title: newEntry.title || 'Untitled Journal',
      publisher: newEntry.publisher || 'Academic Publisher',
      issn: newEntry.issn,
      classification: autoClass,
      quartile: newEntry.quartile || 'Q1',
      impactFactor: newEntry.impactFactor || null,
      fiveYearIF: null,
      citeScore: null,
      sjr: null,
      isTop10Percent: newEntry.quartile === 'Q1',
      isWosIndexed: true,
      isScopusIndexed: true,
      openAccessType: newEntry.openAccessType || 'Hybrid',
      apcUSD: newEntry.apcUSD || null,
      waiverEligible: !!newEntry.waiverEligible,
      waiverDetails: newEntry.waiverEligible ? '100% waiver applicable for Research4Life/eligible countries' : undefined,
      timeToFirstDecisionDays: newEntry.timeToFirstDecisionDays || 28,
      subjectCategories: newEntry.subjectCategories || ['Multidisciplinary'],
      keywords: newEntry.keywords || ['Academic Research', 'Peer Review'],
      scopeSummary: 'User added academic research journal entry.',
      lastUpdated: 'Manually added'
    };

    setJournals(prev => [journal, ...prev]);
    showToast(`Added "${journal.title}" to database!`, 'success');
  };

  // Manual 100% APC Waiver toggle handler
  const handleToggleWaiver = (journalId: string, isWaived?: boolean) => {
    const journal = journals.find(j => j.id === journalId);
    const nextVal = isWaived !== undefined ? isWaived : !journal?.waiverEligible;

    setJournals(prev => prev.map(j => {
      if (j.id !== journalId) return j;
      return {
        ...j,
        waiverEligible: nextVal,
        userWaiverOverride: nextVal,
        waiverDetails: nextVal ? (j.waiverDetails || '100% APC Waiver active / user verified') : undefined
      };
    }));

    if (activeJournalDetail?.id === journalId) {
      setActiveJournalDetail(prev => {
        if (!prev) return null;
        return {
          ...prev,
          waiverEligible: nextVal,
          userWaiverOverride: nextVal,
          waiverDetails: nextVal ? (prev.waiverDetails || '100% APC Waiver active / user verified') : undefined
        };
      });
    }

    if (nextVal) {
      showToast(`Marked "${journal?.title || 'Journal'}" as 100% APC Waived for you!`, 'success');
    } else {
      showToast(`Unmarked 100% waiver for "${journal?.title || 'Journal'}".`, 'info');
    }
  };

  // Delete journal
  const handleDeleteJournal = (journalId: string) => {
    setJournals(prev => prev.filter(j => j.id !== journalId));
    showToast('Removed journal from database.', 'info');
  };

  // Save notes & status
  const handleSaveNotes = (journalId: string, submissionStatus: Journal['submissionStatus'], userNotes: string) => {
    setJournals(prev => prev.map(j => j.id === journalId ? { ...j, submissionStatus, userNotes } : j));
    if (activeJournalDetail?.id === journalId) {
      setActiveJournalDetail(prev => prev ? { ...prev, submissionStatus, userNotes } : null);
    }
  };

  // Update journal full info
  const handleUpdateJournal = (updated: Journal) => {
    setJournals(prev => prev.map(j => j.id === updated.id ? updated : j));
    setActiveJournalDetail(updated);
    showToast(`Successfully updated information for "${updated.title}".`, 'success');
  };

  // Reset all filters
  const handleResetFilters = () => {
    setFilters(INITIAL_FILTERS);
    showToast('All search filters reset.', 'info');
  };

  // Reset database to initial seed
  const handleResetDatabase = () => {
    setJournals(SEED_JOURNALS);
    setClassARegistry(INITIAL_CLASS_A_TITLES);
    setClassBRegistry(INITIAL_CLASS_B_TITLES);
    showToast('Database reset to original seed dataset.', 'info');
  };

  // Batch update journals from batch enrich tool
  const handleBatchUpdateJournals = (updatedJournals: Journal[]) => {
    setJournals(updatedJournals);
    showToast(`Batch updated ${updatedJournals.length} journals with live verified metrics.`, 'success');
  };

  // Export handlers
  const handleExportExcel = () => {
    exportJournalsToExcel(filteredJournals, 'Journal_Database_Export.xlsx');
    showToast(`Exported ${filteredJournals.length} journals to Excel.`, 'success');
  };

  const handleExportCSV = () => {
    exportJournalsToCSV(filteredJournals, 'Journal_Database_Export.csv');
    showToast(`Exported ${filteredJournals.length} journals to CSV.`, 'success');
  };

  const handleExportJSON = () => {
    exportJournalsToJSON(filteredJournals, 'Journal_Database_Export.json');
    showToast(`Exported ${filteredJournals.length} journals to JSON.`, 'success');
  };

  const comparedJournalsList = React.useMemo(() => {
    return journals.filter(j => selectedForCompare.includes(j.id));
  }, [journals, selectedForCompare]);

  const shortlistedJournalsList = React.useMemo(() => {
    return journals.filter(j => shortlistedIds.includes(j.id));
  }, [journals, shortlistedIds]);

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-[#1a1a1a] flex flex-col font-sans antialiased selection:bg-blue-600 selection:text-white">
      {/* Toast Notification */}
      {toastMessage && (
        <div id="toast-notification" className="fixed top-3 right-3 z-50 animate-in slide-in-from-top-2 fade-in duration-150">
          <div className="bg-slate-900 text-white px-3.5 py-2 rounded shadow-lg border border-slate-700 text-xs font-medium flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* Main App Navigation Header */}
      <Header
        journals={journals}
        comparisonCount={selectedForCompare.length}
        compareCount={selectedForCompare.length}
        shortlistCount={shortlistedIds.length}
        totalJournalsCount={journals.length}
        onOpenUpload={() => setIsUploadModalOpen(true)}
        onOpenMatcher={() => setIsMatcherModalOpen(true)}
        onOpenAISearch={() => setIsAISearchModalOpen(true)}
        onOpenComparison={() => setIsCompareModalOpen(true)}
        onOpenShortlist={() => setIsShortlistModalOpen(true)}
        onOpenDatabaseManager={() => setIsDbManagerModalOpen(true)}
        onExportExcel={handleExportExcel}
        onExportCsv={handleExportCSV}
        onExportJson={handleExportJSON}
      />

      {/* Main Workspace: Sidebar Filters & Results Table/Grid */}
      <main className="flex-1 w-full max-w-[1440px] mx-auto px-3 sm:px-4 py-3 flex flex-col lg:flex-row items-start gap-3">
        {/* Left Filter Sidebar */}
        <FilterSidebar
          filters={filters}
          onFilterChange={setFilters}
          onResetFilters={handleResetFilters}
          availablePublishers={availablePublishers}
          availableCategories={availableCategories}
          totalMatches={filteredJournals.length}
        />

        {/* Center & Right: Journals Table / Grid View */}
        <JournalTable
          journals={filteredJournals}
          selectedForCompare={selectedForCompare}
          shortlistedIds={shortlistedIds}
          enrichingJournalId={enrichingJournalId}
          onToggleCompare={handleToggleCompare}
          onToggleShortlist={handleToggleShortlist}
          onViewJournalDetails={(j) => setActiveJournalDetail(j)}
          onEnrichJournal={handleEnrichJournal}
          onClearFilters={handleResetFilters}
          onToggleWaiver={handleToggleWaiver}
        />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-2.5 text-[11px] text-slate-500">
        <div className="max-w-[1440px] mx-auto px-3 sm:px-4 flex flex-col sm:flex-row items-center justify-between gap-1.5 font-mono">
          <span>
            Scopus & Class A/B Academic AI Journal Intelligence & Submission Finder
          </span>
          <span className="text-slate-400">
            RSC 100% Waivers • WoS / SCIE • Scopus Top 10% • Diamond OA
          </span>
        </div>
      </footer>

      {/* Modals */}
      <JournalDetailModal
        journal={activeJournalDetail}
        onClose={() => setActiveJournalDetail(null)}
        onEnrich={handleEnrichJournal}
        isEnriching={enrichingJournalId === activeJournalDetail?.id}
        onSaveNotes={handleSaveNotes}
        onToggleCompare={handleToggleCompare}
        isCompared={activeJournalDetail ? selectedForCompare.includes(activeJournalDetail.id) : false}
        onToggleWaiver={handleToggleWaiver}
        onUpdateJournal={handleUpdateJournal}
      />

      <UploadDatabaseModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onImportJournals={handleImportJournals}
        onLoadPresetSample={handleLoadPresetSample}
      />

      <AISearchModal
        isOpen={isAISearchModalOpen}
        onClose={() => setIsAISearchModalOpen(false)}
        databaseJournals={journals}
        onSelectJournal={(j) => {
          setIsAISearchModalOpen(false);
          setActiveJournalDetail(j);
        }}
        onToggleShortlist={handleToggleShortlist}
        shortlistedIds={shortlistedIds}
        onApplyJournalFilter={(titles) => {
          setFilters(prev => ({
            ...prev,
            searchQuery: titles[0] || ''
          }));
          showToast(`Filtered table to AI suggested research titles!`, 'success');
        }}
      />

      <ManuscriptMatcher
        isOpen={isMatcherModalOpen}
        onClose={() => setIsMatcherModalOpen(false)}
        databaseJournals={journals}
        onSelectJournal={(j) => {
          setIsMatcherModalOpen(false);
          setActiveJournalDetail(j);
        }}
        onToggleShortlist={handleToggleShortlist}
        shortlistedIds={shortlistedIds}
      />

      <CompareJournalsModal
        isOpen={isCompareModalOpen}
        onClose={() => setIsCompareModalOpen(false)}
        comparedJournals={comparedJournalsList}
        onRemoveFromCompare={handleToggleCompare}
        onClearCompare={() => setSelectedForCompare([])}
        onToggleShortlist={handleToggleShortlist}
        shortlistedIds={shortlistedIds}
        onViewDetails={(j) => {
          setIsCompareModalOpen(false);
          setActiveJournalDetail(j);
        }}
        onToggleWaiver={handleToggleWaiver}
      />

      <TargetShortlistModal
        isOpen={isShortlistModalOpen}
        onClose={() => setIsShortlistModalOpen(false)}
        shortlistedJournals={shortlistedJournalsList}
        onRemoveFromShortlist={(id) => {
          const j = journals.find(item => item.id === id);
          if (j) handleToggleShortlist(j);
        }}
        onUpdateJournalStatus={handleSaveNotes}
        onViewDetails={(j) => {
          setIsShortlistModalOpen(false);
          setActiveJournalDetail(j);
        }}
      />

      <DatabaseManagerModal
        isOpen={isDbManagerModalOpen}
        onClose={() => setIsDbManagerModalOpen(false)}
        journals={journals}
        onUpdateJournalClassification={handleUpdateJournalClassification}
        onAddManualJournal={handleAddManualJournal}
        onDeleteJournal={handleDeleteJournal}
        onOpenUploadModal={() => setIsUploadModalOpen(true)}
        onResetDatabase={handleResetDatabase}
        onBatchUpdateJournals={handleBatchUpdateJournals}
        classARegistry={classARegistry}
        classBRegistry={classBRegistry}
        onUpdateClassARegistry={setClassARegistry}
        onUpdateClassBRegistry={setClassBRegistry}
        onReauditAllClassifications={handleReauditAllClassifications}
      />
    </div>
  );
}

export default App;
