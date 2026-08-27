import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { Journal } from '../types';

export const exportJournalsToExcel = (journals: Journal[], fileName = 'Journal_Database_Export.xlsx') => {
  const data = journals.map(j => ({
    'Journal Title': j.title,
    'Classification': j.classification,
    'Publisher': j.publisher,
    'Quartile': j.quartile,
    'Impact Factor (IF)': j.impactFactor ?? 'N/A',
    '5-Year IF': j.fiveYearIF ?? 'N/A',
    'CiteScore': j.citeScore ?? 'N/A',
    'SJR': j.sjr ?? 'N/A',
    'SNIP': j.snip ?? 'N/A',
    'WoS Indexed': j.isWosIndexed ? 'Yes' : 'No',
    'WoS Collection': j.wosCollection ?? 'SCIE',
    'Scopus Indexed': j.isScopusIndexed ? 'Yes' : 'No',
    'Scopus Top 10%': j.isTop10Percent ? 'Yes' : 'No',
    'Open Access Type': j.openAccessType,
    'APC (USD)': j.apcUSD !== null ? `$${j.apcUSD}` : 'Free/Unspecified',
    'APC Details': j.apcDetails ?? '',
    '100% Waiver Eligible': j.waiverEligible ? 'Yes' : 'No',
    'Waiver Details / Terms': j.waiverDetails ?? 'N/A',
    'Time to First Decision (Days)': j.timeToFirstDecisionDays ?? 'N/A',
    'Review Turnaround (Weeks)': j.reviewTimeWeeks ?? 'N/A',
    'Publication Speed Notes': j.publicationSpeedNotes ?? '',
    'Acceptance Rate (%)': j.acceptanceRate ? `${j.acceptanceRate}%` : 'N/A',
    'ISSN': j.issn ?? 'N/A',
    'E-ISSN': j.eIssn ?? 'N/A',
    'Subject Categories': Array.isArray(j.subjectCategories) ? j.subjectCategories.join(', ') : '',
    'Keywords': Array.isArray(j.keywords) ? j.keywords.join(', ') : '',
    'Scope Summary': j.scopeSummary ?? '',
    'Official Homepage URL': j.homePageUrl ?? 'N/A',
    'Submission Portal URL': j.submissionPortalUrl ?? 'N/A',
    'Submission Status': j.submissionStatus ?? 'None',
    'User Research Notes': j.userNotes ?? '',
    'Last Metric Update': j.lastUpdated ?? 'N/A'
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Academic Journals');
  XLSX.writeFile(workbook, fileName);
};

export const exportJournalsToCsv = (journals: Journal[], fileName = 'Journal_Database_Export.csv') => {
  const data = journals.map(j => ({
    'Journal Title': j.title,
    'Classification': j.classification,
    'Publisher': j.publisher,
    'Quartile': j.quartile,
    'Impact Factor': j.impactFactor ?? '',
    '5-Year IF': j.fiveYearIF ?? '',
    'CiteScore': j.citeScore ?? '',
    'SJR': j.sjr ?? '',
    'SNIP': j.snip ?? '',
    'WoS Indexed': j.isWosIndexed ? 'Yes' : 'No',
    'WoS Collection': j.wosCollection ?? 'SCIE',
    'Scopus Indexed': j.isScopusIndexed ? 'Yes' : 'No',
    'Scopus Top 10%': j.isTop10Percent ? 'Yes' : 'No',
    'Open Access Type': j.openAccessType,
    'APC (USD)': j.apcUSD !== null ? j.apcUSD : '',
    '100% Waiver': j.waiverEligible ? 'Yes' : 'No',
    'Waiver Policy': j.waiverDetails ?? '',
    'Time to First Decision (Days)': j.timeToFirstDecisionDays ?? '',
    'Review Turnaround (Weeks)': j.reviewTimeWeeks ?? '',
    'Acceptance Rate': j.acceptanceRate ? `${j.acceptanceRate}%` : '',
    'ISSN': j.issn ?? '',
    'E-ISSN': j.eIssn ?? '',
    'Categories': Array.isArray(j.subjectCategories) ? j.subjectCategories.join('; ') : '',
    'Homepage': j.homePageUrl ?? '',
    'Submission Portal': j.submissionPortalUrl ?? '',
    'Status': j.submissionStatus ?? '',
    'Notes': j.userNotes ?? ''
  }));

  const csv = Papa.unparse(data);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportJournalsToJson = (journals: Journal[], fileName = 'Journal_Database_Export.json') => {
  const jsonStr = JSON.stringify(journals, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportJournalsToCSV = exportJournalsToCsv;
export const exportJournalsToJSON = exportJournalsToJson;
