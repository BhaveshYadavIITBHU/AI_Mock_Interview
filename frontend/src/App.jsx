import { Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast'; // <-- The new Toaster import
import TopLoader from './components/TopLoader';
import Navbar from './components/Navbar';

//PAge Components
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Interview from './pages/Interview';
import Result from './pages/Result';
import History from './pages/History';
import Profile from './pages/Profile';
import Session from './pages/Session';

function App() {
  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      <TopLoader/>
      <Navbar />

      {/* The Global Toaster Component */}
      <Toaster 
        position="top-center"
        toastOptions={{
          style: {
            background: '#1f2937', 
            color: '#f3f4f6',      
            border: '1px solid #374151', 
          },
          success: { iconTheme: { primary: '#10b981', secondary: '#1f2937' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#1f2937' } },
        }}
      />

      {/* Main Page Content */}
      <main>
        <Routes>
          {/* Public Route */}
          <Route path="/" element={<Landing />} />
          
          {/* Protected Routes */}
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/interview" element={<Interview />} />
          <Route path="/result/:id" element={<Result />} />
          <Route path="/history" element={<History />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/session/:id" element={<Session />} />
        </Routes>
      </main>

    </div>
  );
}

export default App;