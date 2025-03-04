
/**
 * API client with authentication support
 */

// Get token from localStorage
const getToken = () => localStorage.getItem('token');

// Create headers with authentication
const createHeaders = (contentType = 'application/json') => {
  const headers: Record<string, string> = {
    'Content-Type': contentType,
  };
  
  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
};

// Generic API request function
const apiRequest = async <T>(
  url: string,
  method: string,
  body?: any,
  contentType = 'application/json'
): Promise<T> => {
  const headers = createHeaders(contentType);
  
  const options: RequestInit = {
    method,
    headers,
    credentials: 'include', // Send cookies
  };
  
  if (body) {
    options.body = contentType === 'application/json' ? JSON.stringify(body) : body;
  }
  
  const response = await fetch(url, options);
  
  // Handle 401 Unauthorized responses
  if (response.status === 401) {
    // Clear local storage and reload the page to trigger login
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/auth';
    throw new Error('Your session has expired. Please log in again.');
  }
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || 'An error occurred');
  }
  
  return data;
};

// API methods
export const api = {
  get: <T>(url: string) => apiRequest<T>(url, 'GET'),
  post: <T>(url: string, body: any) => apiRequest<T>(url, 'POST', body),
  put: <T>(url: string, body: any) => apiRequest<T>(url, 'PUT', body),
  patch: <T>(url: string, body: any) => apiRequest<T>(url, 'PATCH', body),
  delete: <T>(url: string) => apiRequest<T>(url, 'DELETE'),
};
