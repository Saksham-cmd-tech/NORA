import { NormalizedTicket } from '../types/ticket';

export const PRIMARY_MOCK_TICKET: NormalizedTicket = {
  id: 'ticket_active_1',
  source: 'IRCTC',
  bookingId: 'VC360111245',
  pnr: '8354766445',
  train: {
    number: '26101',
    name: 'Ajni Vande Bharat',
    type: 'RAPID EXPRESS',
  },
  journey: {
    from: 'PUNE',
    fromName: 'Pune Junction',
    to: 'BD',
    toName: 'Badnera Jn',
    date: '08 Oct 2026',
    departure: '06:25 AM',
    boardingStation: 'PUNE',
  },
  passenger: {
    name: 'Rahul Sharma',
    coach: 'C5',
    seat: '64',
    class: 'CC',
    className: 'CC Chair Car',
    bookingStatus: 'CONFIRMED',
  },
  fare: {
    base: 1800,
    convenienceFee: 35,
    otherCharges: 0,
    total: 1835,
  },
  status: 'CONFIRMED',
  createdAt: '2026-10-07T09:12:38Z',
  updatedAt: '2026-10-07T09:12:38Z',
  isUpcoming: true,
};

export const SECONDARY_TEST_TICKET: NormalizedTicket = {
  id: 'ticket_test_2',
  source: 'IRCTC',
  bookingId: 'IR8354766446',
  pnr: '8354766446',
  train: {
    number: '26203',
    name: 'Ajni Vande Bharat',
    type: 'SUPERFAST 26203',
  },
  journey: {
    from: 'PUNE',
    fromName: 'Pune Junction',
    to: 'BD',
    toName: 'Badnera Jn',
    date: '09 Oct 2026',
    departure: '06:25 AM',
    boardingStation: 'PUNE',
  },
  passenger: {
    name: 'Rahul Sharma',
    coach: 'C3',
    seat: '42',
    class: 'CC',
    className: 'CC Chair Car',
    bookingStatus: 'CONFIRMED',
  },
  fare: {
    base: 1800,
    convenienceFee: 35,
    total: 1835,
  },
  status: 'CONFIRMED',
  createdAt: '2026-10-07T10:00:00Z',
  updatedAt: '2026-10-07T10:00:00Z',
  isUpcoming: true,
};

export const PAST_MOCK_JOURNEYS: NormalizedTicket[] = [];
