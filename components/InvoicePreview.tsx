import React, { useEffect, useState } from 'react';
import { InvoiceItem, Customer, Rates, MetalType, MakingChargeType } from '../types';
import { TrashIcon, PrintIcon } from './Icons';
import { useLanguage } from '../contexts/LanguageContext';

// Let TypeScript know that QRCode will be available on the window object
declare var QRCode: any;

interface InvoicePreviewProps {
  customer: Customer;
  onCustomerChange: (field: keyof Customer, value: string) => void;
  items: InvoiceItem[];
  rates: Rates;
  onRemoveItem: (id: string) => void;
  onClearInvoice: () => void;
  gstRate: number;
  invoiceNumber: number;
}

export const InvoicePreview: React.FC<InvoicePreviewProps> = ({ customer, onCustomerChange, items, rates, onRemoveItem, onClearInvoice, gstRate, invoiceNumber }) => {
  const { t } = useLanguage();
  const [discountType, setDiscountType] = useState<'PERCENT' | 'FIXED'>('PERCENT');
  const [discountValue, setDiscountValue] = useState<string>('');

  const calculations = items.map(item => {
    const rate = rates[item.metal];
    const metalValue = item.netWeight * rate;
    const makingCharges = item.makingChargeType === MakingChargeType.PER_GRAM
      ? item.makingChargeValue * item.grossWeight
      : item.makingChargeValue;
    const valueBeforeGst = metalValue + makingCharges;
    const itemGstAmount = item.applyGst ? valueBeforeGst * (gstRate / 100) : 0;
    const totalValue = valueBeforeGst + itemGstAmount;
    return { ...item, rate, metalValue, makingCharges, valueBeforeGst, itemGstAmount, totalValue };
  });

  const subTotal = calculations.reduce((acc, item) => acc + item.valueBeforeGst, 0);
  const gstAmount = calculations.reduce((acc, item) => acc + item.itemGstAmount, 0);
  const totalBeforeDiscount = subTotal + gstAmount;

  let discountAmount = 0;
  const numericDiscountValue = parseFloat(discountValue) || 0;
  if (numericDiscountValue > 0) {
    if (discountType === 'PERCENT') {
      discountAmount = totalBeforeDiscount * (numericDiscountValue / 100);
    } else { // FIXED
      discountAmount = numericDiscountValue;
    }
  }

  // Ensure discount doesn't exceed the total
  if (discountAmount > totalBeforeDiscount) {
    discountAmount = totalBeforeDiscount;
  }

  const grandTotal = totalBeforeDiscount - discountAmount;

  useEffect(() => {
    const qrCodeContainer = document.getElementById('qrcode-container');
    if (qrCodeContainer && grandTotal > 0) {
      qrCodeContainer.innerHTML = ''; // Clear previous QR code
      
      const upiId = '8858874858@paytm'; 
      const payeeName = 'Aman Jewellers';
      const transactionNote = `INV-${String(invoiceNumber).padStart(3, '0')}`;

      const upiUrl = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(payeeName)}&am=${grandTotal.toFixed(2)}&cu=INR&tn=${encodeURIComponent(transactionNote)}`;
      
      new QRCode(qrCodeContainer, {
        text: upiUrl,
        width: 128,
        height: 128,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
      });
    } else if (qrCodeContainer) {
      qrCodeContainer.innerHTML = ''; // Clear QR if total is zero or negative
    }
  }, [grandTotal, invoiceNumber]);

  const handleClear = () => {
    onClearInvoice();
    setDiscountValue('');
    setDiscountType('PERCENT');
  };

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    });
  };

  return (
    <div className="bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg shadow-lg relative print-container" id="invoice-preview">
      <div className="p-6">
        <div className="flex justify-between items-start mb-6 no-print">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{t('invoice_preview')}</h2>
          <div className="flex gap-2">
            <button
              onClick={() => window.print()}
              disabled={items.length === 0}
              className="bg-sky-600 text-white px-4 py-2 rounded-md hover:bg-sky-700 transition duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-800 focus:ring-sky-500"
            >
              <PrintIcon className="h-5 w-5" />
              <span>{t('print')}</span>
            </button>
            <button
              onClick={handleClear}
              className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-800 focus:ring-red-500"
            >
              <span>{t('clear')}</span>
            </button>
          </div>
        </div>
        <div className="border-b border-slate-200 dark:border-slate-700 pb-6">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-xl font-bold text-amber-500 dark:text-amber-400">{t('aman_jewellers')}</h3>
              <p className="text-xs">{t('shop_address_phone')}</p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-slate-900 dark:text-white">{t('invoice_no')} <span className="font-normal">{String(invoiceNumber).padStart(3, '0')}</span></p>
              <p className="font-semibold text-slate-900 dark:text-white">{t('date')} <span className="font-normal">{new Date().toLocaleDateString('en-GB')}</span></p>
            </div>
          </div>
        </div>
        <div className="py-6">
          <h4 className="font-semibold text-slate-500 dark:text-slate-400 mb-2">{t('billed_to')}</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 no-print">
            <div>
              <label htmlFor="customerName" className="block text-xs font-medium text-slate-500 mb-1">{t('customer_name')}</label>
              <input type="text" id="customerName" value={customer.name} onChange={e => onCustomerChange('name', e.target.value)} className="w-full bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white rounded-md border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:ring-1 focus:ring-amber-500"/>
            </div>
            <div>
              <label htmlFor="customerPhone" className="block text-xs font-medium text-slate-500 mb-1">{t('phone_number')}</label>
              <input type="tel" id="customerPhone" value={customer.phone} onChange={e => onCustomerChange('phone', e.target.value)} className="w-full bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white rounded-md border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:ring-1 focus:ring-amber-500"/>
            </div>
          </div>
          <div className="pt-2 print-customer-details">
            <p className="font-bold text-slate-800 dark:text-slate-200">{customer.name || 'N/A'}</p>
            <p className="text-sm">{t('phone')} {customer.phone || 'N/A'}</p>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="text-center py-12 border-t border-slate-200 dark:border-slate-700">
            <p className="text-slate-500">{t('no_items_added')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 dark:bg-slate-700 text-xs text-slate-500 dark:text-slate-300 uppercase">
                <tr>
                  <th scope="col" className="px-4 py-2">{t('item')}</th>
                  <th scope="col" className="px-4 py-2 text-right">{t('rate')}</th>
                  <th scope="col" className="px-4 py-2 text-right">{t('m_chg')}</th>
                  <th scope="col" className="px-4 py-2 text-right">{t('taxable_amt')}</th>
                  <th scope="col" className="px-4 py-2 text-right">{t('gst')}</th>
                  <th scope="col" className="px-4 py-2 text-right">{t('total')}</th>
                  <th scope="col" className="px-1 py-2 text-right no-print"></th>
                </tr>
              </thead>
              <tbody>
                {calculations.map(item => (
                  <tr key={item.id} className="border-b dark:border-slate-700">
                    <td className="px-4 py-2 font-medium text-slate-900 dark:text-white whitespace-nowrap">{item.description} <span className="text-xs text-slate-500">({item.netWeight.toFixed(3)}g)</span></td>
                    <td className="px-4 py-2 text-right">{formatCurrency(item.rate)}</td>
                    <td className="px-4 py-2 text-right">{formatCurrency(item.makingCharges)}</td>
                    <td className="px-4 py-2 text-right">{formatCurrency(item.valueBeforeGst)}</td>
                    <td className="px-4 py-2 text-right">{formatCurrency(item.itemGstAmount)}</td>
                    <td className="px-4 py-2 text-right font-semibold">{formatCurrency(item.totalValue)}</td>
                    <td className="px-1 py-2 text-right no-print">
                      <button onClick={() => onRemoveItem(item.id)} className="text-red-500 hover:text-red-700 p-1"><TrashIcon className="h-4 w-4" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {items.length > 0 && (
          <div className="mt-6 border-t border-slate-200 dark:border-slate-700 pt-4">
            <div className="flex justify-between items-start">
              {/* QR Code Section */}
              <div className="text-center">
                <div id="qrcode-container" className="p-1 bg-white inline-block border border-slate-200 dark:border-slate-600 rounded"></div>
                <p className="font-semibold text-sm mt-2">{t('scan_to_pay')}</p>
              </div>
              
              {/* Totals Section */}
              <div className="w-full max-w-sm">
                <div className="flex justify-between py-1">
                  <span className="font-medium">{t('subtotal')}</span>
                  <span>{formatCurrency(subTotal)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="font-medium">{t('total_gst')} ({gstRate}%)</span>
                  <span>{formatCurrency(gstAmount)}</span>
                </div>
                
                <div className="border-t border-slate-200 dark:border-slate-700 my-2"></div>

                <div className="flex justify-between items-center py-1 mb-2 no-print">
                    <label className="text-sm font-medium">{t('apply_discount')}</label>
                    <div className="flex w-1/2">
                        <input 
                            type="number" 
                            value={discountValue}
                            onChange={e => setDiscountValue(e.target.value)}
                            className="w-full bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white rounded-l-md border border-slate-300 dark:border-slate-600 px-2 py-1 text-sm focus:ring-1 focus:ring-amber-500"
                        />
                        <select 
                            value={discountType}
                            onChange={e => setDiscountType(e.target.value as 'PERCENT' | 'FIXED')}
                            className="bg-slate-200 dark:bg-slate-600 border-t border-b border-r border-slate-300 dark:border-slate-600 rounded-r-md px-1 text-xs focus:ring-1 focus:ring-amber-500"
                        >
                            <option value="PERCENT">%</option>
                            <option value="FIXED">₹</option>
                        </select>
                    </div>
                </div>
                {discountAmount > 0 && (
                    <div className="flex justify-between py-1 text-red-600 dark:text-red-400">
                        <span className="font-medium">{t('discount')}</span>
                        <span>- {formatCurrency(discountAmount)}</span>
                    </div>
                )}
                
                <div className="flex justify-between py-2 text-xl font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-700/50 -mx-4 px-4 rounded-b-lg">
                  <span className="">{t('grand_total')}</span>
                  <span>{formatCurrency(grandTotal)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
