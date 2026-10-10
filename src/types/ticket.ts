export type TicketSource = 'IRCTC' | 'redRail' | 'MANUAL';
export type TicketStatus = 'CONFIRMED' | 'RAC' | 'WAITLISTED' | 'COMPLETED' | 'CANCELLED';

export interface TrainInfo {
  number: string;
  name: string;
  type?: string; // e.g. "RAPID EXPRESS", "SUPERFAST"
}

export interface JourneyInfo {
  from: string; // Station code, e.g. "PUNE"
  fromName?: string; // Station name, e.g. "Pune Junction"
  to: string; // Station code, e.g. "BD"
  toName?: string; // Station name, e.g. "Badnera Jn"
  date: string; // e.g. "08 Oct 2026"
  departure?: string; // e.g. "06:25 AM"
  arrival?: string; // e.g. "03:40 PM"
  duration?: string; // e.g. "09H 15M"
  boardingStation?: string; // e.g. "PUNE"
}

export interface PassengerInfo {
  name: string;
  coach?: string; // e.g. "C5"
  seat?: string; // e.g. "64"
  class?: string; // e.g. "CC", "EC", "2A", "3A", "SL"
  className?: string; // e.g. "CC Chair Car"
  bookingStatus?: string; // e.g. "CONFIRMED"
}

export interface FareInfo {
  base?: number;
  convenienceFee?: number;
  otherCharges?: number;
  total?: number; // e.g. 1835
}

export interface NormalizedTicket {
  id: string;
  source: TicketSource;
  bookingId?: string;
  pnr: string;
  train: TrainInfo;
  journey: JourneyInfo;
  passenger: PassengerInfo;
  fare?: FareInfo;
  status: TicketStatus;
  rawMessage?: string;
  createdAt: string;
  updatedAt: string;
  isUpcoming?: boolean;
}

export type ScreenName = 'Onboarding' | 'Home' | 'TicketDetails' | 'TrainStatus' | 'AddTicket' | 'VerifyDetails' | 'Settings';
