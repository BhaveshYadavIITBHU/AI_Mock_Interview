import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api';

export default function Result() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [interview, setInterview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'mcq', 'text', 'needs_review'

  useEffect(() => {
    const fetchResult = async () => {
      try {
        const response = await api.get(`/api/interview/session/${id}`);
        setInterview(response.data);
      } catch (error) {
        console.error("Failed to load interview results:", error);
        toast.error("Could not fetch interview results or session expired.");
      } finally {
        setLoading(false);
      }
    };

    fetchResult();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-gray-950 flex flex-col items-center justify-center text-gray-100">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-gray-400 font-medium">Assembling detailed assessment report...</p>
      </div>
    );
  }

  if (!interview) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-gray-950 flex flex-col items-center justify-center text-gray-100 p-6 text-center">
        <h2 className="text-2xl font-bold text-red-400 mb-2">Assessment Report Not Found</h2>
        <p className="text-gray-400 mb-6 max-w-md">
          This session does not exist or you do not have permission to view its report.
        </p>
        <button
          onClick={() => navigate('/dashboard')}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const questions = interview.questions || [];
  const score = interview.score ?? 0;

  // Breakdown statistics
  const mcqQuestions = questions.filter(q => q.type === 'mcq');
  const textQuestions = questions.filter(q => q.type === 'text');

  const mcqPassed = mcqQuestions.filter(q => (q.rating ?? 0) >= 7).length;
  const mcqAccuracy = mcqQuestions.length > 0 ? Math.round((mcqPassed / mcqQuestions.length) * 100) : 0;

  const textAvgRating = textQuestions.length > 0 
    ? (textQuestions.reduce((acc, q) => acc + (q.rating || 0), 0) / textQuestions.length).toFixed(1)
    : 0;

  const needsReviewCount = questions.filter(q => (q.rating ?? 0) < 7).length;

  // Filter questions according to active tab
  const filteredQuestions = questions.filter(q => {
    if (activeFilter === 'mcq') return q.type === 'mcq';
    if (activeFilter === 'text') return q.type === 'text';
    if (activeFilter === 'needs_review') return (q.rating ?? 0) < 7;
    return true;
  });

  // Performance tier categorization
  const getTier = (s) => {
    if (s >= 80) return { label: "Placement Ready", sub: "Exceptional mastery of core concepts and problem solving.", color: "text-emerald-400", border: "border-emerald-500/30", bg: "bg-emerald-950/30" };
    if (s >= 60) return { label: "Proficient", sub: "Solid fundamentals demonstrated. Review weaker topics to reach top tier.", color: "text-amber-400", border: "border-amber-500/30", bg: "bg-amber-950/30" };
    return { label: "Needs Practice", sub: "Foundational concepts require targeted practice before company rounds.", color: "text-rose-400", border: "border-rose-500/30", bg: "bg-rose-950/30" };
  };

  const tier = getTier(score);

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gray-950 text-gray-100 p-4 sm:p-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* TOP BAR / ACTIONS */}
        <div className="flex flex-wrap justify-between items-center gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 bg-blue-900/30 text-blue-400 text-xs font-semibold rounded-full border border-blue-800">
                Target: {interview.topic}
              </span>
              <span className="text-xs text-gray-400">
                Experience: {interview.difficulty} yrs
              </span>
              <span className="text-xs text-gray-500">
                {new Date(interview.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
              </span>
            </div>
            <h1 className="text-3xl font-extrabold text-white mt-2">Evaluation & Performance Report</h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-gray-300 rounded-lg text-sm font-medium border border-gray-700 transition cursor-pointer"
            >
              📄 Print / Save PDF
            </button>
            <Link
              to="/interview"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold shadow-lg shadow-blue-900/20 transition"
            >
              + New Interview
            </Link>
          </div>
        </div>

        {/* HERO SCORE BANNER */}
        <div className={`p-8 rounded-2xl border ${tier.border} ${tier.bg} relative overflow-hidden shadow-2xl`}>
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            
            {/* Score Ring / Dial */}
            <div className="flex items-center gap-6">
              <div className="relative w-32 h-32 flex items-center justify-center rounded-full bg-gray-950 border-4 border-gray-800 shadow-inner">
                <span className={`text-5xl font-black ${tier.color}`}>
                  {score}
                </span>
                <span className="absolute bottom-4 text-xs font-bold text-gray-500 uppercase tracking-widest">
                  / 100
                </span>
              </div>
              <div>
                <span className={`text-sm font-bold uppercase tracking-widest ${tier.color}`}>
                  {tier.label}
                </span>
                <h2 className="text-2xl font-bold text-white mt-1">Technical Readiness Score</h2>
                <p className="text-sm text-gray-400 mt-1 max-w-md">
                  {tier.sub}
                </p>
              </div>
            </div>

            {/* Sub-Metrics Cards */}
            <div className="grid grid-cols-2 gap-4 w-full md:w-auto">
              <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-4 text-center min-w-[140px]">
                <span className="text-xs uppercase text-gray-400 font-semibold tracking-wider">MCQ Accuracy</span>
                <p className="text-2xl font-bold text-blue-400 mt-1">{mcqAccuracy}%</p>
                <span className="text-[11px] text-gray-500">{mcqPassed}/{mcqQuestions.length} Solid</span>
              </div>

              <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-4 text-center min-w-[140px]">
                <span className="text-xs uppercase text-gray-400 font-semibold tracking-wider">Text/Code Avg</span>
                <p className="text-2xl font-bold text-purple-400 mt-1">{textAvgRating}<span className="text-sm text-gray-500">/10</span></p>
                <span className="text-[11px] text-gray-500">{textQuestions.length} Open Questions</span>
              </div>
            </div>

          </div>
        </div>

        {/* DETAILED QUESTION BREAKDOWN SECTION */}
        <div className="space-y-4">
          
          {/* Header & Filter Tabs */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-800 pb-3">
            <div>
              <h3 className="text-xl font-bold text-white">Itemized Question Analysis</h3>
              <p className="text-xs text-gray-400 mt-0.5">Review your responses alongside critical AI evaluator feedback.</p>
            </div>

            {/* Filter Tabs */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setActiveFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  activeFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-900 text-gray-400 hover:text-white border border-gray-800'
                }`}
              >
                All ({questions.length})
              </button>
              <button
                onClick={() => setActiveFilter('mcq')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  activeFilter === 'mcq' ? 'bg-blue-600 text-white' : 'bg-gray-900 text-gray-400 hover:text-white border border-gray-800'
                }`}
              >
                MCQs ({mcqQuestions.length})
              </button>
              <button
                onClick={() => setActiveFilter('text')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  activeFilter === 'text' ? 'bg-blue-600 text-white' : 'bg-gray-900 text-gray-400 hover:text-white border border-gray-800'
                }`}
              >
                Code / Detailed ({textQuestions.length})
              </button>
              <button
                onClick={() => setActiveFilter('needs_review')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  activeFilter === 'needs_review' ? 'bg-rose-600 text-white' : 'bg-gray-900 text-rose-400 hover:text-rose-300 border border-gray-800'
                }`}
              >
                Needs Review ({needsReviewCount})
              </button>
            </div>
          </div>

          {/* Question Cards List */}
          <div className="space-y-5">
            {filteredQuestions.map((q, idx) => {
              const rating = q.rating ?? 0;
              const isHigh = rating >= 8;
              const isMedium = rating >= 5 && rating < 8;

              return (
                <div 
                  key={q.id || idx} 
                  className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4 hover:border-gray-700 transition"
                >
                  
                  {/* Card Title & Rating Badge */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <span className="text-blue-500 font-bold text-sm bg-blue-950/60 border border-blue-900/60 px-2 py-0.5 rounded">
                        Q{idx + 1}
                      </span>
                      <div>
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 block mb-1">
                          {q.type === 'mcq' ? 'Multiple Choice' : 'Code / Technical Response'}
                        </span>
                        <h4 className="text-base font-semibold text-white leading-snug">
                          {q.text}
                        </h4>
                      </div>
                    </div>

                    {/* Numeric Score Pill */}
                    <span className={`shrink-0 px-3 py-1 rounded-full text-xs font-bold border ${
                      isHigh 
                        ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800' 
                        : isMedium 
                        ? 'bg-amber-950/80 text-amber-300 border-amber-800' 
                        : 'bg-rose-950/80 text-rose-300 border-rose-800'
                    }`}>
                      {rating}/10
                    </span>
                  </div>

                  {/* Candidate Answer Box */}
                  <div className="bg-gray-950 border border-gray-800 rounded-lg p-3.5 text-sm">
                    <span className="text-xs text-gray-500 font-medium block mb-1">Your Submitted Answer:</span>
                    <p className={`text-gray-200 ${q.type === 'text' ? 'font-mono text-xs whitespace-pre-wrap' : 'font-medium'}`}>
                      {q.answer ? q.answer : <span className="italic text-gray-600">No answer provided / skipped.</span>}
                    </p>
                  </div>

                  {/* AI Feedback Box */}
                  <div className="bg-purple-950/20 border border-purple-900/40 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-purple-400 text-sm">✦</span>
                      <span className="text-xs font-bold uppercase tracking-wider text-purple-300">
                        AI Evaluator Feedback
                      </span>
                    </div>
                    <p className="text-sm text-gray-300 leading-relaxed">
                      {q.aiFeedback || "Evaluation feedback not generated for this item."}
                    </p>
                  </div>

                </div>
              );
            })}

            {filteredQuestions.length === 0 && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center text-gray-500">
                No questions found under the selected filter tab.
              </div>
            )}
          </div>

        </div>

        {/* BOTTOM NAVIGATION */}
        <div className="flex justify-between items-center pt-6 border-t border-gray-800">
          <Link
            to="/history"
            className="text-sm font-medium text-gray-400 hover:text-white transition"
          >
            ← View All Past Interviews
          </Link>
          <Link
            to="/dashboard"
            className="px-6 py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm font-semibold border border-gray-700 transition"
          >
            Go to Dashboard
          </Link>
        </div>

      </div>
    </div>
  );
}