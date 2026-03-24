import authService from './authService';
import config from '../config/environment';

class ApiService {
  constructor() {
    this.baseURL = config.apiBaseUrl;
  }

  // Get authorization headers with JWT token
  getAuthHeaders() {
    const idToken = authService.getIdTokenFromLocalStorage();
    const headers = {
      'Content-Type': 'application/json',
    };

    if (idToken) {
      headers['Authorization'] = `Bearer ${idToken}`;
    }

    return headers;
  }

  // Make authenticated API request
  async makeAuthenticatedRequest(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const headers = this.getAuthHeaders();

    const requestOptions = {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, requestOptions);
      
      // Handle authentication errors
      if (response.status === 401) {
        console.error('Authentication failed - redirecting to login');
        await authService.signOutUser();
        throw new Error('Authentication failed');
      }

      return response;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Send chat message with authentication
  async sendChatMessage(message, userId, sessionId, signal) {
    const requestBody = {
      message: message,
      user_id: userId,
      session_id: sessionId
    };

    return this.makeAuthenticatedRequest('/chatstream', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      signal: signal
    });
  }

  // Get ready-made LLM analysis for quick reports
  async getReadyMadeLLMAnalysis(dependent, independent, type = "SARIMAX", commodity = undefined) {
    const requestBody = {
      command: "getReadyMadeLLMAnalysis",
      filter: {
        dependent: dependent,
        independent: independent,
        type: type
      },
    };

    // Only include commodity when provided (for GFS scenarios)
    if (commodity) {
      requestBody.filter.commodity = commodity;
    }

    // Use the external API endpoint for quick reports
    const externalURL = "https://h3mpcj10p8.execute-api.ap-south-1.amazonaws.com/dev/read";

    // Get the ID token dynamically from localStorage using authService method
    const idToken = authService.getIdTokenFromLocalStorage();

    const headers = {
      'Content-Type': 'application/json',
    };

    if (idToken) {
      headers['Authorization'] = `Bearer ${idToken}`;
    }

    try {
      const response = await fetch(externalURL, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Quick reports API request failed:', error);
      throw error;
    }
  }

  // Test API connection with authentication
  async testConnection() {
    try {
      const response = await this.makeAuthenticatedRequest('/health', {
        method: 'GET'
      });

      return response.ok;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }
}

// Create singleton instance
const apiService = new ApiService();

export default apiService;
