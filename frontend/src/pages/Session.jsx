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
  
  // Local active question draft for lag-free typing
  const [localAnswer, setLocalAnswer] = useState('');
  
  // --- TIMER STATE (30 Minutes Default) ---
  const [timeLeft, setTimeLeft] = useState(30 * 60);

  // --- SPEECH RECOGNITION (DICTATION) ---
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);
  const [speechSupported, setSpeechSupported] = useState(false);

  // --- CODE MODE & LANGUAGE ---
  const [isCodeMode, setIsCodeMode] = useState(false);
  const [selectedLang, setSelectedLang] = useState('javascript');

  // Tracks penalty box if cheat submission failed
  const [isCheatLocked, setIsCheatLocked] = useState(false);

  // --- ANTI-CHEAT & PROCTORING ---
  const containerRef = useRef(null);
  const warnings = useRef(0);
  const [violationCount, setViolationCount] = useState(0);
  const [isProctoringActive, setIsProctoringActive] = useState(false);
  
  // Ref preventing stale closures in anti-cheat / timer callbacks
  const latestQuestions = useRef(questions);
  useEffect(() => {
    latestQuestions.current = questions;
  }, [questions]);

  // Sync localAnswer whenever current question changes
  useEffect(() => {
    if (questions[currentIndex]) {
      setLocalAnswer(questions[currentIndex].answer || '');
    }
  }, [currentIndex, questions]);

  // --- MASTER SUBMISSION FUNCTION ---
  const handleSubmitFinal = async (isForced = false) => {
    if (!isForced) {
        const confirmSubmit = window.confirm("Are you sure you want to submit your assessment?");
        if (!confirmSubmit) return;
    }

    // Ensure any unsaved local answer is committed
    const finalQuestions = latestQuestions.current.map((q, idx) => {
      if (idx === currentIndex) {
        return { ...q, answer: localAnswer };
      }
      return q;
    });

    try {
        setIsSubmitting(true);
        if (isListening && recognitionRef.current) {
          recognitionRef.current.stop();
          setIsListening(false);
        }

        toast.loading("AI is evaluating your technical assessment...", { id: "gradingToast" });

        await api.post(`/api/interview/session/${id}/submit`, {
            answers: finalQuestions 
        });

        toast.success("Assessment graded successfully!", { id: "gradingToast" });

        if (document.fullscreenElement) {
            await document.exitFullscreen().catch(err => console.log(err));
        }

        // Navigate to dedicated Results page
        navigate(`/result/${id}`);
    }
    catch (error) {
        console.error("Failed to submit assessment:", error);
        toast.error("There was an error grading your assessment.", { id: "gradingToast" });
        setIsSubmitting(false);
        
        if (isForced) {
            setIsCheatLocked(true);
        }
    }
  };

  // --- COUNTDOWN TIMER EFFECT ---
  useEffect(() => {
    if (!isReady || isSubmitting || isCheatLocked) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          toast.error("Time has expired! Automatically submitting your assessment.");
          handleSubmitFinal(true);
          return 0;
        }
        if (prev === 300) {
          toast("⏳ 5 minutes remaining!", { duration: 4000 });
        }
        if (prev === 60) {
          toast.error("⚠️ Final 60 seconds remaining!");
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isReady, isSubmitting, isCheatLocked]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // --- WEB SPEECH API SETUP ---
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            transcript += event.results[i][0].transcript;
          }
        }
        if (transcript) {
          setLocalAnswer((prev) => {
            const updatedText = prev ? `${prev} ${transcript.trim()}` : transcript.trim();
            // Also sync to questions
            setQuestions((curr) => {
              const nextQ = [...curr];
              if (nextQ[currentIndex]) {
                nextQ[currentIndex] = { ...nextQ[currentIndex], answer: updatedText };
              }
              return nextQ;
            });
            return updatedText;
          });
        }
      };

      recognition.onerror = (event) => {
        console.warn("Speech recognition error:", event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch(e) {}
      }
    };
  }, [currentIndex]);

  const toggleSpeech = () => {
    if (!speechSupported || !recognitionRef.current) {
      toast.error("Voice dictation is only supported on Chromium browsers (Chrome, Edge).");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      toast("Voice dictation stopped", { icon: "🎙️" });
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
        toast.success("Listening... Speak your answer clearly", { icon: "🎙️" });
      } catch (err) {
        console.error(err);
      }
    }
  };

  // --- ANTI-CHEAT SYSTEM ---
  useEffect(() => {
    if (!isProctoringActive) return;

    const handleViolation = () => {
        if (warnings.current === 0) {
            warnings.current = 1;
            setViolationCount(1);
            toast.error(
              "WARNING (1/3): You left fullscreen or switched tabs! You have 2 chances remaining before automatic submission.",
              { duration: 6000 }
            );  
        }
        else if (warnings.current === 1) {
            warnings.current = 2;
            setViolationCount(2);
            toast.error(
              "WARNING (2/3): Second violation detected! One more violation will automatically submit your assessment.",
              { duration: 6000 }
            );
        }
        else if (warnings.current >= 2) {
            warnings.current = 3;
            setViolationCount(3);
            toast.error("FINAL VIOLATION (3/3): Automatically submitting your assessment to the AI.");
            handleSubmitFinal(true); 
        }
    };

    const onFullscreenChange = () => {
        if (!document.fullscreenElement) handleViolation();
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
            if (response.data.questions && response.data.questions.length > 0) {
              setLocalAnswer(response.data.questions[0].answer || '');
            }
        } catch (error) {
            console.error("Could not pull dynamic session questions:", error);
            toast.error("Session not found or expired.");
        } finally {
            setLoading(false);
        }
    };
    loadInterviewData();
  }, [id]);

  // --- INITIALIZE CAMERA ---
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

  // --- NAVIGATION & STATUS HELPERS ---
  const updateQuestionStatus = (index, newStatus, newAnswer = null) => {
    const updated = [...questions];
    if (newAnswer !== null) updated[index].answer = newAnswer;
    updated[index].status = newStatus;
    setQuestions(updated);
  };

  const goToQuestion = (index) => {
    // Save current question's localAnswer before switching
    if (questions[currentIndex]) {
      const currentAns = localAnswer.trim();
      const updated = [...questions];
      updated[currentIndex].answer = localAnswer;
      
      if (!currentAns && questions[currentIndex].status === 'visited') {
        updated[currentIndex].status = 'skipped';
      } else if (currentAns) {
        updated[currentIndex].status = 'answered';
      }
      setQuestions(updated);
    }

    setCurrentIndex(index);
    setLocalAnswer(questions[index]?.answer || '');

    if (questions[index]?.status === 'not_visited' || questions[index]?.status === 'skipped') {
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
    setLocalAnswer(option);
    updateQuestionStatus(currentIndex, 'answered', option);
  };

  const handleTextAnswerChange = (val) => {
    setLocalAnswer(val);
    const updated = [...questions];
    if (updated[currentIndex]) {
      updated[currentIndex].answer = val;
      if (val.trim()) {
        updated[currentIndex].status = 'answered';
      }
      setQuestions(updated);
    }
  };

  const handleKeyDown = (e) => {
    // Enable Tab indentation in code/text areas
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.target.selectionStart;
      const end = e.target.selectionEnd;
      const value = e.target.value;
      const newValue = value.substring(0, start) + '  ' + value.substring(end);
      handleTextAnswerChange(newValue);
      setTimeout(() => {
        if (e.target) {
          e.target.selectionStart = e.target.selectionEnd = start + 2;
        }
      }, 0);
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      goToQuestion(currentIndex + 1);
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'answered': return 'bg-green-600 border-green-500 text-white';
      case 'skipped': return 'bg-yellow-600 border-yellow-500 text-white';
      case 'visited': return 'bg-blue-600 border-blue-500 text-white';
      default: return 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700';
    }
  };

  // --- LOADING VIEW ---
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center text-gray-100">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-gray-400 font-medium">Assembling custom AI interview assessment...</p>
      </div>
    );
  }

  if (!questions || questions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center text-gray-100 p-4 text-center">
        <p className="text-red-400 font-medium mb-4">No questions found for this session or session expired.</p>
        <button onClick={() => navigate('/dashboard')} className="px-5 py-2.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm border border-gray-700 transition">
          Return to Dashboard
        </button>
      </div>
    );
  }

  // --- PENALTY BOX VIEW ---
  if (isCheatLocked) {
    return (
      <div ref={containerRef} className="min-h-screen bg-gray-950 flex flex-col items-center justify-center text-center p-4 select-none w-full relative">
        <div className="w-20 h-20 bg-red-900/30 text-red-500 rounded-full flex items-center justify-center mb-6">
          <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-white mb-4">Assessment Locked</h1>
        <p className="text-gray-400 max-w-md mb-8">
          Your assessment was terminated due to a proctoring violation. Please retry submission to compute your score.
        </p>
        <button 
          disabled={isSubmitting}
          onClick={async () => {
             if (!document.fullscreenElement && containerRef.current) {
                 await containerRef.current.requestFullscreen().catch(e => console.log(e));
             }
             handleSubmitFinal(true);
          }}
          className="px-8 py-3 bg-red-600 hover:bg-red-700 disabled:bg-red-900 text-white rounded-lg font-bold transition shadow-lg flex items-center justify-center"
        >
          {isSubmitting ? "Retrying..." : "Retry Submission"}
        </button>
      </div>
    );
  }

  const currentQ = questions[currentIndex];

  return (
    <div ref={containerRef} className="select-none min-h-screen w-full bg-gray-950 text-gray-100 flex flex-col md:flex-row font-sans relative">
      
      {/* EVALUATION PROGRESS OVERLAY */}
      {isSubmitting && (
        <div className="absolute inset-0 z-50 bg-gray-950/85 backdrop-blur-md flex flex-col items-center justify-center">
          <div className="relative w-24 h-24 mb-6">
            <div className="absolute inset-0 border-t-4 border-blue-500 rounded-full animate-spin"></div>
            <div className="absolute inset-2 border-r-4 border-purple-500 rounded-full animate-spin-slow"></div>
            <div className="absolute inset-4 border-b-4 border-green-500 rounded-full animate-spin-reverse"></div>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2 tracking-wide animate-pulse">
            AI is Evaluating Your Responses
          </h2>
          <p className="text-gray-400 max-w-md text-center">
            Analyzing your answers against industry technical benchmarks and calculating ratings...
          </p>
        </div>
      )}

      {/* LEFT PROCTORING SIDEBAR */}
      <div className="w-full md:w-1/4 p-5 border-r border-gray-800 bg-gray-900/60 flex flex-col">
        
        {/* Webcam View */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Proctor Camera</span>
            <span className="flex items-center text-red-500 text-[10px] font-bold uppercase tracking-widest animate-pulse">
              <span className="w-2 h-2 bg-red-500 rounded-full mr-1.5"></span> Live
            </span>
          </div>
          <div className="bg-black rounded-lg overflow-hidden relative border border-gray-800 shadow-inner h-36 flex items-center justify-center">
            {!cameraActive && <p className="text-xs text-gray-600">Initializing camera...</p>}
            <video 
              ref={videoRef} autoPlay playsInline muted 
              className="absolute inset-0 w-full h-full object-cover"
              style={{ transform: 'scaleX(-1)' }} 
            />
          </div>
        </div>

        {/* Question Map */}
        <div className="flex-grow">
          <h3 className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-3">Question Map</h3>
          
          <div className="grid grid-cols-2 gap-2 mb-4 text-[11px] text-gray-400">
            <div className="flex items-center"><div className="w-2 h-2 bg-gray-800 rounded-full mr-2"></div>Not Visited</div>
            <div className="flex items-center"><div className="w-2 h-2 bg-blue-600 rounded-full mr-2"></div>Current</div>
            <div className="flex items-center"><div className="w-2 h-2 bg-yellow-600 rounded-full mr-2"></div>Skipped</div>
            <div className="flex items-center"><div className="w-2 h-2 bg-green-600 rounded-full mr-2"></div>Answered</div>
          </div>

          <div className="grid grid-cols-5 gap-2">
            {questions.map((q, idx) => (
              <button
                key={q.id}
                disabled={!isReady}
                onClick={() => goToQuestion(idx)}
                className={`h-10 rounded-md text-sm font-semibold border transition-all ${
                  currentIndex === idx && isReady ? 'ring-2 ring-white scale-105 shadow-md' : ''
                } ${getStatusColor(q.status)} ${!isReady ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                {idx + 1}
              </button>
            ))}
          </div>
        </div>

        {/* Warning Badge */}
        <div className="mt-4 pt-4 border-t border-gray-800 flex justify-between text-xs text-gray-400">
          <span>Violations: <strong className={violationCount > 0 ? 'text-red-400' : 'text-gray-300'}>{violationCount}/3</strong></span>
          <span>Proctoring: <strong className="text-green-400">Active</strong></span>
        </div>
      </div>

      {/* RIGHT MAIN ASSESSMENT AREA */}
      <div className="w-full md:w-3/4 p-8 flex flex-col">
        
        {!isReady ? (
          /* System Check Screen */
          <div className="flex-grow flex flex-col items-center justify-center text-center max-w-lg mx-auto">
            <div className="w-16 h-16 bg-blue-600/20 text-blue-500 rounded-full flex items-center justify-center mb-6">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
            </div>
            <h1 className="text-3xl font-bold mb-4 text-white">System Check Complete</h1>
            <p className="text-gray-400 mb-8 leading-relaxed">
              Your camera is active and proctoring is enabled. You have <strong>30 minutes</strong> to complete <strong>{questions.length} questions</strong> (10 MCQs + 5 Technical open-ended).
              Leaving full-screen or switching tabs more than 2 times (3 strikes) will automatically submit your assessment.
            </p>
            <button 
              onClick={handleStart}
              className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-lg transition-all w-full shadow-lg shadow-blue-900/20 cursor-pointer"
            >
              I am ready, Begin Assessment
            </button>
          </div>
        ) : (
          /* Active Question Flow */
          <div className="flex flex-col h-full max-w-3xl mx-auto w-full">
            
            {/* Header with Timer */}
            <div className="flex flex-wrap justify-between items-center border-b border-gray-800 pb-4 mb-6 gap-4">
              <div>
                <span className="text-blue-500 font-bold tracking-widest text-xs uppercase">Question {currentIndex + 1} of {questions.length}</span>
                <h2 className="text-xl font-semibold mt-1 text-white">{currentQ.text}</h2>
              </div>
              
              <div className="flex items-center gap-3">
                {/* Countdown Timer HUD */}
                <div className={`px-4 py-2 rounded-lg border font-mono font-bold text-base flex items-center gap-2 ${
                  timeLeft <= 60 
                    ? 'border-red-500 bg-red-950/50 text-red-400 animate-pulse' 
                    : timeLeft <= 300 
                    ? 'border-yellow-500 bg-yellow-950/40 text-yellow-400' 
                    : 'border-gray-700 bg-gray-900 text-blue-400'
                }`}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {formatTime(timeLeft)}
                </div>

                <span className="px-3 py-1 bg-gray-800 text-gray-300 text-xs rounded-full border border-gray-700 uppercase tracking-wider">
                  {currentQ.type === 'mcq' ? 'MCQ' : 'Technical / Code'}
                </span>
              </div>
            </div>

            {/* Question Body */}
            <div className="flex-grow mb-6">
              {currentQ.type === 'mcq' ? (
                <div className="space-y-3">
                  {currentQ.options.map((opt, i) => (
                    <div 
                      key={i}
                      onClick={() => handleMcqSelect(opt)}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all flex items-center ${
                        localAnswer === opt 
                          ? 'border-blue-500 bg-blue-900/20 text-white shadow-md' 
                          : 'border-gray-800 bg-gray-900/50 text-gray-300 hover:border-gray-600 hover:bg-gray-800/80'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full border-2 mr-4 flex items-center justify-center ${
                        localAnswer === opt ? 'border-blue-500' : 'border-gray-600'
                      }`}>
                        {localAnswer === opt && <div className="w-2.5 h-2.5 bg-blue-500 rounded-full"></div>}
                      </div>
                      <span className="text-base">{opt}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-full flex flex-col">
                  {/* Toolbar for Voice & Formatting */}
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsCodeMode(!isCodeMode)}
                        className={`px-3 py-1 text-xs rounded border transition cursor-pointer ${
                          isCodeMode ? 'bg-blue-600 border-blue-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'
                        }`}
                      >
                        {isCodeMode ? "💻 Code Mode Active" : "📝 Text Mode"}
                      </button>

                      {isCodeMode && (
                        <select 
                          value={selectedLang} 
                          onChange={(e) => setSelectedLang(e.target.value)}
                          className="px-2 py-1 text-xs bg-gray-800 border border-gray-700 rounded text-gray-200 outline-none"
                        >
                          <option value="javascript">JavaScript</option>
                          <option value="python">Python</option>
                          <option value="java">Java</option>
                          <option value="cpp">C++</option>
                          <option value="sql">SQL</option>
                        </select>
                      )}
                    </div>

                    {/* Speech to Text Dictation Button */}
                    <button
                      type="button"
                      onClick={toggleSpeech}
                      className={`px-3 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition border cursor-pointer ${
                        isListening 
                          ? 'bg-red-600 border-red-500 text-white animate-pulse' 
                          : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
                      }`}
                      title="Dictate response via microphone"
                    >
                      <span className={`w-2 h-2 rounded-full ${isListening ? 'bg-white' : 'bg-red-500'}`}></span>
                      {isListening ? "Listening... (Click to stop)" : "🎤 Dictate Answer"}
                    </button>
                  </div>

                  {/* Text / Code Editor with Tab Key Support */}
                  <textarea 
                    value={localAnswer}
                    onChange={(e) => handleTextAnswerChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={isCodeMode ? "// Write your code implementation here (Tab supported)..." : "Explain your technical approach, solution, or architecture in detail..."}
                    className={`select-text w-full flex-grow p-4 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none leading-relaxed min-h-[260px] ${
                      isCodeMode ? 'font-mono text-sm bg-gray-950' : 'text-base'
                    }`}
                  />
                  <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
                    <span>{isCodeMode ? "Tab key indentation enabled" : "Use microphone to dictate your verbal response"}</span>
                    <span>{localAnswer.length} characters</span>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Actions Bar */}
            <div className="flex justify-between items-center pt-4 border-t border-gray-800">
              <button 
                onClick={() => goToQuestion(currentIndex - 1)}
                disabled={currentIndex === 0}
                className="px-6 py-2.5 rounded-lg font-medium bg-gray-800 text-gray-300 hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                Previous
              </button>
              
              {currentIndex === questions.length - 1 ? (
                <button 
                  onClick={() => handleSubmitFinal(false)}
                  className="px-8 py-2.5 rounded-lg font-bold bg-green-600 text-white hover:bg-green-500 shadow-lg shadow-green-900/20 transition-all cursor-pointer"
                >
                  Submit Final Assessment
                </button>
              ) : (
                <div className="space-x-3">
                  <button 
                    onClick={handleNext}
                    className="px-6 py-2.5 rounded-lg font-medium border border-gray-700 text-gray-300 hover:bg-gray-800 transition-colors cursor-pointer"
                  >
                    Skip
                  </button>
                  <button 
                    onClick={handleNext}
                    className="px-8 py-2.5 rounded-lg font-bold bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-900/20 transition-colors cursor-pointer"
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