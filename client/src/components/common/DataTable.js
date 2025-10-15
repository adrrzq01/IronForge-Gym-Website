import React from 'react';

const DataTable = ({
  columns,
  data,
  loading,
  page,
  pages,
  total,
  onPageChange
}) => {
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              {columns.map((c) => (
                <th key={c.key} className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  {c.title}
                </th>
              ))}
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
            {loading ? (
              <tr><td colSpan={columns.length + 1} className="px-4 py-8 text-center text-gray-500">Loading...</td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan={columns.length + 1} className="px-4 py-8 text-center text-gray-500">No results</td></tr>
            ) : (
              data.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  {columns.map((c) => (
                    <td key={c.key} className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                      {c.render ? c.render(row[c.dataIndex], row) : row[c.dataIndex]}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-right">
                    {row.actions}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <p className="text-sm text-gray-600 dark:text-gray-300">Page {page} of {pages} · {total} total</p>
        <div className="space-x-2">
          <button className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>Prev</button>
          <button className="btn btn-secondary btn-sm" disabled={page >= pages} onClick={() => onPageChange(page + 1)}>Next</button>
        </div>
      </div>
    </div>
  );
};

export default DataTable;


