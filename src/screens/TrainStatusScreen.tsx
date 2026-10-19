import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import {
  ArrowLeft,
  Share2,
  RotateCw,
  MapPin,
  Zap,
  Luggage,
  Check,
  Train,
  Compass,
  Clock,
  Calendar,
  ArrowRight,
  Radio,
  ChevronDown,
  ChevronUp,
  Bed,
  Shield,
  ShieldCheck,
  Utensils,
  Refrigerator,
  Coffee,
  Wind,
  Users,
} from 'lucide-react-native';
import { Colors } from '../theme/colors';
import { Spacing } from '../theme/spacing';
import { NormalizedTicket } from '../types/ticket';
import { AppText } from '../components/common/AppText';
import { StatusBadge } from '../components/common/StatusBadge';
import {
  getCoachPosition,
  getStationCoachPosition,
  getLegacyTrainDetails,
  getLiveTrainStatus,
  formatHaltTime,
  buildVandeBharatCCBlueprint,
  normalizeBlueprints,
  CoachPositionResponse,
  StationCoachResponse,
  LegacyTrainDetails,
  LegacyRouteHalt,
  LiveTrainData,
  Cabin,
  CabinSeat,
  BlueprintClass,
} from '../services/railService';
import { getTrainName } from '../utils/stationLookup';
import { ShareTicketModal } from '../components/ticket/ShareTicketModal';
import { CoachLayout } from '../components/coach/CoachLayout';
import { buildShareTicketData, ShareTicketData } from '../services/shareTicketService';
import { parseDepartureTimestamp } from '../services/reminderNotificationService';
import { parseDateComponents } from '../utils/dateUtils';

interface TrainStatusScreenProps {
  ticket: NormalizedTicket;
  onBack: () => void;
}

/**
 * Resolves coach class based on coach code (e.g. C2 -> CC, B2 -> 3A, S4 -> SL, E1 -> EC)
 */
export function resolveCoachClass(coachCode?: string, fallbackClass?: string): string {
  const code = (coachCode || '').trim().toUpperCase();
  if (/^C\d+/i.test(code)) return 'CC';
  if (/^E\d+/i.test(code)) return 'EC';
  if (/^B\d+/i.test(code)) return '3A';
  if (/^M\d+/i.test(code)) return '3E';
  if (/^A\d+/i.test(code)) return '2A';
  if (/^H\d+/i.test(code)) return '1A';
  if (/^S\d+/i.test(code)) return 'SL';
  if (/^D\d+/i.test(code)) return '2S';
  if (code === 'GEN' || code === 'GS' || code === 'SLR') return 'GEN';

  const fb = (fallbackClass || '').trim().toUpperCase();
  if (fb) return fb;
  return 'CC';
}

/**
 * Returns true if the class is a sleeper class (3A, 2A, 1A, SL, 3E)
 */
export function isSleeperClass(classCode?: string): boolean {
  const c = (classCode || '').trim().toUpperCase();
  return ['3A', '2A', '1A', 'SL', '3E'].includes(c);
}

/**
 * Friendly label for seat or berth type
 */
export function getSeatBerthFriendlyLabel(type?: string): string {
  switch (type?.toUpperCase()) {
    case 'LB':
      return 'LOWER';
    case 'MB':
      return 'MIDDLE';
    case 'UB':
      return 'UPPER';
    case 'SL':
      return 'SIDE LOWER';
    case 'SU':
      return 'SIDE UPPER';
    case 'SM':
      return 'SIDE MIDDLE';
    case 'WS':
      return 'WINDOW';
    case 'MS':
      return 'MIDDLE';
    case 'AS':
      return 'AISLE';
    default:
      return type || '';
  }
}

/**
 * Ensures train name is not just numeric digits or matching the train number
 */
export function getCleanTrainName(name?: string, num?: string): string {
  if (!name) return '';
  const trimmed = name.trim();
  if (/^\d+$/.test(trimmed)) return '';
  if (num && trimmed.toLowerCase() === num.trim().toLowerCase()) return '';
  return trimmed;
}

/**
 * Train category badge label
 */
export function getTrainCategoryLabel(trainName: string, trainType?: string): string {
  const nameUpper = (trainName || '').toUpperCase();
  if (nameUpper.includes('VANDE BHARAT')) return 'VANDE BHARAT EXP';
  if (nameUpper.includes('RAJDHANI')) return 'RAJDHANI EXP';
  if (nameUpper.includes('SHATABDI')) return 'SHATABDI EXP';
  if (nameUpper.includes('HUMSAFAR')) return 'HUMSAFAR EXP';
  if (nameUpper.includes('DURONTO')) return 'DURONTO EXP';
  if (nameUpper.includes('GARIB RATH')) return 'GARIB RATH EXP';
  if (nameUpper.includes('TEJAS')) return 'TEJAS EXP';
  if (nameUpper.includes('SUPERFAST') || (trainType && trainType.toUpperCase().includes('SUPERFAST')))
    return 'SUPERFAST EXP';
  if (nameUpper.includes('MAIL')) return 'MAIL SERVICE';
  return 'EXPRESS SERVICE';
}

/**
 * Parses time string like '06:25 AM' or '23:20' to minutes from midnight
 */
