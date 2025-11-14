import React from 'react';

const DataTable = ({
  columns = [],
  data = [],
  loading = false,
  page = 1,
  pages = 1,
  total = 0,
  onPageChange,
  emptyMessage = "No results"
}) => {
  // Defensively ensure data is an array
  const safeData = Array.isArray(data) ? data.filter(Boolean) : [];

  // Helper: determine accessor/key for a column safely
  const getAccessorKey = (col) => {
    // Prefer explicit accessor field if provided
    if (col.accessor != null) {
      // accessor can be a string (key) or a function
      if (typeof col.accessor === 'function') return col.accessor;
      return String(col.accessor);
    }

    // Otherwise try header -> safe lowercased key (only if header is a non-empty string)
    if (typeof col.header === 'string' && col.header.trim().length > 0) {
      return col.header.trim().toLowerCase();
    }

    // Last resort: use column index label (will be handled by render fallback)
    return null;
  };

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              {columns.map((c, idx) => (
                <th
                  key={c.header ?? idx}
                  className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider"
                >
                  {c.header ?? ''}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
            {loading ? (
              <tr><td colSpan={Math.max(columns.length, 1)} className="px-4 py-8 text-center text-gray-500">Loading...</td></tr>
            ) : safeData.length === 0 ? (
              <tr><td colSpan={Math.max(columns.length, 1)} className="px-4 py-8 text-center text-gray-500">{emptyMessage}</td></tr>
            ) : (
              safeData.map((row, rowIndex) => {
                // Defensive: skip any null / primitive rows
                if (!row || typeof row !== 'object') return null;

                const key = row.id ?? row.booking_id ?? row.schedule_id ?? rowIndex;
                return (
                  <tr key={key} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    {columns.map((c, colIndex) => {
                      // Determine accessor
                      const accessor = getAccessorKey(c);

                      // Resolve cell value safely
                      let cellValue = '—';
                      try {
                        if (typeof c.render === 'function') {
                          // custom render takes precedence
                          cellValue = c.render(row, rowIndex);
                        } else if (typeof accessor === 'function') {
                          cellValue = accessor(row, rowIndex);
                        } else if (typeof accessor === 'string') {
                          // support nested keys like 'sch.start_time'
                          if (accessor.includes('.')) {
                            const parts = accessor.split('.');
                            let cur = row;
                            for (const p of parts) {
                              cur = cur?.[p];
                              if (cur == null) break;
                            }
                            cellValue = cur ?? '—';
                          } else {
                            cellValue = row?.[accessor] ?? '—';
                          }
                        } else {
                          // fallback: try some common keys
                          cellValue = row?.[c.header?.toLowerCase?.()] ?? row?.start_time ?? row?.startTime ?? row?.service_name ?? '—';
                        }
                      } catch (err) {
                        console.error('DataTable cell render error', { col: c, row, err });
                        cellValue = '—';
                      }

                      // Final formatting: if it's a Date-like string and column suggests start_time, show nice format
                      const isLikelyDate = typeof cellValue === 'string' && (c.header?.toLowerCase?.().includes('start') || c.accessor === 'start_time' || c.accessor === 'startTime');
                      const display = isLikelyDate && Date.parse(cellValue) ? new Date(cellValue).toLocaleString() : (cellValue ?? '—');

                      return (
                        <td key={c.header ?? colIndex} className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                          {display}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {onPageChange && total > 0 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <p className="text-sm text-gray-600 dark:text-gray-300">Page {page} of {pages} · {total} total</p>
          <div className="space-x-2">
            <button className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>Prev</button>
            <button className="btn btn-secondary btn-sm" disabled={page >= pages} onClick={() => onPageChange(page + 1)}>Next</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTable;
