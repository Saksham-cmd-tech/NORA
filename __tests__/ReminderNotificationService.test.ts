import { NativeModules, NativeEventEmitter, Platform } from 'react-native';
import {
  parseDepartureTimestamp,
  scheduleJourneyReminders,
  cancelJourneyReminders,
  showTicketDetectedNotification,
  getInitialNotificationAction,
  subscribeToNotificationActions,
  showLiveJourneyNotification,
  dismissLiveJourneyNotification,
  isLiveJourneyNotificationActive,
} from '../src/services/reminderNotificationService';
import { NormalizedTicket } from '../src/types/ticket';

Platform.OS = 'android';

// Mock NativeModules
NativeModules.NoraNotificationModule = {
  scheduleJourneyReminders: jest.fn().mockResolvedValue(true),
  cancelJourneyReminders: jest.fn().mockResolvedValue(true),
  showTicketDetectedNotification: jest.fn().mockResolvedValue(true),
  showLiveJourney: jest.fn().mockResolvedValue(true),
  dismissLiveJourney: jest.fn().mockResolvedValue(true),
  isLiveJourneyActive: jest.fn().mockResolvedValue(true),
  getInitialNotificationAction: jest.fn().mockResolvedValue({
    actionType: 'TRAIN_STATUS',
    pnr: '8354766445',
    trainNumber: '26101',
  }),
  addListener: jest.fn(),
  removeListeners: jest.fn(),
};

