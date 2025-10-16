import { renderHook, act } from '@testing-library/react';
import { useAuthStore, useAuth, useAuthActions } from '../auth';
import { authService } from '@/lib/auth';
import { SessionManager } from '@/lib/session';

// Mock dependencies
jest.mock('@/lib/auth');
jest.mock('@/lib/session');

const mockAuthService = authService as jest.Mocked<typeof authService>;
const mockSessionManager = SessionManager as jest.Mocked<typeof SessionManager>;

describe('Auth Store', () => {
  beforeEach(() => {
    // Reset store state before each test
    useAuthStore.setState({
      user: null,
      loading: false,
      error: null,
      isInitialized: false,
    });

    // Clear mocks
    jest.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useAuth());
      
      expect(result.current.user).toBeNull();
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.isInitialized).toBe(false);
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe('Sign In', () => {
    it('should sign in successfully', async () => {
      const mockUser = {
        id: '123',
        email: 'test@example.com',
        role: 'user',
      };

      mockAuthService.signIn.mockResolvedValue({
        user: mockUser,
        error: null,
      });

      const { result } = renderHook(() => useAuthActions());

      await act(async () => {
        const success = await result.current.signIn({
          email: 'test@example.com',
          password: 'password123',
        });
        expect(success).toBe(true);
      });

      const { result: authResult } = renderHook(() => useAuth());
      expect(authResult.current.user).toEqual(mockUser);
      expect(authResult.current.loading).toBe(false);
      expect(authResult.current.error).toBeNull();
      expect(mockSessionManager.storeSession).toHaveBeenCalledWith(mockUser);
    });

    it('should handle sign in error', async () => {
      const mockError = { message: 'Invalid credentials' };
      
      mockAuthService.signIn.mockResolvedValue({
        user: null,
        error: mockError,
      });

      const { result } = renderHook(() => useAuthActions());

      await act(async () => {
        const success = await result.current.signIn({
          email: 'test@example.com',
          password: 'wrongpassword',
        });
        expect(success).toBe(false);
      });

      const { result: authResult } = renderHook(() => useAuth());
      expect(authResult.current.user).toBeNull();
      expect(authResult.current.loading).toBe(false);
      expect(authResult.current.error).toEqual(mockError);
    });

    it('should handle sign in exception', async () => {
      mockAuthService.signIn.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useAuthActions());

      await act(async () => {
        const success = await result.current.signIn({
          email: 'test@example.com',
          password: 'password123',
        });
        expect(success).toBe(false);
      });

      const { result: authResult } = renderHook(() => useAuth());
      expect(authResult.current.user).toBeNull();
      expect(authResult.current.loading).toBe(false);
      expect(authResult.current.error?.message).toBe('An unexpected error occurred during sign in');
    });
  });

  describe('Sign Out', () => {
    it('should sign out successfully', async () => {
      // Set initial authenticated state
      useAuthStore.setState({
        user: { id: '123', email: 'test@example.com', role: 'user' },
        loading: false,
        error: null,
        isInitialized: true,
      });

      mockAuthService.signOut.mockResolvedValue({ error: null });

      const { result } = renderHook(() => useAuthActions());

      await act(async () => {
        await result.current.signOut();
      });

      const { result: authResult } = renderHook(() => useAuth());
      expect(authResult.current.user).toBeNull();
      expect(authResult.current.loading).toBe(false);
      expect(authResult.current.error).toBeNull();
      expect(mockSessionManager.clearSession).toHaveBeenCalled();
    });

    it('should handle sign out error but still clear session', async () => {
      useAuthStore.setState({
        user: { id: '123', email: 'test@example.com', role: 'user' },
        loading: false,
        error: null,
        isInitialized: true,
      });

      const mockError = { message: 'Sign out failed' };
      mockAuthService.signOut.mockResolvedValue({ error: mockError });

      const { result } = renderHook(() => useAuthActions());

      await act(async () => {
        await result.current.signOut();
      });

      const { result: authResult } = renderHook(() => useAuth());
      expect(authResult.current.user).toBeNull(); // Still cleared locally
      expect(authResult.current.error).toEqual(mockError);
      expect(mockSessionManager.clearSession).toHaveBeenCalled();
    });
  });

  describe('Initialize Auth', () => {
    it('should initialize with valid stored session', async () => {
      const mockUser = {
        id: '123',
        email: 'test@example.com',
        role: 'user',
      };

      const mockSession = {
        user: mockUser,
        expiresAt: Date.now() + 10000,
      };

      mockSessionManager.getSession.mockReturnValue(mockSession);
      mockSessionManager.isSessionValid.mockReturnValue(true);
      mockAuthService.onAuthStateChange.mockReturnValue({ data: { subscription: {} } });

      const { result } = renderHook(() => useAuthActions());

      await act(async () => {
        await result.current.initializeAuth();
      });

      const { result: authResult } = renderHook(() => useAuth());
      expect(authResult.current.user).toEqual(mockUser);
      expect(authResult.current.isInitialized).toBe(true);
      expect(authResult.current.loading).toBe(false);
      expect(mockSessionManager.initSessionCleanup).toHaveBeenCalled();
    });

    it('should initialize with Supabase when no valid session', async () => {
      const mockUser = {
        id: '123',
        email: 'test@example.com',
        role: 'user',
      };

      mockSessionManager.getSession.mockReturnValue(null);
      mockSessionManager.isSessionValid.mockReturnValue(false);
      mockAuthService.getCurrentUser.mockResolvedValue({
        user: mockUser,
        error: null,
      });
      mockAuthService.onAuthStateChange.mockReturnValue({ data: { subscription: {} } });

      const { result } = renderHook(() => useAuthActions());

      await act(async () => {
        await result.current.initializeAuth();
      });

      const { result: authResult } = renderHook(() => useAuth());
      expect(authResult.current.user).toEqual(mockUser);
      expect(authResult.current.isInitialized).toBe(true);
      expect(mockSessionManager.storeSession).toHaveBeenCalledWith(mockUser);
      expect(mockSessionManager.initSessionCleanup).toHaveBeenCalled();
    });

    it('should handle initialization error', async () => {
      mockSessionManager.getSession.mockReturnValue(null);
      mockAuthService.getCurrentUser.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useAuthActions());

      await act(async () => {
        await result.current.initializeAuth();
      });

      const { result: authResult } = renderHook(() => useAuth());
      expect(authResult.current.user).toBeNull();
      expect(authResult.current.isInitialized).toBe(true);
      expect(authResult.current.error?.message).toBe('Failed to initialize authentication');
    });
  });

  describe('Clear Error', () => {
    it('should clear error state', () => {
      useAuthStore.setState({
        user: null,
        loading: false,
        error: { message: 'Some error' },
        isInitialized: true,
      });

      const { result } = renderHook(() => useAuthActions());

      act(() => {
        result.current.clearError();
      });

      const { result: authResult } = renderHook(() => useAuth());
      expect(authResult.current.error).toBeNull();
    });
  });

  describe('Auth State Changes', () => {
    it('should handle auth state change with user', async () => {
      const mockUser = {
        id: '123',
        email: 'test@example.com',
        role: 'user',
      };

      // Mock auth state change callback
      let authStateCallback: (user: unknown, error: unknown) => void;
      mockAuthService.onAuthStateChange.mockImplementation((callback) => {
        authStateCallback = callback;
        return { data: { subscription: {} } };
      });

      const { result } = renderHook(() => useAuthActions());

      await act(async () => {
        await result.current.initializeAuth();
      });

      // Simulate auth state change
      act(() => {
        authStateCallback!(mockUser, null);
      });

      const { result: authResult } = renderHook(() => useAuth());
      expect(authResult.current.user).toEqual(mockUser);
      expect(mockSessionManager.storeSession).toHaveBeenCalledWith(mockUser);
    });

    it('should handle auth state change with logout', async () => {
      // Set initial authenticated state
      useAuthStore.setState({
        user: { id: '123', email: 'test@example.com', role: 'user' },
        loading: false,
        error: null,
        isInitialized: true,
      });

      let authStateCallback: (user: unknown, error: unknown) => void;
      mockAuthService.onAuthStateChange.mockImplementation((callback) => {
        authStateCallback = callback;
        return { data: { subscription: {} } };
      });

      const { result } = renderHook(() => useAuthActions());

      await act(async () => {
        await result.current.initializeAuth();
      });

      // Simulate logout
      act(() => {
        authStateCallback!(null, null);
      });

      const { result: authResult } = renderHook(() => useAuth());
      expect(authResult.current.user).toBeNull();
      expect(mockSessionManager.clearSession).toHaveBeenCalled();
    });
  });
});