import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import api from '../api';

export default function Navbar() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const location = useLocation(); 

  useEffect(() => {
    // Check for a fresh token every time the route changes or URL parameters update
    const token = localStorage.getItem('accessToken');

    if (token) {
      api.get('/api/auth/me')
        .then(res => setUser(res.data))
        .catch(() => {
            // If token is expired or invalid, clear everything out
            localStorage.removeItem('accessToken');
            setUser(null);
        });
    } else {
      // Ensure user state is cleared if no token is found
      setUser(null);
    }
  }, [location.pathname, location.search]); 

  const handleGoogleLogin = () => {
    // Dynamically reads the environment variable from Vercel deployment configs
    const backendUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
    window.location.href = `${backendUrl}/api/auth/google`;
  };

  const handleLogout = () => {
    // 1. Clear Local Storage Tokens
    localStorage.removeItem('accessToken');
    setUser(null);
    
    // 2. Broadcast a global logout event to sync cross-component states instantly
    window.dispatchEvent(new Event('authChange'));
    
    // 3. Redirect back to home
    navigate('/');
  };

  return (
    <nav className="bg-gray-950 border-b border-gray-800 px-4 sm:px-6 lg:px-8 py-3 flex justify-between items-center select-none">
      
      {/* Logo Section */}
      <Link to="/" className="text-2xl font-extrabold text-white tracking-wide flex items-center gap-2">
        NEX<span className="text-blue-500">AI</span>
      </Link>

      {/* Navigation Links */}
      <div className="flex items-center gap-6">
        {user ? (
          <>
            <Link to="/dashboard" className="text-sm font-medium text-gray-400 hover:text-white transition">Dashboard</Link>
            <Link to="/history" className="text-sm font-medium text-gray-400 hover:text-white transition">History</Link>
            
            <div className="flex items-center gap-4 pl-4 border-l border-gray-800">
              <Link to="/profile" className="flex items-center gap-3 hover:opacity-80 transition">
                <span className="text-sm font-bold text-gray-200 hidden sm:block">{user.name}</span>
                {user.avatar ? (
                  <img src={user.avatar} alt="Profile" className="w-9 h-9 rounded-full border-2 border-blue-500 object-cover" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
                    {user.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                )}
              </Link>
              <button 
                onClick={handleLogout} 
                className="text-sm font-medium text-red-500 hover:text-red-400 transition cursor-pointer bg-transparent border-none"
              >
                Logout
              </button>
            </div>
          </>
        ) : (
          <button 
            onClick={handleGoogleLogin} 
            className="text-sm font-bold text-blue-500 hover:text-blue-400 transition cursor-pointer bg-transparent border-none"
          >
            Sign In
          </button>
        )}
      </div>
    </nav>
  );
}