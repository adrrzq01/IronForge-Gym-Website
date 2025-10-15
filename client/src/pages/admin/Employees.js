import React from 'react';
import Sidebar from '../../components/layout/Sidebar';
import Header from '../../components/layout/Header';
import { useEffect, useState } from 'react';
import DataTable from '../../components/common/DataTable';
import api from '../../lib/api';

const Employees = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <div className="lg:pl-64">
        <Header />
        <main className="py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              Employees Management
            </h1>
            <EmployeesTable />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Employees;

function EmployeesTable() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');

  const fetchData = async (p = page) => {
    setLoading(true);
    try {
      const { data } = await api.get('/employees', { params: { page: p, limit: 10, search, status } });
      const employees = data.employees || [];
      setRows(employees.map(e => ({
        ...e,
        actions: (
          <div className="space-x-2">
            <a href={`/employees/${e.id}`} className="btn btn-secondary btn-sm">View</a>
            <a href={`/employees/${e.id}/edit`} className="btn btn-secondary btn-sm">Edit</a>
          </div>
        )
      })));
      setPage(data.pagination?.current || 1);
      setPages(data.pagination?.pages || 1);
      setTotal(data.pagination?.total || 0);
    } catch (e) {
      setRows([]); setPages(1); setTotal(0);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(1); /* eslint-disable-next-line */ }, [search, status]);

  const columns = [
    { key: 'name', title: 'Name', dataIndex: 'name' },
    { key: 'email', title: 'Email', dataIndex: 'email' },
    { key: 'phone', title: 'Phone', dataIndex: 'phone' },
    { key: 'position', title: 'Position', dataIndex: 'position' },
    { key: 'status', title: 'Status', dataIndex: 'is_active', render: (v)=> (
      <span className={`px-2 py-1 rounded text-xs font-semibold ${v? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200':'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200'}`}>{v? 'Active':'Inactive'}</span>
    )}
  ];

  return (
    <div className="space-y-4">
      <div className="card p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex gap-3">
          <input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Search name/email/phone" className="input" />
          <select value={status} onChange={(e)=>setStatus(e.target.value)} className="input">
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <a href="/employees/new" className="btn btn-primary btn-md">Add Employee</a>
      </div>

      <DataTable
        columns={columns}
        data={rows}
        loading={loading}
        page={page}
        pages={pages}
        total={total}
        onPageChange={(p)=>{ setPage(p); fetchData(p); }}
      />
    </div>
  );
}
