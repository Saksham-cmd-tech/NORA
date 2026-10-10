import { irctcParser } from '../src/parsers/irctcParser';
import { redRailParser } from '../src/parsers/redrailParser';
import { parseBookingNotification } from '../src/parsers/notificationParser';
import { mergeTickets } from '../src/parsers/merger';
import { ticketRepository } from '../src/database/repositories/ticketRepository';
import { NormalizedTicket } from '../src/types/ticket';
import { getStationName, getTrainName } from '../src/utils/stationLookup';
import { isTicketValidAndUpcoming } from '../src/utils/dateUtils';
import { buildShareTicketData } from '../src/services/shareTicketService';

jest.setTimeout(15000);

describe('NORA Parser & Duplicate Reconciliation Suite', () => {
  const CONFIRMED_BOOKING_MSG =
    'PNR:4341568676,TRAIN:12626,DOJ:12-10-2026,TIME:20:10,CLASS:3A,NDLS TO SBC,NAME:RAKESH KUMAR+,COACH:B1,SEAT:22,FARE:2450,SC:11.80.';

  const WAITLIST_BOOKING_MSG =
    'PNR:2345678901,TRAIN:12420,DOJ:15-11-2026,TIME:05:40,CLASS:SL,NDLS TO GZB,NAME:MOHIT YADAV+,STATUS:WL23,FARE:120,SC:10.00.';

  const STATUS_139_MSG =
    'PNR:4341568676 Train:12626 DOJ:12-10-2026 Class:3A From:NDLS To:SBC Booking Status:WL23 Current Status:CNF Coach:B1 Seat:22';

  const CANCELLATION_MSG =
    'PNR:4341568676,TRAIN:12626,DOJ:12-10-2026,NDLS TO SBC,Your ticket has been cancelled. Refund Amt:2330.00 will be credited to your account.';

  const CHART_PREP_MSG =
    'Chart Prep for PNR:4341568676 Train:12626. Current Status:CNF, Coach:B1, Seat:24. Please check platform display for final updates.';

  const REAL_CRIS_CHART_SMS = `PNR-8833285172
Trn:11030
Dt:24-09-26 Dep.Time-09:05 Hrs.
Frm JSP to PUNE
Cls:SL
P1-S2,7
Boarding allowed from JSP only
Chart Prepared
Url for coach position: https://enquiry.indianrail.gov.in/mntes/C?u=ffeheNx8zNgiengkN8g 
Download RailOne for latest updates https://railone.indianrailways.gov.in 
For Enquiry/Complaint/Assistance, please dial 139 IR-CRIS`;

  test('Parse Confirmed Ticket Booking Format with name, coach, seat, fare, sc', () => {
    expect(irctcParser.canParse(CONFIRMED_BOOKING_MSG)).toBe(true);
    const result = irctcParser.parse(CONFIRMED_BOOKING_MSG);
    expect(result).not.toBeNull();
    expect(result?.pnr).toBe('4341568676');
    expect(result?.train?.number).toBe('12626');
    expect(result?.train?.name).toBe('Kerala Express');
    expect(result?.journey?.date).toBe('12 Oct 2026');
    expect(result?.journey?.departure).toBe('08:10 PM');
    expect(result?.journey?.from).toBe('NDLS');
    expect(result?.journey?.fromName).toBe('New Delhi');
    expect(result?.journey?.to).toBe('SBC');
    expect(result?.journey?.toName).toBe('KSR Bengaluru');
    expect(result?.passenger?.name).toBe('RAKESH KUMAR');
    expect(result?.passenger?.coach).toBe('B1');
    expect(result?.passenger?.seat).toBe('22');
    expect(result?.passenger?.class).toBe('3A');
    expect(result?.fare?.total).toBe(2450);
    expect(result?.fare?.convenienceFee).toBe(11.8);
    expect(result?.status).toBe('CONFIRMED');
    expect(result?.isUpcoming).toBe(true);
  });

  test('Parse Waitlisted / RAC Ticket Booking Format with status WL23', () => {
    expect(irctcParser.canParse(WAITLIST_BOOKING_MSG)).toBe(true);
    const result = irctcParser.parse(WAITLIST_BOOKING_MSG);
    expect(result).not.toBeNull();
    expect(result?.pnr).toBe('2345678901');
    expect(result?.train?.number).toBe('12420');
    expect(result?.train?.name).toBe('Gomti Express');
    expect(result?.journey?.date).toBe('15 Nov 2026');
    expect(result?.journey?.departure).toBe('05:40 AM');
    expect(result?.journey?.from).toBe('NDLS');
    expect(result?.journey?.to).toBe('GZB');
    expect(result?.passenger?.name).toBe('MOHIT YADAV');
    expect(result?.passenger?.class).toBe('SL');
    expect(result?.status).toBe('WAITLISTED');
    expect(result?.passenger?.bookingStatus).toBe('WL23');
    expect(result?.fare?.total).toBe(120);
    expect(result?.fare?.convenienceFee).toBe(10);
    expect(result?.isUpcoming).toBe(true);
  });

  test('Parse 139 Status Inquiry (Space Delimited) and show "-" when no passenger name', () => {
    expect(irctcParser.canParse(STATUS_139_MSG)).toBe(true);
    const result = irctcParser.parse(STATUS_139_MSG);
    expect(result).not.toBeNull();
    expect(result?.pnr).toBe('4341568676');
    expect(result?.train?.number).toBe('12626');
    expect(result?.journey?.from).toBe('NDLS');
    expect(result?.journey?.to).toBe('SBC');
    expect(result?.passenger?.name).toBe('-');
    expect(result?.passenger?.coach).toBe('B1');
    expect(result?.passenger?.seat).toBe('22');
    expect(result?.status).toBe('CONFIRMED');
  });

  test('Parse Ticket Cancellation Format and mark status CANCELLED', () => {
    expect(irctcParser.canParse(CANCELLATION_MSG)).toBe(true);
    const result = irctcParser.parse(CANCELLATION_MSG);
    expect(result).not.toBeNull();
    expect(result?.pnr).toBe('4341568676');
    expect(result?.status).toBe('CANCELLED');
    expect(result?.isUpcoming).toBe(false);
  });

  test('Parse Chart Prepared Alerts accurately', () => {
    expect(irctcParser.canParse(CHART_PREP_MSG)).toBe(true);
    const result = irctcParser.parse(CHART_PREP_MSG);
    expect(result).not.toBeNull();
    expect(result?.pnr).toBe('4341568676');
    expect(result?.train?.number).toBe('12626');
    expect(result?.passenger?.coach).toBe('B1');
    expect(result?.passenger?.seat).toBe('24');
    expect(result?.passenger?.name).toBe('-');
  });

  test('Parse real CRIS chart SMS accurately with passenger name "-" and past date', () => {
    const result = irctcParser.parse(REAL_CRIS_CHART_SMS);
    expect(result).not.toBeNull();
    expect(result?.pnr).toBe('8833285172');
    expect(result?.passenger?.name).toBe('-');
    expect(result?.journey?.from).toBe('JSP');
    expect(result?.journey?.fromName).toBe('Jaysingpur');
    expect(result?.journey?.to).toBe('PUNE');
    expect(result?.journey?.toName).toBe('Pune Junction');
    expect(result?.journey?.date).toBe('24 Sep 2026');
    expect(result?.passenger?.coach).toBe('S2');
    expect(result?.passenger?.seat).toBe('7');
    expect(result?.isUpcoming).toBe(false);
  });

  test('Upcoming Validity Check: Validates future dates, filters past dates, and strictly rejects missing/invalid dates', () => {
    // Valid upcoming dates
    expect(isTicketValidAndUpcoming('12 Oct 2026')).toBe(true);
    expect(isTicketValidAndUpcoming('15 Nov 2026')).toBe(true);
    expect(isTicketValidAndUpcoming('25 Oct 2026')).toBe(true);
    expect(isTicketValidAndUpcoming('12-Oct-2026')).toBe(true);
    expect(isTicketValidAndUpcoming('12/10/26')).toBe(true);
    expect(isTicketValidAndUpcoming('2026-10-25')).toBe(true);

    // Past / expired dates
    expect(isTicketValidAndUpcoming('24 Sep 2026')).toBe(false);
    expect(isTicketValidAndUpcoming('24-Sep-26')).toBe(false);
    expect(isTicketValidAndUpcoming('24-Sep-2024')).toBe(false);
    expect(isTicketValidAndUpcoming('08 Oct 2026')).toBe(false);
    expect(isTicketValidAndUpcoming('08-10-2026')).toBe(false);
    expect(isTicketValidAndUpcoming('13 Dec 2025')).toBe(false);

    // Cancelled and completed tickets
    expect(isTicketValidAndUpcoming('12 Oct 2026', 'CANCELLED')).toBe(false);
    expect(isTicketValidAndUpcoming('12 Oct 2026', 'COMPLETED')).toBe(false);

    // Missing, empty or invalid date strings must strictly return false
    expect(isTicketValidAndUpcoming(undefined)).toBe(false);
    expect(isTicketValidAndUpcoming('')).toBe(false);
    expect(isTicketValidAndUpcoming('   ')).toBe(false);
    expect(isTicketValidAndUpcoming('not-a-date')).toBe(false);
  });

  test('Parse IRCTC SMS with letter months (dd-MMM-yy) and verify expired detection', () => {
    const PAST_SMS_WITH_MONTH_NAME =
      'PNR:7766554433,TRAIN:12626,DOJ:24-Sep-26,TIME:08:10 PM,CLASS:3A,NDLS TO SBC,NAME:TEST USER,COACH:B1,SEAT:22';
    const parsedPast = irctcParser.parse(PAST_SMS_WITH_MONTH_NAME);
    expect(parsedPast).not.toBeNull();
    expect(parsedPast?.journey?.date).toBe('24 Sep 2026');
    expect(parsedPast?.isUpcoming).toBe(false);

    const FUTURE_SMS_WITH_MONTH_NAME =
      'PNR:7766554434,TRAIN:12626,DOJ:24-Oct-26,TIME:08:10 PM,CLASS:3A,NDLS TO SBC,NAME:TEST USER,COACH:B1,SEAT:22';
    const parsedFuture = irctcParser.parse(FUTURE_SMS_WITH_MONTH_NAME);
    expect(parsedFuture).not.toBeNull();
    expect(parsedFuture?.journey?.date).toBe('24 Oct 2026');
    expect(parsedFuture?.isUpcoming).toBe(true);
  });

  test('redRail parser handles SMS without date without hardcoding 08 Oct 2026', () => {
    const NO_DATE_REDRAIL =
      'redRail Booking RR998877 is successful. PNR: 9876543210, Train: 26101 Ajni Vandebharat from PUNE to BD. Class: CC.';
    const parsed = redRailParser.parse(NO_DATE_REDRAIL);
    expect(parsed).not.toBeNull();
    expect(parsed?.journey?.date).toBe('');
    expect(parsed?.isUpcoming).toBe(false);
  });

  test('Verify station database and train names lookup', () => {
    expect(getStationName('JSP')).toBe('Jaysingpur');
    expect(getStationName('PUNE')).toBe('Pune Junction');
    expect(getStationName('BD')).toBe('Badnera Junction');
    expect(getStationName('NDLS')).toBe('New Delhi');
    expect(getStationName('SBC')).toBe('KSR Bengaluru');
    expect(getStationName('GZB')).toBe('Ghaziabad');
    expect(getTrainName('12626')).toBe('Kerala Express');
    expect(getTrainName('12420')).toBe('Gomti Express');
    expect(getTrainName('11030')).toBe('Koyna Express');
    expect(getTrainName('26101')).toBe('Ajni Vande Bharat Express');
  });

  test('Strict Duplicate Prevention and multi-source merge', async () => {
    await ticketRepository.clearAllTickets();

    // 1. Initial 139 status check SMS (no name, no fare)
    const t1 = irctcParser.parse(STATUS_139_MSG) as NormalizedTicket;
    expect(t1.passenger.name).toBe('-');
    await ticketRepository.saveOrMergeTicket(t1);

    // 2. Full booking SMS arrives for same PNR (with name RAKESH KUMAR, fare 2450)
    const t2 = irctcParser.parse(CONFIRMED_BOOKING_MSG) as NormalizedTicket;
    await ticketRepository.saveOrMergeTicket(t2);

    // Database must still have only 1 ticket, with merged data
    const list = await ticketRepository.getTickets();
    expect(list.length).toBe(1);
    expect(list[0].pnr).toBe('4341568676');
    expect(list[0].passenger.name).toBe('RAKESH KUMAR');
    expect(list[0].fare?.total).toBe(2450);
    expect(list[0].passenger.coach).toBe('B1');
  });

  test('buildShareTicketData generates clean message matching user requested specification', () => {
    const sampleTicket: NormalizedTicket = {
      id: 'ticket-1',
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
        date: '08 Oct 2026',
        departure: '06:25 AM',
      },
      passenger: {
        name: 'RAHUL SHARMA',
        coach: 'C5',
        seat: '64',
        bookingStatus: 'CONFIRMED',
      },
      status: 'CONFIRMED',
      createdAt: '2026-10-08T00:00:00Z',
      updatedAt: '2026-10-08T00:00:00Z',
    };

    const shareData = buildShareTicketData(sampleTicket, {
      platform: '5',
      pillar: '11',
    });

    const expectedText = [
      '26101 · Ajni Vande Bharat Express',
      'PUNE → BD',
      'Pune Junction → Badnera Junction',
      '08 Oct 2026 · 06:25 AM',
      'Coach C5',
      'Seat 64',
      'Platform 5 · Pillar 11',
      'PNR 8354766445',
      'Status · Confirmed',
    ].join('\n');

    expect(shareData.shareText).toBe(expectedText);
  });

  test('Onboarding status and ticket store persistence across app reload', async () => {
    // 1. Mark onboarding completed
    await ticketRepository.setOnboardingStatus(true);
    const status = await ticketRepository.hasCompletedOnboarding();
    expect(status).toBe(true);

    // 2. Add ticket
    const testTicket: NormalizedTicket = {
      id: 'persist-1',
      source: 'IRCTC',
      pnr: '9988776655',
      train: { number: '12952', name: 'Mumbai Rajdhani' },
      journey: { from: 'MMCT', to: 'NDLS', date: '25 Dec 2026' },
      passenger: { name: 'RAHUL', coach: 'B2', seat: '15' },
      status: 'CONFIRMED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await ticketRepository.saveOrMergeTicket(testTicket);

    const saved = await ticketRepository.findTicketByPNR('9988776655');
    expect(saved).not.toBeNull();
    expect(saved?.pnr).toBe('9988776655');
  });
});
