import React, { useState, useMemo } from 'react';
import { KhataTransaction, Party } from '../types';
import { WhatsAppIcon, ShareIcon, ArrowLeftIcon, PhoneIcon, UserCircleIcon, PlusIcon, CameraIcon } from './Icons';
import { useLanguage } from '../contexts/LanguageContext';
import { useGoogleAuth } from '../contexts/GoogleAuthContext';
import { uploadPdfToDrive } from '../utils/googleDrive';
import { registerHindiFont } from '../utils/pdfFonts';

// Let TypeScript know about the global jsPDF object from the CDN script
declare var jspdf: any;

// --- Helper Functions and Components ---

const formatCurrency = (num: number) => `₹ ${num.toLocaleString('en-IN')}`;
const formatDate = (date: Date) => date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });

// --- Prop Interfaces ---

interface KhatabookProps {
  parties: Party[];
  transactions: KhataTransaction[];
  onAddParty: (party: Omit<Party, 'id'>) => void;
  onAddTransaction: (transaction: Omit<KhataTransaction, 'id' | 'date'>) => void;
}

type View = 'LIST' | 'CUSTOMER_LEDGER' | 'ADD_CUSTOMER' | 'ADD_TRANSACTION';

// --- Main Khatabook Component (State Machine) ---

export const Khatabook: React.FC<KhatabookProps> = (props) => {
  const [view, setView] = useState<View>('LIST');
  const [selectedPartyId, setSelectedPartyId] = useState<string | null>(null);
  const [transactionType, setTransactionType] = useState<'CREDIT' | 'DEBIT'>('CREDIT');
  
  const selectedParty = useMemo(() => {
    return props.parties.find(p => p.id === selectedPartyId) || null;
  }, [selectedPartyId, props.parties]);

  switch (view) {
    case 'ADD_CUSTOMER':
      return <AddCustomerForm onBack={() => setView('LIST')} onSave={props.onAddParty} />;
    case 'CUSTOMER_LEDGER':
      if (!selectedParty) return null; // Should not happen
      return (
        <CustomerLedger
          party={selectedParty}
          transactions={props.transactions.filter(t => t.partyId === selectedParty.id)}
          onBack={() => setView('LIST')}
          onAddTransaction={(type) => {
            setTransactionType(type);
            setView('ADD_TRANSACTION');
          }}
        />
      );
    case 'ADD_TRANSACTION':
        if (!selectedParty) return null; // Should not happen
        return (
            <AddTransactionForm
                party={selectedParty}
                type={transactionType}
                onBack={() => setView('CUSTOMER_LEDGER')}
                onSave={(data) => {
                    props.onAddTransaction(data);
                    setView('CUSTOMER_LEDGER');
                }}
            />
        )
    case 'LIST':
    default:
      return (
        <CustomerList
          parties={props.parties}
          transactions={props.transactions}
          onSelectParty={(partyId) => {
            setSelectedPartyId(partyId);
            setView('CUSTOMER_LEDGER');
          }}
          onAddCustomer={() => setView('ADD_CUSTOMER')}
        />
      );
  }
};


// --- Sub-Components for Different Views ---

const CustomerList: React.FC<{
    parties: Party[],
    transactions: KhataTransaction[],
    onSelectParty: (partyId: string) => void,
    onAddCustomer: () => void,
}> = ({ parties, transactions, onSelectParty, onAddCustomer }) => {
    const { t } = useLanguage();
    const partyBalances = useMemo(() => {
        const balances = new Map<string, number>();
        transactions.forEach(t => {
            const currentBalance = balances.get(t.partyId) || 0;
            const newBalance = currentBalance + (t.type === 'CREDIT' ? -t.amount : t.amount);
            balances.set(t.partyId, newBalance);
        });
        return balances;
    }, [transactions]);

    return (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg relative min-h-[60vh]">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t('customers')}</h2>
            </div>
            {parties.length > 0 ? (
                <ul>
                    {parties.map(party => {
                        const balance = partyBalances.get(party.id) || 0;
                        return (
                            <li key={party.id} onClick={() => onSelectParty(party.id)} className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer">
                                <div className="p-4 flex justify-between items-center">
                                    <div>
                                        <p className="font-semibold text-slate-900 dark:text-white">{party.name}</p>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">{party.phone}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className={`font-bold ${balance > 0 ? 'text-green-600' : balance < 0 ? 'text-red-600' : 'text-slate-500'}`}>{formatCurrency(Math.abs(balance))}</p>
                                        <p className={`text-xs ${balance > 0 ? 'text-green-500' : 'text-red-500'}`}>{balance !== 0 ? (balance > 0 ? 'Advance' : 'Due') : ''}</p>
                                    </div>
                                </div>
                            </li>
                        )
                    })}
                </ul>
            ) : (
                <div className="text-center py-20 text-slate-500">
                    <p>{t('no_customers_added')}</p>
                    <p>{t('click_to_add_customer')}</p>
                </div>
            )}
             <div className="absolute bottom-6 right-6">
                <button onClick={onAddCustomer} className="bg-amber-600 text-white rounded-full p-4 shadow-lg hover:bg-amber-700 transition-transform transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-800 focus:ring-amber-500">
                    <PlusIcon className="h-8 w-8" />
                    <span className="sr-only">{t('add_customer')}</span>
                </button>
            </div>
        </div>
    );
}

