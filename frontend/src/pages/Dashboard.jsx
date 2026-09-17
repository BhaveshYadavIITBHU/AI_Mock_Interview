import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { 
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  BarChart, Bar
} from 'recharts';
import api from '../api';

export default function Dashboard() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [analytics, setAnalytics] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const urlToken = searchParams.get('token');
    const isNew = searchParams.get('isNew');

    if (urlToken) {
      localStorage.setItem('accessToken', urlToken);
      setIsAuthenticated(true);

      if (isNew) {
        navigate('/profile', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } else {
      const savedToken = localStorage.getItem('accessToken');
      if (savedToken) {
        setIsAuthenticated(true);
      } else {
        navigate('/');
      }
    }
  }, [searchParams, navigate]);

  useEffect(() => {
    if (isAuthenticated) {
      const loadDashboardData = async () => {
        try {
          const [analyticsRes, historyRes] = await Promise.all([
            api.get('/api/interview/analytics').catch(() => ({ data: { totalInterviews: 0, averageScore: 0 } })),
            api.get('/api/interview/history').catch(() => ({ data: [] }))
          ]);

          setAnalytics(analyticsRes.data);
          setHistory(historyRes.data || []);
        } catch (error) {
          console.error("Failed to fetch dashboard data:", error);
        } finally {
          setLoading(false);
        }
      };
      loadDashboardData();
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) return null;

  // Format history for chronological score trend
  const completedInterviews = history.filter(item => item.score !== null);
  
  const trendData = [...completedInterviews].reverse().map((item, idx) => ({
    name: `Test ${idx + 1}`,
    score: item.score,
    topic: item.topic,
    date: new Date(item.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  }));

  // Aggregate average score by topic
  const topicStats = {};
  completedInterviews.forEach(item => {
    if (!topicStats[item.topic]) {
      topicStats[item.topic] = { total: 0, count: 0 };
    }
    topicStats[item.topic].total += item.score;
    topicStats[item.topic].count += 1;
  });

  const topicData = Object.entries(topicStats).map(([topic, data]) => ({
    topic: topic.length > 14 ? topic.substring(0, 12) + '...' : topic,
    avgScore: Math.round(data.total / data.count)
  })).slice(0, 6);

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gray-950 text-gray-100 p-4 sm:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-800 pb-6 mt-2">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Your Dashboard</h1>
            <p className="text-gray-400 text-sm mt-1">Track your progress, monitor accuracy trends, and launch new practice sessions.</p>
          </div>
          <Link 
            to="/interview" 
            className="shrink-0 bg-blue-600 hover:bg-blue-500 text-white px-7 py-3 rounded-lg font-bold transition shadow-lg shadow-blue-900/20 cursor-pointer"
          >
            + New Interview
          </Link>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32">
             <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
             <div className="text-gray-400 font-medium">Loading your performance metrics...</div>
          </div>
        ) : (
          <>
            {/* KPI STAT CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              
              <div className="bg-gray-900/80 border border-gray-800 rounded-2xl p-6 flex flex-col justify-between hover:border-gray-700 transition">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Completed Sessions</span>
                <div className="mt-3">
                  <p className="text-5xl font-black text-blue-500">{analytics?.totalInterviews || 0}</p>
                  <p className="text-xs text-gray-500 mt-1">Total proctored assessments</p>
                </div>
              </div>

              <div className="bg-gray-900/80 border border-gray-800 rounded-2xl p-6 flex flex-col justify-between hover:border-gray-700 transition">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Average Performance</span>
                <div className="mt-3">
                  <p className="text-5xl font-black text-emerald-400">{analytics?.averageScore || 0}%</p>
                  <p className="text-xs text-gray-500 mt-1">Across all technical topics</p>
                </div>
              </div>

              <div className="bg-gray-900/80 border border-gray-800 rounded-2xl p-6 flex flex-col justify-between hover:border-gray-700 transition">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Placement Readiness</span>
                <div className="mt-3">
                  <p className={`text-4xl font-black ${
                    (analytics?.averageScore || 0) >= 75 ? 'text-emerald-400' :
                    (analytics?.averageScore || 0) >= 60 ? 'text-amber-400' : 'text-rose-400'
                  }`}>
                    {(analytics?.averageScore || 0) >= 75 ? 'Tier 1 Ready' :
                     (analytics?.averageScore || 0) >= 60 ? 'Competitive' : 'Developing'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Based on recent evaluations</p>
                </div>
              </div>

            </div>

            {/* VISUAL ANALYTICS CHARTS */}
            {trendData.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* Score Progression Trend Chart */}
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h3 className="text-base font-bold text-white">Score Progression History</h3>
                      <p className="text-xs text-gray-400 mt-0.5">Performance trajectory across sequential tests</p>
                    </div>
                    <span className="text-xs bg-blue-950 text-blue-400 border border-blue-800 px-2.5 py-1 rounded-full">
                      Line Trend
                    </span>
                  </div>

                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={trendData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.5} />
                        <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} tickLine={false} />
                        <YAxis domain={[0, 100]} stroke="#9ca3af" fontSize={12} tickLine={false} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '8px', color: '#fff' }}
                          formatter={(value, name, props) => [`${value}/100`, `${props.payload.topic}`]}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="score" 
                          stroke="#3b82f6" 
                          strokeWidth={3} 
                          dot={{ r: 5, fill: '#3b82f6', stroke: '#1e3a8a', strokeWidth: 2 }}
                          activeDot={{ r: 7 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Domain / Topic Breakdown Chart */}
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h3 className="text-base font-bold text-white">Topic Competency Breakdown</h3>
                      <p className="text-xs text-gray-400 mt-0.5">Average score achieved per target domain</p>
                    </div>
                    <span className="text-xs bg-purple-950 text-purple-400 border border-purple-800 px-2.5 py-1 rounded-full">
                      Domain Avg
                    </span>
                  </div>

                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={topicData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.5} />
                        <XAxis dataKey="topic" stroke="#9ca3af" fontSize={12} tickLine={false} />
                        <YAxis domain={[0, 100]} stroke="#9ca3af" fontSize={12} tickLine={false} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '8px', color: '#fff' }}
                          formatter={(value) => [`${value}%`, 'Average Score']}
                        />
                        <Bar dataKey="avgScore" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

              </div>
            ) : (
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center">
                <p className="text-gray-400 mb-4 text-base">You haven't completed any technical interviews yet.</p>
                <Link
                  to="/interview"
                  className="inline-block px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg shadow-lg transition"
                >
                  Start Your First Interview
                </Link>
              </div>
            )}

            {/* RECENT SESSIONS TABLE */}
            {completedInterviews.length > 0 && (
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold text-white">Recent Interview Sessions</h3>
                  <Link to="/history" className="text-xs font-semibold text-blue-400 hover:underline">
                    View Full History →
                  </Link>
                </div>

                <div className="divide-y divide-gray-800">
                  {completedInterviews.slice(0, 4).map((item) => (
                    <div key={item.id} className="py-4 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                      <div>
                        <h4 className="font-semibold text-white text-base">{item.topic}</h4>
                        <span className="text-xs text-gray-500">
                          Experience: {item.difficulty} yrs • Date: {new Date(item.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      <div className="flex items-center gap-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          item.score >= 70 ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                          item.score >= 50 ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                          'bg-rose-950 text-rose-300 border border-rose-800'
                        }`}>
                          Score: {item.score}/100
                        </span>

                        <Link
                          to={`/result/${item.id}`}
                          className="text-xs px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded border border-gray-700 transition"
                        >
                          View Report
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </>
        )}

      </div>
    </div>
  );
}