describe('NORA Reminder & Notification Service Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('parseDepartureTimestamp', () => {
    test('Correctly parses AM time and standard date format', () => {
      const timestamp = parseDepartureTimestamp('25 Oct 2026', '06:25 AM');
      expect(timestamp).not.toBeNull();
      const date = new Date(timestamp!);
      expect(date.getFullYear()).toBe(2026);
      expect(date.getMonth()).toBe(9); // 0-indexed: October is 9
      expect(date.getDate()).toBe(25);
      expect(date.getHours()).toBe(6);
      expect(date.getMinutes()).toBe(25);
    });

    test('Correctly parses PM 12-hour format', () => {
      const timestamp = parseDepartureTimestamp('15 Nov 2026', '03:45 PM');
      expect(timestamp).not.toBeNull();
      const date = new Date(timestamp!);
      expect(date.getHours()).toBe(15);
      expect(date.getMinutes()).toBe(45);
    });

    test('Correctly parses 12:00 PM (Noon)', () => {
      const timestamp = parseDepartureTimestamp('15 Nov 2026', '12:00 PM');
      expect(timestamp).not.toBeNull();
      const date = new Date(timestamp!);
      expect(date.getHours()).toBe(12);
      expect(date.getMinutes()).toBe(0);
    });

    test('Correctly parses 12:30 AM (Midnight)', () => {
      const timestamp = parseDepartureTimestamp('15 Nov 2026', '12:30 AM');
      expect(timestamp).not.toBeNull();
      const date = new Date(timestamp!);
      expect(date.getHours()).toBe(0);
      expect(date.getMinutes()).toBe(30);
    });

    test('Correctly parses 24-hour military time format', () => {
      const timestamp = parseDepartureTimestamp('20 Nov 2026', '18:50');
      expect(timestamp).not.toBeNull();
      const date = new Date(timestamp!);
      expect(date.getHours()).toBe(18);
      expect(date.getMinutes()).toBe(50);
    });

    test('Defaults to 06:00 AM when departure time is absent', () => {
      const timestamp = parseDepartureTimestamp('20 Nov 2026');
      expect(timestamp).not.toBeNull();
      const date = new Date(timestamp!);
      expect(date.getHours()).toBe(6);
      expect(date.getMinutes()).toBe(0);
    });

    test('Returns null for missing or invalid dates', () => {
      expect(parseDepartureTimestamp(undefined)).toBeNull();
      expect(parseDepartureTimestamp('')).toBeNull();
    });
  });

  describe('Native Module Bridge Integration', () => {
    const mockTicket: NormalizedTicket = {
      id: 'ticket-99',
      source: 'IRCTC',
      pnr: '8354766445',
      train: {
        number: '26101',
        name: 'Ajni Vande Bharat Express',
      },
      journey: {
        from: 'PUNE',
        fromName: 'Pune Junction',
        to: 'BD',
        toName: 'Badnera Junction',
        date: '25 Dec 2026',
        departure: '06:25 AM',
      },
      passenger: {
        name: 'RAHUL SHARMA',
        coach: 'C5',
        seat: '64',
        bookingStatus: 'CONFIRMED',
      },
      status: 'CONFIRMED',
      createdAt: '2026-10-09T00:00:00Z',
      updatedAt: '2026-10-09T00:00:00Z',
    };

    test('scheduleJourneyReminders passes expected payload to native AlarmManager', async () => {
      const result = await scheduleJourneyReminders(mockTicket);
      expect(result).toBe(true);
      expect(NativeModules.NoraNotificationModule.scheduleJourneyReminders).toHaveBeenCalledTimes(1);

      const callArgs = NativeModules.NoraNotificationModule.scheduleJourneyReminders.mock.calls[0];
      const payload = callArgs[0];
      const epoch = callArgs[1];

      expect(payload.pnr).toBe('8354766445');
      expect(payload.train.number).toBe('26101');
      expect(payload.passenger.coach).toBe('C5');
      expect(payload.passenger.seat).toBe('64');
      expect(typeof epoch).toBe('number');
      expect(epoch).toBeGreaterThan(Date.now());
    });

    test('cancelJourneyReminders invokes native cancel method', async () => {
      const result = await cancelJourneyReminders('8354766445');
      expect(result).toBe(true);
      expect(NativeModules.NoraNotificationModule.cancelJourneyReminders).toHaveBeenCalledWith('8354766445');
    });

    test('showTicketDetectedNotification invokes native notification builder', async () => {
      const result = await showTicketDetectedNotification(mockTicket);
      expect(result).toBe(true);
      expect(NativeModules.NoraNotificationModule.showTicketDetectedNotification).toHaveBeenCalledTimes(1);

      const payload = NativeModules.NoraNotificationModule.showTicketDetectedNotification.mock.calls[0][0];
      expect(payload.pnr).toBe('8354766445');
      expect(payload.journey.from).toBe('PUNE');
      expect(payload.journey.to).toBe('BD');
    });

    test('getInitialNotificationAction returns pending action', async () => {
      const action = await getInitialNotificationAction();
      expect(action).toEqual({
        actionType: 'TRAIN_STATUS',
        pnr: '8354766445',
        trainNumber: '26101',
      });
    });

    test('subscribeToNotificationActions registers listener on NativeEventEmitter', () => {
      const listenerCallback = jest.fn();
      const unsubscribe = subscribeToNotificationActions(listenerCallback);
      expect(typeof unsubscribe).toBe('function');
      unsubscribe();
    });

    test('showLiveJourneyNotification pins ongoing lock screen activity', async () => {
      const liveData = {
        statusBadgeText: 'ON TIME',
        nextStationCode: 'BD',
        nextStationName: 'Badnera Junction',
        nextStationTime: '06:25 AM',
        nextStationPlatform: '2',
        currentSpeed: '110 km/h',
        isAtStation: false,
      };
      const result = await showLiveJourneyNotification(mockTicket, liveData);
      expect(result).toBe(true);
      expect(NativeModules.NoraNotificationModule.showLiveJourney).toHaveBeenCalledWith(
        mockTicket,
        liveData
      );
    });

    test('dismissLiveJourneyNotification cancels persistent lock screen activity', async () => {
      const result = await dismissLiveJourneyNotification();
      expect(result).toBe(true);
      expect(NativeModules.NoraNotificationModule.dismissLiveJourney).toHaveBeenCalledTimes(1);
    });

    test('isLiveJourneyNotificationActive checks status from native module', async () => {
      const active = await isLiveJourneyNotificationActive();
      expect(active).toBe(true);
      expect(NativeModules.NoraNotificationModule.isLiveJourneyActive).toHaveBeenCalledTimes(1);
    });
  });
});
