/**
 * Secure API client for making authenticated requests
 */

import { getSupabaseBrowserClient } from './supabase/client';

interface ApiRequestOptions extends RequestInit {
  requireAuth?: boolean;
}

class ApiClient {
  private baseUrl: string;

  constructor() {
    // Use relative URLs to work with any domain
    this.baseUrl = '';
  }

  private async getAuthHeaders(): Promise<HeadersInit> {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      return {};
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      return {};
    }

    return {
      'Authorization': `Bearer ${session.access_token}`,
    };
  }

  async request<T = any>(
    endpoint: string,
    options: ApiRequestOptions = {}
  ): Promise<{ data?: T; error?: string }> {
    const { requireAuth = true, ...fetchOptions } = options;

    try {
      // Get auth headers if required
      const authHeaders = requireAuth ? await this.getAuthHeaders() : {};

      // Check if we have auth when required
      if (requireAuth && !authHeaders['Authorization']) {
        return { error: 'Authentication required. Please sign in.' };
      }

      // Merge headers
      const headers = {
        'Content-Type': 'application/json',
        ...authHeaders,
        ...fetchOptions.headers,
      };

      // Make the request
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...fetchOptions,
        headers,
      });

      // Handle rate limiting
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        return { 
          error: `Too many requests. Please try again in ${retryAfter} seconds.` 
        };
      }

      // Handle authentication errors
      if (response.status === 401) {
        // Try to refresh the session
        const supabase = getSupabaseBrowserClient();
        if (supabase) {
          const { error: refreshError } = await supabase.auth.refreshSession();
          if (!refreshError) {
            // Retry the request with new token
            return this.request(endpoint, options);
          }
        }
        return { error: 'Authentication expired. Please sign in again.' };
      }

      // Handle other non-2xx responses
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return { error: errorData.error || `Request failed: ${response.statusText}` };
      }

      // Parse successful response
      const data = await response.json();
      return { data };
    } catch (error) {
      // Network or other errors
      if (error instanceof Error) {
        return { error: error.message };
      }
      return { error: 'An unexpected error occurred' };
    }
  }

  // Convenience methods
  async get<T = any>(endpoint: string, options?: Omit<ApiRequestOptions, 'method'>) {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  async post<T = any>(endpoint: string, body?: any, options?: Omit<ApiRequestOptions, 'method' | 'body'>) {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async put<T = any>(endpoint: string, body?: any, options?: Omit<ApiRequestOptions, 'method' | 'body'>) {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T = any>(endpoint: string, options?: Omit<ApiRequestOptions, 'method'>) {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Export convenience functions
export const api = {
  games: {
    // Fetch all games
    list: () => apiClient.get('/api/games', { requireAuth: false }),
    
    // Fetch user's games
    listUserGames: (type: 'hosted' | 'joined') => 
      apiClient.get(`/api/games?type=${type}`),
    
    // Get single game
    get: (id: string) => 
      apiClient.get(`/api/games/${id}`, { requireAuth: false }),
    
    // Create game
    create: (data: {
      venueId: string;
      startTime: string;
      minPlayers: number;
      maxPlayers: number;
      visibility: string;
      notes?: string;
      costInstructions?: string;
    }) => apiClient.post('/api/games', data),
    
    // Update game
    update: (id: string, data: any) => 
      apiClient.put(`/api/games/${id}`, data),
    
    // Delete game
    delete: (id: string) => 
      apiClient.delete(`/api/games/${id}`),
    
    // Join game
    join: (id: string) => 
      apiClient.post(`/api/games/${id}/join`),
    
    // Leave game
    leave: (id: string) => 
      apiClient.delete(`/api/games/${id}/join`),
  },
  
  clicks: {
    // Track click (public endpoint)
    track: (venueId: string, redirect: string) => 
      apiClient.get(`/api/clicks?venueId=${venueId}&redirect=${encodeURIComponent(redirect)}`, {
        requireAuth: false
      }),
  },
};
