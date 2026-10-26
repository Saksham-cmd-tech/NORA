import {
  generateTripShareUrl,
  parseTripShareUrl,
  convertSharedTripToTicket,
  SharedTripData,
} from '../src/services/tripShareService';
import { NormalizedTicket } from '../src/types/ticket';

describe('TripShareService', () => {
  const sampleTicket: NormalizedTicket = {
    id: 'test_ticket_1',
    source: 'IRCTC',
    pnr: '8354766445',
    train: {
      number: '12951',
      name: 'Mumbai Rajdhani Express',
      type: 'RAJDHANI',
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
      name: 'Saksham Tale',
      coach: 'B3',
      seat: '42',
      class: '3A',
      bookingStatus: 'CONFIRMED',
    },
    status: 'CONFIRMED',
    createdAt: '2026-10-26T12:00:00Z',
    updatedAt: '2026-10-26T12:00:00Z',
  };

  test('generates tracking-only URL without exposing coach/seat/PNR', () => {
    const url = generateTripShareUrl(sampleTicket, { includeBerth: false });
    expect(url).toContain('https://nora-privacy-policy.vercel.app/t#data=');

    const parsed = parseTripShareUrl(url);
    expect(parsed).not.toBeNull();
    expect(parsed?.trainNumber).toBe('12951');
    expect(parsed?.fromStation).toBe('BCT');
    expect(parsed?.toStation).toBe('NDLS');
    expect(parsed?.dateOfJourney).toBe('28 Oct 2026');
    // Privacy verification: Coach and seat must NOT be included
    expect(parsed?.coach).toBeUndefined();
    expect(parsed?.seat).toBeUndefined();
    expect(parsed?.pnr).toBeUndefined();
  });

  test('generates complete boarding pass URL when includeBerth is true', () => {
    const url = generateTripShareUrl(sampleTicket, { includeBerth: true });
    const parsed = parseTripShareUrl(url);

    expect(parsed).not.toBeNull();
    expect(parsed?.trainNumber).toBe('12951');
    expect(parsed?.coach).toBe('B3');
    expect(parsed?.seat).toBe('42');
    expect(parsed?.pnr).toBe('8354766445');
  });

  test('parses query-parameter-based fallback URL', () => {
    const fallbackUrl = 'https://nora-privacy-policy.vercel.app/t?train=12951&from=BCT&to=NDLS&date=2026-10-28';
    const parsed = parseTripShareUrl(fallbackUrl);

    expect(parsed).not.toBeNull();
    expect(parsed?.trainNumber).toBe('12951');
    expect(parsed?.fromStation).toBe('BCT');
    expect(parsed?.toStation).toBe('NDLS');
    expect(parsed?.dateOfJourney).toBe('2026-10-28');
  });

  test('parses custom scheme nora://trip URL', () => {
    const customSchemeUrl = generateTripShareUrl(sampleTicket, {
      includeBerth: true,
      useCustomScheme: true,
    });
    expect(customSchemeUrl).toContain('nora://trip?data=');

    const parsed = parseTripShareUrl(customSchemeUrl);
    expect(parsed).not.toBeNull();
    expect(parsed?.trainNumber).toBe('12951');
    expect(parsed?.coach).toBe('B3');
  });

  test('handles malformed or invalid URLs gracefully without throwing', () => {
    expect(parseTripShareUrl('')).toBeNull();
    expect(parseTripShareUrl('not_a_url')).toBeNull();
    expect(parseTripShareUrl('https://example.com/')).toBeNull();
    expect(parseTripShareUrl('https://nora-privacy-policy.vercel.app/t#data=malformed_junk_123')).toBeNull();
  });

  test('converts SharedTripData to a valid NormalizedTicket for wallet import', () => {
    const sharedData: SharedTripData = {
      trainNumber: '12951',
      trainName: 'Mumbai Rajdhani',
      trainType: 'RAJDHANI',
      dateOfJourney: '28 Oct 2026',
      fromStation: 'BCT',
      fromStationName: 'Mumbai Central',
      toStation: 'NDLS',
      toStationName: 'New Delhi',
      departureTime: '05:00 PM',
      arrivalTime: '08:32 AM',
      coach: 'B3',
      seat: '42',
    };

    const ticket = convertSharedTripToTicket(sharedData);
    expect(ticket.source).toBe('SHARED_LINK');
    expect(ticket.train.number).toBe('12951');
    expect(ticket.journey.from).toBe('BCT');
    expect(ticket.journey.to).toBe('NDLS');
    expect(ticket.passenger.coach).toBe('B3');
    expect(ticket.passenger.seat).toBe('42');
    expect(ticket.status).toBe('CONFIRMED');
    expect(ticket.isUpcoming).toBe(true);
  });
});
