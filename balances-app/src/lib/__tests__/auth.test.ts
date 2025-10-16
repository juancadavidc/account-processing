import { AuthService, validateLoginForm, validateSignUpForm } from '../auth';
import { createClientComponentClient } from '../supabase';

// Mock Supabase client
jest.mock('../supabase');

const mockSupabaseClient = {
  auth: {
    signUp: jest.fn(),
    signInWithPassword: jest.fn(),
    signOut: jest.fn(),
    getUser: jest.fn(),
    onAuthStateChange: jest.fn(),
  },
};

(createClientComponentClient as jest.Mock).mockReturnValue(mockSupabaseClient);

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService();
    jest.clearAllMocks();
  });

  describe('signUp', () => {
    it('should sign up successfully', async () => {
      const mockUser = {
        id: '123',
        email: 'test@example.com',
        user_metadata: { role: 'user', full_name: 'Test User' },
      }

      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const result = await authService.signUp({
        email: 'test@example.com',
        password: 'password123',
        fullName: 'Test User',
      })

      expect(result.user).toEqual({
        id: '123',
        email: 'test@example.com',
        role: 'user',
        metadata: { role: 'user', full_name: 'Test User' },
      })
      expect(result.error).toBeNull()
      expect(mockSupabaseClient.auth.signUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        options: {
          data: {
            full_name: 'Test User',
            role: 'user'
          }
        }
      })
    })

    it('should handle sign up error', async () => {
      const mockError = {
        message: 'User already exists',
        status: '422',
      }

      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: { user: null },
        error: mockError,
      })

      const result = await authService.signUp({
        email: 'test@example.com',
        password: 'password123',
      })

      expect(result.user).toBeNull()
      expect(result.error).toEqual({
        message: 'User already exists',
        code: '422',
      })
    })

    it('should handle exception during sign up', async () => {
      mockSupabaseClient.auth.signUp.mockRejectedValue(
        new Error('Network error')
      )

      const result = await authService.signUp({
        email: 'test@example.com',
        password: 'password123',
      })

      expect(result.user).toBeNull()
      expect(result.error?.message).toBe('An unexpected error occurred during sign up')
    })

    it('should set default role when not provided', async () => {
      const mockUser = {
        id: '123',
        email: 'test@example.com',
        user_metadata: { role: 'user' },
      }

      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      await authService.signUp({
        email: 'test@example.com',
        password: 'password123',
      })

      expect(mockSupabaseClient.auth.signUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        options: {
          data: {
            full_name: undefined,
            role: 'user'
          }
        }
      })
    })
  })

  describe('signIn', () => {
    it('should sign in successfully', async () => {
      const mockUser = {
        id: '123',
        email: 'test@example.com',
        user_metadata: { role: 'user' },
      };

      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const result = await authService.signIn({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.user).toEqual({
        id: '123',
        email: 'test@example.com',
        role: 'user',
        metadata: { role: 'user' },
      });
      expect(result.error).toBeNull();
      expect(mockSupabaseClient.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });

    it('should handle sign in error', async () => {
      const mockError = {
        message: 'Invalid credentials',
        status: '400',
      };

      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: null },
        error: mockError,
      });

      const result = await authService.signIn({
        email: 'test@example.com',
        password: 'wrongpassword',
      });

      expect(result.user).toBeNull();
      expect(result.error).toEqual({
        message: 'Invalid credentials',
        code: '400',
      });
    });

    it('should handle exception during sign in', async () => {
      mockSupabaseClient.auth.signInWithPassword.mockRejectedValue(
        new Error('Network error')
      );

      const result = await authService.signIn({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.user).toBeNull();
      expect(result.error?.message).toBe('An unexpected error occurred during sign in');
    });
  });

  describe('signOut', () => {
    it('should sign out successfully', async () => {
      mockSupabaseClient.auth.signOut.mockResolvedValue({
        error: null,
      });

      const result = await authService.signOut();

      expect(result.error).toBeNull();
      expect(mockSupabaseClient.auth.signOut).toHaveBeenCalled();
    });

    it('should handle sign out error', async () => {
      const mockError = {
        message: 'Sign out failed',
        status: '500',
      };

      mockSupabaseClient.auth.signOut.mockResolvedValue({
        error: mockError,
      });

      const result = await authService.signOut();

      expect(result.error).toEqual({
        message: 'Sign out failed',
        code: '500',
      });
    });
  });

  describe('getCurrentUser', () => {
    it('should get current user successfully', async () => {
      const mockUser = {
        id: '123',
        email: 'test@example.com',
        user_metadata: { role: 'admin' },
      };

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const result = await authService.getCurrentUser();

      expect(result.user).toEqual({
        id: '123',
        email: 'test@example.com',
        role: 'admin',
        metadata: { role: 'admin' },
      });
      expect(result.error).toBeNull();
    });

    it('should handle no current user', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const result = await authService.getCurrentUser();

      expect(result.user).toBeNull();
      expect(result.error).toBeNull();
    });
  });

  describe('onAuthStateChange', () => {
    it('should set up auth state change listener', () => {
      const mockCallback = jest.fn();
      const mockUnsubscribe = { data: { subscription: {} } };

      mockSupabaseClient.auth.onAuthStateChange.mockReturnValue(mockUnsubscribe);

      const result = authService.onAuthStateChange(mockCallback);

      expect(mockSupabaseClient.auth.onAuthStateChange).toHaveBeenCalled();
      expect(result).toBe(mockUnsubscribe);
    });
  });

  describe('isAuthenticated', () => {
    it('should return true when user exists', async () => {
      const mockUser = {
        id: '123',
        email: 'test@example.com',
        user_metadata: {},
      };

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const result = await authService.isAuthenticated();

      expect(result).toBe(true);
    });

    it('should return false when no user', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const result = await authService.isAuthenticated();

      expect(result).toBe(false);
    });
  });

  describe('static validation methods', () => {
    describe('validateEmail', () => {
      it('should validate correct email formats', () => {
        expect(AuthService.validateEmail('test@example.com')).toBe(true);
        expect(AuthService.validateEmail('user.name+tag@example.co.uk')).toBe(true);
        expect(AuthService.validateEmail('x@example.com')).toBe(true);
      });

      it('should reject incorrect email formats', () => {
        expect(AuthService.validateEmail('invalid-email')).toBe(false);
        expect(AuthService.validateEmail('test@')).toBe(false);
        expect(AuthService.validateEmail('@example.com')).toBe(false);
        expect(AuthService.validateEmail('')).toBe(false);
      });
    });

    describe('validatePassword', () => {
      it('should validate correct passwords', () => {
        expect(AuthService.validatePassword('password123')).toEqual({
          isValid: true,
        });
        expect(AuthService.validatePassword('123456')).toEqual({
          isValid: true,
        });
      });

      it('should reject short passwords', () => {
        expect(AuthService.validatePassword('12345')).toEqual({
          isValid: false,
          message: 'Password must be at least 6 characters long',
        });
        expect(AuthService.validatePassword('')).toEqual({
          isValid: false,
          message: 'Password must be at least 6 characters long',
        });
      });
    });
  });
});