const AddCustomerForm: React.FC<{onBack: () => void, onSave: (party: Omit<Party, 'id'>) => void}> = ({ onBack, onSave }) => {
    const { t } = useLanguage();
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [type, setType] = useState<'CUSTOMER' | 'SUPPLIER'>('CUSTOMER');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (name.trim() && phone.trim().length >= 10) {
            onSave({ name, phone, type });
            onBack();
        }
    }
    
    return (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg">
            <header className="flex items-center p-4 bg-sky-600 dark:bg-sky-800 rounded-t-lg">
                <button onClick={onBack} className="mr-4 text-white"><ArrowLeftIcon className="h-6 w-6" /></button>
                <h2 className="text-xl font-bold text-white">{t('add_party')}</h2>
            </header>
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
                 <div>
                    <label htmlFor="partyName" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">{t('party_name')}</label>
                    <input type="text" id="partyName" value={name} onChange={e => setName(e.target.value)} required className="w-full bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white rounded-md border border-slate-300 dark:border-slate-600 px-3 py-2 focus:ring-2 focus:ring-amber-500" />
                </div>
                <div>
                    <label htmlFor="mobileNumber" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">{t('mobile_number')}</label>
                    <div className="flex">
                        <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 text-sm">🇮🇳 +91</span>
                        <input type="tel" id="mobileNumber" value={phone} onChange={e => setPhone(e.target.value)} required minLength={10} maxLength={10} className="w-full bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white rounded-r-md border border-slate-300 dark:border-slate-600 px-3 py-2 focus:ring-2 focus:ring-amber-500" />
                    </div>
                </div>
                <div>
                     <p className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">{t('who_are_they')}</p>
                     <div className="flex gap-4 items-center">
                        <label className="flex items-center"><input type="radio" name="partyType" value="CUSTOMER" checked={type === 'CUSTOMER'} onChange={() => setType('CUSTOMER')} className="h-4 w-4 text-amber-600 bg-slate-100 border-slate-300 dark:bg-slate-700 dark:border-slate-500 focus:ring-amber-500"/> <span className="ml-2">{t('customer')}</span></label>
                        <label className="flex items-center"><input type="radio" name="partyType" value="SUPPLIER" checked={type === 'SUPPLIER'} onChange={() => setType('SUPPLIER')} className="h-4 w-4 text-amber-600 bg-slate-100 border-slate-300 dark:bg-slate-700 dark:border-slate-500 focus:ring-amber-500"/> <span className="ml-2">{t('supplier')}</span></label>
                     </div>
                </div>
                 <div className="pt-4">
                    <button type="submit" className="w-full bg-sky-600 text-white font-bold py-3 px-4 rounded-md hover:bg-sky-700 transition">{t('add_customer')}</button>
                </div>
            </form>
        </div>
    )
}

