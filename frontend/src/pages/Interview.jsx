import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api from '../api'; // Import custom api

export default function Interview() {
  const navigate = useNavigate();

  // State to hold the user's text input
  const [formData, setFormData] = useState({
    jobRole: '',
    techStack: '',
    experience: ''
  });

  // State to hold the actual PDF file
  const [resume, setResume] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Updates the state whenever the user types
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // PDF Size Validator 
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) {
      setResume(null);
      return;
    }

    const MAX_FILE_SIZE = 5 * 1024 * 1024; 

    if (file.size > MAX_FILE_SIZE) {
      toast.error("Resume is too large. Please upload a PDF smaller than 5MB.");
      e.target.value = null; 
      setResume(null);
      return;
    }

    setResume(file);
  };

  // When clicked "Start Interview"
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsGenerating(true);
    toast.loading("Gemini is analyzing requirements and generating questions...", { id: "genToast" });

    try {
      // Because we are sending a file, we MUST use FormData instead of standard JSON
      const submitData = new FormData();
      submitData.append('jobRole', formData.jobRole);
      submitData.append('techStack', formData.techStack);
      submitData.append('experience', formData.experience);
      
      if (resume) {
        submitData.append('resume', resume);
      }

      // 1) Send the form data to your Node.js backend
      const response = await api.post('/api/interview/generate', submitData);

      // 2) The backend should return the ID of the newly created interview session
      const { interviewId } = response.data;

      // 3) Teleport user to live active interview room
      toast.success("Interview generated!", { id: "genToast" });
      navigate(`/session/${interviewId}`);
       
    } catch (error) {
      toast.error("Failed to generate interview", { id: "genToast" });   
      setIsGenerating(false); 
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] w-full bg-gray-950 text-gray-100 flex items-center justify-center relative select-none py-12 px-4">
      
      {/* THE GENERATION LOADING OVERLAY */}
      {isGenerating && (
        <div className="absolute inset-0 z-50 bg-gray-950/80 backdrop-blur-sm flex flex-col items-center justify-center">
          <div className="relative w-24 h-24 mb-6">
            <div className="absolute inset-0 border-t-4 border-blue-500 rounded-full animate-spin"></div>
            <div className="absolute inset-2 border-r-4 border-purple-500 rounded-full animate-spin-slow"></div>
            <div className="absolute inset-4 border-b-4 border-green-500 rounded-full animate-spin-reverse"></div>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2 tracking-wide animate-pulse">
            Crafting Your Custom Interview
          </h2>
          <p className="text-gray-400 max-w-md text-center">
            Our AI is analyzing your resume and generating highly specific technical questions based on your requirements...
          </p>
          <div className="w-64 h-1.5 bg-gray-800 rounded-full mt-8 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500 w-full animate-progress origin-left"></div>
          </div>
        </div>
      )}

      {/* FORM CARD */}
      <div className="w-full max-w-3xl bg-gray-900 rounded-xl shadow-lg border border-gray-800 p-8">
        <h1 className="text-3xl font-bold text-white mb-2">Configure Your Interview</h1>
        <p className="text-gray-400 mb-8">Tell our AI what role you are targeting and upload your resume for tailored questions.</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Job Role Input */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Target Job Role</label>
            <input
             type="text"
             name="jobRole"
             required
             placeholder="e.g., Frontend Developer, Data Scientist"
             className="w-full px-4 py-3 bg-gray-950 border border-gray-800 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition select-text"
             value={formData.jobRole}
             onChange={handleChange}
            />
          </div>

          {/* Tech Stack Input */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Key Skills / Tech Stack</label>
            <textarea
              name="techStack"
              required
              placeholder="e.g., React, Node.js, Python, System Design"
              rows="3"
              className="w-full px-4 py-3 bg-gray-950 border border-gray-800 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition select-text resize-none"
              value={formData.techStack}
              onChange={handleChange}
            />
          </div>

          {/* Experience Level Input */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Years of Experience</label>
            <input
              type="number"
              name="experience"
              required
              min="0"
              max="50"
              placeholder="e.g., 0 for Entry Level, 3 for Mid-Level"
              className="w-full px-4 py-3 bg-gray-950 border border-gray-800 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition select-text"
              value={formData.experience}
              onChange={handleChange}
            />
          </div>

         {/* Resume File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Upload Resume (Optional PDF, Max 5MB)</label>
            <input 
              type="file" 
              accept=".pdf"
              onChange={handleFileChange} 
              className="w-full text-gray-300 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 bg-gray-950 border border-gray-800 rounded-lg p-2 outline-none transition cursor-pointer"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-4 pt-6 border-t border-gray-800">
            <button
              type="button"
              disabled={isGenerating}
              onClick={() => navigate('/dashboard')}
              className="px-6 py-2.5 border border-gray-700 text-gray-300 rounded-lg font-medium hover:bg-gray-800 transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isGenerating}
              className="px-8 py-2.5 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-500 transition disabled:bg-blue-800 disabled:text-gray-400 shadow-lg shadow-blue-900/20"
            >
              Start Interview
            </button>
          </div>
          
        </form>
      </div>
    </div>
  );
}