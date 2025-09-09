import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

interface RateCardProps {
  metal: string;
  rate: number;
  icon: React.ReactNode;
  colorClass: string;
}

export const RateCard: React.FC<RateCardProps> = ({ metal, rate, icon, colorClass }) => {
  const { t } = useLanguage();
  return (
    <div className={`flex-1 p-4 rounded-lg shadow-lg flex items-center bg-white dark:bg-slate-800 border-l-4 ${colorClass}`}>
      <div className="mr-4 text-4xl">{icon}</div>
      <div>
        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{metal} {t('rate')}</p>
        <p className="text-2xl font-bold text-slate-900 dark:text-white">₹ {rate.toLocaleString('en-IN')} {t('rate_per_gm')}</p>
      </div>
    </div>
  );
};
