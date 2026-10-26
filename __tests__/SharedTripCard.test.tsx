import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { SharedTripCard } from '../src/components/ticket/SharedTripCard';
import { HomeScreen } from '../src/screens/HomeScreen';
import { NormalizedTicket } from '../src/types/ticket';

jest.mock('../src/services/railService', () => ({
  getLiveTrainStatus: jest.fn().mockResolvedValue({
    trainNumber: '12951',
    trainName: 'Mumbai Rajdhani Express',
    status: 'running',
    delayMinutes: 0,
    nextHalt: {
      stationCode: 'ANG',
      stationName: 'Ahmednagar Jn',
      sequence: 3,
      distance: 120,
      arrivalTime: '08:32 AM',
      platform: '1',
    },
    route: [
      { status: 'departed' },
      { status: 'departed' },
      { status: 'upcoming' },
      { status: 'upcoming' },
    ],
  }),
  formatHaltTime: jest.fn((t) => t || '--:--'),
}));

const mockSharedTicketWithSeat: NormalizedTicket = {
  id: 'shared_12951_1729000000000',
  source: 'SHARED_LINK',
  pnr: 'SHARED-12951',
  train: {
    number: '12951',
    name: 'Mumbai Rajdhani Express',
    type: 'SUPERFAST',
  },
  journey: {
    from: 'BCT',
    fromName: 'Mumbai Central',
    to: 'NDLS',
    toName: 'New Delhi',
    date: '28 Oct 2026',
    departure: '05:00 PM',
    arrival: '08:32 AM',
  },
  passenger: {
    name: 'Passenger',
    coach: 'B3',
    seat: '45',
    class: '3A',
    bookingStatus: 'CONFIRMED',
  },
  status: 'CONFIRMED',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  isUpcoming: true,
};

const mockSharedTicketPrivate: NormalizedTicket = {
  id: 'shared_12951_1729000000001',
  source: 'SHARED_LINK',
  pnr: 'SHARED-12951',
  train: {
    number: '12951',
    name: 'Mumbai Rajdhani Express',
    type: 'SUPERFAST',
  },
  journey: {
    from: 'BCT',
    fromName: 'Mumbai Central',
    to: 'NDLS',
    toName: 'New Delhi',
    date: '28 Oct 2026',
    departure: '05:00 PM',
    arrival: '08:32 AM',
  },
  passenger: {
    name: 'Passenger',
    coach: 'B1',
    seat: '1',
    class: '3A',
    bookingStatus: 'CONFIRMED',
  },
  status: 'CONFIRMED',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  isUpcoming: true,
};

describe('SharedTripCard Component', () => {
  it('renders shared trip card formatted as an authentic ticket pass', async () => {
    let root: any;
    await act(async () => {
      root = ReactTestRenderer.create(
        <SharedTripCard
          ticket={mockSharedTicketWithSeat}
          onTrackLive={jest.fn()}
          onShare={jest.fn()}
        />
      );
    });

    const json = JSON.stringify(root.toJSON());
    expect(json).toContain('SHARED');
    expect(json).toContain('Mumbai Rajdhani Express');
    expect(json).toContain('BCT');
    expect(json).toContain('NDLS');
    expect(json).toContain('B3 · 45');
    expect(json).toContain('Track Live');
  });

  it('renders PROTECTED in berth column when coach & seat were hidden for privacy', async () => {
    let root: any;
    await act(async () => {
      root = ReactTestRenderer.create(
        <SharedTripCard
          ticket={mockSharedTicketPrivate}
          onTrackLive={jest.fn()}
          onShare={jest.fn()}
        />
      );
    });

    const json = JSON.stringify(root.toJSON());
    expect(json).toContain('PROTECTED');
  });

  it('renders SharedTripCard in HomeScreen matching ticket style', async () => {
    let root: any;
    await act(async () => {
      root = ReactTestRenderer.create(
        <HomeScreen
          tickets={[mockSharedTicketWithSeat]}
          onSelectTicket={jest.fn()}
          onTrackSharedTrip={jest.fn()}
          onNavigateAdd={jest.fn()}
          onOpenSettings={jest.fn()}
        />
      );
    });

    const json = JSON.stringify(root.toJSON());
    expect(json).toContain('SHARED');
    expect(json).toContain('Track Live');
  });
});
