
import { useContext } from 'react';
import { AuthContext } from '@/context/AuthContext';

// Export as a named export for components using { useAuth }
export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};

// Also export as default for components using useAuth
export default useAuth;
