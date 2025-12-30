/**
 * Export Helpers - CSV and JSON export utilities
 * Provides client-side utilities for downloading data in various formats
 */

/**
 * Convert array of objects to CSV format
 * Handles special characters, escaping, and UTF-8 encoding
 */
export function convertToCSV(data: any[]): string {
  if (data.length === 0) {
    return '';
  }

  // Get headers from first object
  const headers = Object.keys(data[0]);

  // Create header row
  const csvRows = [
    headers.map(header => escapeCSVField(String(header))).join(','),
  ];

  // Add data rows
  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header];
      return escapeCSVField(String(value ?? ''));
    });
    csvRows.push(values.join(','));
  }

  return csvRows.join('\n');
}

/**
 * Escape CSV field values to handle commas, quotes, and newlines
 */
function escapeCSVField(field: string): string {
  // If field contains comma, quote, or newline, wrap in quotes and escape inner quotes
  if (field.includes(',') || field.includes('"') || field.includes('\n')) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

/**
 * Download CSV file to client
 * Adds BOM for UTF-8 to ensure proper encoding in Excel
 */
export function downloadCSV(data: any[], filename: string): void {
  const csv = convertToCSV(data);

  // Add UTF-8 BOM for Excel compatibility with Assamese/Hindi characters
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });

  downloadFile(blob, `${filename}-${getCurrentDateString()}.csv`);
}

/**
 * Download JSON file to client
 */
export function downloadJSON(data: any, filename: string): void {
  const jsonContent = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });

  downloadFile(blob, `${filename}-${getCurrentDateString()}.json`);
}

/**
 * Generic file download helper
 * Creates blob and triggers browser download
 */
function downloadFile(blob: Blob, filename: string): void {
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();

  // Cleanup
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Get current date in YYYY-MM-DD format
 */
function getCurrentDateString(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Format data for CSV export with headers
 * Transforms nested objects to flat structure
 */
export function formatForExport(data: any[], columns?: string[]): any[] {
  if (!data.length) return [];

  return data.map(row => {
    if (columns) {
      // Only include specified columns
      const filtered: any = {};
      for (const col of columns) {
        filtered[col] = row[col];
      }
      return filtered;
    }
    return row;
  });
}

/**
 * Export configuration for different data types
 */
export const EXPORT_CONFIGS = {
  studentProgress: {
    filename: 'student-progress',
    columns: ['name', 'email', 'progress', 'mastery_score', 'last_active_at', 'at_risk'],
  },
  aiInteractions: {
    filename: 'ai-interactions',
    columns: ['student_name', 'topic_id', 'message', 'role', 'language', 'created_at', 'tokens_used'],
  },
  assessmentResults: {
    filename: 'assessment-results',
    columns: ['student_name', 'session_id', 'total_questions', 'correct_answers', 'score', 'submitted_at'],
  },
} as const;
