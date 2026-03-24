import { jwtDecode } from 'jwt-decode';
import { getCurrentUser, fetchAuthSession, signOut } from 'aws-amplify/auth';
import { Hub } from 'aws-amplify/utils';

class AuthService {
  constructor() {
    this.user = null;
    this.userGroups = [];
    this.isAuthenticated = false;
    this.isAdmin = false;
    this.listeners = [];
    
    // Setup Hub listener for auth events
    this.setupHubListener();
    
    // Initialize authentication state
    this.initializeAuth();
  }

  setupHubListener() {
    Hub.listen('auth', ({ payload }) => {
      const { event } = payload;
      console.log('Auth event:', event);
      
      switch (event) {
        case 'signedIn':
        case 'signIn':
          this.handleSignIn();
          break;
        case 'signedOut':
        case 'signOut':
          this.handleSignOut();
          break;
        case 'signIn_failure':
          console.error('Sign in failed:', payload.data);
          break;
        case 'signOut_failure':
          console.error('Sign out failed:', payload.data);
          break;
        default:
          break;
      }
    });
  }

  async initializeAuth() {
    try {
      const user = await getCurrentUser();
      if (user) {
        console.log('Found existing authenticated user:', user.username);
        await this.handleSignIn();
      }
    } catch (error) {
      console.log('No authenticated user found');
      this.handleSignOut();
    }
  }

  async handleSignIn() {
    try {
      const user = await getCurrentUser();
      const session = await fetchAuthSession();
      
      if (session?.tokens?.idToken) {
        const idToken = session.tokens.idToken.toString();
        const decodedToken = jwtDecode(idToken);
        
        this.user = user;
        this.userGroups = decodedToken['cognito:groups'] || [];
        this.isAuthenticated = true;
        this.isAdmin = this.userGroups.includes('admin');
        
        console.log('User authenticated:', {
          username: user.username,
          groups: this.userGroups,
          isAdmin: this.isAdmin
        });
        
        this.notifyListeners();
      }
    } catch (error) {
      console.error('Error handling sign in:', error);
      this.handleSignOut();
    }
  }

  handleSignOut() {
    this.user = null;
    this.userGroups = [];
    this.isAuthenticated = false;
    this.isAdmin = false;
    
    console.log('User signed out');
    this.notifyListeners();
  }

  // Get ID token from localStorage using Cognito pattern
  getIdTokenFromLocalStorage() {
    try {
      const keys = Object.keys(localStorage);
      const idTokenKey = keys.find(key => 
        key.includes('CognitoIdentityServiceProvider') && key.endsWith('.idToken')
      );
      
      if (idTokenKey) {
        return localStorage.getItem(idTokenKey);
      }
      
      return null;
    } catch (error) {
      console.error('Error getting ID token from localStorage:', error);
      return null;
    }
  }

  // Extract user groups from JWT token
  getUserGroupsFromToken() {
    try {
      const idToken = this.getIdTokenFromLocalStorage();
      if (idToken) {
        const decodedToken = jwtDecode(idToken);
        return decodedToken['cognito:groups'] || [];
      }
      return [];
    } catch (error) {
      console.error('Error extracting groups from token:', error);
      return [];
    }
  }

  // Check if user is admin
  isUserAdmin() {
    const groups = this.getUserGroupsFromToken();
    return groups.includes('admin');
  }

  // Get user email from JWT token
  getUserEmailFromToken() {
    try {
      const idToken = this.getIdTokenFromLocalStorage();
      if (idToken) {
        const decodedToken = jwtDecode(idToken);
        // Common JWT fields for email: 'email', 'cognito:username', 'username'
        return decodedToken.email || decodedToken['cognito:username'] || decodedToken.username || null;
      }
      return null;
    } catch (error) {
      console.error('Error extracting email from token:', error);
      return null;
    }
  }

  // Get user email from localStorage LastAuthUser key (fallback method)
  getUserEmailFromLastAuthUser() {
    try {
      const keys = Object.keys(localStorage);
      const lastAuthUserKey = keys.find(key =>
        key.includes('CognitoIdentityServiceProvider') && key.endsWith('.LastAuthUser')
      );

      if (lastAuthUserKey) {
        return localStorage.getItem(lastAuthUserKey);
      }

      return null;
    } catch (error) {
      console.error('Error getting email from LastAuthUser:', error);
      return null;
    }
  }

  // Get user email with fallback methods
  getUserEmail() {
    // Try JWT token first (most reliable)
    let email = this.getUserEmailFromToken();

    // Fallback to LastAuthUser if JWT doesn't have email
    if (!email) {
      email = this.getUserEmailFromLastAuthUser();
    }

    // Final fallback to current user object
    if (!email && this.user) {
      email = this.user.username;
    }

    return email;
  }

  // Set user data
  setUser(user) {
    this.user = user;
    this.notifyListeners();
  }

  // Get current user
  getUser() {
    return this.user;
  }

  // Get authentication status
  getIsAuthenticated() {
    return this.isAuthenticated;
  }

  // Get admin status
  getIsAdmin() {
    return this.isAdmin;
  }

  // Get user groups
  getUserGroups() {
    return this.userGroups;
  }

  // Sign out user
  async signOutUser() {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  }

  // Add listener for auth state changes
  addListener(callback) {
    this.listeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }

  // Notify all listeners of auth state changes
  notifyListeners() {
    this.listeners.forEach(callback => {
      callback({
        user: this.user,
        isAuthenticated: this.isAuthenticated,
        isAdmin: this.isAdmin,
        userGroups: this.userGroups
      });
    });
  }

  // Get current auth state
  getAuthState() {
    return {
      user: this.user,
      isAuthenticated: this.isAuthenticated,
      isAdmin: this.isAdmin,
      userGroups: this.userGroups
    };
  }
}

// Create singleton instance
const authService = new AuthService();

export default authService;
