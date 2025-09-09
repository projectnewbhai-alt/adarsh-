import React, { useState } from 'react';
import { InvoiceItem, MetalType, MakingChargeType } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface BillingFormProps {
  onAddItem: (item: InvoiceItem) => void;
}

export const BillingForm: React.FC<BillingFormProps> = ({ onAddItem }) => {
  const { t } = useLanguage();
  const [description, setDescription] = useState('');
  const [metal, setMetal] = useState<MetalType>(MetalType.GOLD);
  const [grossWeight, setGrossWeight] = useState('');
  const [netWeight, setNetWeight] = useState('');
  const [makingChargeType, setMakingChargeType] = useState<MakingChargeType>(MakingChargeType.PER_GRAM);
  const [makingChargeValue, setMakingChargeValue] = useState('');
  const [applyGst, setApplyGst] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const gw = parseFloat(grossWeight);
    const nw = parseFloat(netWeight);
    const mcv = parseFloat(makingChargeValue);

    if (!description.trim() || isNaN(gw) || isNaN(nw) || isNaN(mcv) || gw <= 0 || nw <= 0 || mcv < 0) {
      setError(t('please_fill_valid_values'));
      return;
    }
    if (nw > gw) {
      setError(t('net_weight_error'));
      return;
    }

    setError(null);
    onAddItem({
      id: new Date().toISOString(),
      description,
      metal,
      grossWeight: gw,
      netWeight: nw,
      makingChargeType,
      makingChargeValue: mcv,
      applyGst,
    });

    // Reset form
    setDescription('');
    setGrossWeight('');
    setNetWeight('');
    setMakingChargeValue('');
    setApplyGst(true);
  };

  return (
    <div className="p-6 bg-white dark:bg-slate-800 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 border-b border-slate-200 dark:border-slate-700 pb-2">{t('add_new_item')}</h2>
      {error && <div className="bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300 p-3 rounded-md mb-4">{error}</div>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">{t('item_description')}</label>
          <input type="text" id="description" value={description} onChange={e => setDescription(e.target.value)} className="w-full bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white rounded-md border border-slate-300 dark:border-slate-600 px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:border-amber-500" placeholder="e.g., Gold Ring 22K" />
        </div>
        <div>
          <label htmlFor="metal" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">{t('metal')}</label>
          <select id="metal" value={metal} onChange={e => setMetal(e.target.value as MetalType)} className="w-full bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white rounded-md border border-slate-300 dark:border-slate-600 px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:border-amber-500">
            <option value={MetalType.GOLD}>{t('gold')}</option>
            <option value={MetalType.SILVER}>{t('silver')}</option>
          </select>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="grossWeight" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">{t('gross_wt')}</label>
            <input type="number" step="0.001" id="grossWeight" value={grossWeight} onChange={e => setGrossWeight(e.target.value)} className="w-full bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white rounded-md border border-slate-300 dark:border-slate-600 px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:border-amber-500" placeholder="e.g., 10.500" />
          </div>
          <div>
            <label htmlFor="netWeight" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">{t('net_wt')}</label>
            <input type="number" step="0.001" id="netWeight" value={netWeight} onChange={e => setNetWeight(e.target.value)} className="w-full bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white rounded-md border border-slate-300 dark:border-slate-600 px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:border-amber-500" placeholder="e.g., 10.250" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">{t('making_charges')}</label>
          <div className="flex gap-4 items-center">
            <div className="flex items-center">
              <input id="perGram" name="makingChargeType" type="radio" value={MakingChargeType.PER_GRAM} checked={makingChargeType === MakingChargeType.PER_GRAM} onChange={() => setMakingChargeType(MakingChargeType.PER_GRAM)} className="h-4 w-4 text-amber-600 bg-slate-100 border-slate-300 dark:bg-slate-700 dark:border-slate-500 focus:ring-amber-500" />
              <label htmlFor="perGram" className="ml-2 block text-sm text-slate-700 dark:text-slate-200">{t('per_gram')}</label>
            </div>
            <div className="flex items-center">
              <input id="flat" name="makingChargeType" type="radio" value={MakingChargeType.FLAT} checked={makingChargeType === MakingChargeType.FLAT} onChange={() => setMakingChargeType(MakingChargeType.FLAT)} className="h-4 w-4 text-amber-600 bg-slate-100 border-slate-300 dark:bg-slate-700 dark:border-slate-500 focus:ring-amber-500" />
              <label htmlFor="flat" className="ml-2 block text-sm text-slate-700 dark:text-slate-200">{t('flat_amount')}</label>
            </div>
          </div>
        </div>
        <div>
          <label htmlFor="makingChargeValue" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">
            {makingChargeType === MakingChargeType.PER_GRAM ? t('charge_per_gram') : t('flat_charge_amount')}
          </label>
          <input type="number" step="0.01" id="makingChargeValue" value={makingChargeValue} onChange={e => setMakingChargeValue(e.target.value)} className="w-full bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white rounded-md border border-slate-300 dark:border-slate-600 px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:border-amber-500" placeholder="e.g., 500" />
        </div>
         <div className="flex items-center pt-2">
          <input 
            id="applyGst" 
            type="checkbox" 
            checked={applyGst} 
            onChange={e => setApplyGst(e.target.checked)} 
            className="h-4 w-4 text-amber-600 bg-slate-100 border-slate-300 dark:bg-slate-700 dark:border-slate-500 focus:ring-amber-500 rounded" 
          />
          <label htmlFor="applyGst" className="ml-2 block text-sm text-slate-700 dark:text-slate-200">{t('apply_gst')}</label>
        </div>
        <button type="submit" className="w-full bg-amber-600 text-white font-bold py-2 px-4 rounded-md hover:bg-amber-700 transition duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-800 focus:ring-amber-500">
          {t('add_item_to_bill')}
        </button>
      </form>
    </div>
  );
};
