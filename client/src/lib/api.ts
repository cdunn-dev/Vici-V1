/**
 * API client with simplified authentication support
 */

// Create headers with content type only
const createHeaders = (contentType = 'application/json') => {
  return {
    'Content-Type': contentType,
  };
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