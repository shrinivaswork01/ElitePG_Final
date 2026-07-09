import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * PWA Install Prompt — Shows a bottom banner on mobile/desktop
 * when the browser detects the app is installable.
 * 
 * Uses the `beforeinstallprompt` event to trigger native install.
 * Also detects iOS and shows manual instructions.
 */
export const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed as PWA
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || (window.navigator as any).standalone === true;
    
    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // Check if user dismissed the prompt before
    const dismissed = localStorage.getItem('elitepg-pwa-dismissed');
    if (dismissed) {
      const dismissedAt = parseInt(dismissed, 10);
      // Show again after 7 days
      if (Date.now() - dismissedAt < 7 * 24 * 60 * 60 * 1000) {
        return;
      }
    }

    // Detect iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    // Listen for the beforeinstallprompt event (Chrome, Edge, Samsung Browser)
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // On iOS, show custom prompt after a delay (no native event)
    if (isIOSDevice) {
      const timer = setTimeout(() => setShowPrompt(true), 3000);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      };
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowPrompt(false);
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('elitepg-pwa-dismissed', Date.now().toString());
  };

  if (isInstalled || !showPrompt) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed bottom-4 left-4 right-4 z-[9999] md:left-auto md:right-6 md:max-w-sm"
      >
        <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl shadow-2xl shadow-indigo-500/10 border border-gray-200 dark:border-white/10 p-4 flex items-start gap-4">
          {/* Icon */}
          <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-600/30">
            <Smartphone className="w-6 h-6 text-white" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-sm text-gray-900 dark:text-white">
              Install ElitePG
            </h4>
            {isIOS ? (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
                Tap <span className="inline-flex items-center font-semibold">
                  <svg className="w-3.5 h-3.5 inline mr-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M13 7H7v6h2V9.41l4.3 4.3 1.4-1.42L10.41 8H13V7zM10 18a8 8 0 100-16 8 8 0 000 16z"/>
                  </svg>
                  Share
                </span> then <span className="font-semibold">"Add to Home Screen"</span>
              </p>
            ) : (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Add to your home screen for quick access
              </p>
            )}

            {/* Action buttons */}
            {!isIOS && (
              <button
                onClick={handleInstall}
                className="mt-2.5 flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm shadow-indigo-600/20"
              >
                <Download className="w-3.5 h-3.5" />
                Install App
              </button>
            )}
          </div>

          {/* Dismiss */}
          <button
            onClick={handleDismiss}
            className="p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors shrink-0"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
