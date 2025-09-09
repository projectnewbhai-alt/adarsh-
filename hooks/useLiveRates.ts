import { useState, useEffect, useCallback } from 'react';
import { Rates, MetalType } from '../types';

const API_URL = 'https://script.google.com/macros/s/AKfycbzrmua76hRwBTRoDmFMG0L66QAnN6px6cT86EHaE-qDrXDNg8mC7Ba06agSIXsc4uLq/exec';

export const useLiveRates = () => {
  const [rates, setRates] = useState<Rates | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRates = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(API_URL);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();

      if (!Array.isArray(data)) {
        console.error("Invalid data format received (expected an array):", JSON.stringify(data, null, 2));
        throw new Error('Invalid data format from API');
      }

      const goldData = data.find(item => item && typeof item.Item === 'string' && item.Item.toLowerCase().includes('gold'));
      const silverData = data.find(item => item && typeof item.Item === 'string' && item.Item.toLowerCase().includes('silver'));

      let goldRatePerGram = NaN;
      let silverRatePerGram = NaN;

      if (goldData && goldData.Rate) {
        // The API returns the gold rate for 10g, so we divide by 10 for the per-gram rate.
        goldRatePerGram = parseFloat(goldData.Rate) / 10;
      }
      
      if (silverData && silverData.Rate) {
        // The API returns the silver rate for 1kg, so we divide by 1000 for the per-gram rate.
        silverRatePerGram = parseFloat(silverData.Rate) / 1000;
      }

      if (!isNaN(goldRatePerGram) && !isNaN(silverRatePerGram)) {
        setRates({
          [MetalType.GOLD]: goldRatePerGram,
          [MetalType.SILVER]: silverRatePerGram,
        });
      } else {
        console.error("Invalid data format received:", JSON.stringify(data, null, 2));
        throw new Error('Invalid data format from API');
      }

    } catch (e) {
      if (e instanceof Error) {
        setError(e.message);
      } else {
        setError('An unknown error occurred');
      }
      console.error("Failed to fetch rates:", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { rates, isLoading, error, refetchRates: fetchRates };
};
