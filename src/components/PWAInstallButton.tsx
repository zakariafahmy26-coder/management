import React, { useState } from 'react';
import { Download, Smartphone, X, Share2, PlusSquare, Check } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'compact' | 'full' | 'header';
  className?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'header',
  className = '',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  // If already installed in standalone mode, don't show prompt
  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      setIsInstalling(true);
      try {
        await install();
      } finally {
        setIsInstalling(false);
      }
    } else if (isIOS) {
      setShowIOSGuide(true);
    } else {
      // For browsers that don't trigger beforeinstallprompt yet
      setShowIOSGuide(true);
    }
  };

  return (
    <>
      <button
        id="pwa-install-btn"
        onClick={handleInstallClick}
        disabled={isInstalling}
        title="تثبيت التطبيق على هاتفك المحمول"
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer shadow-xs ${
          variant === 'compact'
            ? 'bg-emerald-700 hover:bg-emerald-600 text-white'
            : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white border border-emerald-400/30'
        } ${className}`}
      >
        <Download className="w-3.5 h-3.5 animate-bounce" />
        <span>{isInstalling ? 'جاري التثبيت...' : 'تثبيت التطبيق على الموبايل'}</span>
        <span className="bg-emerald-900/60 text-emerald-200 text-[10px] px-1.5 py-0.5 rounded font-mono">
          PWA
        </span>
      </button>

      {/* Guide Modal for iOS / Safari / Desktop */}
      {showIOSGuide && (
        <div
          id="pwa-install-guide-modal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4"
          dir="rtl"
          onClick={() => setShowIOSGuide(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 text-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                  <Smartphone className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">تثبيت تطبيق أسطول المصنع</h3>
                  <p className="text-xs text-slate-500">يعمل بدون متصفح ومباشرة على شاشة الهاتف</p>
                </div>
              </div>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3.5 text-xs text-slate-600 leading-relaxed">
              {isIOS ? (
                <>
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-xs shrink-0 mt-0.5">
                      1
                    </span>
                    <div>
                      <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                        اضغط على زر المشاركة <Share2 className="w-4 h-4 text-blue-600 inline" /> في متصفح Safari
                      </p>
                      <p className="text-slate-500 text-[11px] mt-0.5">
                        موجود في أسفل الشاشة على هواتف آيفون أو بأعلى الشاشة على أجهزة آيباد.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-xs shrink-0 mt-0.5">
                      2
                    </span>
                    <div>
                      <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                        اختر «إضافة إلى الصفحة الرئيسية» <PlusSquare className="w-4 h-4 text-emerald-600 inline" />
                      </p>
                      <p className="text-slate-500 text-[11px] mt-0.5">
                        (Add to Home Screen) من قائمة الخيارات.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-xs shrink-0 mt-0.5">
                      3
                    </span>
                    <div>
                      <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                        اضغط على «إضافة» (Add) في الزاوية العلوية <Check className="w-4 h-4 text-emerald-600 inline" />
                      </p>
                      <p className="text-slate-500 text-[11px] mt-0.5">
                        سيظهر التطبيق كأيقونة مستقلة على شاشتك الرئيسية ويعمل بدون إنترنت!
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200/60 text-slate-700 space-y-2">
                    <p className="font-bold text-emerald-950 flex items-center gap-1.5">
                      <Smartphone className="w-4 h-4 text-emerald-700" />
                      لتثبيت التطبيق على هواتف أندرويد:
                    </p>
                    <p>
                      1. افتح قائمة المتصفح (الثلاث نقاط الرأسية ⋮ في زاوية Chrome).
                    </p>
                    <p>
                      2. اختر <strong>«تثبيت التطبيق» (Install App)</strong> أو <strong>«إضافة إلى الشاشة الرئيسية»</strong>.
                    </p>
                    <p>
                      3. أكد التثبيت لتشغيل التطبيق بملء الشاشة مع كافة المميزات دون اتصال.
                    </p>
                  </div>
                </>
              )}
            </div>

            <button
              onClick={() => setShowIOSGuide(false)}
              className="mt-5 w-full rounded-xl bg-emerald-600 hover:bg-emerald-500 py-2.5 text-xs font-bold text-white shadow-xs transition cursor-pointer"
            >
              فهمت ذلك، حسناً
            </button>
          </div>
        </div>
      )}
    </>
  );
};
