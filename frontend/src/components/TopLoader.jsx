import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import LoadingBar from 'react-top-loading-bar';

export default function TopLoader() {
  const [progress, setProgress] = useState(0);
  const location = useLocation();

  useEffect(() => {
    // When the route changes, start the bar at 30%
    setProgress(30);
    
    // Simulate the page load finishing after a brief moment
    const timer = setTimeout(() => {
      setProgress(100);
    }, 400); 

    return () => clearTimeout(timer);
  }, [location.pathname]); 

  return (
    <LoadingBar 
      color="#3b82f6" 
      progress={progress} 
      onLoaderFinished={() => setProgress(0)} 
      height={3} 
      waitingTime={200}
    />
  );
}