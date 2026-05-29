import React, { useState, useEffect } from 'react';
import { ShieldAlert, X } from 'lucide-react';

const AgeVerificationModal: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const hasVerified = localStorage.getItem('ageVerified');
    if (!hasVerified) {
      setIsVisible(true);
    }
  }, []);

  const handleConfirm = () => {
    localStorage.setItem('ageVerified', 'true');
    setIsExiting(true);
    setTimeout(() => {
      setIsVisible(false);
    }, 300);
  };

  const handleDecline = () => {
    window.location.href = 'about:blank';
    window.close();
  };

  if (!isVisible) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 transition-all duration-300 ${
        isExiting ? 'opacity-0' : 'opacity-100'
      }`}
      style={{
        backdropFilter: 'blur(20px)',
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
      }}
    >
      <div
        className={`relative max-w-md w-full transition-all duration-500 ${
          isExiting
            ? 'scale-95 opacity-0 translate-y-4'
            : 'scale-100 opacity-100 translate-y-0'
        }`}
      >
        <div
          className="relative bg-gradient-to-br from-gray-900/95 via-gray-800/95 to-purple-900/50 backdrop-blur-xl rounded-2xl p-8 border border-purple-500/30 shadow-2xl overflow-hidden"
          style={{
            boxShadow: '0 0 60px rgba(168, 85, 247, 0.3), 0 0 100px rgba(168, 85, 247, 0.1)',
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 via-transparent to-pink-600/10 pointer-events-none" />

          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-50" />

          <div className="relative z-10">
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-purple-500/30 rounded-full blur-xl animate-pulse" />
                <div className="relative bg-gradient-to-br from-purple-600 to-pink-600 p-4 rounded-full">
                  <ShieldAlert className="w-10 h-10 text-white" />
                </div>
              </div>
            </div>

            <h2 className="text-3xl font-black text-center mb-3 text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-200 to-white">
              Age Verification
            </h2>

            <div className="w-16 h-1 bg-gradient-to-r from-transparent via-purple-500 to-transparent mx-auto mb-6" />

            <p className="text-gray-300 text-center mb-2 text-lg leading-relaxed">
              You must be <span className="font-bold text-purple-400">18 years or older</span> to access this website.
            </p>

            <p className="text-gray-400 text-center mb-8 text-sm">
              This site contains content and transactions related to virtual items and gaming skins.
            </p>

            <div className="flex flex-col gap-3">
              <button
                onClick={handleConfirm}
                className="group relative w-full py-4 px-6 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold rounded-xl transition-all duration-300 overflow-hidden shadow-lg hover:shadow-purple-500/50"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-purple-400/0 via-white/20 to-purple-400/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                <span className="relative flex items-center justify-center gap-2">
                  <ShieldAlert className="w-5 h-5" />
                  I am 18 or older
                </span>
              </button>

              <button
                onClick={handleDecline}
                className="group relative w-full py-4 px-6 bg-gray-800/50 hover:bg-gray-700/50 text-gray-300 hover:text-white font-semibold rounded-xl transition-all duration-300 border border-gray-700/50 hover:border-gray-600"
              >
                <span className="relative flex items-center justify-center gap-2">
                  <X className="w-5 h-5" />
                  I am under 18
                </span>
              </button>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-700/50">
              <p className="text-xs text-gray-500 text-center leading-relaxed">
                By clicking "I am 18 or older", you confirm that you meet the age requirement
                and agree to our Terms of Service and Privacy Policy.
              </p>
            </div>
          </div>

          <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -top-20 -left-20 w-40 h-40 bg-pink-600/20 rounded-full blur-3xl pointer-events-none" />
        </div>
      </div>
    </div>
  );
};

export default AgeVerificationModal;
