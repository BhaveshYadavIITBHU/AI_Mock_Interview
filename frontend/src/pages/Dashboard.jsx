import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import api from '../api';

export default function Dashboard() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1) Check if there is a token and an isNew flag in the URL
    const urlToken = searchParams.get('token');
    const isNew = searchParams.get('isNew');

    if (urlToken) {
      // 2) Save it securely to local storage
      localStorage.setItem('accessToken', urlToken);
      setIsAuthenticated(true);

      // 3) Route based on whether they just signed up
      if (isNew) {
        navigate('/profile', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } else {
      // 4) If not in URL, check if they already have one saved
      const savedToken = localStorage.getItem('accessToken');
      if (savedToken) {
        setIsAuthenticated(true);
      } else {
        // 5) If no token exists at all, kick them back to the landing page
        navigate('/');
      }
    }
  }, [searchParams, navigate]);

  useEffect(() => {
    // Fetch Data (Only runs if they are authenticated)
    if (isAuthenticated) {
      const fetchAnalytics = async () => {
        try {
          // We dont need to pass the token here, api.js interceptor does it
          const response = await api.get('/api/interview/analytics'); 
          setAnalytics(response.data);
        } catch (error) {
          console.error("Failed to fetch analytics:", error);
        } finally {
          setLoading(false);
        }
      };
      fetchAnalytics();
    }
  }, [isAuthenticated]);

  // If they aren't authenticated yet, don't show the dashboard
  if (!isAuthenticated) return null;

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gray-950 text-gray-100 p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        
        {/*  HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10 mt-4 pt-2">
          <div>
            <h1 className="text-3xl font-bold text-white">Your Dashboard</h1>
            <p className="text-gray-400 mt-2">Review your past interviews and track your progress.</p>
          </div>
          <Link 
            to="/interview" 
            className="shrink-0 bg-blue-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-900/20"
          >
            + New Interview
          </Link>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center mt-32">
             <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
             <div className="text-gray-400 font-medium">Loading your stats...</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

            {/* Stat Card 1  */}
            <div className="bg-gray-900 rounded-xl shadow-lg border border-gray-800 p-8 flex flex-col items-center justify-center hover:border-gray-700 transition-colors">
              <h3 className="text-lg font-medium text-gray-400 mb-4 uppercase tracking-wider">Total Interviews</h3>
              <p className="text-7xl font-bold text-blue-500">{analytics?.totalInterviews || 0}</p>
            </div>

            {/* Stat Card 2 */}
            <div className="bg-gray-900 rounded-xl shadow-lg border border-gray-800 p-8 flex flex-col items-center justify-center hover:border-gray-700 transition-colors">
              <h3 className="text-lg font-medium text-gray-400 mb-4 uppercase tracking-wider">Average Score</h3>
              <p className="text-7xl font-bold text-green-500">{analytics?.averageScore || 0}%</p>
            </div>
            
          </div>
        )}
      </div>
    </div>
  );
}