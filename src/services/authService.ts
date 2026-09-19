import {
  GoogleAuthProvider,
  User,
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
  signOut,
} from 'firebase/auth';
import { auth } from './firebase';
export { auth };

// Sensitive scopes required specifically for Google Sheets synchronization
export const SHEETS_SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
];

// Standard provider with public, non-sensitive scopes (email, profile, openid).
// This allows ANY Google account to sign in immediately without being blocked
// by Google's OAuth 403 test-user restriction!
const standardGoogleProvider = new GoogleAuthProvider();
standardGoogleProvider.setCustomParameters({
  prompt: 'select_account',
});

// Flag to indicate if we are in the middle of a sign-in flow.
let isSigningIn = false;
// Cache the access token in memory only.
let cachedAccessToken: string | null = null;

// Initialize auth state listener.
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Standard Sign-In: works for EVERY user, driver, and manager seamlessly!
export const googleSignIn = async (): Promise<{ user: User; accessToken: string | null }> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, standardGoogleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (credential?.accessToken) {
      cachedAccessToken = credential.accessToken;
    }
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

// Corporate Email & Password Sign In
export const loginWithEmail = async (email: string, password: string): Promise<User> => {
  try {
    const result = await signInWithEmailAndPassword(auth, email.trim(), password);
    return result.user;
  } catch (error: any) {
    console.warn('Email sign in attempt notice:', error?.code || error?.message || error);
    throw error;
  }
};

// Corporate Email & Password Registration
export const registerWithEmail = async (
  email: string,
  password: string,
  displayName: string
): Promise<User> => {
  try {
    const result = await createUserWithEmailAndPassword(auth, email.trim(), password);
    if (displayName && displayName.trim()) {
      await updateProfile(result.user, {
        displayName: displayName.trim(),
      });
    }
    return result.user;
  } catch (error: any) {
    console.warn('Registration attempt notice:', error?.code || error?.message || error);
    throw error;
  }
};

// Send Password Reset Link
export const resetPassword = async (email: string): Promise<void> => {
  try {
    await sendPasswordResetEmail(auth, email.trim());
  } catch (error: any) {
    console.warn('Password reset attempt notice:', error?.code || error?.message || error);
    throw error;
  }
};

// Translate Firebase auth errors to readable Arabic messages
export const formatAuthError = (error: any): string => {
  if (!error) return 'حدث خطأ غير معروف في عملية تسجيل الدخول';
  
  const code = error?.code || '';
  const rawMsg = error instanceof Error 
    ? error.message 
    : typeof error === 'string' 
      ? error 
      : typeof error?.message === 'string' 
        ? error.message 
        : '';

  if (code === 'auth/operation-not-allowed') {
    return 'طريقة تسجيل الدخول بالبريد وكلمة المرور غير مفعّلة في لوحة تحكم Firebase Console لهذا المشروع. يرجى استخدام الدخول السريع المعتمد عبر Google أو تفعيل موفّر Email/Password في إعدادات Firebase.';
  }
  if (code === 'auth/user-not-found') {
    return 'لم يتم العثور على أي حساب مسجل بهذا البريد الإلكتروني';
  }
  if (code === 'auth/wrong-password') {
    return 'كلمة المرور المدخلة غير صحيحة، يرجى التأكد وإعادة المحاولة';
  }
  if (code === 'auth/invalid-credential') {
    return 'بيانات تسجيل الدخول غير صالحة. يرجى التحقق من البريد وكلمة المرور';
  }
  if (code === 'auth/email-already-in-use') {
    return 'هذا البريد الإلكتروني مسجل بالفعل لدى النظام. يمكنك الانتقال لتسجيل الدخول به مباشرة';
  }
  if (code === 'auth/weak-password') {
    return 'كلمة المرور ضعيفة جداً. يجب أن تحتوي على 6 أحرف أو أرقام على الأقل';
  }
  if (code === 'auth/invalid-email') {
    return 'صيغة البريد الإلكتروني غير صحيحة';
  }
  if (code === 'auth/popup-closed-by-user') {
    return 'تم إغلاق نافذة المصادقة قبل اكتمال تسجيل الدخول';
  }
  if (code === 'auth/popup-blocked') {
    return 'قام المتصفح بحظر نافذة المصادقة المنبثقة، يرجى السماح بالنوافذ المنبثقة للموقع';
  }
  if (code === 'auth/network-request-failed') {
    return 'فشل الاتصال بالخادم، يرجى التحقق من اتصال الإنترنت والمحاولة مجدداً';
  }
  if (code === 'auth/too-many-requests') {
    return 'تم حظر الدخول مؤقتاً لكثرة المحاولات غير الناجحة، يرجى المحاولة بعد قليل';
  }

  // Sanitize and avoid displaying raw [object Object]
  if (rawMsg && rawMsg !== '[object Object]' && !rawMsg.includes('[object Object]')) {
    return rawMsg;
  }

  return 'تعذر إتمام عملية تسجيل الدخول، يرجى استخدام الدخول المعتمد عبر Google أو مراجعة الاتصال.';
};

// Separate dedicated authorization for Google Sheets when explicitly requested by user
export const authorizeGoogleSheets = async (): Promise<string> => {
  const sheetsProvider = new GoogleAuthProvider();
  SHEETS_SCOPES.forEach((scope) => {
    sheetsProvider.addScope(scope);
  });
  sheetsProvider.setCustomParameters({
    prompt: 'consent',
  });

  try {
    const result = await signInWithPopup(auth, sheetsProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('لم يتم استخراج تصريح الوصول لـ Google Sheets');
    }
    cachedAccessToken = credential.accessToken;
    return cachedAccessToken;
  } catch (err: any) {
    console.error('Authorize Google Sheets error:', err);
    throw err;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const logout = async () => {
  await signOut(auth);
  cachedAccessToken = null;
};

// Aliases for clear integration
export const listenToAuthChanges = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, (user) => {
    callback(user);
  });
};

export const signInWithGoogle = googleSignIn;
export const getStoredGoogleToken = () => cachedAccessToken;
export const signOutUser = logout;