const CustomerLedger: React.FC<{
    party: Party,
    transactions: KhataTransaction[],
    onBack: () => void,
    onAddTransaction: (type: 'CREDIT' | 'DEBIT') => void
}> = ({ party, transactions, onBack, onAddTransaction }) => {
    const { t, language } = useLanguage();
    const { isAuthenticated, accessToken } = useGoogleAuth();
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

    const { finalBalance, transactionRows } = useMemo(() => {
        const sorted = [...transactions].sort((a, b) => a.date.getTime() - b.date.getTime());
        let runningBalance = 0;
        const rows = sorted.map(t => {
            runningBalance += t.type === 'DEBIT' ? t.amount : -t.amount;
            return { ...t, balance: runningBalance };
        }).reverse();
        return { finalBalance: runningBalance, transactionRows: rows };
    }, [transactions]);
    
    const handleWhatsAppReminder = () => {
        if (finalBalance === 0) {
            alert("No outstanding balance to remind about.");
            return;
        }

        const balanceType = finalBalance < 0 ? 'due' : 'advance';
        const amount = formatCurrency(Math.abs(finalBalance));

        const message = `Hello ${party.name}, this is a friendly reminder from Aman Jewellers. Your current ${balanceType} balance is ${amount}. Thank you.`;
        const encodedMessage = encodeURIComponent(message);
        
        // Use a phone number format that works internationally, assuming Indian numbers
        const phone = party.phone.startsWith('+') ? party.phone.substring(1) : `91${party.phone}`;

        const url = `https://wa.me/${phone}?text=${encodedMessage}`;
        window.open(url, '_blank', 'noopener,noreferrer');
    };

    const handleGeneratePdf = async () => {
        if (transactions.length === 0) {
            alert(t('no_transactions_to_generate'));
            return;
        }
        
        setIsGeneratingPdf(true);
        try {
            const { jsPDF } = jspdf;
            const doc = new jsPDF();

            if (language === 'hi') {
                registerHindiFont(doc);
            }
            
            // Document Header
            doc.setFontSize(20);
            doc.text(t('aman_jewellers'), 105, 15, null, null, 'center');
            doc.setFontSize(10);
            doc.text(t('shop_address_phone'), 105, 22, null, null, 'center');
            doc.line(14, 32, 196, 32);

            // Customer Details
            doc.setFontSize(12);
            doc.text(`${t('statement_for')}: ${party.name}`, 14, 40);
            doc.text(`${t('phone')}: ${party.phone}`, 14, 46);
            doc.text(`${t('date')}: ${new Date().toLocaleDateString('en-GB')}`, 196, 40, null, null, 'right');

            const sortedTransactions = [...transactions].sort((a, b) => a.date.getTime() - b.date.getTime());
            let runningBalance = 0;
            const tableBody = sortedTransactions.map(t => {
                runningBalance += t.type === 'DEBIT' ? t.amount : -t.amount;
                return [
                    formatDate(t.date),
                    t.description,
                    t.type === 'DEBIT' ? t.amount.toLocaleString('en-IN') : '-',
                    t.type === 'CREDIT' ? t.amount.toLocaleString('en-IN') : '-',
                    runningBalance.toLocaleString('en-IN'),
                ];
            });

            (doc as any).autoTable({
                head: [[t('table_date'), t('table_description'), t('table_you_gave'), t('table_you_received'), t('table_balance')]],
                body: tableBody,
                startY: 55,
                headStyles: { fillColor: [251, 191, 36] }, // Amber color for header
                styles: { font: language === 'hi' ? 'NotoSansDevanagari' : 'helvetica' },
                theme: 'grid',
            });
            
            const finalY = (doc as any).autoTable.previous.finalY;

            // Summary
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            if (language === 'hi') doc.setFont('NotoSansDevanagari');
            doc.text(t('final_balance'), 14, finalY + 15);
            doc.text(formatCurrency(finalBalance), 196, finalY + 15, null, null, 'right');
            
            const fileName = `Statement-${party.name}-${new Date().toISOString().split('T')[0]}.pdf`;
            
            if (isAuthenticated && accessToken) {
                alert(t('uploading_to_drive'));
                const pdfBlob = doc.output('blob');
                await uploadPdfToDrive(accessToken, pdfBlob, fileName);
                alert(t('upload_success'));
            } else {
                doc.save(fileName);
            }

        } catch (error) {
            console.error("PDF Generation failed", error);
            if (error instanceof Error && error.message.includes('font')) {
                 alert(t('font_load_error'));
            } else {
                alert("An error occurred during PDF generation.");
            }
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    return (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg flex flex-col min-h-[80vh]">
            <header className="flex items-center justify-between p-3 bg-sky-600 dark:bg-sky-800 rounded-t-lg sticky top-0 z-10">
                <div className="flex items-center">
                    <button onClick={onBack} className="mr-3 text-white"><ArrowLeftIcon className="h-6 w-6" /></button>
                    <UserCircleIcon className="h-10 w-10 text-sky-100 dark:text-slate-300 bg-sky-500 dark:bg-slate-600 rounded-full p-1 mr-3" />
                    <div>
                        <h2 className="text-lg font-bold text-white">{party.name}</h2>
                        <p className="text-xs text-sky-100 dark:text-slate-300">{party.type}</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <button onClick={handleWhatsAppReminder} className="text-white" aria-label={t('send_whatsapp_reminder')}>
                        <WhatsAppIcon className="h-6 w-6" />
                    </button>
                    <button onClick={handleGeneratePdf} disabled={isGeneratingPdf} className="text-white disabled:opacity-50" aria-label={t('share_statement_pdf')}>
                        {isGeneratingPdf ? t('processing_pdf') : <ShareIcon className="h-6 w-6" />}
                    </button>
                    <a href={`tel:${party.phone}`} className="text-white" aria-label={t('call_customer')}>
                        <PhoneIcon className="h-6 w-6" />
                    </a>
                </div>
            </header>

            <div className="flex-grow p-4">
                <div className="bg-slate-100 dark:bg-slate-700/50 p-3 rounded-lg text-center mb-4">
                    <p className="text-sm text-slate-500 dark:text-slate-300">{finalBalance >= 0 ? t('net_balance_get') : t('net_balance_give')}</p>
                    <p className={`text-2xl font-bold ${finalBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(Math.abs(finalBalance))}</p>
                </div>
                
                {transactionRows.length > 0 ? (
                    <div className="space-y-3">
                        {transactionRows.map(t => (
                             <div key={t.id} className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-md flex justify-between items-center">
                                <div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">{t.date.toLocaleString()}</p>
                                    <p className="text-sm text-slate-800 dark:text-white">{t.description || (t.type === 'CREDIT' ? 'Amount Received' : 'Amount Given')}</p>
                                    <p className="text-xs text-slate-500 mt-1">Balance: {formatCurrency(t.balance)}</p>
                                </div>
                                <p className={`text-lg font-bold ${t.type === 'DEBIT' ? 'text-red-500' : 'text-green-500'}`}>
                                    {formatCurrency(t.amount)}
                                </p>
                             </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20 text-slate-500">
                        <p>{t('start_adding_transactions')} {party.name}</p>
                    </div>
                )}
            </div>

            <footer className="grid grid-cols-2 gap-3 p-3 sticky bottom-0 bg-white dark:bg-slate-800 rounded-b-lg">
                <button onClick={() => onAddTransaction('DEBIT')} className="bg-red-600 text-white font-bold py-3 px-4 rounded-md hover:bg-red-700 transition">{t('you_gave')}</button>
                <button onClick={() => onAddTransaction('CREDIT')} className="bg-green-600 text-white font-bold py-3 px-4 rounded-md hover:bg-green-700 transition">{t('you_recv')}</button>
            </footer>
        </div>
    )
}

const AddTransactionForm: React.FC<{
    party: Party,
    type: 'CREDIT' | 'DEBIT',
    onBack: () => void,
    onSave: (data: Omit<KhataTransaction, 'id' | 'date'>) => void
}> = ({ party, type, onBack, onSave }) => {
    const { t } = useLanguage();
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const numericAmount = parseFloat(amount);
        if (!isNaN(numericAmount) && numericAmount > 0) {
            onSave({
                partyId: party.id,
                amount: numericAmount,
                type,
                description,
                // The date handling in the parent will use `new Date()`, this is for display
            });
        }
    };

    const title = type === 'CREDIT' 
        ? t('amount_received_from')
        : t('amount_given_to');

    return (
         <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg flex flex-col min-h-[80vh]">
            <header className="flex items-center p-4 bg-sky-600 dark:bg-sky-800 rounded-t-lg">
                <button onClick={onBack} className="mr-4 text-white"><ArrowLeftIcon className="h-6 w-6" /></button>
                <h2 className="text-xl font-bold text-white">{title} {type === 'DEBIT' && party.name}</h2>
            </header>
            <form onSubmit={handleSubmit} className="p-6 space-y-6 flex-grow flex flex-col">
                 <div className="flex-grow space-y-6">
                    <div>
                        <label htmlFor="amount" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">{t('amount')}</label>
                        <input type="number" id="amount" value={amount} onChange={e => setAmount(e.target.value)} required autoFocus className="w-full bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white rounded-md border border-slate-300 dark:border-slate-600 px-3 py-2 text-2xl focus:ring-2 focus:ring-amber-500" placeholder="0"/>
                    </div>
                    <div>
                        <label htmlFor="description" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">{t('fill_details_optional')}</label>
                        <input type="text" id="description" value={description} onChange={e => setDescription(e.target.value)} className="w-full bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white rounded-md border border-slate-300 dark:border-slate-600 px-3 py-2 focus:ring-2 focus:ring-amber-500" placeholder={t('bill_no_etc')}/>
                    </div>
                    <div className="flex justify-between items-center">
                        <div>
                            <label htmlFor="date" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">{t('date')}</label>
                            <input type="date" id="date" value={date} onChange={e => setDate(e.target.value)} className="bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white rounded-md border border-slate-300 dark:border-slate-600 px-3 py-2 focus:ring-2 focus:ring-amber-500"/>
                        </div>
                        <button type="button" className="flex items-center gap-2 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white px-4 py-2 rounded-md hover:bg-slate-300 dark:hover:bg-slate-600">
                            <CameraIcon className="h-5 w-5" />
                            <span>{t('attach_bill')}</span>
                        </button>
                    </div>
                 </div>
                 <div className="pt-4">
                    <button type="submit" className="w-full bg-green-600 text-white font-bold py-3 px-4 rounded-md hover:bg-green-700 transition">{t('save')}</button>
                </div>
            </form>
        </div>
    )
}