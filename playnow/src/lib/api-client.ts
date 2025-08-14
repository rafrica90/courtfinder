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

  private async getAuthHeaders(): Promise<Record<string, string>> {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      return {} as Record<string, string>;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      return {} as Record<string, string>;
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
      const authHeaders = requireAuth ? await this.getAuthHeaders() : {} as Record<string, string>;

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
      skillLevel: string;
      sport: string;
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

    // Approve participant
    approveParticipant: (gameId: string, participantId: string) =>
      apiClient.put(`/api/games/${gameId}/participants/${participantId}`, { action: 'approve' }),

    // Deny participant
    denyParticipant: (gameId: string, participantId: string) =>
      apiClient.put(`/api/games/${gameId}/participants/${participantId}`, { action: 'deny' }),

    // Remove participant (host only)
    removeParticipant: (gameId: string, participantId: string) =>
      apiClient.delete(`/api/games/${gameId}/participants/${participantId}`),
  },
  
  clicks: {
    // Track click (public endpoint)
    track: (venueId: string, redirect: string) => 
      apiClient.get(`/api/clicks?venueId=${venueId}&redirect=${encodeURIComponent(redirect)}`, {
        requireAuth: false
      }),
  },
  profiles: {
    // Public view: only sports and skill level
    getPublic: (userIds: string[]) => {
      const param = encodeURIComponent(userIds.join(","));
      return apiClient.get(`/api/profiles/public?ids=${param}`, { requireAuth: false });
    }
  },
  favorites: {
    list: () => apiClient.get<{ favorites: string[] }>("/api/favorites"),
    toggle: (venueId: string) => apiClient.post<{ favorites: string[] }>("/api/favorites", { venueId, action: "toggle" }),
    add: (venueId: string) => apiClient.post<{ favorites: string[] }>("/api/favorites", { venueId, action: "add" }),
    remove: (venueId: string) => apiClient.post<{ favorites: string[] }>("/api/favorites", { venueId, action: "remove" }),
  },
  reports: {
    submit: (payload: { venueId?: string | null; message: string; category?: string | null; pageUrl?: string | null }) =>
      apiClient.post('/api/reports', payload),
    list: (opts?: { status?: string; limit?: number }) => {
      const params = new URLSearchParams();
      if (opts?.status) params.set('status', opts.status);
      if (opts?.limit) params.set('limit', String(opts.limit));
      const q = params.toString();
      return apiClient.get<{ reports: any[] }>(`/api/reports${q ? `?${q}` : ''}`);
    },
    updateStatus: (id: string, status: 'open' | 'reviewing' | 'resolved' | 'dismissed') =>
      apiClient.put(`/api/reports/${id}`, { status }),
  },
};
