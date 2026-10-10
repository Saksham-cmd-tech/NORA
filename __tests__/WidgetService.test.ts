import { formatTicketForWidget, updateActiveTicketWidget, updateActiveTicketsWidget } from '../src/services/widgetService';
import { NormalizedTicket } from '../src/types/ticket';
import { NativeModules, Platform } from 'react-native';

describe('WidgetService', () => {
  const mockTicket: NormalizedTicket = {
    id: 'test-1',
    source: 'IRCTC',
    pnr: '2458910342',
    train: {
      number: '26101',
      name: 'VANDE BHARAT EXP',
    },
    journey: {
      from: 'CSMT',
      fromName: 'Mumbai CSMT',
      to: 'PUNE',
      toName: 'Pune Jn',
      date: '10 Oct 2026',
      departure: '14:05',
      arrival: '18:10',
    },
    passenger: {
      name: 'Traveler',
      coach: 'C2',
      seat: '22',
      class: 'CC',
      className: 'AC Chair Car',
      bookingStatus: 'CNF',
    },
    status: 'CONFIRMED',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  it('formats active ticket correctly with all details', () => {
    const formatted = formatTicketForWidget(mockTicket);
    expect(formatted.hasTicket).toBe(true);
    expect(formatted.pnr).toBe('2458910342');
    expect(formatted.trainNumber).toBe('26101');
    expect(formatted.trainName).toBe('VANDE BHARAT EXP');
    expect(formatted.from).toBe('CSMT');
    expect(formatted.to).toBe('PUNE');
    expect(formatted.departure).toBe('14:05');
    expect(formatted.arrival).toBe('18:10');
    expect(formatted.coach).toBe('C2');
    expect(formatted.seat).toBe('22');
    expect(formatted.status).toBe('CONFIRMED');
  });

  it('returns hasTicket: false when no active ticket is provided', () => {
    const formatted = formatTicketForWidget(null);
    expect(formatted.hasTicket).toBe(false);
  });

  it('calls clearActiveTicket when ticket is null', async () => {
    Platform.OS = 'android';
    NativeModules.NoraWidgetModule = {
      updateActiveTicket: jest.fn().mockResolvedValue(true),
      clearActiveTicket: jest.fn().mockResolvedValue(true),
    };

    const res = await updateActiveTicketWidget(null);
    expect(res).toBe(true);
    expect(NativeModules.NoraWidgetModule.clearActiveTicket).toHaveBeenCalled();
  });

  it('calls updateActiveTicket with json payload when ticket is provided', async () => {
    Platform.OS = 'android';
    NativeModules.NoraWidgetModule = {
      updateActiveTicket: jest.fn().mockResolvedValue(true),
      clearActiveTicket: jest.fn().mockResolvedValue(true),
    };

    const res = await updateActiveTicketWidget(mockTicket);
    expect(res).toBe(true);
    expect(NativeModules.NoraWidgetModule.updateActiveTicket).toHaveBeenCalledWith(
      expect.stringContaining('26101')
    );
  });

  it('resolves platform for boarding station correctly', () => {
    const formatted = formatTicketForWidget(mockTicket);
    expect(formatted.platform).toBe('3'); // CSMT on train 26101
  });

  it('updates widget with multiple tickets payload', async () => {
    Platform.OS = 'android';
    NativeModules.NoraWidgetModule = {
      updateActiveTicket: jest.fn().mockResolvedValue(true),
      clearActiveTicket: jest.fn().mockResolvedValue(true),
    };

    const res = await updateActiveTicketsWidget([mockTicket]);
    expect(res).toBe(true);
    expect(NativeModules.NoraWidgetModule.updateActiveTicket).toHaveBeenCalledWith(
      expect.stringContaining('"count":1')
    );
  });
});
