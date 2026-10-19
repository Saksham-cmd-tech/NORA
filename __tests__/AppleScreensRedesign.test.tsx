import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { HomeScreen } from '../src/screens/HomeScreen';
import { AddTicketScreen } from '../src/screens/AddTicketScreen';
import { SettingsScreen } from '../src/screens/SettingsScreen';
import { TicketDetailsScreen } from '../src/screens/TicketDetailsScreen';
import { TicketCard } from '../src/components/ticket/TicketCard';
import { NormalizedTicket } from '../src/types/ticket';

const mockTicket: NormalizedTicket = {
  id: 'ticket_1234567890',
  source: 'MANUAL',
  pnr: '1234567890',
  train: {
    number: '26101',
    name: 'Ajni Vande Bharat Express',
    type: 'SUPERFAST',
  },
  journey: {
    from: 'PUNE',
    fromName: 'Pune Junction',
    to: 'BD',
    toName: 'Badnera Jn',
    date: '28 Oct 2026',
    departure: '06:25 AM',
    arrival: '03:40 PM',
  },
  passenger: {
    name: 'Saksham',
    coach: 'C5',
    seat: '64',
    class: 'CC',
    className: 'CC Chair Car',
    bookingStatus: 'CONFIRMED',
  },
  status: 'CONFIRMED',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  isUpcoming: true,
};

describe('Apple-Inspired Screens Redesign', () => {
  describe('HomeScreen', () => {
    it('renders Apple Wallet style header and ticket card when tickets exist', async () => {
      let root: any;
      await act(async () => {
        root = ReactTestRenderer.create(
          <HomeScreen
            tickets={[mockTicket]}
            onSelectTicket={jest.fn()}
            onNavigateAdd={jest.fn()}
            onOpenSettings={jest.fn()}
            onRefreshTickets={jest.fn()}
          />
        );
      });

      const textNodes = root.root.findAllByType('Text');
      const textStrings = textNodes.map((n: any) => n.props.children).flat();

      // Wallet title exists
      expect(textStrings).toContain('Wallet');
      // Station codes exist
      expect(textStrings).toContain('PUNE');
      expect(textStrings).toContain('BD');
    });

    it('renders clean Apple Wallet empty state when no tickets exist', async () => {
      let root: any;
      await act(async () => {
        root = ReactTestRenderer.create(
          <HomeScreen
            tickets={[]}
            onSelectTicket={jest.fn()}
            onNavigateAdd={jest.fn()}
            onOpenSettings={jest.fn()}
          />
        );
      });

      const textNodes = root.root.findAllByType('Text');
      const textStrings = textNodes.map((n: any) => n.props.children).flat();

      expect(textStrings).toContain('No Upcoming Journeys');
      expect(textStrings).toContain('Add Ticket');
      // Confirms auto-detection and SMS clutter is not present
      expect(textStrings).not.toContain('CHECK COPIED TICKET');
      expect(textStrings).not.toContain('DIGITAL WALLET READY');
    });
  });

  describe('AddTicketScreen', () => {
    it('renders manual form without any auto-detection mechanisms', async () => {
      let root: any;
      await act(async () => {
        root = ReactTestRenderer.create(
          <AddTicketScreen
            onBack={jest.fn()}
            onProceedToVerify={jest.fn()}
          />
        );
      });

      const textNodes = root.root.findAllByType('Text');
      const textStrings = textNodes.map((n: any) => n.props.children).flat();

      // New Ticket header and Cancel/Add buttons
      expect(textStrings).toContain('New Ticket');
      expect(textStrings).toContain('Cancel');
      expect(textStrings).toContain('Add to Wallet');

      // Sections
      expect(textStrings).toContain('JOURNEY & TRAIN');
      expect(textStrings).toContain('ROUTE & SCHEDULE');
      expect(textStrings).toContain('PASSENGER & BERTH');

      // Auto-detection must NOT be present
      expect(textStrings).not.toContain('AUTO-DETECT');
      expect(textStrings).not.toContain('DETECT FROM CLIPBOARD NOW');
      expect(textStrings).not.toContain('Share to NORA');
    });
  });

  describe('SettingsScreen', () => {
    it('renders Apple Settings grouped sections and triggers callbacks', async () => {
      const onExport = jest.fn();
      const onClear = jest.fn();
      let root: any;

      await act(async () => {
        root = ReactTestRenderer.create(
          <SettingsScreen
            onBack={jest.fn()}
            ticketCount={1}
            onExportTickets={onExport}
            onClearAllTickets={onClear}
          />
        );
      });

      const textNodes = root.root.findAllByType('Text');
      const textStrings = textNodes.map((n: any) => n.props.children).flat();

      // Section titles
      expect(textStrings).toContain('PREFERENCES');
      expect(textStrings).toContain('WALLET STORAGE');
      expect(textStrings).toContain('DATA & PRIVACY');
      expect(textStrings).toContain('ABOUT');

      // Row labels
      expect(textStrings).toContain('Departure Reminders');
      expect(textStrings).toContain('Appearance');
      expect(textStrings).toContain('Storage Engine');
      expect(textStrings).toContain('100% Offline Storage');
      expect(textStrings).toContain('Delete All Tickets');
    });
  });

  describe('TicketCard (Apple Transit Pass)', () => {
    it('renders transit pass with route, date, coach, seat and action pills', async () => {
      let root: any;
      await act(async () => {
        root = ReactTestRenderer.create(
          <TicketCard
            ticket={mockTicket}
            onPress={jest.fn()}
            onShare={jest.fn()}
            onAddToCalendar={jest.fn()}
          />
        );
      });

      const textNodes = root.root.findAllByType('Text');
      const textStrings = textNodes.map((n: any) => n.props.children).flat();

      expect(textStrings).toContain('PUNE');
      expect(textStrings).toContain('BD');
      expect(textStrings).toContain('28 Oct 2026');
      expect(textStrings).toContain('Share Pass');
      expect(textStrings).toContain('Add to Calendar');
    });
  });

  describe('TicketDetailsScreen (Apple Details Layout)', () => {
    it('renders Apple boarding pass, action cards, and grouped detail sections', async () => {
      let root: any;
      await act(async () => {
        root = ReactTestRenderer.create(
          <TicketDetailsScreen ticket={mockTicket} onBack={jest.fn()} />
        );
      });

      const textNodes = root.root.findAllByType('Text');
      const textStrings = textNodes.map((n: any) => n.props.children).flat();

      expect(textStrings).toContain('Ticket Details');
      expect(textStrings).toContain('Live Status');
      expect(textStrings).toContain('Share Pass');
      expect(textStrings).toContain('Calendar');
      expect(textStrings).toContain('JOURNEY SPECIFICATIONS');
      expect(textStrings).toContain('RESERVATION & FARE');
      expect(textStrings).toContain('Encrypted Offline Pass');
    });
  });
});