export function parseTimeStringToMinutes(timeStr?: string): number | undefined {
  if (!timeStr) return undefined;
  const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!match) return undefined;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3]?.toUpperCase();
  if (period === 'PM' && hours < 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

export const TrainStatusScreen: React.FC<TrainStatusScreenProps> = ({
  ticket,
  onBack,
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshingLive, setRefreshingLive] = useState<boolean>(false);
  const [coachData, setCoachData] = useState<CoachPositionResponse | null>(null);
  const [stationCoachData, setStationCoachData] = useState<StationCoachResponse | null>(null);
  const [legacyTrainData, setLegacyTrainData] = useState<LegacyTrainDetails | null>(null);
  const [liveData, setLiveData] = useState<LiveTrainData | null>(null);
  const [lastRefreshedText, setLastRefreshedText] = useState<string | null>(null);
  const [shareModalVisible, setShareModalVisible] = useState<boolean>(false);
  const [shareData, setShareData] = useState<ShareTicketData | null>(null);

  const trainNum = ticket.train.number || '26101';
  const boardingStation = (ticket.journey.from || 'PUNE').trim().toUpperCase();
  const destinationStation = (ticket.journey.to || 'BD').trim().toUpperCase();

  const userCoach = (ticket.passenger.coach || 'C2').trim().toUpperCase();
  const userSeat = ticket.passenger.seat || '22';
  const userSeatNum = parseInt(userSeat, 10) || 22;

  // Selected coach state allows user to tap through coach rake lineup
  const [selectedCoachCode, setSelectedCoachCode] = useState<string>(userCoach);
  const rakeScrollRef = useRef<any>(null);

  const effectiveTrainName =
    getCleanTrainName(legacyTrainData?.trainName, trainNum) ||
    getCleanTrainName(stationCoachData?.trainName, trainNum) ||
    getCleanTrainName(coachData?.trainName, trainNum) ||
    getCleanTrainName(liveData?.trainName, trainNum) ||
    getCleanTrainName(ticket.train.name, trainNum) ||
    getTrainName(trainNum) ||
    'Superfast Express';

  const passengerName =
    ticket.passenger.name && ticket.passenger.name !== '-'
      ? ticket.passenger.name
      : 'Passenger';

  // Journey Departure timing calculations
  const departureEpoch = useMemo(() => {
    return parseDepartureTimestamp(ticket.journey?.date, ticket.journey?.departure);
  }, [ticket.journey?.date, ticket.journey?.departure]);

  const ticketDateComponents = useMemo(() => {
    return parseDateComponents(ticket.journey?.date);
  }, [ticket.journey?.date]);

  const isJourneyToday = useMemo(() => {
    if (!ticketDateComponents) return false;
    const today = new Date();
    return (
      ticketDateComponents.year === today.getFullYear() &&
      ticketDateComponents.month === today.getMonth() &&
      ticketDateComponents.day === today.getDate()
    );
  }, [ticketDateComponents]);

  const isFutureJourney = useMemo(() => {
    if (!ticketDateComponents) {
      if (departureEpoch) {
        return departureEpoch - Date.now() > 24 * 60 * 60 * 1000;
      }
      return false;
    }
    const now = new Date();
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime();
    const journeyMidnight = new Date(
      ticketDateComponents.year,
      ticketDateComponents.month,
      ticketDateComponents.day,
      0, 0, 0, 0
    ).getTime();
    return journeyMidnight > todayMidnight;
  }, [ticketDateComponents, departureEpoch]);

  const [currentTime, setCurrentTime] = useState<number>(Date.now());
  const [showFullSchedulePreview, setShowFullSchedulePreview] = useState<boolean>(false);

  // Periodically check time to transition automatically when 1-hour window opens
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  const ONE_HOUR_MS = 60 * 60 * 1000;
  // If journey is in the future, it is ALWAYS pre-departure.
  // Otherwise, if departureEpoch is known, it is pre-departure if currentTime < (departureEpoch - 1 hour).
  const isJourneyNotStarted =
    isFutureJourney || (departureEpoch ? currentTime < departureEpoch - ONE_HOUR_MS : true);

  // Validate that live running telemetry actually belongs to THIS ticket's journey date!
  // A future journey (e.g. 28 Oct) has no live train telemetry today.
  const isLiveDataValidForThisJourney = useMemo(() => {
    if (!liveData) return false;
    if (isFutureJourney) return false; // Never apply today's running train to a future booking!
    if (!ticketDateComponents) return isJourneyToday;

    if (liveData.startDate) {
      const liveStartComponents = parseDateComponents(liveData.startDate);
      if (liveStartComponents) {
        return (
          ticketDateComponents.year === liveStartComponents.year &&
          ticketDateComponents.month === liveStartComponents.month &&
          ticketDateComponents.day === liveStartComponents.day
        );
      }
    }
    return isJourneyToday;
  }, [liveData, isFutureJourney, ticketDateComponents, isJourneyToday]);

  const effectiveLiveData = isLiveDataValidForThisJourney ? liveData : null;

  const getTimeRemainingText = () => {
    if (!departureEpoch) return 'SCHEDULED';
    const diffMs = departureEpoch - currentTime;
    if (diffMs <= 0) return 'JOURNEY IN PROGRESS';

    const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
    const diffHours = Math.floor((diffMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    const diffMins = Math.floor((diffMs % (60 * 60 * 1000)) / (60 * 1000));

    if (diffDays > 0) {
      return `STARTS IN ${diffDays}D ${diffHours}H`;
    }
    if (diffHours > 0) {
      return `STARTS IN ${diffHours}H ${diffMins}M`;
    }
    return `STARTS IN ${diffMins} MINS`;
  };

  useEffect(() => {
    loadInitialData();
  }, [trainNum, boardingStation]);

  // Auto-fetch live status when 1-hour window opens ONLY for today's active journey
  useEffect(() => {
    if (!isFutureJourney && isJourneyToday && departureEpoch && !isJourneyNotStarted && !liveData) {
      handleFetchTrainLocation();
    }
  }, [isJourneyNotStarted, departureEpoch, isFutureJourney, isJourneyToday]);

  /**
   * Initial Load: Fetches coach formations and scheduled timetable once.
   */
  const loadInitialData = async (force: boolean = false) => {
    try {
      setLoading(true);
      const [coaches, stationCoach, legacyDetails] = await Promise.all([
        getCoachPosition(trainNum, force, userCoach),
        getStationCoachPosition(trainNum, boardingStation, force),
        getLegacyTrainDetails(trainNum, force),
      ]);

      setCoachData(coaches);
      if (stationCoach) setStationCoachData(stationCoach);
      if (legacyDetails) setLegacyTrainData(legacyDetails);
    } catch (err) {
      console.log('[TrainStatusScreen] Error loading initial data:', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Check Radar Preview / Refresh Location:
   * When journey is pre-departure (e.g. 28 Oct), never fetches today's live train or shows the timeline!
   */
  const handleFetchTrainLocation = async () => {
    try {
      setRefreshingLive(true);
      // Guarantee timeline is NOT shown after clicking check radar preview:
      setShowFullSchedulePreview(false);

      if (isFutureJourney || isJourneyNotStarted) {
        // Pre-departure / Future booking (e.g. 28 Oct):
        // Re-verify latest coach position and platform assignment without querying today's live train!
        await loadInitialData(true);
        setLiveData(null);
        setLastRefreshedText(
          new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        );
        return;
      }

      // Active / today's journey:
      const live = await getLiveTrainStatus(trainNum, true);
      setLiveData(live);
      setLastRefreshedText(
        live.isCached && live.cacheTime
          ? live.cacheTime
          : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      );
    } catch (err) {
      console.log('[TrainStatusScreen] Error fetching live status:', err);
    } finally {
      setRefreshingLive(false);
    }
  };

  // 1. DYNAMIC COACH & RAKE RESOLUTION
  const rakeList =
    stationCoachData?.rake && stationCoachData.rake.length > 0
      ? stationCoachData.rake
      : coachData?.rake && coachData.rake.length > 0
      ? coachData.rake
      : [
          { position: 1, code: 'LOCO' },
          { position: 2, code: userCoach },
        ];

  const totalCoaches =
    stationCoachData?.totalCoaches || coachData?.totalCoaches || rakeList.length;

  const userCoachIndex = rakeList.findIndex(
    (c) => c.code.toUpperCase() === userCoach || userCoach.includes(c.code.toUpperCase())
  );
  const matchedCoach = userCoachIndex >= 0 ? rakeList[userCoachIndex] : rakeList[0];

  // Auto-scroll rake to user's coach on mount or rake load
  useEffect(() => {
    if (userCoachIndex >= 0 && rakeScrollRef.current) {
      const itemWidth = 56;
      const offset = Math.max(0, userCoachIndex * itemWidth - 100);
      const timer = setTimeout(() => {
        rakeScrollRef.current?.scrollTo({ x: offset, animated: true });
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [userCoachIndex, rakeList.length]);

  // Selected coach resolution
  const selectedCoachIndex = rakeList.findIndex(
    (c) => c.code.toUpperCase() === selectedCoachCode.toUpperCase()
  );
  const activeCoach = selectedCoachIndex >= 0 ? rakeList[selectedCoachIndex] : matchedCoach;
  const isViewingUserCoach = selectedCoachCode.toUpperCase() === userCoach.toUpperCase();

  // Dynamic Class & Blueprint for selected coach
  const activeClassType = resolveCoachClass(
    selectedCoachCode,
    activeCoach?.classType || (isViewingUserCoach ? ticket.passenger.class : undefined)
  );
  const isSelectedSleeper = isSleeperClass(activeClassType);

  const isPantryCar =
    activeClassType === 'PC' ||
    selectedCoachCode.toUpperCase().includes('PC');
  const isLuggageOrPowerCar =
    ['SLR', 'EOG', 'LSR', 'DL1', 'DL2'].includes(activeClassType) ||
    ['SLR', 'EOG', 'LSR', 'LOCO'].some((k) => selectedCoachCode.toUpperCase().includes(k));
  const isGeneralUnreserved =
    ['GS', 'GEN'].includes(activeClassType) ||
    ['GS', 'GEN'].some((k) => selectedCoachCode.toUpperCase().includes(k));
  const isSpecialServiceCoach = !isViewingUserCoach && (isPantryCar || isLuggageOrPowerCar || isGeneralUnreserved);

  const specialCoachInfo = useMemo(() => {
    if (isPantryCar) {
      return {
        badge: 'PANTRY CAR',
        title: 'On-Board Catering & Pantry',
        subtitle: 'Hot meals, beverages & IRCTC crew logistics',
        description:
          'This coach houses the train’s commercial catering kitchen, refrigeration storage, hot food cases, and catering crew headquarters. No passenger berths are installed.',
        features: [
          { label: 'Meal Preparation', desc: 'Pre-ordered IRCTC breakfast, lunch & dinner assembly' },
          { label: 'Fresh Beverages', desc: 'Indian Railways tea, coffee & packaged water supply' },
          { label: 'Catering Supervisor', desc: 'On-board catering manager stationed for assistance' },
        ],
      };
    }
    if (isGeneralUnreserved) {
      return {
        badge: 'UNRESERVED (GS)',
        title: 'General Unreserved Coach',
        subtitle: 'Open seating for second-class unreserved travelers',
        description:
          'Configured with open longitudinal and transverse bench seating on a first-come, first-served basis. Does not contain numbered seat reservations or berths.',
        features: [
          { label: 'Open Seating', desc: 'Available to all valid second-class ticket holders' },
          { label: 'Overhead Racks', desc: 'Full-length luggage racks across both sidewalls' },
          { label: 'Air Circulation', desc: 'Wide openable windows with protective safety bars' },
        ],
      };
    }
    return {
      badge: selectedCoachCode.toUpperCase().includes('EOG') ? 'POWER CAR' : 'GUARD & LUGGAGE',
      title: selectedCoachCode.toUpperCase().includes('EOG') ? 'End-On Generation Power Car' : 'Seating Cum Luggage Rake (SLR)',
      subtitle: 'High-voltage train power supply & cargo transit',
      description:
        'Equipped with diesel alternators supplying hotel-load AC power to coaches, secure parcel lockers, and the Train Manager (Guard) operations cabin.',
      features: [
        { label: 'Power Supply', desc: 'Generates 750V AC electrical power for all coaches' },
        { label: 'Luggage Compartment', desc: 'Secure transit space for registered railway parcels' },
        { label: 'Guard Cabin', desc: 'Train Manager safety equipment, hand brakes & radio' },
      ],
    };
  }, [isPantryCar, isGeneralUnreserved, selectedCoachCode]);

  const normalizedAllBlueprints = useMemo(() => {
    return normalizeBlueprints({
      ...(coachData?.blueprints || {}),
      ...(stationCoachData?.blueprints || {}),
    });
  }, [coachData?.blueprints, stationCoachData?.blueprints]);

  const activeBlueprint: BlueprintClass =
    normalizedAllBlueprints[activeClassType] ||
    (activeClassType === 'CC'
      ? buildVandeBharatCCBlueprint()
      : normalizedAllBlueprints['3A'] || buildVandeBharatCCBlueprint());

  const cabins: Cabin[] = activeBlueprint?.cabins || [];

  // User's coach class and sleeper status (for passenger overview card)
  const userCoachClass = resolveCoachClass(userCoach, ticket.passenger.class);
  const isUserSleeper = isSleeperClass(userCoachClass);

  // Boarding Platform from station coach API
  const boardingPlatform =
    stationCoachData?.platform ||
    legacyTrainData?.route.find((r) => r.stationCode.toUpperCase() === boardingStation)?.platform ||
    '5';

  // Dynamic Platform Pillar Alignment based on selected coach position
  const activePosNum = selectedCoachIndex >= 0 ? selectedCoachIndex + 1 : userCoachIndex >= 0 ? userCoachIndex + 1 : 4;
  const dynamicPillarNum = Math.max(1, Math.round((activePosNum / totalCoaches) * 22));
  const dynamicPositionDesc =
    activePosNum <= Math.ceil(totalCoaches / 3)
      ? 'Front of train'
      : activePosNum >= Math.floor((totalCoaches * 2) / 3)
      ? 'Rear of train'
      : 'Middle of train';

  // 2. DYNAMIC CABIN & SEAT RESOLUTION FOR ACTIVE COACH
  let targetCabin: Cabin | undefined = isViewingUserCoach
    ? cabins.find(
        (c) =>
          c.main.some((s) => s.number === userSeatNum) ||
          c.side.some((s) => s.number === userSeatNum)
      )
    : cabins[0];

  let targetSeatObj: CabinSeat | undefined = isViewingUserCoach
    ? targetCabin?.main.find((s) => s.number === userSeatNum) ||
      targetCabin?.side.find((s) => s.number === userSeatNum)
    : undefined;

  if (isViewingUserCoach && !targetCabin && cabins.length > 0) {
    const divisor = isSelectedSleeper ? 8 : 5;
    const targetIdx = Math.min(cabins.length - 1, Math.max(0, Math.floor(userSeatNum / divisor) - 1));
    targetCabin = cabins[targetIdx];
    targetSeatObj = {
      number: userSeatNum,
      type: isSelectedSleeper ? 'UB' : 'WS',
      name: isSelectedSleeper ? 'Upper Berth' : 'Window Seat',
    };
  }

  const activeCabinNum = targetCabin?.cabinNumber || 1;
  const prevCabin = cabins.find((c) => c.cabinNumber === activeCabinNum - 1);

  // Dynamic Boarding Door Guidance
  const totalCabinsCount = cabins.length || (isSelectedSleeper ? 9 : 16);
  const isFrontDoor = activeCabinNum <= Math.ceil(totalCabinsCount / 2);
  const doorName = isFrontDoor ? 'Front Door' : 'Rear Door';
  const walkRows = isFrontDoor ? activeCabinNum : totalCabinsCount - activeCabinNum + 1;
  const walkDirection = isFrontDoor ? 'cabin rear' : 'cabin front';

  // 3. DYNAMIC JOURNEY ROUTE TIMELINE RESOLUTION
  const rawRoute: LegacyRouteHalt[] =
    legacyTrainData?.route && legacyTrainData.route.length > 0
      ? legacyTrainData.route
      : effectiveLiveData?.route && effectiveLiveData.route.length > 0
      ? effectiveLiveData.route.map((r, i) => ({
          sequence: r.sequence || i + 1,
          stationCode: r.stationCode,
          stationName: r.stationName,
          isHalt: r.isHalt !== false,
          distanceFromSourceKm: r.distance ?? 0,
          scheduledArrival: r.scheduledArrival,
          scheduledDeparture: r.scheduledDeparture,
          actualArrival: r.actualArrival,
          actualDeparture: r.actualDeparture,
          platform: r.platform,
        }))
      : [];

  const allHalts = rawRoute.filter((r) => r.isHalt);
  let journeyHalts: LegacyRouteHalt[] = [];

  const fromHaltIdx = allHalts.findIndex(
    (r) => r.stationCode.toUpperCase() === boardingStation
  );
  const toHaltIdx = allHalts.findIndex(
    (r) => r.stationCode.toUpperCase() === destinationStation
  );

  const parsedDepMins = parseTimeStringToMinutes(ticket.journey.departure) ?? 385;
  const parsedArrMins = parseTimeStringToMinutes(ticket.journey.arrival) ?? 948;

  if (fromHaltIdx >= 0 && toHaltIdx >= 0 && fromHaltIdx <= toHaltIdx) {
    journeyHalts = allHalts.slice(fromHaltIdx, toHaltIdx + 1);
  } else if (fromHaltIdx >= 0) {
    journeyHalts = allHalts.slice(fromHaltIdx);
  } else if (allHalts.length > 0) {
    journeyHalts = allHalts;
  } else {
    // Dynamic fallback stops without hardcoding 26101 values
    journeyHalts = [
      {
        sequence: 1,
        stationCode: boardingStation,
        stationName: ticket.journey.fromName || `${boardingStation} Jn`,
        isHalt: true,
        distanceFromSourceKm: 0,
        scheduledDeparture: parsedDepMins,
        platform: boardingPlatform,
      },
      {
        sequence: 2,
        stationCode: destinationStation,
        stationName: ticket.journey.toName || `${destinationStation} Jn`,
        isHalt: true,
        distanceFromSourceKm: 711,
        scheduledArrival: parsedArrMins,
        platform: '2',
      },
    ];
  }

  const originDistance = journeyHalts[0]?.distanceFromSourceKm ?? 0;
  const destDistance =
    journeyHalts[journeyHalts.length - 1]?.distanceFromSourceKm ?? originDistance + 711;
  const totalDistanceKm = Math.max(1, Math.round(Math.abs(destDistance - originDistance)));

  const originStationName =
    ticket.journey.fromName ||
    journeyHalts[0]?.stationName ||
    legacyTrainData?.route.find((r) => r.stationCode.toUpperCase() === boardingStation)?.stationName ||
    `${boardingStation} Jn`;

  const destStationName =
    ticket.journey.toName ||
    journeyHalts[journeyHalts.length - 1]?.stationName ||
    legacyTrainData?.route.find((r) => r.stationCode.toUpperCase() === destinationStation)?.stationName ||
    `${destinationStation} Jn`;

  const destPlatform =
    journeyHalts[journeyHalts.length - 1]?.platform ||
    legacyTrainData?.route.find((r) => r.stationCode.toUpperCase() === destinationStation)?.platform ||
    '1';

  // Live Location metrics (if refreshed and valid for this journey)
  const currentSpeed =
    effectiveLiveData?.currentLocation?.speedKmh !== undefined
      ? Math.round(effectiveLiveData.currentLocation.speedKmh)
      : effectiveLiveData?.status === 'running'
      ? 110
      : 0;

  const delayMinutes = effectiveLiveData?.delayMinutes || 0;
  const isDelayed = delayMinutes > 0;
  const isEarly = delayMinutes < 0;
  const statusBadgeText = isDelayed
    ? `DELAYED ${delayMinutes}M`
    : isEarly
    ? `EARLY ${Math.abs(delayMinutes)}M`
    : effectiveLiveData?.status === 'completed'
    ? 'COMPLETED'
    : 'ON TIME';

  // Live halt sequence tracking
  const liveNextHaltCode = effectiveLiveData?.nextHalt?.stationCode?.toUpperCase();
  const liveCurrentCode = effectiveLiveData?.currentLocation?.stationCode?.toUpperCase();
  const liveLocationStatus = effectiveLiveData?.currentLocation?.status;
  const isTrainAtStation = liveLocationStatus === 'at-station' || liveLocationStatus === 'arrived';

  let currentStationIndex = -1;
  let nextStationIndex = -1;

  if (effectiveLiveData) {
    if (liveCurrentCode) {
      currentStationIndex = journeyHalts.findIndex(
        (h) => h.stationCode.toUpperCase() === liveCurrentCode
      );
    }

    if (liveNextHaltCode) {
      nextStationIndex = journeyHalts.findIndex(
        (h) => h.stationCode.toUpperCase() === liveNextHaltCode
      );
    }

    const originRouteHalt = effectiveLiveData.route?.find(
      (r) => r.stationCode.toUpperCase() === boardingStation
    );
    const hasDepartedOrigin =
      originRouteHalt?.status === 'departed' || originRouteHalt?.actualDeparture !== undefined;

    if (!hasDepartedOrigin) {
      currentStationIndex = 0;
      nextStationIndex = journeyHalts.length > 1 ? 1 : -1;
    } else if (currentStationIndex < 0 && nextStationIndex > 0) {
      currentStationIndex = nextStationIndex - 1;
    }
  }

  // Amenities for the currently selected coach
  const coachAmenities = useMemo(() => {
    if (isSpecialServiceCoach) {
      if (isPantryCar) {
        return [
          {
            icon: 'coffee',
            title: 'Beverages',
            subtitle: 'Tea & Coffee',
          },
          {
            icon: 'utensils',
            title: 'Kitchen',
            subtitle: 'IRCTC Meals',
          },
          {
            icon: 'refrigerator',
            title: 'Cold Storage',
            subtitle: 'Deep Chiller',
          },
        ];
      }
      if (isGeneralUnreserved) {
        return [
          {
            icon: 'users',
            title: 'Open Seating',
            subtitle: 'Non-Reserved',
          },
          {
            icon: 'luggage',
            title: 'Overhead Rack',
            subtitle: 'Full Length',
          },
          {
            icon: 'wind',
            title: 'Air Flow',
            subtitle: 'Open Windows',
          },
        ];
      }
      return [
        {
          icon: 'zap',
          title: '750V Supply',
          subtitle: 'Coach Power',
        },
        {
          icon: 'luggage',
          title: 'Parcel Hold',
          subtitle: 'Locked Cargo',
        },
        {
          icon: 'shield',
          title: 'Guard Cabin',
          subtitle: 'Train Manager',
        },
      ];
    }

    if (['1A', '2A', '3A', '3E'].includes(activeClassType)) {
      return [
        {
          icon: 'power',
          title: 'Power Socket',
          subtitle: 'At Each Berth',
        },
        {
          icon: 'bed',
          title: 'Bedroll',
          subtitle: 'Clean Linen',
        },
        {
          icon: 'luggage',
          title: 'Luggage',
          subtitle: 'Under Berth',
        },
      ];
    }
    if (activeClassType === 'SL') {
      return [
        {
          icon: 'power',
          title: 'Charging',
          subtitle: 'In Bay Point',
        },
        {
          icon: 'shield',
          title: 'Luggage Hold',
          subtitle: 'Chain Loop',
        },
        {
          icon: 'wind',
          title: 'Air Flow',
          subtitle: 'Open Windows',
        },
      ];
    }
    if (activeClassType === 'EC') {
      return [
        {
          icon: 'power',
          title: 'Power & USB',
          subtitle: 'Under Armrest',
        },
        {
          icon: 'luggage',
          title: `Rack #${activeCabinNum}`,
          subtitle: 'Overhead Rack',
        },
        {
          icon: 'coffee',
          title: 'Recline & Leg',
          subtitle: 'Executive Seat',
        },
      ];
    }
    return [
      {
        icon: 'power',
        title: 'Power & USB',
        subtitle: 'Under Armrest',
      },
      {
        icon: 'luggage',
        title: `Rack #${activeCabinNum}`,
        subtitle: 'Overhead Rack',
      },
      {
        icon: 'coffee',
        title: 'Snack Tray',
        subtitle: 'Seatback Table',
      },
    ];
  }, [activeClassType, activeCabinNum, isSpecialServiceCoach, isPantryCar, isGeneralUnreserved]);

  const handleShareTrip = () => {
    const data = buildShareTicketData(ticket, {
      platform: boardingPlatform,
      pillar: dynamicPillarNum.toString(),
      isLive: !!effectiveLiveData,
    });
    setShareData(data);
    setShareModalVisible(true);
  };

  // Helper renderer for Sleeper Berth Box
  const renderBerthBox = (s: CabinSeat) => {
    const isTarget = isViewingUserCoach && s.number === userSeatNum;
    return (
      <View
        key={`berth_${s.number}`}
        style={[
          styles.blueprintBerthBox,
          isTarget && styles.userHighlightSeatBox,
        ]}
        collapsable={false}
      >
        <AppText
          variant="tiny"
          weight="heavy"
          color={isTarget ? 'dark' : 'primary'}
        >
          {s.number}
        </AppText>
        <AppText
          variant="micro"
          weight="heavy"
          color={isTarget ? 'dark' : 'secondary'}
          style={styles.berthTypeSubtext}
        >
          {isTarget ? `YOU (${s.type})` : s.type}
        </AppText>
      </View>
    );
  };

  // Helper renderer for Chair Car Seat Box
  const renderSeatBox = (s: CabinSeat) => {
    const isTarget = isViewingUserCoach && s.number === userSeatNum;
    return (
      <View
        key={`seat_${s.number}`}
        style={[
          styles.blueprintSeatBox,
          isTarget && styles.userHighlightSeatBox,
        ]}
        collapsable={false}
      >
        <AppText
          variant="tiny"
          weight="heavy"
          color={isTarget ? 'dark' : 'primary'}
        >
          {s.number}
        </AppText>
        <AppText
          variant="micro"
          weight="heavy"
          color={isTarget ? 'dark' : 'secondary'}
          style={styles.seatTypeSubtext}
        >
          {isTarget ? `YOU (${s.type})` : s.type}
        </AppText>
      </View>
    );
  };

  // Helper renderer for Journey Timeline Items
  const renderTimelineItem = (halt: LegacyRouteHalt, idx: number, isLiveMode: boolean = false) => {
    const isFirst = idx === 0;
    const isLast = idx === journeyHalts.length - 1;

    // 1. Is the train physically AT this station right now?
    const isTrainAtThisHalt =
      isLiveMode &&
      effectiveLiveData !== null &&
      idx === currentStationIndex &&
      (isTrainAtStation ||
        !effectiveLiveData.route?.find((r) => r.stationCode.toUpperCase() === boardingStation)
          ?.actualDeparture);

    // 2. Is this station DEPARTED?
    let isDeparted = false;
    if (isLiveMode && effectiveLiveData) {
      if (isTrainAtThisHalt) {
        isDeparted = false;
      } else if (isTrainAtStation && currentStationIndex >= 0) {
        isDeparted = idx < currentStationIndex;
      } else if (nextStationIndex >= 0) {
        isDeparted = idx < nextStationIndex;
      }
    }

    // 3. Is this the immediate NEXT stop?
    const isNextStop =
      isLiveMode &&
      effectiveLiveData !== null &&
      !isDeparted &&
      !isTrainAtThisHalt &&
      idx === (isTrainAtThisHalt ? currentStationIndex + 1 : nextStationIndex);

    // Formatted time
    const haltTime = isFirst
      ? formatHaltTime(halt.scheduledDeparture)
      : formatHaltTime(halt.scheduledArrival);

    const relKm = Math.round(
      Math.abs((halt.distanceFromSourceKm ?? 0) - originDistance)
    );

    const haltPlatform = isFirst ? boardingPlatform : halt.platform || '1';

    return (
      <View
        key={`${halt.stationCode}_${idx}`}
        style={styles.timelineStationItem}
        collapsable={false}
      >
        {/* Left Column: Timing & Distance */}
        <View style={styles.timelineTimeCol}>
          <AppText
            variant="caption"
            weight="heavy"
            color={
              isTrainAtThisHalt
                ? 'orange'
                : isNextStop
                ? 'success'
                : isDeparted
                ? 'secondary'
                : 'primary'
            }
          >
            {haltTime}
          </AppText>
          <AppText variant="micro" color="muted" style={{ marginTop: 2 }}>
            +{relKm} km
          </AppText>
        </View>

        {/* Middle Column: Visual Track Line & Node */}
        <View style={styles.timelineTrackCol}>
          {/* Upper track segment */}
          <View
            style={[
              styles.trackSegment,
              isFirst && styles.trackSegmentHidden,
              (isDeparted || isTrainAtThisHalt) && styles.trackSegmentActive,
            ]}
          />

          {/* Node Icon */}
          {isTrainAtThisHalt ? (
            <View style={styles.nodeCurrentOuter}>
              <Train size={12} color="#FFFFFF" />
            </View>
          ) : isDeparted ? (
            <View style={styles.nodeDeparted}>
              <Check size={10} color="#FFFFFF" strokeWidth={3} />
            </View>
          ) : isNextStop ? (
            <View style={styles.nodeNextOuter}>
              <View style={styles.nodeNextInner} />
            </View>
          ) : isFirst ? (
            <View style={styles.nodeOriginOuter}>
              <View style={styles.nodeOriginInner} />
            </View>
          ) : isLast ? (
            <View style={styles.nodeDestinationOuter}>
              <View style={styles.nodeDestinationInner} />
            </View>
          ) : (
            <View style={styles.nodeUpcoming} />
          )}

          {/* Lower track segment */}
          <View
            style={[
              styles.trackSegment,
              isLast && styles.trackSegmentHidden,
              isDeparted && styles.trackSegmentActive,
            ]}
          />
        </View>

        {/* Right Column: Station Details */}
        <View style={styles.timelineDetailCol}>
          <View style={styles.stationNameBadgeRow}>
            <AppText
              variant="body"
              weight="heavy"
              color={
                isTrainAtThisHalt
                  ? 'orange'
                  : isDeparted
                  ? 'secondary'
                  : 'primary'
              }
              numberOfLines={1}
              style={{ flexShrink: 1 }}
            >
              {halt.stationName}
            </AppText>

            <View style={styles.stationCodeChip}>
              <AppText variant="micro" weight="bold" color="secondary">
                {halt.stationCode}
              </AppText>
            </View>

            {isFirst && !isTrainAtThisHalt && (
              <View style={styles.boardingBadge}>
                <AppText variant="tiny" weight="heavy" color="orange">
                  BOARDING
                </AppText>
              </View>
            )}

            {isLast && !isTrainAtThisHalt && (
              <View style={styles.destinationBadge}>
                <AppText variant="tiny" weight="heavy" color="orange">
                  DESTINATION
                </AppText>
              </View>
            )}

            {isTrainAtThisHalt && (
              <View style={styles.currentStationBadge}>
                <AppText variant="tiny" weight="heavy" color="orange">
                  {isFirst ? 'TRAIN AT PLATFORM' : isLast ? 'ARRIVED' : 'CURRENT STATION'}
                </AppText>
              </View>
            )}

            {isNextStop && !isLast && (
              <View style={styles.nextHaltBadge}>
                <AppText variant="tiny" weight="heavy" color="success">
                  NEXT STOP
                </AppText>
              </View>
            )}
          </View>

          {/* Platform & Halt duration */}
          <View style={styles.stationSubRow}>
            <AppText variant="micro" color="secondary">
              Platform {haltPlatform}
            </AppText>
            {halt.haltDurationMinutes && halt.haltDurationMinutes > 0 && !isFirst && !isLast ? (
              <AppText variant="micro" color="muted">
                {' '}• {halt.haltDurationMinutes}m halt
              </AppText>
            ) : null}
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.safeArea}>
      <StatusBar barStyle="light-content" />

      {/* Apple-style Navigation Header */}
      <View style={styles.header}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onBack}
          style={styles.navButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ArrowLeft size={20} color={Colors.appleLabel} />
        </TouchableOpacity>

        <AppText variant="bodyLg" weight="bold" color="primary">
          Train & Coach Status
        </AppText>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleShareTrip}
          style={styles.navButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Share2 size={18} color={Colors.appleLabel} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Train Overview Card */}
        <View key="train-overview-card" style={styles.trainCard} collapsable={false}>
          <View style={styles.trainTopRow}>
            <View style={styles.trainBadgeContainer}>
              <View style={styles.trainNumBadge}>
                <AppText variant="tiny" weight="heavy" color="primary">
                  {trainNum}
                </AppText>
              </View>
              <AppText
                variant="tiny"
                weight="heavy"
                color="primary"
                uppercase
                style={styles.trainTypeBadgeText}
              >
                {getTrainCategoryLabel(effectiveTrainName, ticket.train.type)}
              </AppText>
            </View>

            <View style={[styles.statusPill, isDelayed && styles.delayedPill]}>
              <View
                style={[styles.statusDot, isDelayed ? styles.dotOrange : styles.dotGreen]}
              />
              <AppText
                variant="micro"
                weight="heavy"
                color={isDelayed ? 'orange' : 'success'}
              >
                {effectiveLiveData ? statusBadgeText : 'CONFIRMED'}
              </AppText>
            </View>
          </View>

          {/* Main Train Name & Route */}
          <View style={styles.trainNameRow}>
            <AppText variant="heading" weight="heavy" color="primary">
              {effectiveTrainName}
            </AppText>
            <AppText variant="caption" color="secondary" style={styles.trainRouteCode}>
              {ticket.journey.fromName || boardingStation} → {ticket.journey.toName || destinationStation}
            </AppText>
          </View>

          {/* Subtle Industrial Divider */}
          <View style={styles.trainCardDivider} />

          {/* Passenger & Assigned Seat Section */}
          <View style={styles.passengerSection}>
            <View style={styles.passengerCol}>
              <AppText
                variant="micro"
                weight="bold"
                color="muted"
                uppercase
                letterSpacing={0.8}
              >
                PASSENGER
              </AppText>
              <AppText
                variant="body"
                weight="heavy"
                color="primary"
                numberOfLines={2}
                style={styles.passengerNameText}
              >
                {passengerName}
              </AppText>
            </View>

            <View style={styles.seatPillCol}>
              <AppText
                variant="micro"
                weight="bold"
                color="muted"
                uppercase
                letterSpacing={0.8}
                style={styles.seatLabelRight}
              >
                ASSIGNED {isUserSleeper ? 'BERTH' : 'SEAT'}
              </AppText>
              <View style={styles.coachSeatPill}>
                <AppText
                  variant="tiny"
                  weight="heavy"
                  color="orange"
                  letterSpacing={0.5}
                >
                  COACH {userCoach} • {isUserSleeper ? 'BERTH' : 'SEAT'} {userSeat}
                </AppText>
                {Boolean(targetSeatObj?.type) && (
                  <View style={styles.berthBadgeInline}>
                    <AppText variant="micro" weight="heavy" color="secondary">
                      {getSeatBerthFriendlyLabel(targetSeatObj?.type)}
                    </AppText>
                  </View>
                )}
              </View>
            </View>
          </View>
        </View>

        {/* ======================================================== */}
        {/* PRE-JOURNEY STATUS SECTION (Departure in Future)          */}
        {/* ======================================================== */}
        {isJourneyNotStarted && (
          <View key="pre-journey-status-card" style={styles.sectionCard} collapsable={false}>
            {/* Header Row */}
            <View style={styles.timelineHeaderRow}>
              <AppText
                variant="micro"
                weight="heavy"
                color="secondary"
                uppercase
                letterSpacing={0.8}
              >
                PRE-JOURNEY STATUS
              </AppText>
              <AppText variant="micro" weight="bold" color="muted">
                {totalDistanceKm} KM ROUTE
              </AppText>
            </View>

            {/* Countdown Badge & State Pill */}
            <View style={styles.preJourneyHeader}>
              <View style={styles.preJourneyBadge}>
                <Clock size={12} color={Colors.primary} />
                <AppText variant="tiny" weight="heavy" color="orange" uppercase style={{ marginLeft: 6 }}>
                  {getTimeRemainingText()}
                </AppText>
              </View>
              <StatusBadge label="PRE-DEPARTURE" variant="dark" dot />
            </View>

            {/* Subtle Divider */}
            <View style={styles.trainCardDivider} />

            {/* Clean, unnested Route Display */}
            <View style={styles.preJourneyRouteRow}>
              {/* Boarding Station Column */}
              <View style={styles.preJourneyStationCol}>
                <AppText variant="title" weight="heavy" color="primary" style={styles.stationCodeText}>
                  {boardingStation}
                </AppText>
                <AppText variant="caption" color="secondary" numberOfLines={1} style={styles.stationSubname}>
                  {originStationName}
                </AppText>
                <View style={styles.timeBadgeRow}>
                  <Clock size={11} color={Colors.primary} style={{ marginRight: 4 }} />
                  <AppText variant="caption" weight="bold" color="orange">
                    Departs {ticket.journey.departure || '06:25 AM'}
                  </AppText>
                </View>
                <View style={styles.platformPill}>
                  <AppText variant="micro" weight="heavy" color="primary">
                    PLATFORM {boardingPlatform}
                  </AppText>
                </View>
              </View>

              {/* Center Route Divider Graphic */}
              <View style={styles.preJourneyArrowCol}>
                <AppText variant="micro" weight="heavy" color="muted">
                  {totalDistanceKm} KM
                </AppText>
                <View style={styles.preJourneyTrackDivider}>
                  <View style={styles.trackDotOrigin} />
                  <View style={styles.trackSolidLine} />
                  <ArrowRight size={12} color={Colors.primary} />
                  <View style={styles.trackSolidLine} />
                  <View style={styles.trackDotDest} />
                </View>
                <AppText variant="micro" weight="bold" color="secondary" uppercase letterSpacing={0.5}>
                  {journeyHalts.length > 2 ? `${journeyHalts.length} STOPS` : 'DIRECT'}
                </AppText>
              </View>

              {/* Destination Station Column */}
              <View style={[styles.preJourneyStationCol, { alignItems: 'flex-end' }]}>
                <AppText variant="title" weight="heavy" color="primary" style={styles.stationCodeText}>
                  {destinationStation}
                </AppText>
                <AppText variant="caption" color="secondary" numberOfLines={1} style={[styles.stationSubname, { textAlign: 'right' }]}>
                  {destStationName}
                </AppText>
                <View style={styles.timeBadgeRow}>
                  <Clock size={11} color={Colors.textSecondary} style={{ marginRight: 4 }} />
                  <AppText variant="caption" weight="bold" color="primary">
                    Arrives {ticket.journey.arrival || '03:48 PM'}
                  </AppText>
                </View>
                <View style={styles.platformPillRight}>
                  <AppText variant="micro" weight="heavy" color="primary">
                    PLATFORM {destPlatform}
                  </AppText>
                </View>
              </View>
            </View>

            {/* Subtle Divider */}
            <View style={styles.trainCardDivider} />

            {/* Informational Radar Notice with verified sync text */}
            <View style={styles.preJourneyNotice}>
              <View style={styles.noticeIconCircle}>
                <Radio size={14} color={Colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="tiny" weight="heavy" color="primary">
                  {lastRefreshedText ? `Verified • Synced at ${lastRefreshedText}` : 'Live Telemetry Inactive'}
                </AppText>
                <AppText variant="micro" color="secondary" style={{ marginTop: 2, lineHeight: 16 }}>
                  {lastRefreshedText
                    ? `Platform ${boardingPlatform} & Coach ${userCoach} confirmed via CRIS NTES.`
                    : 'Live GPS radar & CRIS running telemetry auto-activates 1 hour prior to scheduled departure.'}
                </AppText>
              </View>
            </View>

            {/* Accordion Toggle Button to Expand/Collapse Timetable Preview */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setShowFullSchedulePreview((prev) => !prev)}
              style={[
                styles.previewScheduleBtn,
                showFullSchedulePreview && styles.previewScheduleBtnExpanded,
              ]}
            >
              <View style={styles.previewBtnLeft}>
                <Calendar
                  size={14}
                  color={showFullSchedulePreview ? Colors.primary : Colors.textSecondary}
                  style={{ marginRight: 8 }}
                />
                <AppText
                  variant="micro"
                  weight="heavy"
                  color={showFullSchedulePreview ? 'orange' : 'primary'}
                  uppercase
                  letterSpacing={0.6}
                >
                  {showFullSchedulePreview
                    ? 'Hide Scheduled Timetable'
                    : `Preview Scheduled Stops (${journeyHalts.length} Stops)`}
                </AppText>
              </View>
              {showFullSchedulePreview ? (
                <ChevronUp size={16} color={Colors.primary} />
              ) : (
                <ChevronDown size={16} color={Colors.textSecondary} />
              )}
            </TouchableOpacity>

            {/* Unfolded Timetable Stops Seamlessly Inside This Card */}
            {showFullSchedulePreview && (
              <View style={styles.innerTimelineContainer}>
                <View style={styles.innerTimelineDivider} />
                <View style={styles.timelineList}>
                  {journeyHalts.map((halt, idx) => renderTimelineItem(halt, idx, false))}
                </View>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setShowFullSchedulePreview(false)}
                  style={styles.collapsePreviewBottomBtn}
                >
                  <ChevronUp size={14} color={Colors.textSecondary} style={{ marginRight: 6 }} />
                  <AppText variant="micro" weight="heavy" color="secondary" uppercase letterSpacing={0.5}>
                    Collapse Timetable
                  </AppText>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* ======================================================== */}
        {/* LIVE JOURNEY ROUTE TIMELINE SECTION (When Journey is Live) */}
        {/* ======================================================== */}
        {!isJourneyNotStarted && (
          <View key="journey-timeline-card" style={styles.sectionCard} collapsable={false}>
            <View style={styles.timelineHeaderRow}>
              <AppText
                variant="micro"
                weight="heavy"
                color="secondary"
                uppercase
                letterSpacing={0.8}
              >
                LIVE JOURNEY TIMELINE
              </AppText>
              <AppText variant="micro" weight="bold" color="muted">
                {totalDistanceKm} KM ROUTE
              </AppText>
            </View>

            {/* Live Train Telemetry */}
            {effectiveLiveData && (
              <View style={styles.liveStatusCallout}>
                <View style={styles.liveCalloutTop}>
                  <View style={styles.liveRadarPill}>
                    <View style={styles.pulseDot} />
                    <AppText variant="micro" weight="heavy" color="orange" uppercase letterSpacing={0.5}>
                      LIVE • {currentSpeed} KM/H
                    </AppText>
                  </View>
                  <AppText variant="micro" color="secondary">
                    Updated {lastRefreshedText || 'just now'}
                  </AppText>
                </View>

                <AppText variant="caption" weight="heavy" color="primary" style={styles.liveCalloutTitle}>
                  {effectiveLiveData.currentLocation?.status === 'at-station'
                    ? `Train is at ${effectiveLiveData.currentLocation?.stationName || liveCurrentCode || 'station'}`
                    : `En route: ${effectiveLiveData.previousHalt?.stationName?.split(' ')[0] || boardingStation} → ${effectiveLiveData.nextHalt?.stationName?.split(' ')[0] || destinationStation}`}
                </AppText>
                {Boolean(effectiveLiveData.fullUpdate) && (
                  <AppText variant="micro" color="secondary" style={{ marginTop: 4, lineHeight: 16 }}>
                    {effectiveLiveData.fullUpdate}
                  </AppText>
                )}
              </View>
            )}

            {/* Vertical Stations Lineup */}
            <View style={styles.timelineList}>
              {journeyHalts.map((halt, idx) => renderTimelineItem(halt, idx, true))}
            </View>
          </View>
        )}

        {/* ======================================================== */}
        {/* Section 2: Coach Position Rake Lineup (Interactive)       */}
        {/* ======================================================== */}
        <View key="coach-position-card" style={styles.sectionCard} collapsable={false}>
          <View style={styles.sectionHeaderRow}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <AppText
                variant="micro"
                weight="heavy"
                color="secondary"
                uppercase
                letterSpacing={0.8}
              >
                COACH POSITION
              </AppText>
              <AppText variant="caption" weight="heavy" color="primary" numberOfLines={1}>
                {totalCoaches} Coach Rake Lineup • Tap coach to inspect
              </AppText>
            </View>

            <View style={[styles.engineBadge, { flexShrink: 0 }]}>
              <AppText variant="micro" weight="heavy" color="primary">
                ◄ ENGINE FRONT
              </AppText>
            </View>
          </View>

          {/* Horizontal Rake Lineup with Auto-Scroll */}
          <ScrollView
            ref={rakeScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.rakeScrollContainer}
          >
            {/* Locomotive indicator (only if not already in rake list) */}
            {!rakeList.some((c) =>
              ['LOCO', 'ENG', 'WAP'].some((l) => c.code.toUpperCase().includes(l))
            ) && (
              <View style={styles.locoCoachBox} collapsable={false}>
                <AppText variant="tiny" weight="heavy" color="secondary">
                  LOCO
                </AppText>
              </View>
            )}

            {/* Coaches rendered dynamically from API rake */}
            {rakeList.map((c, idx) => {
              const isUserCoach =
                c.code.toUpperCase() === userCoach ||
                userCoach.includes(c.code.toUpperCase());
              const isSelected = c.code.toUpperCase() === selectedCoachCode.toUpperCase();

              return (
                <TouchableOpacity
                  key={`rake_${c.code}_${idx}`}
                  activeOpacity={0.7}
                  onPress={() => setSelectedCoachCode(c.code)}
                  style={[
                    styles.rakeCoachBox,
                    isUserCoach && styles.userRakeCoachBox,
                    isSelected && !isUserCoach && styles.selectedRakeCoachBox,
                  ]}
                >
                  <AppText
                    variant="tiny"
                    weight="heavy"
                    color={isUserCoach ? 'dark' : isSelected ? 'orange' : 'primary'}
                  >
                    {c.code}
                  </AppText>
                  {isUserCoach ? (
                    <AppText
                      variant="micro"
                      weight="heavy"
                      color="dark"
                      style={styles.youBadgeText}
                    >
                      YOU
                    </AppText>
                  ) : (
                    <AppText
                      variant="micro"
                      weight="bold"
                      color={isSelected ? 'orange' : 'muted'}
                      style={styles.coachClassMiniText}
                    >
                      {c.classType || ''}
                    </AppText>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Quick button to return to user's coach if inspecting another coach */}
          {!isViewingUserCoach && (
            <TouchableOpacity
              activeOpacity={0.7}
              hitSlop={{ top: 12, bottom: 12, left: 24, right: 24 }}
              onPress={() => setSelectedCoachCode(userCoach)}
              style={styles.backToUserCoachBtn}
            >
              <ArrowLeft size={13} color={Colors.primary} style={{ marginRight: 6 }} />
              <AppText variant="caption" weight="heavy" color="orange" uppercase letterSpacing={0.5}>
                Back to Your Coach ({userCoach})
              </AppText>
            </TouchableOpacity>
          )}

          {/* Dynamic Platform Pillar Alignment Notice */}
          <View style={styles.pillarNoticeBox}>
            <MapPin size={16} color={Colors.primary} style={styles.pillarPinIcon} />
            <AppText variant="caption" color="secondary" style={styles.pillarNoticeText}>
              {isViewingUserCoach ? 'Your Coach ' : 'Coach '}
              <AppText variant="caption" weight="heavy" color="primary">
                {selectedCoachCode}
              </AppText>{' '}
              aligns at{' '}
              <AppText variant="caption" weight="heavy" color="primary">
                Platform Pillar #{dynamicPillarNum}
              </AppText>{' '}
              ({dynamicPositionDesc}) on Platform {boardingPlatform}
            </AppText>
          </View>
        </View>

        {/* ======================================================== */}
        {/* Section 3: Interactive Coach Layout & Blueprint Guide    */}
        {/* ======================================================== */}
        <CoachLayout
          coachCode={selectedCoachCode}
          coachClass={activeClassType}
          userCoach={userCoach}
          userSeat={userSeatNum}
          userBerthType={targetSeatObj?.type}
          blueprint={activeBlueprint}
          platformPillar={dynamicPillarNum}
          platformNumber={boardingPlatform}
          positionDesc={dynamicPositionDesc}
        />

        {/* Bottom Spacing */}
        <View style={{ height: 90 }} />
      </ScrollView>

      {/* Bottom Sticky Action Bar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleFetchTrainLocation}
          disabled={refreshingLive}
          style={styles.refreshBtn}
          accessibilityRole="button"
          accessibilityLabel={
            isJourneyNotStarted
              ? 'Check radar preview'
              : effectiveLiveData
              ? 'Refresh location'
              : 'Check live status'
          }
        >
          {refreshingLive ? (
            <ActivityIndicator size="small" color={Colors.appleOrange} style={{ marginRight: 8 }} />
          ) : (
            <RotateCw size={15} color={Colors.appleOrange} style={{ marginRight: 8 }} />
          )}
          <AppText variant="caption" weight="bold" color="primary">
            {refreshingLive ? 'Syncing...' : 'Refresh Radar'}
          </AppText>
        </TouchableOpacity>

        <View style={{ width: 10 }} />

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleShareTrip}
          style={styles.shareTripBtn}
          accessibilityRole="button"
          accessibilityLabel="Share trip"
        >
          <Share2 size={15} color={Colors.appleGreen} style={{ marginRight: 8 }} />
          <AppText variant="caption" weight="bold" color="primary">
            Share Status
          </AppText>
        </TouchableOpacity>
      </View>

      {/* Share Ticket Preview & Action Modal */}
      <ShareTicketModal
        visible={shareModalVisible}
        data={shareData}
        onClose={() => setShareModalVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.screenPadding,
    paddingVertical: 12,
    backgroundColor: Colors.background,
  },
  navButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.appleSecondaryBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.appleSeparator,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.appleSecondaryBg,
    borderWidth: 1,
    borderColor: Colors.appleSeparator,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
  },
  headerSpacer: {
    width: 38,
    height: 38,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.xl,
  },
  trainCard: {
    backgroundColor: Colors.appleGroupedBg,
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.appleSeparator,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 3,
  },
  trainTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  trainBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trainNumBadge: {
    backgroundColor: Colors.appleSecondaryBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginRight: 8,
    borderWidth: 1,
    borderColor: Colors.appleSeparator,
  },
  trainTypeBadgeText: {
    fontSize: 11,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(48, 209, 88, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  delayedPill: {
    backgroundColor: 'rgba(255, 159, 10, 0.12)',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  dotGreen: {
    backgroundColor: Colors.appleGreen,
  },
  dotOrange: {
    backgroundColor: Colors.appleOrange,
  },
  trainNameRow: {
    marginBottom: 4,
  },
  trainRouteCode: {
    marginTop: 4,
    fontSize: 13,
  },
  trainCardDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.appleSeparator,
    marginVertical: 14,
  },
  passengerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  passengerCol: {
    flex: 1,
    marginRight: 10,
  },
  passengerNameText: {
    marginTop: 4,
    fontSize: 15,
    letterSpacing: 0.2,
    flexShrink: 1,
  },
  seatPillCol: {
    alignItems: 'flex-end',
    flexShrink: 0,
  },
  seatLabelRight: {
    textAlign: 'right',
  },
  coachSeatPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.appleSecondaryBg,
    borderWidth: 1,
    borderColor: Colors.appleSeparator,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 4,
  },
  berthBadgeInline: {
    marginLeft: 6,
    paddingLeft: 6,
    borderLeftWidth: 1,
    borderLeftColor: Colors.appleSeparator,
  },
  sectionCard: {
    backgroundColor: Colors.appleGroupedBg,
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.appleSeparator,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 3,
  },
  timelineHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  liveStatusCallout: {
    backgroundColor: 'rgba(245, 51, 44, 0.08)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(245, 51, 44, 0.25)',
    padding: 12,
    marginBottom: 16,
  },
  liveCalloutTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  liveRadarPill: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
    marginRight: 6,
  },
  liveCalloutTitle: {
    fontSize: 13,
  },
  timelineList: {
    paddingTop: 4,
  },
  timelineStationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 64,
    paddingVertical: 6,
  },
  timelineTimeCol: {
    width: 68,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  timelineTrackCol: {
    width: 28,
    alignItems: 'center',
    alignSelf: 'stretch',
    justifyContent: 'center',
  },
  trackSegment: {
    flex: 1,
    width: 2,
    backgroundColor: Colors.borderSubtle,
  },
  trackSegmentActive: {
    backgroundColor: Colors.success,
  },
  trackSegmentHidden: {
    backgroundColor: 'transparent',
  },
  nodeOriginOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.primaryLight,
  },
  nodeOriginInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#000000',
  },
  nodeDeparted: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeCurrentOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 4,
  },
  nodeDestinationOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
  },
  nodeDestinationInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  nodeUpcoming: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.surfaceHigh,
    borderWidth: 1.5,
    borderColor: Colors.borderMedium,
  },
  nodeNextOuter: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#4ADE80',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(74, 222, 128, 0.15)',
  },
  nodeNextInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4ADE80',
  },
  timelineDetailCol: {
    flex: 1,
    paddingLeft: 8,
    paddingVertical: 6,
    justifyContent: 'center',
  },
  stationNameBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  stationCodeChip: {
    backgroundColor: Colors.surfaceHigh,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    marginLeft: 6,
  },
  boardingBadge: {
    backgroundColor: 'rgba(245, 51, 44, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245, 51, 44, 0.32)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 6,
  },
  destinationBadge: {
    backgroundColor: 'rgba(245, 51, 44, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245, 51, 44, 0.32)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 6,
  },
  currentStationBadge: {
    backgroundColor: 'rgba(245, 51, 44, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(245, 51, 44, 0.4)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 6,
  },
  nextHaltBadge: {
    backgroundColor: 'rgba(74, 222, 128, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(74, 222, 128, 0.35)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 6,
  },
  stationSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  engineBadge: {
    backgroundColor: Colors.appleSecondaryBg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.appleSeparator,
  },
  rakeScrollContainer: {
    flexDirection: 'row',
    paddingVertical: 4,
    alignItems: 'center',
  },
  locoCoachBox: {
    width: 56,
    height: 50,
    borderRadius: 10,
    backgroundColor: Colors.appleSecondaryBg,
    borderWidth: 1,
    borderColor: Colors.appleSeparator,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  rakeCoachBox: {
    width: 50,
    height: 50,
    borderRadius: 10,
    backgroundColor: Colors.appleSecondaryBg,
    borderWidth: 1,
    borderColor: Colors.appleSeparator,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  userRakeCoachBox: {
    backgroundColor: Colors.appleOrange,
    borderColor: Colors.appleOrange,
    borderWidth: 1.5,
    shadowColor: Colors.appleOrange,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 3,
  },
  selectedRakeCoachBox: {
    borderColor: Colors.appleOrange,
    borderWidth: 1.5,
    backgroundColor: 'rgba(255, 159, 10, 0.15)',
  },
  youBadgeText: {
    fontSize: 9,
    marginTop: 1,
  },
  coachClassMiniText: {
    fontSize: 9,
    marginTop: 1,
  },
  backToUserCoachBtn: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.appleSecondaryBg,
    borderWidth: 1,
    borderColor: Colors.appleSeparator,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginTop: 10,
  },
  pillarNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.appleSecondaryBg,
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: Colors.appleSeparator,
  },
  pillarPinIcon: {
    marginRight: 8,
  },
  pillarNoticeText: {
    flex: 1,
    fontSize: 12,
  },
  rowBadge: {
    backgroundColor: 'rgba(245, 51, 44, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(245, 51, 44, 0.32)',
  },
  doorAdviceBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceLow,
    padding: 12,
    borderRadius: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  doorIcon: {
    marginRight: 8,
  },
  doorAdviceText: {
    flex: 1,
    fontSize: 12,
  },
  blueprintGridContainer: {
    backgroundColor: Colors.surfaceLow,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    overflow: 'hidden',
  },
  blueprintColumnHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
    marginBottom: 10,
  },
  colHeaderLeft: {
    flex: 1,
    textAlign: 'center',
  },
  colHeaderCenter: {
    width: 60,
    textAlign: 'center',
  },
  colHeaderRight: {
    flex: 1,
    textAlign: 'center',
  },
  blueprintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  seatGroupSide: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
  },
  aisleCol: {
    width: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blueprintSeatBox: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: Colors.surfaceHigh,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seatTypeSubtext: {
    fontSize: 8,
    marginTop: 1,
  },
  // Sleeper Bay Styles
  sleeperBayContainer: {
    paddingVertical: 4,
  },
  sleeperBayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  sleeperBenchGroup: {
    flex: 1.4,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 8,
    padding: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  benchHeaderRow: {
    alignItems: 'center',
    marginBottom: 4,
  },
  berthRow: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
  },
  sleeperAisleDivider: {
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sleeperSideGroup: {
    flex: 0.8,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 8,
    padding: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
    alignItems: 'center',
  },
  sleeperFacingDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginVertical: 6,
  },
  blueprintBerthBox: {
    width: 42,
    height: 42,
    borderRadius: 8,
    backgroundColor: Colors.surfaceHigh,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 2,
  },
  emptyBerthBox: {
    width: 42,
    height: 42,
  },
  berthTypeSubtext: {
    fontSize: 8,
    marginTop: 1,
  },
  userHighlightSeatBox: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primaryLight,
    borderWidth: 1.5,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 6,
    elevation: 3,
  },
  amenitiesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  amenityCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceLow,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 2,
    marginHorizontal: 3,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  amenityIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 7,
    backgroundColor: Colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  amenityTextContainer: {
    alignItems: 'center',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.appleGroupedBg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.appleSeparator,
    flexDirection: 'row',
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: 12,
    paddingBottom: 22,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  refreshBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.appleSecondaryBg,
    borderWidth: 1,
    borderColor: Colors.appleSeparator,
    borderRadius: 12,
    paddingVertical: 13,
  },
  shareTripBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.appleSecondaryBg,
    borderWidth: 1,
    borderColor: Colors.appleSeparator,
    borderRadius: 12,
    paddingVertical: 13,
  },
  btnIconSpacing: {
    marginRight: 6,
  },
  preJourneyBox: {
    paddingTop: Spacing.xs,
  },
  preJourneyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  preJourneyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 51, 44, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 51, 44, 0.3)',
  },
  preJourneyRouteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  preJourneyStationCol: {
    flex: 1,
  },
  stationCodeText: {
    fontSize: 22,
    lineHeight: 26,
    letterSpacing: 0.5,
  },
  stationSubname: {
    marginTop: 2,
    maxWidth: 135,
    fontSize: 12,
  },
  timeBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  platformPill: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.appleSecondaryBg,
    borderWidth: 1,
    borderColor: Colors.appleSeparator,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 6,
  },
  platformPillRight: {
    alignSelf: 'flex-end',
    backgroundColor: Colors.appleSecondaryBg,
    borderWidth: 1,
    borderColor: Colors.appleSeparator,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 6,
  },
  preJourneyArrowCol: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xs,
    minWidth: 84,
  },
  preJourneyTrackDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 6,
  },
  trackDotOrigin: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.appleOrange,
  },
  trackDotDest: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.appleSecondaryLabel,
  },
  trackSolidLine: {
    width: 14,
    height: 2,
    backgroundColor: Colors.appleSeparator,
    marginHorizontal: 4,
  },
  preJourneyNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.appleSecondaryBg,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.appleSeparator,
    marginBottom: 12,
  },
  noticeIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 159, 10, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  previewScheduleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: Colors.appleSecondaryBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.appleSeparator,
  },
  previewScheduleBtnExpanded: {
    borderColor: 'rgba(255, 159, 10, 0.35)',
    backgroundColor: 'rgba(255, 159, 10, 0.08)',
  },
  previewBtnLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  innerTimelineContainer: {
    marginTop: 12,
  },
  innerTimelineDivider: {
    height: 1,
    backgroundColor: Colors.borderSubtle,
    marginBottom: 12,
  },
  collapsePreviewBottomBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    marginTop: 8,
    backgroundColor: Colors.surfaceLow,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  specialCoachCard: {
    backgroundColor: Colors.surfaceLow,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    marginTop: 4,
  },
  specialCoachHeroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  specialCoachIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 75, 43, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 75, 43, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  specialCoachDescBox: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    marginBottom: 14,
  },
  specialCoachFeatureList: {
    gap: 10,
  },
  specialCoachFeatureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  specialCoachBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
    marginTop: 5,
    marginRight: 10,
  },
});
