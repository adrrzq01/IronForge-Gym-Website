import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import Sidebar from '../../components/layout/Sidebar';
import Header from '../../components/layout/Header';

const EditEmployee = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    position: '',
    salary: '',
    shift_start: '',
    shift_end: '',
    is_active: true
  });

  useEffect(() => {
    loadEmployee();
  }, [id]);

  const loadEmployee = async () => {
    try {
      const { data } = await axios.get(`/api/employees/${id}`);
      const e = data.employee;
      setForm({
        name: e.name || '',
        email: e.email || '',
        phone: e.phone || '',
        position: e.position || '',
        salary: e.salary || '',
        shift_start: e.shift_start || '',
        shift_end: e.shift_end || '',
        is_active: e.is_active !== false
      });
      if (e.photo_path) {
        setCapturedPhoto(e.photo_path);
      }
    } catch (err) {
      toast.error('Failed to load employee details');
      navigate('/employees');
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
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
            if (videoRef.current && videoRef.current.videoWidth > 0) {
              setVideoReady(true);
            }
          }, 200);
        };
      }
    } catch (err) {
      const msg = err?.name === 'NotAllowedError' ? 'Camera access denied' : (err?.message || 'Failed to access camera');
      setCameraError(msg);
      toast.error(msg);
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
      if (!videoReady) {
        toast.error('Camera not ready');
        return;
      }
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...form,
        salary: form.salary ? Number(form.salary) : null
      };

      await axios.put(`/api/employees/${id}`, payload);

      // Upload new photo if captured as dataURL
      if (capturedPhoto && capturedPhoto.startsWith('data:')) {
        const formData = new FormData();
        const blob = await fetch(capturedPhoto).then(r => r.blob());
        formData.append('photo', blob, 'employee-photo.jpg');
        await axios.post(`/api/employees/${id}/photo`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }

      toast.success('Employee updated');
      navigate('/employees');
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to update employee';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <div className="lg:pl-64">
        <Header />
        <main className="py-6">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Edit Employee</h1>
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

              {/* Employee Photo */}
              <div className="md:col-span-2">
                <label className="label">Employee Photo</label>
                <div className="mt-2">
                  {!capturedPhoto && !showCamera && (
                    <div>
                      <button type="button" onClick={startCamera} className="btn btn-secondary btn-md">
                        Take New Photo
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
                        <button type="button" onClick={retakePhoto} className="btn btn-secondary btn-sm">Retake Photo</button>
                        <label className="btn btn-sm btn-secondary">
                          Upload from device
                          <input
                            type="file"
                            accept="image/*"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const formData = new FormData();
                              formData.append('photo', file);
                              try {
                                await axios.post(`/api/employees/${id}/photo`, formData, {
                                  headers: { 'Content-Type': 'multipart/form-data' }
                                });
                                toast.success('Photo uploaded');
                                loadEmployee();
                              } catch (err) {
                                toast.error('Upload failed');
                              }
                            }}
                            className="hidden"
                          />
                        </label>
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

              <div className="md:col-span-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    name="is_active"
                    checked={form.is_active}
                    onChange={handleChange}
                    className="rounded border-gray-300"
                  />
                  <span className="label">Active Employee</span>
                </label>
              </div>

              <div className="md:col-span-2 flex justify-end gap-3">
                <Link to="/employees" className="btn btn-secondary btn-md">Cancel</Link>
                <button disabled={loading} className="btn btn-primary btn-md">
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
};

export default EditEmployee;