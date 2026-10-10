import { STATIONS_MAP } from './stationsData';

// Popular Indian Railways Trains mapping
export const TRAIN_NAMES_MAP: Record<string, string> = {
  '11030': 'Koyna Express',
  '11029': 'Koyna Express',
  '17411': 'Mahalaxmi Express',
  '17412': 'Mahalaxmi Express',
  '26101': 'Ajni Vande Bharat Express',
  '26102': 'Ajni Vande Bharat Express',
  '22139': 'Ajni Humsafar Express',
  '22140': 'Ajni Humsafar Express',
  '12123': 'Deccan Queen Express',
  '12124': 'Deccan Queen Express',
  '12125': 'Pragati Express',
  '12126': 'Pragati Express',
  '12127': 'Mumbai Pune Intercity',
  '12128': 'Mumbai Pune Intercity',
  '12111': 'CSMT Amravati Superfast',
  '12112': 'CSMT Amravati Superfast',
  '12105': 'Vidarbha Superfast Express',
  '12106': 'Vidarbha Superfast Express',
  '12051': 'Jan Shatabdi Express',
  '12052': 'Jan Shatabdi Express',
  '22221': 'CSMT NZM Rajdhani Express',
  '22222': 'CSMT NZM Rajdhani Express',
  '22223': 'Sainagar Shirdi Vande Bharat',
  '22224': 'Sainagar Shirdi Vande Bharat',
  '22225': 'Solapur CSMT Vande Bharat',
  '22226': 'Solapur CSMT Vande Bharat',
  '11039': 'Maharashtra Express',
  '11040': 'Maharashtra Express',
  '11005': 'Chalukya Express',
  '11006': 'Chalukya Express',
  '11041': 'CSMT Sainagar Shirdi Express',
  '11042': 'Sainagar Shirdi CSMT Express',
  '12137': 'Punjab Mail',
  '12138': 'Punjab Mail',
  '12289': 'CSMT NGP Duronto Express',
  '12290': 'NGP CSMT Duronto Express',
  '16507': 'Jodhpur Express',
  '16508': 'Jodhpur Express',
  '12779': 'Goa Express',
  '12780': 'Goa Express',
  '12626': 'Kerala Express',
  '12625': 'Kerala Express',
  '12420': 'Gomti Express',
  '12419': 'Gomti Express',
};

export function getStationName(code?: string): string {
  if (!code) return '';
  const upper = code.trim().toUpperCase();
  return STATIONS_MAP[upper] || `${upper} Station`;
}

export function getTrainName(trainNumber?: string): string {
  if (!trainNumber) return '';
  const trimmed = trainNumber.trim();
  return TRAIN_NAMES_MAP[trimmed] || '';
}

export function registerTrainName(trainNumber?: string, trainName?: string): void {
  if (!trainNumber || !trainName) return;
  const trimmedNum = trainNumber.trim();
  const trimmedName = trainName.trim();
  if (trimmedNum && trimmedName) {
    TRAIN_NAMES_MAP[trimmedNum] = trimmedName;
  }
}
