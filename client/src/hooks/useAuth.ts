
import { useContext } from 'react';
import { AuthContext } from '@/context/AuthContext';

// Named export for consistent imports
export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};

// Default export for backward compatibility
export default useAuth;
