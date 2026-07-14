import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api';

export default function Session() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // --- CAMERA STATE ---
  const videoRef = useRef(null);
  const [cameraActive, setCameraActive] = useState(false);

  // --- ASSESSMENT STATE ---
  const [isReady, setIsReady] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Tracks if the user is trapped in the penalty box due to a failed anti-cheat submission
  const [isCheatLocked, setIsCheatLocked] = useState(false);

  // --- ANTI-CHEAT & STATE TRACKING ---
  const containerRef = useRef(null);
  const warnings = useRef(0);
  const [isProctoringActive, setIsProctoringActive] = useState(false);
  
  // preventing "stale closures" if the anti-cheat system forces a submission!
  const latestQuestions = useRef(questions);
  useEffect(() => {
    latestQuestions.current = questions;
  }, [questions]);

  // --- THE MASTER SUBMIT FUNCTION ---
  const handleSubmitFinal = async (isForced = false) => {
    if (!isForced) {
        const confirmSubmit = window.confirm("Are you sure you want to submit your assessment?");
        if (!confirmSubmit) return;
    }

    try {
        setIsSubmitting(true);
        toast.loading("AI is grading your assessment...", { id: "gradingToast" });

        // Use latestQuestions.current to ensure we send the most up-to-date answers
        await api.post(`/api/interview/session/${id}/submit`, {
            answers: latestQuestions.current 
        });

        toast.success("Assessment graded successfully!", { id: "gradingToast" });

        if (document.fullscreenElement) {
            await document.exitFullscreen().catch(err => console.log(err));
        }

        navigate('/history');
    }
    catch (error) {
        console.error("Failed to submit assessment:", error);
        toast.error("There was an error grading your assessment.", { id: "gradingToast" });
        setIsSubmitting(false);
        
        // Trap them in the penalty box if they were caught cheating and the server failed
        if (isForced) {
            setIsCheatLocked(true);
        }
    }
  };

  // --- ANTI-CHEAT SYSTEM ---
  useEffect(() => {
    if(!isProctoringActive) return;

    const handleViolation = () => {
        if(warnings.current === 0){
            toast.error(
              "WARNING: You left fullscreen or switched tabs! One more violation will automatically submit your assessment.",
              { duration: 6000 }
            );  
            warnings.current = 1;
        }
        else if(warnings.current === 1){
            warnings.current = 2;
            toast.error("SECOND VIOLATION DETECTED: Automatically submitting your assessment to the AI.");
            
            // Pass 'true' because this is a forced submission (bypasses the confirm dialog)
            handleSubmitFinal(true); 
        }
    };

    const onFullscreenChange = () => {
        if(!document.fullscreenElement) handleViolation();
    };

    const onVisibilityChange = () => {
      if (document.hidden) handleViolation();
    };

    const onBlur = () => {
      handleViolation();
    };

    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('blur', onBlur);

    return () => {
        document.removeEventListener('fullscreenchange', onFullscreenChange);
        document.removeEventListener('visibilitychange', onVisibilityChange);
        window.removeEventListener('blur', onBlur);
    };
  }, [isProctoringActive]); 


  // --- FETCH QUESTIONS ---
  useEffect(() => {
    const loadInterviewData = async () => {
        try {
            const response = await api.get(`/api/interview/session/${id}`);
            setQuestions(response.data.questions);
        } catch (error) {
            console.error("Could not pull dynamic session questions:", error);
        } finally {
            setLoading(false);
        }
    };
    loadInterviewData();
  }, [id]);

  // --- BOOT UP LOW-QUALITY CAMERA ---
  useEffect(() => {
    let currentStream;
    const startCamera = async () => {
      try {
        currentStream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: "user", width: { ideal: 320 }, height: { ideal: 240 }, frameRate: { ideal: 15 } } 
        });
        if (videoRef.current) {
          videoRef.current.srcObject = currentStream;
          setCameraActive(true);
        }
      } catch (err) {
        console.error("Camera access denied or failed:", err);
      }
    };
    startCamera();
    return () => {
      if (currentStream) currentStream.getTracks().forEach(track => track.stop());
    };
  }, []);

  // --- NAVIGATION & STATUS LOGIC ---
  const updateQuestionStatus = (index, newStatus, newAnswer = null) => {
    const updated = [...questions];
    if (newAnswer !== null) updated[index].answer = newAnswer;
    updated[index].status = newStatus;
    setQuestions(updated);
  };

  const goToQuestion = (index) => {
    if (questions[currentIndex].status === 'visited' && !questions[currentIndex].answer) {
      updateQuestionStatus(currentIndex, 'skipped');
    }
    setCurrentIndex(index);
    if (questions[index].status === 'not_visited' || questions[index].status === 'skipped') {
      updateQuestionStatus(index, 'visited');
    }
  };

  const handleStart = async () => {
    try {
      if (containerRef.current) {
        await containerRef.current.requestFullscreen();
      }
      setIsProctoringActive(true);
      setIsReady(true);
      updateQuestionStatus(0, 'visited'); 
    } catch (error) {
      console.error("Failed to enter fullscreen:", error);
      alert("You must allow fullscreen to begin this proctored assessment.");
    }
  };

  const handleMcqSelect = (option) => {
    updateQuestionStatus(currentIndex, 'answered', option);
  };

  const handleTextSave = () => {
    if (questions[currentIndex].answer.trim() !== '') {
      updateQuestionStatus(currentIndex, 'answered');
      handleNext();
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      goToQuestion(currentIndex + 1);
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'answered': return 'bg-green-500 border-green-600 text-white';
      case 'skipped': return 'bg-yellow-500 border-yellow-600 text-white';
      case 'visited': return 'bg-blue-500 border-blue-600 text-white';
      default: return 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600';
    }
  };

  // --- SAFETY GUARDS ---
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center text-gray-100">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-gray-400 font-medium">Assembling custom AI interview questions...</p>
      </div>
    );
  }

  if (!questions || questions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center text-gray-100 p-4 text-center">
        <p className="text-red-400 font-medium mb-4">No questions found for this session.</p>
        <button onClick={() => navigate('/dashboard')} className="px-4 py-2 bg-gray-800 rounded-lg text-sm border border-gray-700">
          Return to Dashboard
        </button>
      </div>
    );
  }

  // --- THE PENALTY BOX ---
  if (isCheatLocked) {
    return (
      <div ref={containerRef} className="min-h-screen bg-gray-950 flex flex-col items-center justify-center text-center p-4 select-none w-full relative">
        
        {isSubmitting && (
          <div className="absolute inset-0 z-50 bg-gray-950/90 backdrop-blur-md flex flex-col items-center justify-center rounded-xl">
            <div className="relative w-20 h-20 mb-6">
              <div className="absolute inset-0 border-t-4 border-red-500 rounded-full animate-spin"></div>
              <div className="absolute inset-2 border-r-4 border-orange-500 rounded-full animate-spin-slow"></div>
              <div className="absolute inset-4 border-b-4 border-yellow-500 rounded-full animate-spin-reverse"></div>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2 tracking-wide animate-pulse">
              Transmitting Locked Assessment...
            </h2>
            <p className="text-gray-400 max-w-md text-center">
              Please wait while we attempt to securely submit your final answers.
            </p>
          </div>
        )}

        <div className="w-20 h-20 bg-red-900/30 text-red-500 rounded-full flex items-center justify-center mb-6">
          <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-white mb-4">Assessment Locked</h1>
        <p className="text-gray-400 max-w-md mb-8">
          Your assessment was terminated due to a proctoring violation, but the server is currently busy and failed to submit. 
          You cannot return to the questions. Please retry the submission to record your score.
        </p>
        
        <button 
          // 4. LINKED THE BUTTON TO THE LOADING STATE
          disabled={isSubmitting}
          onClick={async () => {
             if (!document.fullscreenElement && containerRef.current) {
                 await containerRef.current.requestFullscreen().catch(e => console.log(e));
             }
             handleSubmitFinal(true);
          }}
          className="px-8 py-3 bg-red-600 hover:bg-red-700 disabled:bg-red-900 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-lg font-bold transition-all shadow-lg shadow-red-900/20 flex items-center justify-center"
        >
          {isSubmitting ? (
            <>
              {/* Spinning SVG Icon for the button */}
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Retrying...
            </>
          ) : (
            "Retry Submission"
          )}
        </button>
      </div>
    );
  }

  const currentQ = questions[currentIndex];

  return (
    <div ref={containerRef} className="select-none min-h-screen w-full bg-gray-950 text-gray-100 flex flex-col md:flex-row font-sans relative">
      
      {/* LOADING OVERLAY */}
      {isSubmitting && (
        <div className="absolute inset-0 z-50 bg-gray-950/80 backdrop-blur-sm flex flex-col items-center justify-center">
          <div className="relative w-24 h-24 mb-6">
            <div className="absolute inset-0 border-t-4 border-blue-500 rounded-full animate-spin"></div>
            <div className="absolute inset-2 border-r-4 border-purple-500 rounded-full animate-spin-slow"></div>
            <div className="absolute inset-4 border-b-4 border-green-500 rounded-full animate-spin-reverse"></div>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2 tracking-wide animate-pulse">
            AI is Analyzing Your Responses
          </h2>
          <p className="text-gray-400 max-w-md text-center">
            Please wait while our strict technical evaluator reviews your code, grades your answers, and generates personalized feedback...
          </p>
          <div className="w-64 h-1.5 bg-gray-800 rounded-full mt-8 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500 w-full animate-progress origin-left"></div>
          </div>
        </div>
      )}

      {/* LEFT SIDEBAR (Camera & Grid) */}
      <div className="w-full md:w-1/4 p-4 border-r border-gray-800 bg-gray-900 flex flex-col">
        
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Proctoring Camera</span>
            <span className="flex items-center text-red-500 text-[10px] font-bold uppercase tracking-widest animate-pulse">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full mr-1.5"></span> Live
            </span>
          </div>
          <div className="bg-black rounded-lg overflow-hidden relative border border-gray-800 shadow-inner h-40 flex items-center justify-center">
            {!cameraActive && <p className="text-xs text-gray-600">Initializing...</p>}
            <video 
              ref={videoRef} autoPlay playsInline muted 
              className="absolute inset-0 w-full h-full object-cover mirror"
              style={{ transform: 'scaleX(-1)' }} 
            />
          </div>
        </div>

        <div className="flex-grow">
          <h3 className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-3">Question Map</h3>
          
          <div className="grid grid-cols-2 gap-2 mb-4 text-[10px] text-gray-400">
            <div className="flex items-center"><div className="w-2 h-2 bg-gray-700 rounded-full mr-2"></div>Not Visited</div>
            <div className="flex items-center"><div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>Current/Visited</div>
            <div className="flex items-center"><div className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></div>Skipped</div>
            <div className="flex items-center"><div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>Answered</div>
          </div>

          <div className="grid grid-cols-5 gap-2">
            {questions.map((q, idx) => (
              <button
                key={q.id}
                disabled={!isReady}
                onClick={() => goToQuestion(idx)}
                className={`h-10 rounded-md text-sm font-semibold border transition-all ${
                  currentIndex === idx && isReady ? 'ring-2 ring-white scale-110 shadow-lg' : ''
                } ${getStatusColor(q.status)} ${!isReady ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                {idx + 1}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT SIDE (Test Area) */}
      <div className="w-full md:w-3/4 p-8 flex flex-col">
        
        {!isReady ? (
          <div className="flex-grow flex flex-col items-center justify-center text-center max-w-lg mx-auto">
            <div className="w-16 h-16 bg-blue-600/20 text-blue-500 rounded-full flex items-center justify-center mb-6">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
            </div>
            <h1 className="text-3xl font-bold mb-4 text-white">System Check Complete</h1>
            <p className="text-gray-400 mb-8">
              Your camera is active and the environment is secure. You have {questions.length} questions to complete. 
              MCQs will save automatically. You can navigate between questions using the map on the left.
            </p>
            <button 
              onClick={handleStart}
              className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-lg transition-colors w-full shadow-lg shadow-blue-900/20"
            >
              I am ready, Start Assessment
            </button>
          </div>
        ) : (
          <div className="flex flex-col h-full max-w-3xl mx-auto w-full">
            
            <div className="flex justify-between items-end border-b border-gray-800 pb-4 mb-6">
              <div>
                <span className="text-blue-500 font-bold tracking-widest text-sm uppercase">Question {currentIndex + 1} of {questions.length}</span>
                <h2 className="text-2xl font-medium mt-2 text-white">{currentQ.text}</h2>
              </div>
              <span className="px-3 py-1 bg-gray-800 text-gray-300 text-xs rounded-full border border-gray-700 uppercase tracking-wider">
                {currentQ.type === 'mcq' ? 'Multiple Choice' : 'Detailed Answer'}
              </span>
            </div>

            <div className="flex-grow mb-8">
              {currentQ.type === 'mcq' ? (
                <div className="space-y-3">
                  {currentQ.options.map((opt, i) => (
                    <div 
                      key={i}
                      onClick={() => handleMcqSelect(opt)}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all flex items-center ${
                        currentQ.answer === opt 
                          ? 'border-blue-500 bg-blue-900/20 text-white' 
                          : 'border-gray-800 bg-gray-900/50 text-gray-400 hover:border-gray-600 hover:bg-gray-800'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full border-2 mr-4 flex items-center justify-center ${
                        currentQ.answer === opt ? 'border-blue-500' : 'border-gray-600'
                      }`}>
                        {currentQ.answer === opt && <div className="w-2.5 h-2.5 bg-blue-500 rounded-full"></div>}
                      </div>
                      <span className="text-lg">{opt}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-full flex flex-col">
                  <textarea 
                    value={currentQ.answer}
                    onChange={(e) => {
                      const updated = [...questions];
                      updated[currentIndex].answer = e.target.value;
                      setQuestions(updated);
                    }}
                    placeholder="Type your detailed answer here..."
                    className="select-text w-full flex-grow p-4 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none font-mono text-sm leading-relaxed"
                  />
                  <button 
                    onClick={handleTextSave}
                    className="mt-4 self-end px-6 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white rounded-md transition-colors text-sm font-medium"
                  >
                    Save Answer
                  </button>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-gray-800">
              <button 
                onClick={() => goToQuestion(currentIndex - 1)}
                disabled={currentIndex === 0}
                className="px-6 py-2.5 rounded-lg font-medium bg-gray-800 text-gray-300 hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              
              {currentIndex === questions.length - 1 ? (
                <button 
                  onClick={() => handleSubmitFinal(false)}
                  className="px-8 py-2.5 rounded-lg font-bold bg-green-600 text-white hover:bg-green-500 shadow-lg shadow-green-900/20 transition-all"
                >
                  Submit Final Assessment
                </button>
              ) : (
                <div className="space-x-3">
                  <button 
                    onClick={handleNext}
                    className="px-6 py-2.5 rounded-lg font-medium border border-gray-700 text-gray-300 hover:bg-gray-800 transition-colors"
                  >
                    Skip
                  </button>
                  <button 
                    onClick={handleNext}
                    className="px-8 py-2.5 rounded-lg font-bold bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-900/20 transition-colors"
                  >
                    Next Question
                  </button>
                </div>
              )}
            </div>
            
          </div>
        )}
      </div>
    </div>
  );
}