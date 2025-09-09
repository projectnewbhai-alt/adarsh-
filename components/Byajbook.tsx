import React, { useState, useMemo, useRef } from 'react';
import { ByajLoan, MortgagedItem } from '../types';
import { ArrowLeftIcon, CameraIcon, DocumentTextIcon, PlusIcon, TrashIcon, UserCircleIcon, UserPlusIcon } from './Icons';
import { useLanguage } from '../contexts/LanguageContext';
import { useGoogleAuth } from '../contexts/GoogleAuthContext';
import { uploadPdfToDrive } from '../utils/googleDrive';
import { registerHindiFont } from '../utils/pdfFonts';

// Let TypeScript know about the global jsPDF object
declare var jspdf: any;

// Helper Functions
const formatCurrency = (num: number) => `₹ ${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const formatDate = (date: Date) => date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

// Prop Interface
interface ByajbookProps {
  loans: ByajLoan[];
  onAddLoan: (loan: Omit<ByajLoan, 'id'>) => void;
}

// State Machine Views
type View = 'LIST' | 'DETAILS' | 'ADD_LOAN';

export const Byajbook: React.FC<ByajbookProps> = ({ loans, onAddLoan }) => {
  const [view, setView] = useState<View>('LIST');
  const [selectedLoanId, setSelectedLoanId] = useState<string | null>(null);

  const selectedLoan = useMemo(() => {
    return loans.find(l => l.id === selectedLoanId) || null;
  }, [selectedLoanId, loans]);

  switch (view) {
    case 'ADD_LOAN':
      return (
        <AddLoanForm 
          onBack={() => setView('LIST')} 
          onSave={(loanData) => {
            onAddLoan(loanData);
            setView('LIST');
          }} 
        />
      );
    case 'DETAILS':
      if (!selectedLoan) return null;
      return <LoanDetails loan={selectedLoan} onBack={() => setView('LIST')} />;
    case 'LIST':
    default:
      return (
        <LoanList
          loans={loans}
          onSelectLoan={(loanId) => {
            setSelectedLoanId(loanId);
            setView('DETAILS');
          }}
          onAddLoan={() => setView('ADD_LOAN')}
        />
      );
  }
};


const LoanList: React.FC<{
  loans: ByajLoan[];
  onSelectLoan: (loanId: string) => void;
  onAddLoan: () => void;
}> = ({ loans, onSelectLoan, onAddLoan }) => {
  const { t } = useLanguage();
  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg relative min-h-[60vh]">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t('loan_accounts')}</h2>
        </div>
        {loans.length > 0 ? (
            <ul>
                {loans.map(loan => (
                    <li key={loan.id} onClick={() => onSelectLoan(loan.id)} className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer">
                        <div className="p-4 flex justify-between items-center">
                            <div>
                                <p className="font-semibold text-slate-900 dark:text-white">{loan.borrower.name}</p>
                                <p className="text-sm text-slate-500 dark:text-slate-400">{formatDate(loan.loanDate)}</p>
                            </div>
                            <div className="text-right">
                                <p className="font-bold text-amber-600 dark:text-amber-400">{formatCurrency(loan.principalAmount)}</p>
                                <p className="text-xs text-slate-500">{loan.interestRate}% {loan.interestRatePeriod === 'MONTHLY' ? t('monthly') : t('annually')}</p>
                            </div>
                        </div>
                    </li>
                ))}
            </ul>
        ) : (
            <div className="text-center py-20 text-slate-500">
                <p>{t('no_active_loans')}</p>
                <p>{t('create_new_loan_agreement')}</p>
            </div>
        )}
        <div className="absolute bottom-6 right-6">
            <button onClick={onAddLoan} className="bg-amber-600 text-white rounded-full p-4 shadow-lg hover:bg-amber-700 transition-transform transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-800 focus:ring-amber-500">
                <UserPlusIcon className="h-8 w-8" />
                <span className="sr-only">{t('add_new_loan')}</span>
            </button>
        </div>
    </div>
  );
};


const LoanDetails: React.FC<{
  loan: ByajLoan;
  onBack: () => void;
}> = ({ loan, onBack }) => {
  const { t, language } = useLanguage();
  const { isAuthenticated, accessToken } = useGoogleAuth();
  const [isProcessingPdf, setIsProcessingPdf] = useState(false);
  const currentDate = new Date();

  const { interest, totalPayable, daysPassed } = useMemo(() => {
    const loanDate = new Date(loan.loanDate);
    if (loan.interestType === 'SIMPLE') {
      const timeDiff = currentDate.getTime() - loanDate.getTime();
      const days = Math.max(0, timeDiff / (1000 * 3600 * 24));
      let interestAmount = 0;
      
      if (loan.interestRatePeriod === 'MONTHLY') {
        const months = days / 30.4375; // Average days in a month
        interestAmount = (loan.principalAmount * loan.interestRate * months) / 100;
      } else { // ANNUAL (default)
        const years = days / 365.25; // Account for leap years
        interestAmount = (loan.principalAmount * loan.interestRate * years) / 100;
      }

      return { 
        interest: interestAmount, 
        totalPayable: loan.principalAmount + interestAmount,
        daysPassed: Math.floor(days)
      };
    }
    // Note: Compound interest calculation is more complex and would be added here
    return { interest: 0, totalPayable: loan.principalAmount, daysPassed: 0 };
  }, [loan, currentDate]);
  
  const handleGeneratePdf = async () => {
    setIsProcessingPdf(true);
    try {
        const { jsPDF } = jspdf;
        const doc = new jsPDF();
        
        if (language === 'hi') {
            registerHindiFont(doc);
        }

        // Header
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        if (language === 'hi') doc.setFont('NotoSansDevanagari');
        doc.text(t('pdf_loan_agreement_title'), 105, 20, null, null, 'center');
        doc.line(14, 28, 196, 28);
        
        // Parties
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        if (language === 'hi') doc.setFont('NotoSansDevanagari');
        const agreementIntro = t('pdf_agreement_intro').replace('{date}', formatDate(new Date()));
        doc.text(agreementIntro, 14, 40);

        doc.setFont('helvetica', 'bold');
        if (language === 'hi') doc.setFont('NotoSansDevanagari');
        doc.text(t('lender'), 14, 50);
        doc.setFont('helvetica', 'normal');
        if (language === 'hi') doc.setFont('NotoSansDevanagari');
        doc.text(t('lender_details'), 28, 55);

        doc.setFont('helvetica', 'bold');
        if (language === 'hi') doc.setFont('NotoSansDevanagari');
        doc.text(t('borrower'), 105, 50);
        doc.setFont('helvetica', 'normal');
        if (language === 'hi') doc.setFont('NotoSansDevanagari');
        let borrowerInfo = `${loan.borrower.name}\n${loan.borrower.address}\n${t('phone_label')} ${loan.borrower.phone}`;
        if(loan.borrower.aadhaarNumber) borrowerInfo += `\n${t('aadhaar_label')} ${loan.borrower.aadhaarNumber}`;
        if(loan.borrower.panNumber) borrowerInfo += `\n${t('pan_label')} ${loan.borrower.panNumber}`;
        doc.text(borrowerInfo, 122, 55);

        if (loan.borrower.photoBase64) {
          doc.addImage(loan.borrower.photoBase64, 'JPEG', 160, 70, 35, 35);
        }
        
        doc.line(14, 110, 196, 110);

        // Loan Terms
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        if (language === 'hi') doc.setFont('NotoSansDevanagari');
        doc.text(t('loan_terms'), 14, 118);
        doc.setFontSize(11);
        
        const ratePeriodText = loan.interestRatePeriod === 'MONTHLY' ? t('per_month') : t('per_year');
        const interestRateValue = `${loan.interestRate}% ${ratePeriodText} (${t('simple_interest')})`;

        const terms = [
        [`${t('principal_amount_label')}`, formatCurrency(loan.principalAmount)],
        [`${t('interest_rate_label')}`, interestRateValue],
        [`${t('loan_date_label')}`, formatDate(loan.loanDate)],
        ];
        terms.forEach(([label, value], index) => {
            doc.setFont('helvetica', 'bold');
            if (language === 'hi') doc.setFont('NotoSansDevanagari');
            doc.text(label, 14, 128 + (index * 7));
            doc.setFont('helvetica', 'normal');
            if (language === 'hi') doc.setFont('NotoSansDevanagari');
            doc.text(value, 60, 128 + (index * 7));
        });
        
        // Mortgaged Items
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        if (language === 'hi') doc.setFont('NotoSansDevanagari');
        doc.text(t('mortgaged_goods_security'), 14, 150);
        
        const tableBody = loan.mortgagedItems.map(item => [
            item.description,
            `${item.weight.toFixed(3)} gm`,
            item.purity,
            formatCurrency(item.estimatedValue)
        ]);

        (doc as any).autoTable({
            head: [[t('desc_col'), t('weight_col'), t('purity_col'), t('est_value_col')]],
            body: tableBody,
            startY: 155,
            headStyles: { fillColor: [251, 191, 36] }, // Amber color
            styles: { font: language === 'hi' ? 'NotoSansDevanagari' : 'helvetica' },
            theme: 'grid',
        });

        let currentY = (doc as any).autoTable.previous.finalY + 10;

        const loanTerms = [
            { title: t('pdf_payment_terms_title'), isHeader: true },
            t('pdf_payment_term_1'),
            t('pdf_payment_term_2'),
            t('pdf_payment_term_3'),
            { title: t('pdf_collateral_terms_title'), isHeader: true },
            t('pdf_collateral_term_1'),
            t('pdf_collateral_term_2'),
            { title: t('pdf_rules_conditions_title'), isHeader: true },
            t('pdf_rules_condition_1'),
            t('pdf_rules_condition_2'),
            t('pdf_rules_condition_3'),
            t('pdf_rules_condition_4'),
            t('pdf_rules_condition_5'),
            t('pdf_rules_condition_6'),
            t('pdf_rules_condition_7'),
        ];

        const checkPageBreak = (y: number, margin = 15) => {
            if (y > 280) {
                doc.addPage();
                return margin;
            }
            return y;
        };
        
        currentY = checkPageBreak(currentY);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        if (language === 'hi') doc.setFont('NotoSansDevanagari');
        doc.text(t('pdf_rules_conditions_title'), 14, currentY);
        currentY += 5;
        
        const maxWidth = 182;

        loanTerms.forEach(term => {
            currentY = checkPageBreak(currentY);
            if (typeof term === 'object' && term.isHeader) {
                currentY += 4;
                doc.setFont('helvetica', 'bold');
                if (language === 'hi') doc.setFont('NotoSansDevanagari');
                doc.setFontSize(10);
                doc.text(term.title, 14, currentY);
                currentY += 5;
            } else if (typeof term === 'string') {
                doc.setFont('helvetica', 'normal');
                if (language === 'hi') doc.setFont('NotoSansDevanagari');
                doc.setFontSize(9);
                const lines = doc.splitTextToSize(term, maxWidth);
                doc.text(lines, 14, currentY);
                currentY += (lines.length * 3.5) + 1.5;
            }
        });

        currentY += 5;
        currentY = checkPageBreak(currentY);
        doc.setFont('helvetica', 'bold');
        if (language === 'hi') doc.setFont('NotoSansDevanagari');
        doc.setFontSize(9);
        const agreementStatement = t('pdf_agreement_statement');
        doc.text(agreementStatement, 14, currentY);
        currentY += 15;
        
        currentY = checkPageBreak(currentY);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        if (language === 'hi') doc.setFont('NotoSansDevanagari');
        doc.text(t('borrower_signature'), 14, currentY);
        doc.line(55, currentY, 100, currentY);
        doc.text(t('lender_signature'), 115, currentY);
        doc.line(150, currentY, 196, currentY);

        const allImages = [
        { title: t('aadhaar_photo'), img: loan.borrower.aadhaarPhotoBase64 },
        { title: t('pan_photo'), img: loan.borrower.panPhotoBase64 },
        ...loan.mortgagedItems.map((item, i) => ({ 
            title: t('attachment_item_title').replace('{index}', String(i + 1)).replace('{description}', item.description), 
            img: item.photoBase64 
        }))
        ].filter(item => !!item.img);

        if (allImages.length > 0) {
        doc.addPage();
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        if (language === 'hi') doc.setFont('NotoSansDevanagari');
        doc.text(t('attached_docs_and_photos'), 105, 15, null, null, 'center');
        let imgY = 25;
        allImages.forEach(({ title, img }) => {
            if(img) {
            imgY = checkPageBreak(imgY, 25);
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            if (language === 'hi') doc.setFont('NotoSansDevanagari');
            doc.text(title, 14, imgY);
            try {
                doc.addImage(img, 'JPEG', 14, imgY + 5, 80, 50);
            } catch (e) {
                console.error("Error adding image to PDF:", e);
                doc.text("Image could not be rendered.", 14, imgY + 10)
            }
            imgY += 65;
            }
        });
        }

        const fileName = `LoanAgreement-${loan.borrower.name}.pdf`;
        
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
        setIsProcessingPdf(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg flex flex-col min-h-[80vh]">
        <header className="flex items-center justify-between p-3 bg-sky-600 dark:bg-sky-800 rounded-t-lg sticky top-0 z-10">
            <div className="flex items-center">
                <button onClick={onBack} className="mr-3 text-white"><ArrowLeftIcon className="h-6 w-6" /></button>
                {loan.borrower.photoBase64 ? 
                  <img src={loan.borrower.photoBase64} alt="Borrower" className="h-10 w-10 rounded-full mr-3 object-cover"/> :
                  <UserCircleIcon className="h-10 w-10 text-sky-100 dark:text-slate-300 mr-3" />
                }
                <div>
                    <h2 className="text-lg font-bold text-white">{loan.borrower.name}</h2>
                    <p className="text-xs text-sky-100 dark:text-slate-300">{loan.borrower.phone}</p>
                </div>
            </div>
            <button onClick={handleGeneratePdf} disabled={isProcessingPdf} className="flex items-center gap-2 bg-white/20 text-white px-3 py-1.5 rounded-md hover:bg-white/30 transition disabled:opacity-50">
                {isProcessingPdf ? (
                    <>
                        <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        <span className="text-sm font-semibold">{t('processing_pdf')}</span>
                    </>
                ) : (
                    <>
                        <DocumentTextIcon className="h-5 w-5"/>
                        <span className="text-sm font-semibold">{t('agreement')}</span>
                    </>
                )}
            </button>
        </header>

        <div className="flex-grow p-4 space-y-4 overflow-y-auto">
            <div className="grid grid-cols-2 gap-4 text-center">
                <div className="bg-slate-100 dark:bg-slate-700/50 p-3 rounded-lg">
                    <p className="text-sm text-slate-500 dark:text-slate-300">{t('principal_amount')}</p>
                    <p className="text-xl font-bold text-slate-900 dark:text-white">{formatCurrency(loan.principalAmount)}</p>
                </div>
                <div className="bg-slate-100 dark:bg-slate-700/50 p-3 rounded-lg">
                    <p className="text-sm text-slate-500 dark:text-slate-300">{t('interest_rate')}</p>
                    <p className="text-xl font-bold text-slate-900 dark:text-white">{loan.interestRate}% <span className="text-sm font-normal">{loan.interestRatePeriod === 'MONTHLY' ? 'p.m.' : 'p.a.'}</span></p>
                </div>
            </div>
             <div className="bg-amber-100 dark:bg-amber-900/40 p-4 rounded-lg text-center">
                <p className="text-sm text-amber-800 dark:text-amber-300">{t('total_payable_as_of_today')} ({daysPassed} {t('days')})</p>
                <p className="text-3xl font-bold text-amber-900 dark:text-white">{formatCurrency(totalPayable)}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t('principal')}: {formatCurrency(loan.principalAmount)} + {t('interest')}: {formatCurrency(interest)}</p>
            </div>
             <div>
                <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-2">{t('id_verification')}</h3>
                <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-md space-y-2">
                    <p><strong>Aadhaar:</strong> {loan.borrower.aadhaarNumber || 'N/A'}</p>
                    <p><strong>PAN:</strong> {loan.borrower.panNumber || 'N/A'}</p>
                    <div className="flex gap-4 pt-2">
                        {loan.borrower.aadhaarPhotoBase64 && <img src={loan.borrower.aadhaarPhotoBase64} alt="Aadhaar" className="h-16 rounded"/>}
                        {loan.borrower.panPhotoBase64 && <img src={loan.borrower.panPhotoBase64} alt="PAN" className="h-16 rounded"/>}
                    </div>
                </div>
            </div>
            <div>
                <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-2">{t('mortgaged_items')}</h3>
                <ul className="space-y-2">
                    {loan.mortgagedItems.map(item => (
                        <li key={item.id} className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-md flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                {item.photoBase64 && <img src={item.photoBase64} alt={item.description} className="h-12 w-12 rounded object-cover"/>}
                                <div>
                                    <p className="font-medium text-slate-800 dark:text-white">{item.description}</p>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">{item.weight.toFixed(3)}g - {item.purity}</p>
                                </div>
                            </div>
                            <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">{formatCurrency(item.estimatedValue)}</p>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    </div>
  );
};

const ImageUpload: React.FC<{
  label: string;
  photoBase64?: string;
  onPhotoChange: (base64?: string) => void;
  className?: string;
}> = ({ label, photoBase64, onPhotoChange, className = '' }) => {
    const { t } = useLanguage();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const handlePhotoCapture = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => onPhotoChange(reader.result as string);
            reader.readAsDataURL(file);
        }
    };
    return (
        <div className={className}>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">{label}</label>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" capture="environment" onChange={handlePhotoCapture} />
            {photoBase64 ? (
                <div className="flex items-center gap-2">
                    <img src={photoBase64} alt="Preview" className="h-16 w-16 rounded-lg object-cover border-2 border-slate-300 dark:border-slate-600"/>
                    <div className="flex flex-col gap-1">
                        <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full text-xs flex items-center justify-center gap-1 bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded-md hover:bg-slate-300 dark:hover:bg-slate-600">{t('retake')}</button>
                        <button type="button" onClick={() => onPhotoChange(undefined)} className="w-full text-xs flex items-center justify-center gap-1 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 px-2 py-1 rounded-md hover:bg-red-200 dark:hover:bg-red-900/60">{t('remove')}</button>
                    </div>
                </div>
            ) : (
                <button type="button" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 bg-slate-200 dark:bg-slate-700 px-3 py-1.5 rounded-md hover:bg-slate-300 dark:hover:bg-slate-600 text-sm">
                    <CameraIcon className="h-4 w-4"/> <span>{t('upload_photo')}</span>
                </button>
            )}
        </div>
    )
}


const AddLoanForm: React.FC<{
  onBack: () => void;
  onSave: (loan: Omit<ByajLoan, 'id'>) => void;
}> = ({ onBack, onSave }) => {
    const { t } = useLanguage();
    const [borrowerName, setBorrowerName] = useState('');
    const [borrowerPhone, setBorrowerPhone] = useState('');
    const [borrowerAddress, setBorrowerAddress] = useState('');
    const [photoBase64, setPhotoBase64] = useState<string | undefined>();
    const [aadhaarNumber, setAadhaarNumber] = useState('');
    const [panNumber, setPanNumber] = useState('');
    const [aadhaarPhotoBase64, setAadhaarPhotoBase64] = useState<string | undefined>();
    const [panPhotoBase64, setPanPhotoBase64] = useState<string | undefined>();

    const [principal, setPrincipal] = useState('');
    const [rate, setRate] = useState('');
    const [ratePeriod, setRatePeriod] = useState<'MONTHLY' | 'ANNUAL'>('MONTHLY');
    const [loanDate, setLoanDate] = useState(new Date().toISOString().split('T')[0]);

    const [items, setItems] = useState<Omit<MortgagedItem, 'id'>[]>([]);
    const [itemDesc, setItemDesc] = useState('');
    const [itemWeight, setItemWeight] = useState('');
    const [itemPurity, setItemPurity] = useState('');
    const [itemValue, setItemValue] = useState('');
    const [itemPhotoBase64, setItemPhotoBase64] = useState<string | undefined>();

    const handleAddItem = () => {
        const weight = parseFloat(itemWeight);
        const value = parseFloat(itemValue);
        if (itemDesc && !isNaN(weight) && weight > 0 && itemPurity && !isNaN(value) && value > 0) {
            setItems([...items, { description: itemDesc, weight, purity: itemPurity, estimatedValue: value, photoBase64: itemPhotoBase64 }]);
            setItemDesc(''); setItemWeight(''); setItemPurity(''); setItemValue(''); setItemPhotoBase64(undefined);
        }
    };
    
    const handleRemoveItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const principalAmount = parseFloat(principal);
        const interestRate = parseFloat(rate);
        if (borrowerName && borrowerPhone && principalAmount > 0 && interestRate > 0 && items.length > 0) {
            onSave({
                borrower: {
                    name: borrowerName,
                    phone: borrowerPhone,
                    address: borrowerAddress,
                    photoBase64: photoBase64,
                    aadhaarNumber: aadhaarNumber,
                    panNumber: panNumber,
                    aadhaarPhotoBase64: aadhaarPhotoBase64,
                    panPhotoBase64: panPhotoBase64,
                },
                principalAmount,
                interestRate,
                interestRatePeriod: ratePeriod,
                loanDate: new Date(loanDate),
                interestType: 'SIMPLE',
                mortgagedItems: items.map(item => ({ ...item, id: Math.random().toString() })),
            });
        } else {
            alert('Please fill all required fields and add at least one mortgaged item.');
        }
    };

    return (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-lg shadow-lg">
             <header className="flex items-center p-4 bg-sky-600 dark:bg-sky-800 rounded-t-lg">
                <button type="button" onClick={onBack} className="mr-4 text-white"><ArrowLeftIcon className="h-6 w-6" /></button>
                <h2 className="text-xl font-bold text-white">{t('create_new_loan')}</h2>
            </header>
            <div className="p-6 space-y-6">
                {/* Borrower Details */}
                <fieldset className="space-y-4 border p-4 rounded-md border-slate-300 dark:border-slate-600">
                    <legend className="text-lg font-bold px-2 text-slate-800 dark:text-slate-200">{t('borrower_details')}</legend>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">{t('full_name')}</label>
                            <input type="text" value={borrowerName} onChange={e => setBorrowerName(e.target.value)} required className="w-full bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white rounded-md p-2 border border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-amber-500"/>
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">{t('phone_number')}</label>
                            <input type="tel" value={borrowerPhone} onChange={e => setBorrowerPhone(e.target.value)} required className="w-full bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white rounded-md p-2 border border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-amber-500"/>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">{t('full_address')}</label>
                        <textarea value={borrowerAddress} onChange={e => setBorrowerAddress(e.target.value)} required className="w-full bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white rounded-md p-2 border border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-amber-500" rows={2}></textarea>
                    </div>
                     <ImageUpload label={t('borrower_photo')} photoBase64={photoBase64} onPhotoChange={setPhotoBase64}/>
                </fieldset>

                {/* ID Verification */}
                <fieldset className="space-y-4 border p-4 rounded-md border-slate-300 dark:border-slate-600">
                    <legend className="text-lg font-bold px-2 text-slate-800 dark:text-slate-200">{t('id_verification')}</legend>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">{t('aadhaar_number')}</label>
                            <input type="text" value={aadhaarNumber} onChange={e => setAadhaarNumber(e.target.value)} className="w-full bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white rounded-md p-2 border border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-amber-500"/>
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">{t('pan_number')}</label>
                            <input type="text" value={panNumber} onChange={e => setPanNumber(e.target.value)} className="w-full bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white rounded-md p-2 border border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-amber-500"/>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <ImageUpload label={t('aadhaar_photo')} photoBase64={aadhaarPhotoBase64} onPhotoChange={setAadhaarPhotoBase64}/>
                        <ImageUpload label={t('pan_photo')} photoBase64={panPhotoBase64} onPhotoChange={setPanPhotoBase64}/>
                    </div>
                </fieldset>


                {/* Loan Terms */}
                 <fieldset className="space-y-4 border p-4 rounded-md border-slate-300 dark:border-slate-600">
                    <legend className="text-lg font-bold px-2 text-slate-800 dark:text-slate-200">{t('loan_terms')}</legend>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">{t('principal')} (₹)</label>
                            <input type="number" value={principal} onChange={e => setPrincipal(e.target.value)} required className="w-full bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white rounded-md p-2 border border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-amber-500"/>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">{t('date')}</label>
                            <input type="date" value={loanDate} onChange={e => setLoanDate(e.target.value)} required className="w-full bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white rounded-md p-2 border border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-amber-500"/>
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">{t('interest_rate')} (%)</label>
                            <input type="number" step="0.01" value={rate} onChange={e => setRate(e.target.value)} required className="w-full bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white rounded-md p-2 border border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-amber-500"/>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">{t('rate_period')}</label>
                            <select value={ratePeriod} onChange={e => setRatePeriod(e.target.value as 'MONTHLY' | 'ANNUAL')} className="w-full bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white rounded-md p-2 border border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-amber-500">
                                <option value="MONTHLY">{t('monthly')}</option>
                                <option value="ANNUAL">{t('annually')}</option>
                            </select>
                        </div>
                    </div>
                </fieldset>

                {/* Mortgaged Items */}
                <fieldset className="border p-4 rounded-md border-slate-300 dark:border-slate-600">
                    <legend className="text-lg font-bold px-2 text-slate-800 dark:text-slate-200">{t('mortgaged_items')}</legend>
                    <ul className="space-y-2 mb-4">
                        {items.map((item, index) => (
                            <li key={index} className="bg-slate-50 dark:bg-slate-900/50 p-2 rounded-md flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                  {item.photoBase64 && <img src={item.photoBase64} alt={item.description} className="h-8 w-8 rounded object-cover"/>}
                                  <span>{item.description} ({item.weight}g) - {formatCurrency(item.estimatedValue)}</span>
                                </div>
                                <button type="button" onClick={() => handleRemoveItem(index)} className="text-red-500"><TrashIcon className="h-4 w-4"/></button>
                            </li>
                        ))}
                    </ul>
                    <div className="space-y-3 bg-slate-100 dark:bg-slate-700/50 p-3 rounded-md">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <input value={itemDesc} onChange={e => setItemDesc(e.target.value)} placeholder={t('item_description')} className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded p-2 text-sm border border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-amber-500" />
                            <input value={itemPurity} onChange={e => setItemPurity(e.target.value)} placeholder="Purity (e.g., 22K)" className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded p-2 text-sm border border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-amber-500" />
                        </div>
                         <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <input value={itemWeight} onChange={e => setItemWeight(e.target.value)} type="number" placeholder="Weight (g)" className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded p-2 text-sm border border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-amber-500" />
                            <input value={itemValue} onChange={e => setItemValue(e.target.value)} type="number" placeholder="Value (₹)" className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded p-2 text-sm border border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-amber-500" />
                            <ImageUpload label={t('item_photo')} photoBase64={itemPhotoBase64} onPhotoChange={setItemPhotoBase64} className="self-center"/>
                        </div>
                    </div>
                    <button type="button" onClick={handleAddItem} className="mt-3 w-full bg-sky-600 text-white font-semibold py-2 rounded-md hover:bg-sky-700">{items.length > 0 ? t('add_another_item') : t('add_item')}</button>
                </fieldset>

                <button type="submit" className="w-full bg-green-600 text-white font-bold py-3 px-4 rounded-md hover:bg-green-700 transition">{t('save_loan_agreement')}</button>
            </div>
        </form>
    );
};