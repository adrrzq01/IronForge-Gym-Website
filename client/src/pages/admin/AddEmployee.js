import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import Sidebar from '../../components/layout/Sidebar';
import Header from '../../components/layout/Header';

const AddEmployee = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    position: '',
    salary: '',
    shift_start: '',
    shift_end: ''
  });
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...form,
        salary: form.salary ? Number(form.salary) : null
      };
      const response = await axios.post('/api/employees', payload);
      const employeeId = response.data.employeeId || response.data.id;

      // Upload photo if captured
      if (capturedPhoto && employeeId) {
        const formData = new FormData();
        const blob = await fetch(capturedPhoto).then(r => r.blob());
        formData.append('photo', blob, 'employee-photo.jpg');
        await axios.post(`/api/employees/${employeeId}/photo`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }

      toast.success('Employee created');
      navigate('/employees');
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to create employee';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const startCamera = async () => {
    try {
      setCameraError('');
      setVideoReady(false);
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        setShowCamera(true);
        videoRef.current.onloadedmetadata = async () => {
          try { await videoRef.current.play(); } catch (e) {}
          setTimeout(() => {
            if (videoRef.current && videoRef.current.videoWidth > 0) setVideoReady(true);
          }, 200);
        };
        setTimeout(() => {
          if (videoRef.current && videoRef.current.videoWidth === 0) {
            setCameraError('Camera started but no video frames available. Check permissions.');
          }
        }, 1000);
      }
    } catch (err) {
      setCameraError(err?.message || 'Failed to access camera');
      toast.error('Camera access denied');
    }
  };

  const stopCamera = () => {
    if (videoRef.current) {
      const stream = videoRef.current.srcObject;
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
      try { videoRef.current.srcObject = null; } catch (e) {}
    }
    setShowCamera(false);
    setVideoReady(false);
    setCameraError('');
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      if (!videoReady) { toast.error('Camera not ready'); return; }
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const ctx = canvas.getContext('2d');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      setCapturedPhoto(dataUrl);
      stopCamera();
    }
  };

  const retakePhoto = () => {
    setCapturedPhoto(null);
    startCamera();
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <div className="lg:pl-64">
        <Header />
        <main className="py-6">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Add Employee</h1>
              <Link to="/employees" className="btn btn-secondary btn-md">Cancel</Link>
            </div>

            <form onSubmit={handleSubmit} className="card p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="label">Full Name</label>
                <input name="name" className="input mt-2" required value={form.name} onChange={handleChange} />
              </div>
              <div>
                <label className="label">Email</label>
                <input name="email" type="email" className="input mt-2" required value={form.email} onChange={handleChange} />
              </div>
              <div>
                <label className="label">Phone</label>
                <input name="phone" className="input mt-2" required value={form.phone} onChange={handleChange} />
              </div>
              <div>
                <label className="label">Position</label>
                <select name="position" className="input mt-2" required value={form.position} onChange={handleChange}>
                  <option value="">Select position</option>
                  <option value="gym_manager">Gym Manager</option>
                  <option value="front_desk">Front Desk / Receptionist</option>
                  <option value="personal_trainer">Personal Trainer / Coach</option>
                  <option value="group_instructor">Group Fitness Instructor</option>
                  <option value="cleaning_staff">Cleaning / Maintenance</option>
                  <option value="sales_executive">Sales / Membership Executive</option>
                  <option value="nutritionist">Nutritionist</option>
                  <option value="physiotherapist">Physiotherapist</option>
                </select>
              </div>

              {/* Employee Photo capture */}
              <div className="md:col-span-2">
                <label className="label">Employee Photo</label>
                <div className="mt-2">
                  {!capturedPhoto && !showCamera && (
                    <div>
                      <button type="button" onClick={startCamera} className="btn btn-secondary btn-md">
                        Take Photo
                      </button>
                    </div>
                  )}

                  {showCamera && (
                    <div className="space-y-3">
                      <video ref={videoRef} autoPlay playsInline className="w-full max-w-md rounded-lg" />
                      {!videoReady && <p className="text-sm text-gray-600">Waiting for camera preview...</p>}
                      {cameraError && <p className="text-sm text-red-600">{cameraError}</p>}
                      <div className="space-x-2">
                        <button type="button" onClick={capturePhoto} className="btn btn-primary btn-md">Capture</button>
                        <button type="button" onClick={stopCamera} className="btn btn-secondary btn-md">Cancel</button>
                      </div>
                    </div>
                  )}

                  {capturedPhoto && (
                    <div className="space-y-3">
                      <img src={capturedPhoto} alt="Captured" className="w-32 h-32 object-cover rounded-lg" />
                      <div className="space-x-2">
                        <button type="button" onClick={retakePhoto} className="btn btn-secondary btn-sm">Retake</button>
                      </div>
                    </div>
                  )}
                </div>
                <canvas ref={canvasRef} className="hidden" />
              </div>
              <div>
                <label className="label">Salary (₹)</label>
                <input name="salary" type="number" min="0" className="input mt-2" value={form.salary} onChange={handleChange} />
              </div>
              <div>
                <label className="label">Shift Start</label>
                <input name="shift_start" type="time" className="input mt-2" value={form.shift_start} onChange={handleChange} />
              </div>
              <div>
                <label className="label">Shift End</label>
                <input name="shift_end" type="time" className="input mt-2" value={form.shift_end} onChange={handleChange} />
              </div>

              <div className="md:col-span-2 flex justify-end gap-3">
                <Link to="/employees" className="btn btn-secondary btn-md">Cancel</Link>
                <button disabled={loading} className="btn btn-primary btn-md">
                  {loading ? 'Saving...' : 'Save Employee'}
                </button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AddEmployee;


