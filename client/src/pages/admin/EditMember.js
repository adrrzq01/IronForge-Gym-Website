import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import Sidebar from '../../components/layout/Sidebar';
import Header from '../../components/layout/Header';
import { Camera, RotateCcw } from 'lucide-react';

const EditMember = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [videoDevices, setVideoDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [form, setForm] = useState({
    name: '', age: '', gender: 'male', email: '', phone: '', address: '',
    emergency_contact_name: '', emergency_contact_phone: '', identity_type: '', identity_number: '', is_student: false,
    plan_id: '', payment_due_date: ''
  });

  useEffect(() => {
    const loadPlans = async () => {
      try {
        const { data } = await axios.get('/api/plans');
        setPlans(data.plans || []);
      } catch (e) {
        setPlans([]);
      }
    };
    loadPlans();
  }, []);

  const loadMember = React.useCallback(async () => {
    try {
      const { data } = await axios.get(`/api/members/${id}`);
      const m = data.member;
      setForm({
        name: m.name || '', age: m.age || '', gender: m.gender || 'male', email: m.email || '', phone: m.phone || '', address: m.address || '',
        emergency_contact_name: m.emergency_contact_name || '', emergency_contact_phone: m.emergency_contact_phone || '',
        identity_type: m.aadhaar ? 'aadhaar' : m.pan ? 'pan' : m.driving_license ? 'driving_license' : m.passport ? 'passport' : '',
        identity_number: m.aadhaar || m.pan || m.driving_license || m.passport || '',
        is_student: !!m.is_student, plan_id: m.plan_id || '', payment_due_date: m.payment_due_date || ''
      });
      if (m.photo_path) setCapturedPhoto(m.photo_path);
    } catch (e) {
      toast.error('Failed to load member');
      navigate('/members');
    }
  }, [id, navigate]);

  useEffect(() => { loadMember(); }, [loadMember]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
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
  // ignore track metadata in this lightweight camera flow
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

  const enumerateDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const vids = devices.filter(d => d.kind === 'videoinput');
      setVideoDevices(vids);
      if (vids.length && !selectedDeviceId) setSelectedDeviceId(vids[0].deviceId);
    } catch (e) {
      setCameraError('Could not enumerate devices. Grant camera permission and try again.');
    }
  };

  const startCameraWithDevice = async (deviceId) => {
    try {
      setCameraError('');
      setVideoReady(false);
      if (!deviceId) return startCamera();
      const stream = await navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: deviceId } } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        setShowCamera(true);
  // ignore track metadata in this lightweight camera flow
        videoRef.current.onloadedmetadata = () => {
          setTimeout(() => {
            if (videoRef.current.videoWidth > 0) {
              setVideoReady(true);
            }
          }, 200);
        };
      }
    } catch (err) {
      setCameraError('Failed to start selected device: ' + (err?.message || err));
    }
  };

  const stopCamera = () => {
    if (videoRef.current) {
      const stream = videoRef.current.srcObject;
      if (stream) stream.getTracks().forEach(t => t.stop());
      try { videoRef.current.srcObject = null; } catch (e) {}
    }
    setShowCamera(false);
    setVideoReady(false);
    setCameraError('');
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      if (!videoReady) { toast.error('Camera not ready'); return; }
      const canvas = canvasRef.current; const video = videoRef.current; const ctx = canvas.getContext('2d');
      canvas.width = video.videoWidth; canvas.height = video.videoHeight; ctx.drawImage(video, 0, 0);
      const photoDataUrl = canvas.toDataURL('image/jpeg', 0.8);
      setCapturedPhoto(photoDataUrl);
      stopCamera();
    }
  };

  const retakePhoto = () => { setCapturedPhoto(null); startCamera(); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...form,
        age: Number(form.age) || 0,
        plan_id: form.plan_id ? Number(form.plan_id) : null,
      };

      await axios.put(`/api/members/${id}`, payload);

      // Upload new photo if captured as dataURL
      if (capturedPhoto && capturedPhoto.startsWith('data')) {
        const formData = new FormData();
        const blob = await fetch(capturedPhoto).then(r => r.blob());
        formData.append('photo', blob, 'member-photo.jpg');
        await axios.post(`/api/members/${id}/photo`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      }

      toast.success('Member updated');
      navigate(`/members/${id}`);
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to update member';
      toast.error(message);
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <div className="lg:pl-64">
        <Header />
        <main className="py-6">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Edit Member</h1>
              <Link to={`/members/${id}`} className="btn btn-secondary btn-md">Cancel</Link>
            </div>

            <form onSubmit={handleSubmit} className="card p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="label">Member Photo</label>
                <div className="mt-2">
                  {!capturedPhoto && !showCamera && (
                    <div className="flex items-center gap-3">
                      <button type="button" onClick={startCamera} className="btn btn-secondary btn-md"><Camera className="h-4 w-4 mr-2"/>Take Photo</button>
                      {capturedPhoto && <img src={capturedPhoto} alt="captured" className="h-20 w-20 object-cover rounded" />}
                    </div>
                  )}

                  {showCamera && (
                    <div className="space-y-3">
                      <video ref={videoRef} autoPlay playsInline className="w-full max-w-md rounded-lg" />
                      {!videoReady && <p className="text-sm text-gray-600">Waiting for camera preview...</p>}
                      {cameraError && <p className="text-sm text-red-600">{cameraError}</p>}
                      <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                        {videoDevices.length === 0 ? (
                          <div className="flex items-center space-x-2"><button type="button" onClick={enumerateDevices} className="btn btn-sm btn-secondary">Detect cameras</button></div>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <select value={selectedDeviceId} onChange={(e)=>setSelectedDeviceId(e.target.value)} className="input">
                              {videoDevices.map(d => <option key={d.deviceId} value={d.deviceId}>{d.label || `Camera ${d.deviceId}`}</option>)}
                            </select>
                            <button type="button" onClick={()=>startCameraWithDevice(selectedDeviceId)} className="btn btn-sm btn-primary">Use selected</button>
                          </div>
                        )}
                      </div>
                      <div className="space-x-2">
                        <button type="button" onClick={capturePhoto} className="btn btn-primary btn-md"><Camera className="h-4 w-4 mr-2"/>Capture</button>
                        <button type="button" onClick={stopCamera} className="btn btn-secondary btn-md">Cancel</button>
                      </div>
                    </div>
                  )}

                  {capturedPhoto && (
                    <div className="space-y-3">
                      <img src={capturedPhoto} alt="Captured" className="w-32 h-32 object-cover rounded-lg" />
                      <div className="space-x-2">
                        <button type="button" onClick={retakePhoto} className="btn btn-secondary btn-sm"><RotateCcw className="h-4 w-4 mr-2"/>Retake</button>
                        <label className="btn btn-sm btn-secondary">
                          Upload from device
                          <input type="file" accept="image/*" onChange={async (e) => {
                            const file = e.target.files?.[0]; if (!file) return; const f = new FormData(); f.append('photo', file); try { await axios.post(`/api/members/${id}/photo`, f, { headers: { 'Content-Type': 'multipart/form-data' } }); toast.success('Photo uploaded'); loadMember(); } catch (err) { toast.error('Upload failed'); }
                          }} className="hidden" />
                        </label>
                      </div>
                    </div>
                  )}

                </div>
                <canvas ref={canvasRef} className="hidden" />
              </div>

              <div>
                <label className="label">Full Name</label>
                <input name="name" className="input mt-2" required value={form.name} onChange={handleChange} />
              </div>
              <div>
                <label className="label">Age</label>
                <input name="age" type="number" min="1" max="120" className="input mt-2" required value={form.age} onChange={handleChange} />
              </div>
              <div>
                <label className="label">Gender</label>
                <select name="gender" className="input mt-2" value={form.gender} onChange={handleChange}><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option></select>
              </div>
              <div>
                <label className="label">Email</label>
                <input name="email" type="email" className="input mt-2" required value={form.email} onChange={handleChange} />
              </div>
              <div>
                <label className="label">Phone</label>
                <input name="phone" className="input mt-2" required value={form.phone} onChange={handleChange} />
              </div>
              <div className="md:col-span-2">
                <label className="label">Address</label>
                <input name="address" className="input mt-2" required value={form.address} onChange={handleChange} />
              </div>
              <div>
                <label className="label">Identity Document Type</label>
                <select name="identity_type" className="input mt-2" value={form.identity_type} onChange={handleChange}><option value="">Select document type</option><option value="aadhaar">Aadhaar Card</option><option value="pan">PAN Card</option><option value="driving_license">Driving License</option><option value="passport">Passport</option></select>
              </div>
              <div>
                <label className="label">Document Number</label>
                <input name="identity_number" className="input mt-2" placeholder="Document number" value={form.identity_number} onChange={handleChange} disabled={!form.identity_type} />
              </div>
              <div className="md:col-span-2">
                <label className="flex items-center space-x-2"><input type="checkbox" name="is_student" checked={form.is_student} onChange={handleChange} className="rounded border-gray-300"/><span className="label">Student (25% discount)</span></label>
              </div>
              <div>
                <label className="label">Emergency Contact Name</label>
                <input name="emergency_contact_name" className="input mt-2" value={form.emergency_contact_name} onChange={handleChange} />
              </div>
              <div>
                <label className="label">Emergency Contact Phone</label>
                <input name="emergency_contact_phone" className="input mt-2" value={form.emergency_contact_phone} onChange={handleChange} />
              </div>
              <div>
                <label className="label">Plan</label>
                <select name="plan_id" className="input mt-2" value={form.plan_id} onChange={handleChange}><option value="">No plan</option>{plans.map(p => <option key={p.id} value={p.id}>{p.name} — ₹{p.price}</option>)}</select>
              </div>
              <div>
                <label className="label">Payment Due Date</label>
                <input name="payment_due_date" type="date" className="input mt-2" value={form.payment_due_date} onChange={handleChange} />
              </div>

              <div className="md:col-span-2 flex justify-end gap-3">
                <Link to={`/members/${id}`} className="btn btn-secondary btn-md">Cancel</Link>
                <button disabled={loading} className="btn btn-primary btn-md">{loading ? 'Saving...' : 'Save Changes'}</button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
};

export default EditMember;
