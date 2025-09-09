import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { SunIcon, MoonIcon, XIcon } from './Icons';
import { useGoogleAuth } from '../contexts/GoogleAuthContext';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, theme, toggleTheme }) => {
  const { language, setLanguage, t } = useLanguage();
  const { isAuthenticated, user, signIn, signOut } = useGoogleAuth();

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
    >
      <div 
        className="bg-white dark:bg-slate-800 rounded-lg shadow-2xl w-full max-w-md relative"
        onClick={e => e.stopPropagation()}
      >
        <header className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700">
          <h2 id="settings-title" className="text-xl font-bold text-slate-900 dark:text-white">{t('app_settings')}</h2>
          <button 
            onClick={onClose} 
            className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            aria-label={t('close')}
          >
            <XIcon className="h-6 w-6" />
          </button>
        </header>
        
        <div className="p-6 space-y-6">
          {/* Language Setting */}
          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">{t('language')}</label>
            <div className="flex gap-2">
              <button 
                onClick={() => setLanguage('en')}
                className={`flex-1 px-4 py-2 rounded-md text-sm font-semibold transition-colors ${language === 'en' ? 'bg-amber-500 text-white shadow' : 'bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600'}`}
              >
                {t('english')}
              </button>
              <button 
                onClick={() => setLanguage('hi')}
                className={`flex-1 px-4 py-2 rounded-md text-sm font-semibold transition-colors ${language === 'hi' ? 'bg-amber-500 text-white shadow' : 'bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600'}`}
              >
                {t('hindi')}
              </button>
            </div>
          </div>
          
          {/* Theme Setting */}
          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">{t('theme')}</label>
            <div className="flex gap-2">
               <button 
                onClick={theme === 'dark' ? toggleTheme : undefined}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition-colors ${theme === 'light' ? 'bg-amber-500 text-white shadow' : 'bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600'}`}
              >
                <SunIcon className="h-5 w-5"/> {t('light')}
              </button>
               <button 
                onClick={theme === 'light' ? toggleTheme : undefined}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition-colors ${theme === 'dark' ? 'bg-amber-500 text-white shadow' : 'bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600'}`}
              >
                <MoonIcon className="h-5 w-5"/> {t('dark')}
              </button>
            </div>
          </div>

          {/* Google Drive Setting */}
          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">{t('google_drive_backup')}</label>
            {isAuthenticated && user ? (
              <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-700 p-3 rounded-lg">
                <div className="flex items-center gap-3">
                  <img src={user.picture} alt="Google user" className="h-10 w-10 rounded-full" />
                  <div>
                    <p className="font-semibold text-sm text-slate-800 dark:text-slate-200">{user.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
                  </div>
                </div>
                <button onClick={signOut} className="text-sm font-semibold text-red-600 dark:text-red-400 hover:underline">
                  {t('disconnect')}
                </button>
              </div>
            ) : (
              <button onClick={signIn} className="w-full flex items-center justify-center gap-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-md hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors">
                 <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56,12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26,1.37-1.04,2.53-2.21,3.31v2.77h3.57c2.08-1.92,3.28-4.74,3.28-8.09Z"/>
                  <path fill="#34A853" d="M12,23c2.97,0,5.46-.98,7.28-2.66l-3.57-2.77c-.98.66-2.23,1.06-3.71,1.06-2.86,0-5.29-1.93-6.16-4.53H2.18v2.84C3.99,20.53,7.7,23,12,23Z"/>
                  <path fill="#FBBC05" d="M5.84,14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43,.35-2.09V7.07H2.18C1.43,8.55,1,10.22,1,12s.43,3.45,1.18,4.93l3.66-2.84Z"/>
                  <path fill="#EA4335" d="M12,5.38c1.62,0,3.06,.56,4.21,1.64l3.15-3.15C17.45,2.09,14.97,1,12,1,7.7,1,3.99,3.47,2.18,7.07l3.66,2.84c.87-2.6,3.3-4.53,6.16-4.53Z"/>
                </svg>
                <span>{t('connect_google_drive')}</span>
              </button>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};