describe('validateLoginForm', () => {
  it('should validate correct form data', () => {
    const result = validateLoginForm('test@example.com', 'password123');
    
    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual({});
  });

  it('should validate form with missing email', () => {
    const result = validateLoginForm('', 'password123');
    
    expect(result.isValid).toBe(false);
    expect(result.errors.email).toBe('Email is required');
  });

  it('should validate form with invalid email', () => {
    const result = validateLoginForm('invalid-email', 'password123');
    
    expect(result.isValid).toBe(false);
    expect(result.errors.email).toBe('Please enter a valid email address');
  });

  it('should validate form with missing password', () => {
    const result = validateLoginForm('test@example.com', '');
    
    expect(result.isValid).toBe(false);
    expect(result.errors.password).toBe('Password is required');
  });

  it('should validate form with short password', () => {
    const result = validateLoginForm('test@example.com', '123');
    
    expect(result.isValid).toBe(false);
    expect(result.errors.password).toBe('Password must be at least 6 characters long');
  });

  it('should validate form with multiple errors', () => {
    const result = validateLoginForm('', '');
    
    expect(result.isValid).toBe(false);
    expect(result.errors.email).toBe('Email is required');
    expect(result.errors.password).toBe('Password is required');
  });
});

describe('validateSignUpForm', () => {
  it('should validate correct form data', () => {
    const result = validateSignUpForm('test@example.com', 'password123', 'password123', 'Test User');
    
    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual({});
  });

  it('should validate form with missing email', () => {
    const result = validateSignUpForm('', 'password123', 'password123');
    
    expect(result.isValid).toBe(false);
    expect(result.errors.email).toBe('Email is required');
  });

  it('should validate form with invalid email', () => {
    const result = validateSignUpForm('invalid-email', 'password123', 'password123');
    
    expect(result.isValid).toBe(false);
    expect(result.errors.email).toBe('Please enter a valid email address');
  });

  it('should validate form with missing password', () => {
    const result = validateSignUpForm('test@example.com', '', 'password123');
    
    expect(result.isValid).toBe(false);
    expect(result.errors.password).toBe('Password is required');
  });

  it('should validate form with short password', () => {
    const result = validateSignUpForm('test@example.com', '123', '123');
    
    expect(result.isValid).toBe(false);
    expect(result.errors.password).toBe('Password must be at least 6 characters long');
  });

  it('should validate form with missing confirm password', () => {
    const result = validateSignUpForm('test@example.com', 'password123', '');
    
    expect(result.isValid).toBe(false);
    expect(result.errors.confirmPassword).toBe('Please confirm your password');
  });

  it('should validate form with mismatched passwords', () => {
    const result = validateSignUpForm('test@example.com', 'password123', 'differentpassword');
    
    expect(result.isValid).toBe(false);
    expect(result.errors.confirmPassword).toBe('Passwords do not match');
  });

  it('should validate form with short full name', () => {
    const result = validateSignUpForm('test@example.com', 'password123', 'password123', 'A');
    
    expect(result.isValid).toBe(false);
    expect(result.errors.fullName).toBe('Full name must be at least 2 characters long');
  });

  it('should validate form with multiple errors', () => {
    const result = validateSignUpForm('', '', '', 'A');
    
    expect(result.isValid).toBe(false);
    expect(result.errors.email).toBe('Email is required');
    expect(result.errors.password).toBe('Password is required');
    expect(result.errors.confirmPassword).toBe('Please confirm your password');
    expect(result.errors.fullName).toBe('Full name must be at least 2 characters long');
  });

  it('should pass without full name', () => {
    const result = validateSignUpForm('test@example.com', 'password123', 'password123');
    
    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual({});
  });
});