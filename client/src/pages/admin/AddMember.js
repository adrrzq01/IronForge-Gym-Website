import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import Sidebar from '../../components/layout/Sidebar';
import Header from '../../components/layout/Header';
import { Camera, RotateCcw } from 'lucide-react';

const AddMember = () => {
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [videoDevices, setVideoDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [streamInfo, setStreamInfo] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [form, setForm] = useState({
    name: '',
    age: '',
    gender: 'male',
    email: '',
    phone: '',
    address: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    identity_type: '',
    identity_number: '',
    is_student: false,
    plan_id: '',
    payment_due_date: ''
  });

  useEffect(() => {
    const loadPlans = async () => {
      try {
        const { data } = await axios.get('/api/plans');
        // Remove duplicates by filtering unique IDs
        const uniquePlans = data.plans?.filter((plan, index, self) => 
          index === self.findIndex(p => p.id === plan.id)
        ) || [];
        setPlans(uniquePlans);
      } catch (e) {
        setPlans([]);
      }
    };
    loadPlans();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }));
  };

  const getIdentityPlaceholder = () => {
    switch (form.identity_type) {
      case 'aadhaar': return '12-digit Aadhaar number';
      case 'pan': return '10-character PAN (e.g., ABCDE1234F)';
      case 'driving_license': return 'Driving license number';
      case 'passport': return 'Passport number';
      default: return 'Enter document number';
    }
  };

  const getIdentityMaxLength = () => {
    switch (form.identity_type) {
      case 'aadhaar': return '12';
      case 'pan': return '10';
      case 'driving_license': return '20';
      case 'passport': return '15';
      default: return '';
    }
  };

  const startCamera = async () => {
    try {
      setCameraError('');
      setVideoReady(false);
      // prefer front camera
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true; // allow autoplay
        // show the camera UI immediately
        setShowCamera(true);

        // update stream info
        const tracks = stream.getTracks();
        setStreamInfo({ tracks: tracks.map(t => ({ kind: t.kind, label: t.label, id: t.id })) });

        // When metadata is loaded, try to play and mark ready
        const onMeta = async () => {
          try {
            await videoRef.current.play();
          } catch (playErr) {
            // some browsers still block play until a gesture
          }
          // small delay to allow dimensions to become available
          setTimeout(() => {
            if (videoRef.current && videoRef.current.videoWidth > 0 && videoRef.current.videoHeight > 0) {
              setVideoReady(true);
              setStreamInfo(prev => ({ ...prev, width: videoRef.current.videoWidth, height: videoRef.current.videoHeight }));
            }
          }, 200);
        };

        videoRef.current.onloadedmetadata = onMeta;

        // fallback: if after 1s video not ready, show a helpful message
        setTimeout(() => {
          if (!videoRef.current) return;
          if (videoRef.current.videoWidth === 0 || videoRef.current.videoHeight === 0) {
            setCameraError('Camera started but no video frames available. Check browser permissions or try a different browser.');
          }
        }, 1000);
      }
    } catch (err) {
      const msg = err?.name === 'NotAllowedError' || err?.name === 'SecurityError' ? 'Camera access denied by user or browser.' : (err?.message || 'Failed to access camera');
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
      // enumerateDevices can fail if no permissions
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
        const tracks = stream.getTracks();
        setStreamInfo({ tracks: tracks.map(t => ({ kind: t.kind, label: t.label, id: t.id })) });
        videoRef.current.onloadedmetadata = () => {
          setTimeout(() => {
            if (videoRef.current.videoWidth > 0) {
              setVideoReady(true);
              setStreamInfo(prev => ({ ...prev, width: videoRef.current.videoWidth, height: videoRef.current.videoHeight }));
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
      if (stream) {
        const tracks = stream.getTracks();
        tracks.forEach(track => track.stop());
      }
      try {
        videoRef.current.srcObject = null;
      } catch (e) {
        // ignore
      }
    }
    setShowCamera(false);
    setVideoReady(false);
    setCameraError('');
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      if (!videoReady) {
        toast.error('Camera not ready. Please wait for the preview to appear or check permissions.');
        return;
      }
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const context = canvas.getContext('2d');
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0);
      
      const photoDataUrl = canvas.toDataURL('image/jpeg', 0.8);
      setCapturedPhoto(photoDataUrl);
      // Stop the camera and hide preview
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
        age: Number(form.age) || 0,
        plan_id: form.plan_id ? Number(form.plan_id) : null,
        // Map identity fields to backend format
        aadhaar: form.identity_type === 'aadhaar' ? form.identity_number : '',
        pan: form.identity_type === 'pan' ? form.identity_number : '',
        driving_license: form.identity_type === 'driving_license' ? form.identity_number : '',
        passport: form.identity_type === 'passport' ? form.identity_number : ''
      };
      
      const response = await axios.post('/api/members', payload);
      const memberId = response.data.memberId;
      
      // Upload photo if captured
      if (capturedPhoto) {
        const formData = new FormData();
        const blob = await fetch(capturedPhoto).then(r => r.blob());
        formData.append('photo', blob, 'member-photo.jpg');
        await axios.post(`/api/members/${memberId}/photo`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }
      
      toast.success('Member created with photo');
      navigate('/members');
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to create member';
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
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Add Member</h1>
              <Link to="/members" className="btn btn-secondary btn-md">Cancel</Link>
            </div>

            <form onSubmit={handleSubmit} className="card p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Photo Capture Section */}
              <div className="md:col-span-2">
                <label className="label">Member Photo (Face Capture)</label>
                <div className="mt-2">
                  {!capturedPhoto && !showCamera && (
                    <button type="button" onClick={startCamera} className="btn btn-secondary btn-md">
                      <Camera className="h-4 w-4 mr-2" />
                      Take Photo
                    </button>
                  )}
                  
                  {showCamera && (
                    <div className="space-y-3">
                      <video ref={videoRef} autoPlay playsInline className="w-full max-w-md rounded-lg" />
                      {!videoReady && (
                        <p className="text-sm text-gray-600">Waiting for camera preview... If nothing appears, check browser camera permissions.</p>
                      )}
                      {cameraError && (
                        <p className="text-sm text-red-600">{cameraError}</p>
                      )}

                      {/* Device selection / debug panel */}
                      <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                        {videoDevices.length === 0 ? (
                          <div className="flex items-center space-x-2">
                            <button type="button" onClick={enumerateDevices} className="btn btn-sm btn-secondary">Detect cameras</button>
                            <span className="text-sm text-gray-600">(Detect available video input devices)</span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <select value={selectedDeviceId} onChange={(e) => setSelectedDeviceId(e.target.value)} className="input">
                              {videoDevices.map(d => (
                                <option key={d.deviceId} value={d.deviceId}>{d.label || `Camera ${d.deviceId}`}</option>
                              ))}
                            </select>
                            <button type="button" onClick={() => startCameraWithDevice(selectedDeviceId)} className="btn btn-sm btn-primary">Use selected camera</button>
                          </div>
                        )}

                        {streamInfo && (
                          <div className="mt-2 text-xs text-gray-600">
                            <div>Stream: {streamInfo.width ? `${streamInfo.width}×${streamInfo.height}` : 'unknown'}</div>
                            <div>Tracks:</div>
                            <ul className="list-disc ml-5">
                              {streamInfo.tracks.map(t => (
                                <li key={t.id}>{t.kind} — {t.label || 'label not available'}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>

                      <div className="space-x-2">
                        <button type="button" onClick={capturePhoto} className="btn btn-primary btn-md">
                          <Camera className="h-4 w-4 mr-2" />
                          Capture
                        </button>
                        <button type="button" onClick={stopCamera} className="btn btn-secondary btn-md">
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {capturedPhoto && (
                    <div className="space-y-3">
                      <img src={capturedPhoto} alt="Captured" className="w-32 h-32 object-cover rounded-lg" />
                      <div className="space-x-2">
                        <button type="button" onClick={retakePhoto} className="btn btn-secondary btn-sm">
                          <RotateCcw className="h-4 w-4 mr-2" />
                          Retake
                        </button>
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
                <select name="gender" className="input mt-2" value={form.gender} onChange={handleChange}>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
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
                <select name="identity_type" className="input mt-2" value={form.identity_type} onChange={handleChange}>
                  <option value="">Select document type</option>
                  <option value="aadhaar">Aadhaar Card</option>
                  <option value="pan">PAN Card</option>
                  <option value="driving_license">Driving License</option>
                  <option value="passport">Passport</option>
                </select>
              </div>
              <div>
                <label className="label">Document Number</label>
                <input 
                  name="identity_number" 
                  className="input mt-2" 
                  placeholder={getIdentityPlaceholder()}
                  maxLength={getIdentityMaxLength()}
                  value={form.identity_number} 
                  onChange={handleChange}
                  disabled={!form.identity_type}
                />
              </div>
              <div className="md:col-span-2">
                <label className="flex items-center space-x-2">
                  <input 
                    type="checkbox" 
                    name="is_student" 
                    checked={form.is_student} 
                    onChange={handleChange}
                    className="rounded border-gray-300"
                  />
                  <span className="label">Student (25% discount on all plans)</span>
                </label>
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
                <select name="plan_id" className="input mt-2" value={form.plan_id} onChange={handleChange}>
                  <option value="">No plan</option>
                  {plans.map((p) => {
                    const originalPrice = Number(p.price);
                    const studentPrice = form.is_student ? Math.round(originalPrice * 0.75) : originalPrice;
                    const discount = form.is_student ? ' (25% off)' : '';
                    return (
                      <option key={p.id} value={p.id}>
                        {p.name} — ₹{studentPrice.toLocaleString()}{discount}
                      </option>
                    );
                  })}
                </select>
                {form.is_student && (
                  <p className="text-sm text-green-600 mt-1">🎓 Student discount applied - 25% off all plans!</p>
                )}
              </div>
              <div>
                <label className="label">Payment Due Date</label>
                <input name="payment_due_date" type="date" className="input mt-2" value={form.payment_due_date} onChange={handleChange} />
              </div>

              <div className="md:col-span-2 flex justify-end gap-3">
                <Link to="/members" className="btn btn-secondary btn-md">Cancel</Link>
                <button disabled={loading} className="btn btn-primary btn-md">
                  {loading ? 'Saving...' : 'Save Member'}
                </button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AddMember;


