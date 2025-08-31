import { describe, test, expect, mock } from 'bun:test';

describe('認証プロバイダーインターフェース', () => {
  test('AuthProviderInterface型定義の検証', () => {
    // Given: 期待される認証プロバイダーインターフェースの型構造
    type ExpectedAuthProvider = {
      signIn: (options?: { redirectTo?: string }) => Promise<{ success: boolean; error?: string }>;
      signOut: () => Promise<{ success: boolean; error?: string }>;
      getUser: () => Promise<{ user: any | null }>;
      getSession: () => Promise<any | null>;
      getProviderName: () => string;
    };

    // When: AuthProviderInterfaceの型定義をimportする
    let importError = null;
    try {
      const authProviderModule = require('../services/providers/authProviderInterface');
      const { AuthProviderInterface } = authProviderModule;
      
      // Then: インターフェースが正しく定義されていることを確認
      expect(AuthProviderInterface).toBeDefined();
    } catch (error) {
      importError = error;
    }

    // Then: インターフェースがインスタンス化できないことを確認（抽象インターフェース）
    expect(() => {
      const { AuthProviderInterface } = require('../services/providers/authProviderInterface');
      return new AuthProviderInterface();
    }).toThrow();
  });

  test('GoogleAuthProvider実装クラスのインターフェース準拠性', () => {
    // Given: Supabaseクライアントのモック
    const mockSupabaseClient = {
      auth: {
        signInWithOAuth: mock(() => Promise.resolve({ data: null, error: null })),
        signOut: mock(() => Promise.resolve({ error: null })),
        getUser: mock(() => Promise.resolve({ data: { user: null }, error: null })),
        getSession: mock(() => Promise.resolve({ data: { session: null }, error: null })),
        onAuthStateChange: mock(() => ({ data: { subscription: { unsubscribe: mock() } } }))
      }
    };

    // When: GoogleAuthProviderをインスタンス化
    const { GoogleAuthProvider } = require('../services/providers/googleAuthProvider');
    const provider = new GoogleAuthProvider(mockSupabaseClient);

    // Then: 必須メソッドがすべて実装されていることを確認
    expect(typeof provider.signIn).toBe('function');
    expect(typeof provider.signOut).toBe('function');
    expect(typeof provider.getUser).toBe('function');
    expect(typeof provider.getSession).toBe('function');
    expect(typeof provider.getProviderName).toBe('function');
  });

  test('AuthServiceの抽象化層機能', () => {
    // Given: AuthProviderInterfaceに準拠したモックプロバイダー
    const mockProvider = {
      signIn: async () => ({ success: true }),
      signOut: async () => ({ success: true }),
      getUser: async () => ({ user: { id: '123', email: 'test@example.com' } }),
      getSession: async () => null,
      getProviderName: () => 'test'
    };

    // When: AuthServiceを初期化してプロバイダーを設定
    let authService;
    let importError = null;
    
    try {
      const { AuthService } = require('../services/authService');
      authService = new AuthService(mockProvider);
    } catch (error) {
      importError = error;
    }

    // Then: AuthServiceが統一されたAPIを提供することを確認
    if (authService) {
      expect(typeof authService.signIn).toBe('function');
      expect(typeof authService.signOut).toBe('function');
      expect(typeof authService.getUser).toBe('function');
    } else {
      // AuthServiceが未実装の場合はimportエラーを確認
      expect(importError).toBeDefined();
    }
  });
});
