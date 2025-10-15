import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Sidebar from '../../components/layout/Sidebar';
import Header from '../../components/layout/Header';
import api from '../../lib/api';
import toast from 'react-hot-toast';

const MemberDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [member, setMember] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [payments, setPayments] = useState([]);

  const load = async () => {
    setLoading(true);
    try {
      const [mRes, aRes, pRes] = await Promise.all([
        api.get(`/members/${id}`),
        api.get(`/members/${id}/attendance`, { params: { page: 1, limit: 5 } }),
        api.get(`/payments/member/${id}`, { params: { page: 1, limit: 5 } })
      ]);
      setMember(mRes.data.member);
      setAttendance(aRes.data.attendance || []);
      setPayments(pRes.data.payments || []);
    } catch (e) {
      toast.error('Failed to load member');
      navigate('/members');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  const onPhotoSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append('photo', file);
    try {
      await api.post(`/members/${id}/photo`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Photo updated');
      load();
    } catch (e) {
      toast.error('Photo upload failed');
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900"><Sidebar /><div className="lg:pl-64"><Header /><div className="p-8">Loading...</div></div></div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <div className="lg:pl-64">
        <Header />
        <main className="py-6">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Member Detail</h1>
              <div className="space-x-2">
                <Link to={`/members/${id}/edit`} className="btn btn-primary btn-md">Edit</Link>
                <Link to="/members" className="btn btn-secondary btn-md">Back</Link>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="card p-6">
                <div className="flex items-center gap-4">
                  <div className="h-20 w-20 rounded-xl overflow-hidden bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                    {member.photo_path ? (
                      <img src={member.photo_path} alt="member" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-2xl">👤</span>
                    )}
                  </div>
                  <div>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">{member.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{member.email}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{member.phone}</p>
                  </div>
                </div>
                <div className="mt-4">
                  <label className="label">Update Photo</label>
                  <input type="file" accept="image/*" onChange={onPhotoSelected} className="mt-2" />
                </div>
              </div>

              <div className="card p-6 lg:col-span-2">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Plan</p>
                    <p className="font-semibold">{member.plan_name || '—'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Payment Status</p>
                    <p className="font-semibold capitalize">{member.payment_status || 'pending'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Payment Due</p>
                    <p className="font-semibold">{member.payment_due_date || '—'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Address</p>
                    <p className="font-semibold">{member.address}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Identity Document</p>
                    <p className="font-semibold">
                      {member.aadhaar ? `Aadhaar: ****${member.aadhaar.slice(-4)}` : 
                       member.pan ? `PAN: ****${member.pan.slice(-4)}` :
                       member.driving_license ? `License: ****${member.driving_license.slice(-4)}` :
                       member.passport ? `Passport: ****${member.passport.slice(-4)}` : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Student Status</p>
                    <p className="font-semibold">
                      {member.is_student ? (
                        <span className="text-green-600">🎓 Student (25% discount)</span>
                      ) : (
                        'Regular member'
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Join Date</p>
                    <p className="font-semibold">{member.join_date || '—'}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="card p-6">
                <h3 className="text-lg font-semibold mb-4">Recent Attendance</h3>
                <ul className="space-y-2 text-sm">
                  {attendance.slice(0,5).map(a => (
                    <li key={a.id} className="flex justify-between"><span>{new Date(a.check_in_time).toLocaleString()}</span><span>{a.check_out_time ? 'Completed' : 'In Gym'}</span></li>
                  ))}
                  {attendance.length === 0 && <li className="text-gray-500">No attendance yet</li>}
                </ul>
              </div>
              <div className="card p-6">
                <h3 className="text-lg font-semibold mb-4">Recent Payments</h3>
                <ul className="space-y-2 text-sm">
                  {payments.slice(0,5).map(p => (
                    <li key={p.id} className="flex justify-between"><span>{new Date(p.payment_date).toLocaleDateString()}</span><span>₹{Number(p.amount).toLocaleString()}</span></li>
                  ))}
                  {payments.length === 0 && <li className="text-gray-500">No payments yet</li>}
                </ul>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default MemberDetail;


