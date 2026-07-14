import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api';

export default function Profile() {
  const [name, setName] = useState('');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/api/auth/me')
      .then(res => {
        setUser(res.data);
        setName(res.data.name || '');
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        navigate('/');
      });
  }, [navigate]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/api/auth/profile', { name });
      toast.success("Profile updated successfully!");

      setTimeout(() => navigate('/dashboard'), 1000);
    } catch (error) {
      toast.error("Failed to update profile.");
      setSaving(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-gray-950 flex justify-center items-center"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div></div>;

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gray-950 flex items-center justify-center p-4 text-gray-100">
      <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-xl shadow-xl p-8">
        
        <div className="text-center mb-8">
          <div className="relative inline-block">
             {user?.avatar ? (
                <img src={user.avatar} alt="Avatar" className="w-24 h-24 rounded-full border-4 border-gray-800 shadow-lg object-cover mb-4" />
             ) : (
                <div className="w-24 h-24 rounded-full bg-blue-600 flex items-center justify-center text-4xl text-white font-bold mx-auto mb-4 border-4 border-gray-800">
                  {name.charAt(0).toUpperCase()}
                </div>
             )}
          </div>
          <h1 className="text-2xl font-bold text-white">Complete Your Profile</h1>
          <p className="text-gray-400 text-sm mt-2">How should we address you during interviews?</p>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Email (Google)</label>
            <input type="text" disabled value={user?.email} className="w-full px-4 py-3 bg-gray-950 border border-gray-800 rounded-lg text-gray-500 cursor-not-allowed" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Display Name</label>
            <input 
              type="text" 
              required 
              value={name} 
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 bg-gray-950 border border-gray-800 rounded-lg text-white focus:ring-2 focus:ring-blue-500 outline-none transition" 
            />
          </div>

          <button 
            type="submit" 
            disabled={saving}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-bold rounded-lg transition-colors shadow-lg shadow-blue-900/20"
          >
            {saving ? 'Saving...' : 'Save & Continue'}
          </button>
        </form>
      </div>
    </div>
  );
}