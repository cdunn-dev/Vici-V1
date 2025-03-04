// client/src/App.tsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { LoginForm } from '@/components/auth/login-form'; // Updated import path
import { RegisterForm } from '@/components/auth/register-form'; // Updated import path
import Home from '@/pages/Home';
import ProtectedRoute from '@/components/ProtectedRoute'; // Added import


function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginForm />} />
        <Route path="/register" element={<RegisterForm />} />
        <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} /> {/* Added ProtectedRoute */}

      </Routes>
    </Router>
  );
}

export default App;


//client/src/components/ProtectedRoute.tsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth'; //Corrected import

const ProtectedRoute = ({ children }: any) => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" />;
  }

  return children;
};


export default ProtectedRoute;


//client/src/hooks/useAuth.ts
import { useState, useEffect } from 'react';

const useAuth = () => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    //Fetch user data here.  This is a placeholder and needs to be implemented based on your authentication system
    const storedUser = localStorage.getItem('user');
    if(storedUser){
        setUser(JSON.parse(storedUser));
    }
  }, []);

  const login = (userData:any) => {
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('user');
    setUser(null);
  };

  return { user, login, logout };
};


export default useAuth; //This line was missing

//vite.config.ts (or equivalent Vite configuration file)
//This needs to be adapted to your specific Vite setup.  This is an example and might not work out of the box.
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    hmr: {
      protocol: 'ws', //This might need adjustment based on your Replit environment
      host: 'localhost', //Or the appropriate Replit domain
      port: 5173,
    },
  },
});