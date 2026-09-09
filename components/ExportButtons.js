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

async function fetchAllRows(endpoint, filters) {
  const pageSize = 100;
  let page = 1;
  let allRows = [];

  while (true) {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('pageSize', String(pageSize));
    if (filters.mobile_number) params.set('mobile_number', filters.mobile_number);
    if (filters.keyword) params.set('keyword', filters.keyword);
    if (filters.start_date) params.set('start_date', filters.start_date);
    if (filters.end_date) params.set('end_date', filters.end_date);

    const response = await fetch(`${endpoint}?${params.toString()}`, {
      credentials: 'include',
    });

    if (response.status === 401) {
      throw new Error('Your session has expired. Please log in again.');
    }

    const json = await response.json();
    if (!response.ok || !json.success) {
      throw new Error(json.error || 'Failed to export report.');
    }

    allRows = allRows.concat(json.data || []);
    const totalPages = json.pagination?.totalPages || 1;
    if (page >= totalPages) break;
    page += 1;
  }

  return allRows;
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

  async function exportReport(format) {
    try {
      setLoading(format);
      const rows = await fetchAllRows(endpoint, filters);

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
    }
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
        {loading === 'csv' ? 'Preparing CSV...' : 'CSV'}
      </button>
      <button
        type="button"
        className="btn btn-export"
        onClick={() => exportReport('xlsx')}
        disabled={!!loading}
      >
        {loading === 'xlsx' ? 'Preparing Excel...' : 'Excel'}
      </button>
    </div>
  );
}
