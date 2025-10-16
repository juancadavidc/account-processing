import { SessionManager } from '../session';
import { AuthUser } from '../auth';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock document for event listeners if it doesn't exist
if (!global.document) {
  const mockDocument = {
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  };

  Object.defineProperty(global, 'document', {
    value: mockDocument,
    writable: true,
  });
} else {
  // If document exists, just spy on the methods
  jest.spyOn(document, 'addEventListener');
  jest.spyOn(document, 'removeEventListener');
}

describe('SessionManager', () => {
  const mockUser: AuthUser = {
    id: '123',
    email: 'test@example.com',
    role: 'user',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('storeSession', () => {
    it('should store session data with expiration', () => {
      const now = 1000000;
      jest.setSystemTime(now);

      SessionManager.storeSession(mockUser, 'refresh-token');

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'bmad_session',
        JSON.stringify({
          user: mockUser,
          expiresAt: now + 24 * 60 * 60 * 1000, // 24 hours
          refreshToken: 'refresh-token',
        })
      );
    });

    it('should store session without refresh token', () => {
      const now = 1000000;
      jest.setSystemTime(now);

      SessionManager.storeSession(mockUser);

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'bmad_session',
        JSON.stringify({
          user: mockUser,
          expiresAt: now + 24 * 60 * 60 * 1000,
          refreshToken: undefined,
        })
      );
    });

    it('should handle localStorage errors gracefully', () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage full');
      });

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      SessionManager.storeSession(mockUser);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to store session data:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('getSession', () => {
    it('should retrieve valid session data', () => {
      const sessionData = {
        user: mockUser,
        expiresAt: Date.now() + 10000, // Valid for 10 seconds
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(sessionData));

      const result = SessionManager.getSession();

      expect(result).toEqual(sessionData);
      expect(localStorageMock.getItem).toHaveBeenCalledWith('bmad_session');
    });

    it('should return null for non-existent session', () => {
      localStorageMock.getItem.mockReturnValue(null);

      const result = SessionManager.getSession();

      expect(result).toBeNull();
    });

    it('should clear expired session and return null', () => {
      const expiredSessionData = {
        user: mockUser,
        expiresAt: Date.now() - 10000, // Expired 10 seconds ago
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(expiredSessionData));

      const result = SessionManager.getSession();

      expect(result).toBeNull();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('bmad_session');
    });

    it('should handle corrupted session data', () => {
      localStorageMock.getItem.mockReturnValue('invalid-json');

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = SessionManager.getSession();

      expect(result).toBeNull();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('bmad_session');
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to retrieve session data:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('clearSession', () => {
    it('should clear session from localStorage', () => {
      SessionManager.clearSession();

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('bmad_session');
    });

    it('should handle localStorage errors gracefully', () => {
      localStorageMock.removeItem.mockImplementation(() => {
        throw new Error('Access denied');
      });

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      SessionManager.clearSession();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to clear session data:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('isSessionValid', () => {
    it('should return true for valid session', () => {
      const validSessionData = {
        user: mockUser,
        expiresAt: Date.now() + 10000,
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(validSessionData));

      const result = SessionManager.isSessionValid();

      expect(result).toBe(true);
    });

    it('should return false for expired session', () => {
      const expiredSessionData = {
        user: mockUser,
        expiresAt: Date.now() - 10000,
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(expiredSessionData));

      const result = SessionManager.isSessionValid();

      expect(result).toBe(false);
    });

    it('should return false for non-existent session', () => {
      localStorageMock.getItem.mockReturnValue(null);

      const result = SessionManager.isSessionValid();

      expect(result).toBe(false);
    });
  });

  describe('extendSession', () => {
    it('should extend valid session expiration', () => {
      const now = 1000000;
      jest.setSystemTime(now);

      const sessionData = {
        user: mockUser,
        expiresAt: now + 5000,
        refreshToken: 'token',
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(sessionData));

      SessionManager.extendSession();

      const expectedExtendedSession = {
        ...sessionData,
        expiresAt: now + 24 * 60 * 60 * 1000,
      };

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'bmad_session',
        JSON.stringify(expectedExtendedSession)
      );
    });

    it('should not extend non-existent session', () => {
      localStorageMock.getItem.mockReturnValue(null);

      SessionManager.extendSession();

      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    });

    it('should handle storage errors when extending', () => {
      const sessionData = {
        user: mockUser,
        expiresAt: Date.now() + 5000,
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(sessionData));
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage error');
      });

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      SessionManager.extendSession();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to extend session:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('initSessionCleanup', () => {
    it('should clear invalid session on initialization', () => {
      localStorageMock.getItem.mockReturnValue(null);

      SessionManager.initSessionCleanup();

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('bmad_session');
    });

    it('should set up periodic cleanup interval', () => {
      const setIntervalSpy = jest.spyOn(global, 'setInterval');
      
      SessionManager.initSessionCleanup();

      expect(setIntervalSpy).toHaveBeenCalledWith(
        expect.any(Function),
        5 * 60 * 1000 // 5 minutes
      );

      setIntervalSpy.mockRestore();
    });

    it('should set up activity event listeners', () => {
      SessionManager.initSessionCleanup();

      const expectedEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
      
      expectedEvents.forEach(event => {
        expect(document.addEventListener).toHaveBeenCalledWith(
          event,
          expect.any(Function),
          { passive: true }
        );
      });
    });

    it('should extend session on activity after 10 minutes', () => {
      let activityHandler: () => void;
      
      const addEventListenerSpy = jest.spyOn(document, 'addEventListener');
      addEventListenerSpy.mockImplementation((event, handler) => {
        if (event === 'mousedown') {
          activityHandler = handler as () => void;
        }
      });

      const now = 1000000;
      jest.setSystemTime(now);

      SessionManager.initSessionCleanup();

      // Simulate activity after 11 minutes
      jest.setSystemTime(now + 11 * 60 * 1000);
      
      const validSessionData = {
        user: mockUser,
        expiresAt: now + 10000,
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(validSessionData));

      activityHandler!();

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'bmad_session',
        expect.stringContaining('"expiresAt"')
      );
    });
  });

  describe('cleanup', () => {
    it('should remove event listeners', () => {
      SessionManager.cleanup();

      const expectedEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
      
      expectedEvents.forEach(event => {
        expect(document.removeEventListener).toHaveBeenCalledWith(
          event,
          expect.any(Function)
        );
      });
    });
  });
});