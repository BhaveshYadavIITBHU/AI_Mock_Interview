import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import api from '../api';

export default function Navbar() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  

  const location = useLocation(); 

  useEffect(() => {
    // Check for a fresh token every time the route changes
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
  // Re-run the effect every time the location path changes!
  }, [location.pathname]); 

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    setUser(null);
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
                className="text-sm font-medium text-red-500 hover:text-red-400 transition"
              >
                Logout
              </button>
            </div>
          </>
        ) : (
          <a 
            href="http://localhost:5000/api/auth/google" 
            className="text-sm font-bold text-blue-500 hover:text-blue-400 transition"
          >
            Sign In
          </a>
        )}
      </div>
    </nav>
  );
}