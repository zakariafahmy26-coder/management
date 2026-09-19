import React, { useState } from 'react';
import {
  Shield,
  Lock,
  Mail,
  User as UserIcon,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  Truck,
  Briefcase,
  Users,
  Compass,
  X,
  LogOut,
  RefreshCw,
  KeyRound,
  Check,
} from 'lucide-react';
import {
  googleSignIn,
  loginWithEmail,
  registerWithEmail,
  resetPassword,
  formatAuthError,
  signOutUser,
} from '../../services/authService';
import { UserProfile, UserRole } from '../../types';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any | null;
  userProfile: UserProfile | null;
  effectiveRole: UserRole;
  onSelectRolePreview?: (role: UserRole) => void;
  onSuccessToast: (title: string, desc?: string) => void;
  onErrorToast: (title: string, desc?: string) => void;
}

type AuthTab = 'signin' | 'signup' | 'demo_roles';

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  userProfile,
  effectiveRole,
  onSelectRolePreview,
  onSuccessToast,
  onErrorToast,
}) => {
  const [activeTab, setActiveTab] = useState<AuthTab>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('OPERATIONS_MANAGER');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(true);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  if (!isOpen) return null;

  // Google OAuth Login
  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await googleSignIn();
      onSuccessToast(
        'تم تسجيل الدخول بنجاح',
        `مرحباً بك مجدداً ${res.user.displayName || res.user.email} في المنظومة`
      );
      onClose();
    } catch (err: any) {
      const formatted = formatAuthError(err);
      setErrorMessage(formatted);
      onErrorToast('تعذر تسجيل الدخول عبر Google', formatted);
    } finally {
      setIsLoading(false);
    }
  };

  // Email & Password Sign In
  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMessage('يرجى إدخال البريد الإلكتروني وكلمة المرور');
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const user = await loginWithEmail(email, password);
      onSuccessToast(
        'تم تسجيل الدخول بنجاح',
        `أهلاً بك ${user.displayName || user.email}`
      );
      onClose();
    } catch (err: any) {
      const formatted = formatAuthError(err);
      setErrorMessage(formatted);
      onErrorToast('فشل تسجيل الدخول', formatted);
    } finally {
      setIsLoading(false);
    }
  };

  // Email & Password Sign Up
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setErrorMessage('يرجى إدخال الاسم بالكامل');
      return;
    }
    if (!email.trim() || !password) {
      setErrorMessage('يرجى إدخال البريد الإلكتروني وكلمة المرور');
      return;
    }
    if (password.length < 6) {
      setErrorMessage('يجب أن تتكون كلمة المرور من 6 أحرف على الأقل');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('كلمتا المرور غير متطابقتين');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    try {
      const user = await registerWithEmail(email, password, displayName);
      onSuccessToast(
        'تم إنشاء الحساب بنجاح',
        `تم تفعيل حسابك كـ ${displayName}. مرحباً بك في المنظومة!`
      );
      onClose();
    } catch (err: any) {
      const formatted = formatAuthError(err);
      setErrorMessage(formatted);
      onErrorToast('تعذر إنشاء الحساب', formatted);
    } finally {
      setIsLoading(false);
    }
  };

  // Password Reset Link
  const handleResetPassword = async () => {
    if (!email.trim()) {
      setErrorMessage('يرجى كتابة البريد الإلكتروني أولاً لإرسال رابط إعادة تعيين كلمة المرور');
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);
    try {
      await resetPassword(email);
      setSuccessMessage(`تم إرسال رابط إعادة التعيين إلى ${email}. يرجى مراجعة صندوق الوارد.`);
      onSuccessToast('تم الإرسال', 'تم إرسال رابط استعادة كلمة المرور');
    } catch (err: any) {
      const formatted = formatAuthError(err);
      setErrorMessage(formatted);
    } finally {
      setIsLoading(false);
    }
  };

  // Sign out current account
  const handleSignOutCurrent = async () => {
    try {
      await signOutUser();
      onSuccessToast('تم تسجيل الخروج', 'يمكنك الآن تسجيل الدخول بحساب آخر');
    } catch (err: any) {
      onErrorToast('خطأ في تسجيل الخروج', err.message);
    }
  };

  // Demo Roles for quick preview / team switching
  const demoAccounts = [
    {
      id: 'super_admin',
      role: 'SUPER_ADMIN' as UserRole,
      title: 'مدير النظام العام (Super Admin)',
      name: 'أ. زكريا فهمي',
      email: 'zakaria.fahmy26@gmail.com',
      badge: 'كامل الصلاحيات',
      badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
      description: 'إدارة المستخدمين، إعدادات الشركات، الربط السحابي، والصلاحيات الكاملة',
      icon: Shield,
    },
    {
      id: 'ops_manager',
      role: 'OPERATIONS_MANAGER' as UserRole,
      title: 'مدير العمليات والتشغيل',
      name: 'م. أحمد الشناوي',
      email: 'ahmed.operations@fleetops.com',
      badge: 'إدارة الأسطول',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      description: 'جدولة المهام التشغيلية، مراقبة الشاحنات، محرك الأتمتة والتقارير',
      icon: Briefcase,
    },
    {
      id: 'sales_lead',
      role: 'COMPANY_ADMIN' as UserRole,
      title: 'مسؤول المبيعات والعقود',
      name: 'أ. طارق عبد الرحمن',
      email: 'tarek.sales@fleetops.com',
      badge: 'إدارة المبيعات',
      badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
      description: 'لوحة صفقات المبيعات، عروض الأسعار، وتوقيع العقود مع العملاء',
      icon: Sparkles,
    },
    {
      id: 'dispatcher',
      role: 'DISPATCHER' as UserRole,
      title: 'مشرف الحركة واللوجستيات',
      name: 'ك. محمود الجمل',
      email: 'mahmoud.logistics@fleetops.com',
      badge: 'حركة ووقود',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      description: 'توزيع خطوط السير، متابعة الرحلات، تسجيل الوقود والصيانة',
      icon: Compass,
    },
    {
      id: 'driver',
      role: 'DRIVER' as UserRole,
      title: 'كابتن سائق الشاحنة',
      name: 'ك. إبراهيم خليل',
      email: 'ibrahim.driver@fleetops.com',
      badge: 'بوابة السائق',
      badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      description: 'استعراض المهام المسندة، تحديث قراءة العدادات، والتوقيع الرقمي',
      icon: Truck,
    },
  ];

  const handleSelectDemoRole = (demo: typeof demoAccounts[0]) => {
    if (onSelectRolePreview) {
      onSelectRolePreview(demo.role);
    }
    setEmail(demo.email);
    setPassword('DemoPass2026!');
    onSuccessToast(
      'تم اختيار حساب تجريبي',
      `تم التبديل السريع إلى دور: ${demo.title}`
    );
    onClose();
  };

  return (
    <div
      id="login-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto"
      dir="rtl"
    >
      <div
        id="login-modal-card"
        className="relative w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden text-slate-100 my-auto"
      >
        {/* Top Header & Close Button */}
        <div className="relative bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 p-6 border-b border-slate-800">
          <button
            id="login-modal-close-btn"
            onClick={onClose}
            className="absolute top-5 left-5 p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 transition-colors"
            title="إغلاق النافذة"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-cyan-500/20 text-slate-950 shrink-0">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-wide">
                  فليت أوبس &bull; تسجيل الدخول الموحد
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  Enterprise SSO
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                بوابة الوصول الآمن لمنظومة إدارة الأسطول والعمليات والمبيعات
              </p>
            </div>
          </div>

          {/* Active Account Banner if already logged in */}
          {currentUser && (
            <div className="mt-4 p-3 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center font-bold shrink-0">
                  {currentUser.displayName ? currentUser.displayName[0].toUpperCase() : 'U'}
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-slate-200 truncate">
                    الحساب الحالي: {currentUser.displayName || currentUser.email}
                  </div>
                  <div className="text-[11px] text-slate-400 truncate">
                    الدور الحالي: <span className="text-emerald-400 font-mono">{effectiveRole}</span>
                  </div>
                </div>
              </div>

              <button
                id="sign-out-switch-btn"
                onClick={handleSignOutCurrent}
                className="px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 flex items-center gap-1.5 text-[11px] font-medium transition shrink-0"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>تبديل الحساب</span>
              </button>
            </div>
          )}

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 mt-5 bg-slate-950/60 p-1 rounded-xl border border-slate-800">
            <button
              id="tab-signin-btn"
              onClick={() => {
                setActiveTab('signin');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
                activeTab === 'signin'
                  ? 'bg-gradient-to-r from-cyan-600 to-cyan-500 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>تسجيل الدخول</span>
            </button>

            <button
              id="tab-signup-btn"
              onClick={() => {
                setActiveTab('signup');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
                activeTab === 'signup'
                  ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <UserIcon className="w-3.5 h-3.5" />
              <span>حساب جديد</span>
            </button>

            <button
              id="tab-demoroles-btn"
              onClick={() => {
                setActiveTab('demo_roles');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
                activeTab === 'demo_roles'
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>حسابات الأدوار</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {/* Alerts */}
          {errorMessage && (
            <div className="mb-4 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-200 text-xs flex flex-col gap-2.5 animate-in fade-in">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                <div className="flex-1 leading-relaxed">{errorMessage}</div>
              </div>

              {/* Action buttons inside alert if operation-not-allowed or provider notice */}
              {(errorMessage.includes('Google') || errorMessage.includes('operation-not-allowed') || errorMessage.includes('غير مفعّلة')) && (
                <div className="pt-2 border-t border-rose-500/20 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={isLoading}
                    className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-2 transition shadow cursor-pointer"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                      <path fill="#fff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#fff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#fff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                      <path fill="#fff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                    </svg>
                    <span>تسجيل الدخول عبر Google (مفعّل دائماً)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('demo_roles');
                      setErrorMessage(null);
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs transition cursor-pointer"
                  >
                    تجربة الأدوار السريعة
                  </button>
                </div>
              )}

              {/* Action buttons if email already exists */}
              {(errorMessage.includes('مسجل بالفعل') || errorMessage.includes('email-already-in-use')) && (
                <div className="pt-2 border-t border-rose-500/20 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('signin');
                      setErrorMessage(null);
                      setPassword('');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>الانتقال لتسجيل الدخول بهذا البريد</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-2.5 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
              <div className="flex-1">{successMessage}</div>
            </div>
          )}

          {/* 1. SIGN IN TAB */}
          {activeTab === 'signin' && (
            <div className="space-y-4">
              {/* Google Fast Sign In */}
              <button
                id="google-signin-btn"
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs sm:text-sm flex items-center justify-center gap-3 transition-all shadow-md active:scale-[0.99] disabled:opacity-60 cursor-pointer"
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-slate-800" />
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                )}
                <span>الدخول السريع بحساب Google (أي حساب أو بريد)</span>
              </button>

              {/* Divider */}
              <div className="relative flex items-center justify-center my-4">
                <div className="border-t border-slate-700/80 w-full" />
                <span className="bg-slate-900 px-3 text-[11px] text-slate-400 font-medium whitespace-nowrap">
                  أو الدخول بالبريد المؤسسي وكلمة المرور
                </span>
                <div className="border-t border-slate-700/80 w-full" />
              </div>

              {/* Form */}
              <form onSubmit={handleEmailSignIn} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    البريد الإلكتروني المؤسسي
                  </label>
                  <div className="relative">
                    <input
                      id="signin-email-input"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="user@fleetops.com"
                      className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3.5 py-2.5 pl-10 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-cyan-500 transition-colors"
                      required
                    />
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-300">
                      كلمة المرور
                    </label>
                    <button
                      type="button"
                      onClick={handleResetPassword}
                      className="text-[11px] text-cyan-400 hover:text-cyan-300 transition-colors"
                    >
                      نسيت كلمة المرور؟
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      id="signin-password-input"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3.5 py-2.5 pl-10 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-cyan-500 transition-colors"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded-sm bg-slate-800 border-slate-700 text-cyan-500 focus:ring-cyan-500/20"
                    />
                    <span>تذكر بيانات تسجيل الدخول</span>
                  </label>
                </div>

                <button
                  id="submit-signin-btn"
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs sm:text-sm transition-all shadow-md shadow-cyan-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>جارٍ التحقق والمصادقة...</span>
                    </>
                  ) : (
                    <>
                      <span>تسجيل الدخول للمنظومة</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* 2. SIGN UP TAB */}
          {activeTab === 'signup' && (
            <div className="space-y-4">
              {/* Google Fast Sign In / Sign Up */}
              <button
                id="google-signup-btn"
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs sm:text-sm flex items-center justify-center gap-3 transition-all shadow-md active:scale-[0.99] disabled:opacity-60 cursor-pointer"
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-slate-800" />
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                )}
                <span>التسجيل الفوري المباشر بـ Google (موصى به وبنقرة واحدة)</span>
              </button>

              {/* Divider */}
              <div className="relative flex items-center justify-center my-3">
                <div className="border-t border-slate-700/80 w-full" />
                <span className="bg-slate-900 px-3 text-[11px] text-slate-400 font-medium whitespace-nowrap">
                  أو إنشاء حساب بالبريد المؤسسي وكلمة المرور
                </span>
                <div className="border-t border-slate-700/80 w-full" />
              </div>

              <form onSubmit={handleSignUp} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  الاسم الكامل واللقب
                </label>
                <div className="relative">
                  <input
                    id="signup-name-input"
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="مثال: م. كريم عبد العزيز"
                    className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3.5 py-2.5 pl-10 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-emerald-500 transition-colors"
                    required
                  />
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  البريد الإلكتروني المؤسسي
                </label>
                <div className="relative">
                  <input
                    id="signup-email-input"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3.5 py-2.5 pl-10 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-emerald-500 transition-colors"
                    required
                  />
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    كلمة المرور
                  </label>
                  <div className="relative">
                    <input
                      id="signup-password-input"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="6 أحرف على الأقل"
                      className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3.5 py-2.5 pl-10 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-emerald-500 transition-colors"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    تأكيد كلمة المرور
                  </label>
                  <div className="relative">
                    <input
                      id="signup-confirm-password-input"
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="إعادة كلمة المرور"
                      className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-emerald-500 transition-colors"
                      required
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  الدور المقترح / القسم
                </label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-100 focus:outline-hidden focus:border-emerald-500"
                >
                  <option value="OPERATIONS_MANAGER">إدارة العمليات والتشغيل (Operations Manager)</option>
                  <option value="COMPANY_ADMIN">إدارة المبيعات والشركات (Sales / Admin)</option>
                  <option value="DISPATCHER">مشرف الحركة واللوجستيات (Dispatcher)</option>
                  <option value="SUPERVISOR">مشرف ميداني / فني صيانة (Supervisor)</option>
                  <option value="DRIVER">كابتن سائق أسطول (Driver)</option>
                  <option value="VIEWER">مشاهد ومتابع تقارير (Viewer)</option>
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  * سيتم ربط الحساب تلقائياً بقاعدة البيانات السحابية ومصادقة الصلاحيات
                </p>
              </div>

              <button
                id="submit-signup-btn"
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold text-xs sm:text-sm transition-all shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>جارٍ إنشاء الحساب والمزامنة...</span>
                  </>
                ) : (
                  <>
                    <span>إنشاء الحساب وتفعيل الهوية</span>
                    <Check className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
          )}

          {/* 3. DEMO ROLES TAB */}
          {activeTab === 'demo_roles' && (
            <div className="space-y-3">
              <div className="text-xs text-slate-300 mb-2 leading-relaxed">
                اضغط على أي من الحسابات التشغيلية أدناه لتجربة المنظومة ومعاينة صلاحيات ذلك الدور فوراً:
              </div>

              <div className="grid grid-cols-1 gap-2.5 max-h-72 overflow-y-auto pr-1">
                {demoAccounts.map((acc) => {
                  const Icon = acc.icon;
                  const isCurrentRole = effectiveRole === acc.role;
                  return (
                    <div
                      key={acc.id}
                      onClick={() => handleSelectDemoRole(acc)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                        isCurrentRole
                          ? 'bg-cyan-950/40 border-cyan-500/60 ring-1 ring-cyan-500/30'
                          : 'bg-slate-800/60 border-slate-700/60 hover:bg-slate-800 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-slate-700/60 border border-slate-600/40 flex items-center justify-center text-cyan-400 shrink-0 mt-0.5">
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-100">{acc.title}</span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${acc.badgeColor}`}
                            >
                              {acc.badge}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5 truncate">
                            {acc.name} &bull; {acc.email}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-1 leading-normal">
                            {acc.description}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs font-bold whitespace-nowrap shrink-0 transition"
                      >
                        دخول بهذا الدور
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer info and security stamp */}
        <div className="bg-slate-950/80 px-6 py-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-500">
          <div className="flex items-center gap-2">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span>نظام المصادقة المحمي &bull; تشفير عالي الكفاءة &bull; Google Cloud Auth</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 underline font-medium"
          >
            متابعة كزائر (معاينة)
          </button>
        </div>
      </div>
    </div>
  );
};
