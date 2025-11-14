import React, { useState, useEffect, useRef } from 'react';
import Sidebar from '../../components/layout/Sidebar';
import Header from '../../components/layout/Header';
import { Camera } from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import DataTable from '../../components/common/DataTable';

const Attendance = () => {
  const [members, setMembers] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCamera, setShowCamera] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [todayAttendance, setTodayAttendance] = useState([]);
  const [stats, setStats] = useState(null);
  const [dateRange, setDateRange] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    loadMembers();
    loadTodayAttendance();
    loadStats();
  }, []);

  const loadMembers = async () => {
    try {
      const { data } = await api.get('/members');
      setMembers(data.members || []);
    } catch (e) {
      toast.error('Failed to load members');
    }
  };

  const loadTodayAttendance = async () => {
    try {
      const { data } = await api.get('/attendance/today');
      setTodayAttendance(data.attendance || []);
    } catch (e) {
      toast.error('Failed to load today\'s attendance');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const { data } = await api.get('/attendance/stats');
      setStats(data.stats || []);
    } catch (e) {
      console.error('Failed to load attendance stats');
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setShowCamera(true);
      }
    } catch (err) {
      toast.error('Failed to access camera');
    }
  };

  const stopCamera = () => {
    if (videoRef.current) {
      const stream = videoRef.current.srcObject;
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      videoRef.current.srcObject = null;
    }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const context = canvas.getContext('2d');
    context.drawImage(video, 0, 0);
    
    return canvas.toDataURL('image/jpeg');
  };

  const handleCheckIn = async () => {
    if (!selectedMember) {
      toast.error('Please select a member');
      return;
    }

    setCapturing(true);
    try {
      let photoData = null;
      if (showCamera) {
        photoData = capturePhoto();
        if (photoData) {
          const blob = await fetch(photoData).then(r => r.blob());
          const formData = new FormData();
          formData.append('photo', blob, 'checkin.jpg');
          formData.append('memberId', selectedMember);
          
          await api.post('/attendance/checkin', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
        }
      } else {
        await api.post('/attendance/checkin', { memberId: selectedMember });
      }

      toast.success('Check-in successful');
      loadTodayAttendance();
      stopCamera();
      setSelectedMember(null);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Check-in failed');
    } finally {
      setCapturing(false);
    }
  };

  const handleCheckOut = async (memberId) => {
    try {
      await api.post('/attendance/checkout', { memberId });
      toast.success('Check-out successful');
      loadTodayAttendance();
    } catch (e) {
      toast.error('Check-out failed');
    }
  };

  const attendanceColumns = [
    { key: 'member_name', title: 'Member', dataIndex: 'member_name' },
    { 
      key: 'check_in_time', 
      title: 'Check In', 
      render: (row) => new Date(row.check_in_time).toLocaleTimeString() 
    },
    { 
      key: 'check_out_time', 
      title: 'Check Out', 
      render: (row) => row.check_out_time ? new Date(row.check_out_time).toLocaleTimeString() : '—'
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (row) => !row.check_out_time && (
        <button 
          onClick={() => handleCheckOut(row.member_id)}
          className="btn btn-secondary btn-sm"
        >
          Check Out
        </button>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <div className="lg:pl-64">
        <Header />
        <main className="py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Attendance Management
              </h1>
            </div>

            {/* Check-in Form */}
            <div className="card p-6 mb-6">
              <h2 className="text-lg font-medium mb-4">Member Check-in</h2>
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <select
                    value={selectedMember || ''}
                    onChange={(e) => setSelectedMember(e.target.value)}
                    className="input w-full"
                  >
                    <option value="">Select Member</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-2">
                  {!showCamera ? (
                    <button
                      onClick={startCamera}
                      className="btn btn-secondary"
                      disabled={!selectedMember}
                    >
                      <Camera className="w-4 h-4 mr-2" />
                      Take Photo
                    </button>
                  ) : (
                    <button
                      onClick={stopCamera}
                      className="btn btn-secondary"
                    >
                      Cancel Photo
                    </button>
                  )}
                  
                  <button
                    onClick={handleCheckIn}
                    className="btn btn-primary"
                    disabled={!selectedMember || capturing}
                  >
                    {capturing ? 'Processing...' : 'Check In'}
                  </button>
                </div>
              </div>

              {showCamera && (
                <div className="mt-4">
                  <video
                    ref={videoRef}
                    style={{ width: '100%', maxWidth: '400px' }}
                    autoPlay
                    playsInline
                  />
                  <canvas ref={canvasRef} style={{ display: 'none' }} />
                </div>
              )}
            </div>

            {/* Today's Attendance */}
            <div className="card p-6">
              <h2 className="text-lg font-medium mb-4">Today's Attendance</h2>
              <DataTable
                columns={attendanceColumns}
                data={todayAttendance}
                loading={loading}
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Attendance;
