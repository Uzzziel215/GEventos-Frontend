import { useAuth } from '@/context/AuthContext'; // Assuming AuthContext is in context folder
import { useRouter } from 'next/navigation';
import { useCallback, useMemo } from 'react'; // Importar useCallback y useMemo

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001/api';

interface ApiOptions extends RequestInit {
  token?: string;
  isFormData?: boolean;
}

async function apiFetch<T>(endpoint: string, options?: ApiOptions): Promise<T> {
  const { token, isFormData, ...fetchOptions } = options || {};

  const headers = new Headers(fetchOptions.headers);

  if (!isFormData) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const config: RequestInit = {
    ...fetchOptions,
    headers: headers,
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

    if (!response.ok) {
      // Handle specific error codes, e.g., 401 for unauthorized
      if (response.status === 401 || response.status === 403) {
        // This is where you might want to redirect to login or refresh token
        // For now, just throw an error
        const errorData = await response.json();
        throw new Error(errorData.message || `API Error: ${response.statusText}`);
      }
      const errorData = await response.json();
      throw new Error(errorData.message || `API Error: ${response.statusText}`);
    }

    // Check if the response has content before parsing as JSON
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      return await response.json() as T;
    } else {
      // If not JSON, return as text or handle accordingly
      return await response.text() as T;
    }

  } catch (error) {
    console.error('API Fetch Error:', error);
    throw error;
  }
}

// Helper functions for common HTTP methods
export const api = {
  get: <T>(endpoint: string, token?: string) => apiFetch<T>(endpoint, { method: 'GET', token }),
  post: <T>(endpoint: string, data: any, token?: string, isFormData: boolean = false) =>
    apiFetch<T>(endpoint, { method: 'POST', body: isFormData ? data : JSON.stringify(data), token, isFormData }),
  put: <T>(endpoint: string, data: any, token?: string, isFormData: boolean = false) =>
    apiFetch<T>(endpoint, { method: 'PUT', body: isFormData ? data : JSON.stringify(data), token, isFormData }),
  delete: <T>(endpoint: string, token?: string) => apiFetch<T>(endpoint, { method: 'DELETE', token }),
};

// Custom hook to use the API with authentication context
export const useApi = () => {
  const { token, logout } = useAuth();
  const router = useRouter();

  // Memoizar authenticatedApiFetch ya que depende de token, logout, router
  const authenticatedApiFetch = useCallback(async <T>(endpoint: string, options?: ApiOptions): Promise<T> => {
    try {
      // Usar el 'token' del closure de useCallback, que se actualizará si 'token' cambia.
      return await apiFetch<T>(endpoint, { ...options, token: token || options?.token });
    } catch (error: any) {
      // Verificar si el error tiene un mensaje antes de acceder a error.message.includes
      const errorMessage = error && typeof error.message === 'string' ? error.message : '';
      if (errorMessage.includes('401') || errorMessage.includes('403') || (error && (error.status === 401 || error.status === 403) )) {
        console.warn('Authentication error, redirecting to login.');
        logout();
        // router.push('/login'); // Comentado temporalmente si causa problemas en ciertos contextos de renderizado
                                // o asegurarse que solo se llame en el lado del cliente.
                                // Idealmente, el manejo de redirección por 401/403 se hace en un interceptor de Axios o similar
                                // o en un componente de alto nivel.
      }
      throw error;
    }
  }, [token, logout, router]); // Dependencias de authenticatedApiFetch

  // Memoizar el objeto devuelto para que solo se cree una vez
  // o cuando sus dependencias (authenticatedApiFetch) cambien.
  const memoizedApi = useMemo(() => ({
    get: <T>(endpoint: string) => authenticatedApiFetch<T>(endpoint, { method: 'GET' }),
    post: <T>(endpoint: string, data: any, isFormData: boolean = false) =>
      authenticatedApiFetch<T>(endpoint, { method: 'POST', body: isFormData ? data : JSON.stringify(data), isFormData }),
    put: <T>(endpoint: string, data: any, isFormData: boolean = false) =>
      authenticatedApiFetch<T>(endpoint, { method: 'PUT', body: isFormData ? data : JSON.stringify(data), isFormData }),
    delete: <T>(endpoint: string) => authenticatedApiFetch<T>(endpoint, { method: 'DELETE' }),
  }), [authenticatedApiFetch]);

  return memoizedApi;
};
