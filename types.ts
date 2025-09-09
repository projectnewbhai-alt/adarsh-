export enum MetalType {
  GOLD = 'GOLD',
  SILVER = 'SILVER',
}

export enum MakingChargeType {
  PER_GRAM = 'PER_GRAM',
  FLAT = 'FLAT',
}

export interface InvoiceItem {
  id: string;
  description: string;
  metal: MetalType;
  grossWeight: number;
  netWeight: number;
  makingChargeType: MakingChargeType;
  makingChargeValue: number;
  applyGst: boolean;
}

export interface Rates {
  [MetalType.GOLD]: number;
  [MetalType.SILVER]: number;
}

export interface Customer {
  name: string;
  phone: string;
}

export interface Party {
  id: string; // Using phone number as the unique ID
  name: string;
  phone: string;
  type: 'CUSTOMER' | 'SUPPLIER';
}

export interface KhataTransaction {
  id: string;
  date: Date;
  partyId: string; // The phone number (ID) of the party
  description: string;
  type: 'CREDIT' | 'DEBIT';
  amount: number;
}

export interface MortgagedItem {
  id: string;
  description: string;
  weight: number;
  purity: string;
  estimatedValue: number;
  photoBase64?: string;
}

export interface ByajLoan {
  id: string;
  borrower: {
    name: string;
    phone: string;
    address: string;
    photoBase64?: string;
    aadhaarNumber?: string;
    panNumber?: string;
    aadhaarPhotoBase64?: string;
    panPhotoBase64?: string;
  };
  principalAmount: number;
  interestRate: number; // The percentage rate
  interestRatePeriod: 'MONTHLY' | 'ANNUAL'; // The period for the rate
  interestType: 'SIMPLE' | 'COMPOUND';
  loanDate: Date;
  mortgagedItems: MortgagedItem[];
}

export interface GoogleUser {
  name: string;
  email: string;
  picture: string;
}