import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api'; // custom axios instance with the JWT token

export default function History() {
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null); 
  const navigate = useNavigate();

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await api.get('/api/interview/history');
        setInterviews(response.data);
      } catch (error) {
        console.error("Failed to fetch history:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-100">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-8 font-sans">
      <div className="max-w-5xl mx-auto">
        
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Interview History & Feedback</h1>
          <button 
            onClick={() => navigate('/interview')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            Start New Interview
          </button>
        </div>

        {interviews.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
            <p className="text-gray-400 mb-4">You haven't completed any interviews yet.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {interviews.map((interview) => (
              <div key={interview.id} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-lg">
                
                {/* Card Header */}
                <div 
                  className="p-6 flex flex-col md:flex-row justify-between items-center cursor-pointer hover:bg-gray-800 transition-colors"
                  onClick={() => toggleExpand(interview.id)}
                >
                  <div>
                    <h2 className="text-xl font-bold text-blue-400">{interview.topic}</h2>
                    <p className="text-sm text-gray-400 mt-1">
                      Difficulty: {interview.difficulty} Years Experience | Date: {new Date(interview.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  
                  <div className="mt-4 md:mt-0 flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-sm text-gray-400 uppercase tracking-wider">AI Score</p>
                      <p className={`text-2xl font-bold ${interview.score >= 70 ? 'text-green-500' : interview.score >= 50 ? 'text-yellow-500' : 'text-red-500'}`}>
                        {interview.score !== null ? `${interview.score}/100` : 'Pending'}
                      </p>
                    </div>
                    <span className="text-gray-500 text-2xl">
                      {expandedId === interview.id ? '▴' : '▾'}
                    </span>
                  </div>
                </div>

                {/* Expanded Feedback Section */}
                {expandedId === interview.id && (
                  <div className="border-t border-gray-800 bg-gray-950 p-6 space-y-6">
                    <h3 className="text-lg font-semibold border-b border-gray-800 pb-2 mb-4">Detailed AI Feedback</h3>
                    
                    {interview.questions.map((q, index) => (
                      <div key={q.id} className="bg-gray-900 rounded-lg p-5 border border-gray-800">
                        <div className="flex justify-between items-start mb-3">
                          <p className="font-medium text-gray-200">
                            <span className="text-blue-500 mr-2">Q{index + 1}.</span> 
                            {q.text}
                          </p>
                          <span className={`px-2 py-1 rounded text-xs font-bold ${q.rating >= 8 ? 'bg-green-900 text-green-300' : q.rating >= 5 ? 'bg-yellow-900 text-yellow-300' : 'bg-red-900 text-red-300'}`}>
                            {q.rating ? `${q.rating}/10` : 'N/A'}
                          </span>
                        </div>
                        
                        <div className="mb-3">
                          <p className="text-sm text-gray-500 mb-1">Your Answer:</p>
                          <p className="text-sm text-gray-300 bg-gray-950 p-3 rounded border border-gray-800">
                            {q.answer || <span className="italic text-gray-600">No answer provided.</span>}
                          </p>
                        </div>
                        
                        <div>
                          <p className="text-sm text-purple-400 mb-1">AI Evaluator Feedback:</p>
                          <p className="text-sm text-gray-300">
                            {q.aiFeedback || "No feedback generated."}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}