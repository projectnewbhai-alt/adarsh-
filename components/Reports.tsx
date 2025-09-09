import React, { useMemo } from 'react';
import { Party, KhataTransaction } from '../types';
import { TrendingUpIcon, TrendingDownIcon } from './Icons';
import { useLanguage } from '../contexts/LanguageContext';

const formatCurrency = (num: number) => `₹ ${num.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

interface ReportsProps {
  parties: Party[];
  transactions: KhataTransaction[];
}

interface PartyBalance {
    party: Party;
    balance: number;
}

export const Reports: React.FC<ReportsProps> = ({ parties, transactions }) => {
  const { t } = useLanguage();
  const { totalReceivables, totalPayables, customerDues, supplierPayables } = useMemo(() => {
    const balances = new Map<string, number>();
    transactions.forEach(t => {
      const currentBalance = balances.get(t.partyId) || 0;
      const newBalance = currentBalance + (t.type === 'DEBIT' ? t.amount : -t.amount);
      balances.set(t.partyId, newBalance);
    });

    const allPartyBalances: PartyBalance[] = parties.map(party => ({
        party,
        balance: balances.get(party.id) || 0
    }));

    const customerDues = allPartyBalances.filter(pb => pb.party.type === 'CUSTOMER' && pb.balance > 0);
    const supplierPayables = allPartyBalances.filter(pb => pb.party.type === 'SUPPLIER' && pb.balance < 0);

    const totalReceivables = customerDues.reduce((sum, pb) => sum + pb.balance, 0);
    const totalPayables = supplierPayables.reduce((sum, pb) => sum + Math.abs(pb.balance), 0);

    return { totalReceivables, totalPayables, customerDues, supplierPayables };
  }, [parties, transactions]);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold mb-3 text-slate-900 dark:text-white">{t('financial_summary')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Total Receivables Card */}
          <div className="bg-green-100 dark:bg-green-900/40 border-l-4 border-green-500 p-4 rounded-lg shadow-md flex items-start">
            <div className="bg-green-500 text-white rounded-full p-3 mr-4">
                <TrendingUpIcon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-green-800 dark:text-green-300 font-medium">{t('total_receivables')}</p>
              <p className="text-2xl font-bold text-green-900 dark:text-white">{formatCurrency(totalReceivables)}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{t('amount_to_collect')}</p>
            </div>
          </div>
          {/* Total Payables Card */}
          <div className="bg-red-100 dark:bg-red-900/40 border-l-4 border-red-500 p-4 rounded-lg shadow-md flex items-start">
            <div className="bg-red-500 text-white rounded-full p-3 mr-4">
                <TrendingDownIcon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-red-800 dark:text-red-300 font-medium">{t('total_payables')}</p>
              <p className="text-2xl font-bold text-red-900 dark:text-white">{formatCurrency(totalPayables)}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{t('amount_to_pay')}</p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Customer Dues List */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg">
          <h3 className="text-lg font-bold p-4 border-b border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">{t('customer_dues')}</h3>
          {customerDues.length > 0 ? (
            <ul className="divide-y divide-slate-200 dark:divide-slate-700 max-h-96 overflow-y-auto">
              {customerDues.map(({ party, balance }) => (
                <li key={party.id} className="p-4 flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">{party.name}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{party.phone}</p>
                  </div>
                  <p className="font-bold text-green-600 dark:text-green-400">{formatCurrency(balance)}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="p-4 text-center text-slate-500">{t('no_pending_dues')}</p>
          )}
        </div>

        {/* Supplier Payables List */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg">
          <h3 className="text-lg font-bold p-4 border-b border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">{t('supplier_payables')}</h3>
          {supplierPayables.length > 0 ? (
            <ul className="divide-y divide-slate-200 dark:divide-slate-700 max-h-96 overflow-y-auto">
              {supplierPayables.map(({ party, balance }) => (
                <li key={party.id} className="p-4 flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">{party.name}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{party.phone}</p>
                  </div>
                  <p className="font-bold text-red-600 dark:text-red-400">{formatCurrency(Math.abs(balance))}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="p-4 text-center text-slate-500">{t('no_pending_payments')}</p>
          )}
        </div>
      </div>
    </div>
  );
};
