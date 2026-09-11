import { useState } from 'react';
import * as XLSX from 'xlsx';

function getValue(row, column) {
  if (column.key === 'source_table') {
    const map = {
      keyword1: 'Keyword 1',
      keyword2: 'Keyword 2',
      keyword3: 'Keyword 3',
      keyword_selected: 'Keyword Selected',
    };
    return map[row.source_table] || row.source_table || '-';
  }
  const value = row[column.key];
  return value == null || value === '' ? '-' : value;
}

// Bulk export tuning: bigger pages means fewer round-trips, and fetching
// several pages concurrently means we're not just sitting idle waiting on
// network latency between each request. 5 concurrent requests is a
// deliberately modest number -- it speeds things up a lot without hammering
// Supabase with a huge burst from a single export click.
const EXPORT_PAGE_SIZE = 1000;
const EXPORT_CONCURRENCY = 5;

function buildExportUrl(endpoint, filters, page) {
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('pageSize', String(EXPORT_PAGE_SIZE));
  if (filters.mobile_number) params.set('mobile_number', filters.mobile_number);
  if (filters.keyword) params.set('keyword', filters.keyword);
  if (filters.start_date) params.set('start_date', filters.start_date);
  if (filters.end_date) params.set('end_date', filters.end_date);
  return `${endpoint}?${params.toString()}`;
}

async function fetchExportPage(endpoint, filters, page) {
  const response = await fetch(buildExportUrl(endpoint, filters, page), { credentials: 'include' });

  if (response.status === 401) {
    throw new Error('Your session has expired. Please log in again.');
  }

  const json = await response.json();
  if (!response.ok || !json.success) {
    throw new Error(json.error || 'Failed to export report.');
  }
  return json;
}

async function fetchAllRows(endpoint, filters, onProgress) {
  // First request tells us how many total pages there are at EXPORT_PAGE_SIZE.
  const first = await fetchExportPage(endpoint, filters, 1);
  const totalPages = first.pagination?.totalPages || 1;

  const pagesByIndex = new Array(totalPages);
  pagesByIndex[0] = first.data || [];
  let completed = 1;
  if (onProgress) onProgress(completed, totalPages);

  const remainingPages = [];
  for (let p = 2; p <= totalPages; p += 1) remainingPages.push(p);

  let cursor = 0;
  async function worker() {
    while (cursor < remainingPages.length) {
      const page = remainingPages[cursor];
      cursor += 1;
      const json = await fetchExportPage(endpoint, filters, page);
      pagesByIndex[page - 1] = json.data || [];
      completed += 1;
      if (onProgress) onProgress(completed, totalPages);
    }
  }

  const workerCount = Math.min(EXPORT_CONCURRENCY, remainingPages.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));

  return pagesByIndex.flat();
}

function makeCsv(rows, columns) {
  const escapeCsv = (value) => {
    const text = String(value ?? '');
    return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };

  const header = columns.map((column) => escapeCsv(column.label)).join(',');
  const body = rows.map((row) => columns.map((column) => escapeCsv(getValue(row, column))).join(','));
  return '\uFEFF' + [header, ...body].join('\r\n');
}

function downloadBlob(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export default function ExportButtons({ endpoint, filters, columns, filename }) {
  const [loading, setLoading] = useState('');
  const [progress, setProgress] = useState(null); // { completed, totalPages } | null

  async function exportReport(format) {
    try {
      setLoading(format);
      setProgress(null);
      const rows = await fetchAllRows(endpoint, filters, (completed, totalPages) => {
        setProgress({ completed, totalPages });
      });

      if (format === 'csv') {
        downloadBlob(
          makeCsv(rows, columns),
          `${filename}.csv`,
          'text/csv;charset=utf-8;'
        );
        return;
      }

      const worksheetRows = rows.map((row) => {
        const item = {};
        columns.forEach((column) => {
          item[column.label] = getValue(row, column);
        });
        return item;
      });

      const worksheet = XLSX.utils.json_to_sheet(worksheetRows);
      worksheet['!cols'] = columns.map((column) => ({ wch: Math.max(12, Math.min(40, column.label.length + 8)) }));
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');
      XLSX.writeFile(workbook, `${filename}.xlsx`);
    } catch (error) {
      window.alert(error.message || 'Failed to export report.');
    } finally {
      setLoading('');
      setProgress(null);
    }
  }

  function labelFor(format, idleLabel, preparingLabel) {
    if (loading !== format) return idleLabel;
    if (progress && progress.totalPages > 1) {
      const pct = Math.round((progress.completed / progress.totalPages) * 100);
      return `${preparingLabel} ${pct}%`;
    }
    return preparingLabel;
  }

  return (
    <div className="export-actions">
      <span className="export-label">Download:</span>
      <button
        type="button"
        className="btn btn-export"
        onClick={() => exportReport('csv')}
        disabled={!!loading}
      >
        {labelFor('csv', 'CSV', 'Preparing CSV...')}
      </button>
      <button
        type="button"
        className="btn btn-export"
        onClick={() => exportReport('xlsx')}
        disabled={!!loading}
      >
        {labelFor('xlsx', 'Excel', 'Preparing Excel...')}
      </button>
    </div>
  );
}