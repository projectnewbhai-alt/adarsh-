import React, { useState, useEffect } from 'react';
import { useLiveRates } from './hooks/useLiveRates';
import { InvoiceItem, Customer, MetalType, KhataTransaction, Party, ByajLoan } from './types';
import { RateCard } from './components/RateCard';
import { GoldBarIcon, SilverBarIcon, RefreshIcon, CogIcon } from './components/Icons';
import { BillingForm } from './components/BillingForm';
import { InvoicePreview } from './components/InvoicePreview';
import { Khatabook } from './components/Khatabook';
import { Reports } from './components/Reports';
import { Byajbook } from './components/Byajbook';
import { useLanguage } from './contexts/LanguageContext';
import { SettingsModal } from './components/SettingsModal';


const App: React.FC = () => {
  const { rates, isLoading, error, refetchRates } = useLiveRates();
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [customer, setCustomer] = useState<Customer>({ name: '', phone: '' });
  const [gstRate, setGstRate] = useState<number>(3);
  const [invoiceNumber, setInvoiceNumber] = useState<number>(1);
  
  const [currentView, setCurrentView] = useState<'billing' | 'khatabook' | 'reports' | 'byajbook'>('billing');
  const [parties, setParties] = useState<Party[]>([]);
  const [khataTransactions, setKhataTransactions] = useState<KhataTransaction[]>([]);
  const [byajLoans, setByajLoans] = useState<ByajLoan[]>([]);
  
  const { t } = useLanguage();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light' || savedTheme === 'dark') {
      return savedTheme;
    }
    return 'dark';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  const handleAddItem = (item: InvoiceItem) => {
    setItems(prevItems => [...prevItems, item]);
  };

  const handleRemoveItem = (id: string) => {
    setItems(prevItems => prevItems.filter(item => item.id !== id));
  };

  const handleClearInvoice = () => {
    setItems([]);
    setCustomer({ name: '', phone: '' });
    setInvoiceNumber(prev => prev + 1);
  };

  const handleCustomerChange = (field: keyof Customer, value: string) => {
    setCustomer(prevCustomer => ({ ...prevCustomer, [field]: value }));
  };
  
  const handleGstRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setGstRate(isNaN(value) ? 0 : value);
  };

  const handleInvoiceNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    setInvoiceNumber(isNaN(value) || value < 1 ? 1 : value);
  };
  
  const handleAddParty = (party: Omit<Party, 'id'>) => {
    if (parties.some(p => p.phone === party.phone)) {
        console.error("A party with this phone number already exists.");
        return; 
    }
    const newParty: Party = { ...party, id: party.phone };
    setParties(prev => [...prev, newParty]);
  };


  const handleAddKhataTransaction = (transaction: Omit<KhataTransaction, 'id' | 'date'>) => {
    const newTransaction: KhataTransaction = {
      ...transaction,
      id: new Date().toISOString() + Math.random(),
      date: new Date(),
    };
    setKhataTransactions(prev => [...prev, newTransaction].sort((a, b) => a.date.getTime() - b.date.getTime()));
  };

  const handleAddLoan = (loanData: Omit<ByajLoan, 'id'>) => {
    const newLoan: ByajLoan = {
      ...loanData,
      id: new Date().toISOString() + Math.random(),
    };
    setByajLoans(prev => [...prev, newLoan]);
  };

  const getHeaderTitle = () => {
    switch(currentView) {
      case 'billing': return t('billing_software');
      case 'khatabook': return t('khatabook_ledger');
      case 'reports': return t('financial_reports');
      case 'byajbook': return t('byajbook_interest_calculator');
      default: return t('billing_software');
    }
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 pb-24">
      <SettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        theme={theme}
        toggleTheme={toggleTheme}
      />

      <div className="max-w-7xl mx-auto relative">
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="absolute top-0 left-0 p-2 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors duration-200 z-10"
          aria-label={t('settings')}
        >
          <CogIcon className="h-6 w-6" />
        </button>
        <header className="text-center mb-8">
          <h1 className="text-4xl font-extrabold text-amber-500 dark:text-amber-400 tracking-wider" style={{ fontFamily: 'serif' }}>{t('aman_jewellers')}</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            {getHeaderTitle()}
          </p>
        </header>

        {currentView === 'billing' && (
          <>
            <section className="mb-8">
              <h2 className="text-xl font-bold mb-3">{t('settings')}</h2>
              <div className="p-4 bg-white dark:bg-slate-800 rounded-lg grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                      <label htmlFor="gstRate" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">{t('gst_rate')}</label>
                      <input 
                          type="number" 
                          id="gstRate" 
                          value={gstRate} 
                          onChange={handleGstRateChange} 
                          className="w-full bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white rounded-md border border-slate-300 dark:border-slate-600 px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:border-amber-500" 
                          placeholder="e.g., 3" 
                      />
                  </div>
                  <div>
                      <label htmlFor="invoiceNumber" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">{t('invoice_number')}</label>
                      <input
                          type="number"
                          id="invoiceNumber"
                          value={invoiceNumber}
                          onChange={handleInvoiceNumberChange}
                          className="w-full bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white rounded-md border border-slate-300 dark:border-slate-600 px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                          placeholder="e.g., 101"
                          min="1"
                      />
                  </div>
              </div>
            </section>

            <section className="mb-8">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-xl font-bold">{t('live_market_rates')}</h2>
                <button
                  onClick={refetchRates}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-md transition-colors disabled:opacity-50 disabled:cursor-wait"
                  aria-label={t('refresh')}
                >
                  <RefreshIcon className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                  {isLoading ? t('updating') : t('refresh')}
                </button>
              </div>
              {isLoading && !rates && (
                <div className="text-center p-8 bg-white dark:bg-slate-800 rounded-lg">
                  <p className="text-slate-500 dark:text-slate-400">{t('fetching_live_rates')}</p>
                </div>
              )}
              {error && (
                <div className="text-center p-4 bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300 rounded-lg">
                  <p>{t('could_not_fetch_rates')} {error}</p>
                </div>
              )}
              {rates && (
                <div className="flex flex-col sm:flex-row gap-4">
                  <RateCard metal={t('gold')} rate={rates[MetalType.GOLD]} icon={<GoldBarIcon className="text-amber-400" />} colorClass="border-amber-400" />
                  <RateCard metal={t('silver')} rate={rates[MetalType.SILVER]} icon={<SilverBarIcon className="text-slate-400" />} colorClass="border-slate-400" />
                </div>
              )}
            </section>
          </>
        )}
        
        <main>
            {currentView === 'billing' && (
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                    <div className="lg:col-span-2">
                        <BillingForm onAddItem={handleAddItem} />
                    </div>
                    <div className="lg:col-span-3">
                        {rates ? (
                        <InvoicePreview
                            customer={customer}
                            onCustomerChange={handleCustomerChange}
                            items={items}
                            rates={rates}
                            onRemoveItem={handleRemoveItem}
                            onClearInvoice={handleClearInvoice}
                            gstRate={gstRate}
                            invoiceNumber={invoiceNumber}
                        />
                        ) : (
                        <div className="h-full flex items-center justify-center bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
                            <p className="text-slate-500">{t('waiting_for_rates')}</p>
                        </div>
                        )}
                    </div>
                </div>
            )}
            {currentView === 'khatabook' && (
                <Khatabook 
                    parties={parties}
                    transactions={khataTransactions} 
                    onAddParty={handleAddParty}
                    onAddTransaction={handleAddKhataTransaction} 
                />
            )}
            {currentView === 'reports' && (
                <Reports parties={parties} transactions={khataTransactions} />
            )}
            {currentView === 'byajbook' && (
                <Byajbook loans={byajLoans} onAddLoan={handleAddLoan} />
            )}
        </main>
        
        <footer className="text-center text-slate-500 mt-12 text-sm">
            <p>&copy; {new Date().getFullYear()} {t('aman_jewellers')}. {t('all_rights_reserved')}</p>
        </footer>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-t border-slate-200 dark:border-slate-700 p-2 z-50 no-print">
        <div className="flex justify-around items-center">
            <button 
                onClick={() => setCurrentView('khatabook')}
                className={`flex-1 text-center px-2 py-2 rounded-lg transition-colors duration-200 ${currentView === 'khatabook' ? 'text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-slate-800' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'}`}
            >
                <span className="font-semibold text-sm sm:text-base">{t('khatabook')}</span>
            </button>
            <button 
                onClick={() => setCurrentView('reports')}
                className={`flex-1 text-center px-2 py-2 rounded-lg transition-colors duration-200 ${currentView === 'reports' ? 'text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-slate-800' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'}`}
            >
                <span className="font-semibold text-sm sm:text-base">{t('reports')}</span>
            </button>
             <button 
                onClick={() => setCurrentView('byajbook')}
                className={`flex-1 text-center px-2 py-2 rounded-lg transition-colors duration-200 ${currentView === 'byajbook' ? 'text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-slate-800' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'}`}
            >
                <span className="font-semibold text-sm sm:text-base">{t('byajbook')}</span>
            </button>
            <button 
                onClick={() => setCurrentView('billing')}
                className={`flex-1 text-center px-2 py-2 rounded-lg transition-colors duration-200 ${currentView === 'billing' ? 'text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-slate-800' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'}`}
            >
                <span className="font-semibold text-sm sm:text-base">{t('billing')}</span>
            </button>
        </div>
      </nav>
    </div>
  );
};

export default App;
