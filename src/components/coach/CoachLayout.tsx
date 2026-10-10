import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import {
  Compass,
  MapPin,
  Zap,
  Bed,
  Luggage,
  ShieldCheck,
  Coffee,
  Users,
  Wind,
  Utensils,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Layers,
  Eye,
  DoorOpen,
  DoorClosed,
  ArrowLeft,
} from 'lucide-react-native';
import { Colors } from '../../theme/colors';
import { Spacing } from '../../theme/spacing';
import { AppText } from '../common/AppText';
import {
  BlueprintClass,
  Cabin,
  CabinSeat,
  buildVandeBharatCCBlueprint,
  build3ABlueprint,
} from '../../services/railService';

export interface CoachLayoutProps {
  coachCode: string;
  coachClass: string;
  userCoach?: string;
  userSeat?: string | number;
  userBerthType?: string;
  blueprint?: BlueprintClass;
  platformPillar?: number;
  platformNumber?: string;
  positionDesc?: string;
}

/**
 * Returns true if the class is a sleeper class (3A, 2A, 1A, SL, 3E)
 */
export function isSleeperClass(classCode?: string): boolean {
  const c = (classCode || '').trim().toUpperCase();
  return ['3A', '2A', '1A', 'SL', '3E'].includes(c);
}

/**
 * Human-friendly title for seat or berth abbreviations
 */
export function getSeatTypeName(type?: string): string {
  switch ((type || '').toUpperCase()) {
    case 'WS': return 'Window Seat';
    case 'MS': return 'Middle Seat';
    case 'AS': return 'Aisle Seat';
    case 'LB': return 'Lower Berth';
    case 'MB': return 'Middle Berth';
    case 'UB': return 'Upper Berth';
    case 'SL': return 'Side Lower';
    case 'SM': return 'Side Middle';
    case 'SU': return 'Side Upper';
    case 'CB': return 'Cabin Berth';
    case 'CP': return 'Coupe Berth';
    default: return type ? `${type} Berth` : 'Standard Seat';
  }
}

export const CoachLayout: React.FC<CoachLayoutProps> = ({
  coachCode,
  coachClass,
  userCoach,
  userSeat,
  userBerthType,
  blueprint,
  platformPillar,
  platformNumber,
  positionDesc,
}) => {
  const normalizedCoachCode = (coachCode || 'C1').trim().toUpperCase();
  const normalizedUserCoach = (userCoach || '').trim().toUpperCase();
  const isViewingUserCoach = normalizedCoachCode === normalizedUserCoach;

  const userSeatNum = typeof userSeat === 'number' ? userSeat : parseInt(String(userSeat || '0'), 10) || 0;
  const isSleeper = isSleeperClass(coachClass);

  // Special Service coaches (Pantry Car, General Unreserved, Guard/Luggage/Power Car)
  const isPantry =
    coachClass === 'PC' || normalizedCoachCode.includes('PC');
  const isGeneral =
    ['GS', 'GEN'].includes(coachClass) || ['GS', 'GEN'].some((k) => normalizedCoachCode.includes(k));
  const isLuggagePower =
    ['SLR', 'EOG', 'LSR', 'DL1', 'DL2', 'LOCO'].includes(coachClass) ||
    ['SLR', 'EOG', 'LSR', 'LOCO'].some((k) => normalizedCoachCode.includes(k));
  const isSpecialCoach = !isViewingUserCoach && (isPantry || isGeneral || isLuggagePower);

  // Effective Blueprint resolution
  const activeBlueprint: BlueprintClass = useMemo(() => {
    if (blueprint && blueprint.cabins && blueprint.cabins.length > 0) {
      return blueprint;
    }
    return isSleeper ? build3ABlueprint() : buildVandeBharatCCBlueprint();
  }, [blueprint, isSleeper]);

  const cabins: Cabin[] = activeBlueprint.cabins || [];

  // Find user's cabin
  const userCabin = useMemo(() => {
    if (!isViewingUserCoach || !userSeatNum) return undefined;
    return cabins.find(
      (c) =>
        c.main.some((s) => s.number === userSeatNum) ||
        c.side.some((s) => s.number === userSeatNum)
    );
  }, [cabins, isViewingUserCoach, userSeatNum]);

  // Selected cabin number for focused view (defaults to user's cabin or first cabin)
  const [selectedCabinNum, setSelectedCabinNum] = useState<number>(1);
  const [viewMode, setViewMode] = useState<'focused' | 'full'>('focused');
  const [inspectedSeat, setInspectedSeat] = useState<CabinSeat | null>(null);

  // Sync selected cabin when coach changes or user cabin is found
  useEffect(() => {
    if (userCabin) {
      setSelectedCabinNum(userCabin.cabinNumber);
    } else if (cabins.length > 0) {
      setSelectedCabinNum(cabins[0].cabinNumber);
    }
    setInspectedSeat(null);
  }, [normalizedCoachCode, userCabin, cabins]);

  // Current active cabin in focused view
  const currentCabin = useMemo(() => {
    return cabins.find((c) => c.cabinNumber === selectedCabinNum) || cabins[0];
  }, [cabins, selectedCabinNum]);

  // Selected seat information
  const userSeatObj = useMemo(() => {
    if (!isViewingUserCoach || !userSeatNum || !userCabin) return undefined;
    return (
      userCabin.main.find((s) => s.number === userSeatNum) ||
      userCabin.side.find((s) => s.number === userSeatNum)
    );
  }, [isViewingUserCoach, userSeatNum, userCabin]);

  // Dynamic entrance door guidance
  const totalUnits = cabins.length || (isSleeper ? 9 : 16);
  const activeUnitNum = userCabin?.cabinNumber || selectedCabinNum;
  const isFrontDoor = activeUnitNum <= Math.ceil(totalUnits / 2);
  const doorName = isFrontDoor ? 'Front Entrance' : 'Rear Entrance';
  const walkCount = isFrontDoor ? activeUnitNum : totalUnits - activeUnitNum + 1;
  const walkUnitLabel = isSleeper ? 'Bay' : 'Row';

  // Amenities for the active coach class
  const classAmenities = useMemo(() => {
    if (isSleeper) {
      if (['1A', '2A', '3A', '3E'].includes(coachClass)) {
        return [
          { icon: Bed, label: 'Linen & Bedroll Included' },
          { icon: Zap, label: 'Charging Socket per Berth' },
          { icon: Wind, label: 'Central Air Conditioning' },
          { icon: Luggage, label: 'Under-Berth Luggage Space' },
        ];
      }
      return [
        { icon: Wind, label: 'Openable Window with Shutter' },
        { icon: Luggage, label: 'Full Under-Berth Storage' },
        { icon: Zap, label: 'Corridor Mobile Charger' },
      ];
    }
    if (coachClass === 'EC') {
      return [
        { icon: Sparkles, label: 'Executive Reclining Seats' },
        { icon: Zap, label: 'Individual Power & USB' },
        { icon: Utensils, label: 'Foldable Snack Table' },
        { icon: Wind, label: 'Quiet AC Salon Environment' },
      ];
    }
    return [
      { icon: Zap, label: 'Shared Power Outlet' },
      { icon: Luggage, label: 'Spacious Overhead Racks' },
      { icon: Utensils, label: 'Seatback Snack Table' },
      { icon: Wind, label: 'Climate-Controlled Cabin' },
    ];
  }, [coachClass, isSleeper]);

  // Pill strip ref for auto-scrolling to active row/bay
  const pillScrollRef = useRef<any>(null);

  // Render Special Service Coaches (PC, GS, SLR, etc.)
  if (isSpecialCoach) {
    let title = 'Service Coach';
    let subtitle = 'Railway operational equipment';
    let desc = 'This coach is reserved for train operation, logistics, or unreserved transit.';
    let IconComp = Luggage;
    let badge = 'SERVICE CAR';

    if (isPantry) {
      title = 'On-Board Catering & Pantry';
      subtitle = 'Commercial train kitchen & meal assembly';
      desc = 'Houses commercial hot cases, deep refrigeration, drinking water supplies, and IRCTC catering headquarters. No passenger berths are installed.';
      IconComp = Coffee;
      badge = 'PANTRY CAR (PC)';
    } else if (isGeneral) {
      title = 'General Unreserved Coach';
      subtitle = 'Open seating for second-class unreserved travelers';
      desc = 'Equipped with open longitudinal bench seating on a first-come, first-served basis. No numbered seat reservations or berths are allocated.';
      IconComp = Users;
      badge = 'UNRESERVED (GS)';
    } else if (isLuggagePower) {
      title = normalizedCoachCode.includes('EOG') ? 'End-On Generation Power Car' : 'Seating Cum Luggage Rake (SLR)';
      subtitle = '750V AC train power & railway parcels';
      desc = 'Houses diesel alternator sets supplying electrical power to train coaches, secure parcel lockers, and the Train Manager (Guard) cabin.';
      IconComp = Zap;
      badge = 'GUARD & POWER CAR';
    }

    return (
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <AppText variant="caption" weight="heavy" color="secondary" uppercase letterSpacing={0.8}>
              COACH {normalizedCoachCode} GUIDE
            </AppText>
            <AppText variant="subheading" weight="heavy" color="primary" style={{ marginTop: 2 }}>
              {title}
            </AppText>
          </View>
          <View style={styles.badgePill}>
            <AppText variant="micro" weight="heavy" color="orange">
              {badge}
            </AppText>
          </View>
        </View>

        <View style={styles.specialHeroBox}>
          <View style={styles.specialIconCircle}>
            <IconComp size={22} color={Colors.primary} />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <AppText variant="caption" weight="heavy" color="primary">
              {subtitle}
            </AppText>
            <AppText variant="tiny" color="secondary" style={{ marginTop: 4, lineHeight: 17 }}>
              {desc}
            </AppText>
          </View>
        </View>

        {platformPillar ? (
          <View style={styles.platformPillarBanner}>
            <MapPin size={14} color={Colors.primary} style={{ marginRight: 6 }} />
            <AppText variant="tiny" color="secondary">
              Positions near Platform Pillar <AppText variant="tiny" weight="heavy" color="primary">#{platformPillar}</AppText>
              {positionDesc ? ` (${positionDesc})` : ''} on Platform {platformNumber || '5'}
            </AppText>
          </View>
        ) : null}
      </View>
    );
  }

  // Helper to render an individual Seat / Berth Box
  const renderSeatItem = (s: CabinSeat, isSideBerth: boolean = false) => {
    const isUserSeat = isViewingUserCoach && s.number === userSeatNum;
    const isSelected = inspectedSeat?.number === s.number;

    return (
      <TouchableOpacity
        key={`seat_${s.number}`}
        activeOpacity={0.75}
        onPress={() => setInspectedSeat(s)}
        style={[
          styles.seatBox,
          isSideBerth && styles.sideBerthBox,
          isUserSeat && styles.userSeatBox,
          isSelected && !isUserSeat && styles.inspectedSeatBox,
        ]}
      >
        <AppText
          variant="tiny"
          weight="heavy"
          color={isUserSeat ? 'dark' : isSelected ? 'orange' : 'primary'}
        >
          {s.number}
        </AppText>
        <AppText
          variant="micro"
          weight="heavy"
          color={isUserSeat ? 'dark' : 'secondary'}
          style={styles.seatTypeTag}
        >
          {isUserSeat ? 'YOU' : s.type}
        </AppText>
      </TouchableOpacity>
    );
  };

  // Render a Single Bay (for Sleeper coaches: 3A, 2A, SL, 3E, 1A)
  const renderSleeperBay = (cabin: Cabin, isCompact: boolean = false) => {
    const isUserInBay = isViewingUserCoach && (
      cabin.main.some((s) => s.number === userSeatNum) ||
      cabin.side.some((s) => s.number === userSeatNum)
    );

    const halfMain = Math.ceil(cabin.main.length / 2);
    const benchLeft = cabin.main.slice(0, halfMain);
    const benchRight = cabin.main.slice(halfMain);

    return (
      <View
        key={`bay_${cabin.cabinNumber}`}
        style={[
          styles.bayContainer,
          isUserInBay && styles.userBayContainer,
          isCompact && { marginBottom: 12 },
        ]}
      >
        {/* Bay Header */}
        <View style={styles.bayHeaderRow}>
          <AppText variant="micro" weight="heavy" color={isUserInBay ? 'orange' : 'secondary'}>
            BAY {cabin.cabinNumber}
          </AppText>
          <AppText variant="micro" color="muted">
            {`Berths ${cabin.main[0]?.number || 1}–${
              cabin.side[cabin.side.length - 1]?.number || cabin.main[cabin.main.length - 1]?.number || 8
            }`}
          </AppText>
          {isUserInBay ? (
            <View style={styles.youBayBadge}>
              <AppText variant="micro" weight="heavy" color="orange">YOUR BAY</AppText>
            </View>
          ) : null}
        </View>

        {/* Bay Body: Facing Main Benches + Aisle + Side Berths */}
        <View style={styles.bayBodyRow}>
          {/* Main Compartment (Facing Benches) */}
          <View style={styles.bayMainBlock}>
            <View style={styles.benchColumn}>
              <AppText variant="micro" weight="bold" color="muted" style={styles.benchSideLabel}>
                BENCH A
              </AppText>
              <View style={styles.berthStack}>
                {benchLeft.map((s) => renderSeatItem(s, false))}
              </View>
            </View>

            <View style={styles.bayFacingSpacer}>
              <View style={styles.facingLine} />
              <AppText variant="micro" weight="heavy" color="muted">FACING</AppText>
              <View style={styles.facingLine} />
            </View>

            <View style={styles.benchColumn}>
              <AppText variant="micro" weight="bold" color="muted" style={styles.benchSideLabel}>
                BENCH B
              </AppText>
              <View style={styles.berthStack}>
                {benchRight.map((s) => renderSeatItem(s, false))}
              </View>
            </View>
          </View>

          {/* Central Aisle */}
          <View style={styles.bayAisleColumn}>
            <View style={styles.aisleDottedLine} />
            <AppText variant="micro" weight="heavy" color="muted" style={styles.aisleText}>
              AISLE
            </AppText>
            <View style={styles.aisleDottedLine} />
          </View>

          {/* Side Berths Corridor */}
          <View style={styles.baySideBlock}>
            <AppText variant="micro" weight="bold" color="muted" style={styles.benchSideLabel}>
              SIDE CORRIDOR
            </AppText>
            <View style={styles.berthStack}>
              {cabin.side.map((s) => renderSeatItem(s, true))}
            </View>
          </View>
        </View>
      </View>
    );
  };

  // Render a Single Row (for Chair Car coaches: CC, EC, 2S)
  const renderChairRow = (cabin: Cabin, isCompact: boolean = false) => {
    const isUserInRow = isViewingUserCoach && (
      cabin.main.some((s) => s.number === userSeatNum) ||
      cabin.side.some((s) => s.number === userSeatNum)
    );

    return (
      <View
        key={`row_${cabin.cabinNumber}`}
        style={[
          styles.chairRowContainer,
          isUserInRow && styles.userChairRowContainer,
          isCompact && { marginBottom: 10 },
        ]}
      >
        {/* Left Side Seats (Window to Aisle) */}
        <View style={styles.chairSeatsGroup}>
          <AppText variant="micro" weight="bold" color="muted" style={styles.windowLabel}>
            WINDOW
          </AppText>
          <View style={styles.seatsRow}>
            {cabin.main.map((s) => renderSeatItem(s, false))}
          </View>
        </View>

        {/* Central Aisle */}
        <View style={styles.chairAisleBlock}>
          <View style={styles.chairAisleLine} />
        </View>

        {/* Right Side Seats (Aisle to Window) */}
        <View style={styles.chairSeatsGroup}>
          <AppText variant="micro" weight="bold" color="muted" style={[styles.windowLabel, { textAlign: 'right' }]}>
            WINDOW
          </AppText>
          <View style={styles.seatsRow}>
            {cabin.side.map((s) => renderSeatItem(s, false))}
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.card} collapsable={false}>
      {/* 1. Coach Header */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <AppText variant="caption" weight="heavy" color="secondary" uppercase letterSpacing={0.8}>
              COACH {normalizedCoachCode}
            </AppText>
            {isViewingUserCoach ? (
              <View style={styles.userCoachTag}>
                <AppText variant="micro" weight="heavy" color="dark">
                  YOUR COACH
                </AppText>
              </View>
            ) : null}
          </View>
          <AppText variant="subheading" weight="heavy" color="primary" style={{ marginTop: 2 }}>
            {activeBlueprint.className || (isSleeper ? 'Sleeper Class' : 'Chair Car')}
          </AppText>
        </View>

        <View style={styles.badgePill}>
          <AppText variant="micro" weight="heavy" color="orange">
            {`${activeBlueprint.totalBerths} ${isSleeper ? 'BERTHS' : 'SEATS'}`}
          </AppText>
        </View>
      </View>

      {/* 2. User Seat Hero Card or Inspection Banner */}
      {isViewingUserCoach ? (
        <View style={styles.userSeatBanner}>
          <View style={styles.userSeatBadge}>
            <AppText variant="tiny" weight="heavy" color="dark">
              {isSleeper ? 'BERTH' : 'SEAT'}
            </AppText>
            <AppText variant="heading" weight="heavy" color="dark" style={{ lineHeight: 28 }}>
              {userSeatNum}
            </AppText>
          </View>

          <View style={styles.userSeatDetails}>
            <AppText variant="caption" weight="heavy" color="primary">
              {getSeatTypeName(userSeatObj?.type || userBerthType)} ({userSeatObj?.type || userBerthType || '--'})
            </AppText>
            <AppText variant="tiny" color="secondary" style={{ marginTop: 2 }}>
              {isSleeper ? `Bay #${userCabin?.cabinNumber || 1}` : `Row #${userCabin?.cabinNumber || 1}`}
              {' · '}
              Board via <AppText variant="tiny" weight="heavy" color="primary">{doorName}</AppText>
              {' · '}
              {walkCount} {walkUnitLabel}s from door
            </AppText>
          </View>
        </View>
      ) : (
        <View style={styles.inspectingBanner}>
          <Eye size={15} color={Colors.textSecondary} style={{ marginRight: 8 }} />
          <AppText variant="tiny" color="secondary" style={{ flex: 1 }}>
            Viewing layout for coach <AppText variant="tiny" weight="heavy" color="primary">{normalizedCoachCode}</AppText>.
            {' '}Tap any seat to inspect its position.
          </AppText>
        </View>
      )}

      {/* Platform & Pillar Alignment */}
      {platformPillar ? (
        <View style={styles.platformPillarBanner}>
          <MapPin size={13} color={Colors.primary} style={{ marginRight: 6 }} />
          <AppText variant="tiny" color="secondary">
            Aligns near <AppText variant="tiny" weight="heavy" color="primary">Platform Pillar #{platformPillar}</AppText>
            {positionDesc ? ` (${positionDesc})` : ''} on Platform {platformNumber || '5'}
          </AppText>
        </View>
      ) : null}

      {/* 3. View Mode Switcher (Focused Bay/Row vs Full Coach Map) */}
      <View style={styles.modeTabsRow}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setViewMode('focused')}
          style={[styles.modeTab, viewMode === 'focused' && styles.modeTabActive]}
        >
          <Layers size={13} color={viewMode === 'focused' ? Colors.primary : Colors.textMuted} style={{ marginRight: 6 }} />
          <AppText
            variant="micro"
            weight="heavy"
            color={viewMode === 'focused' ? 'orange' : 'muted'}
            letterSpacing={0.5}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {isViewingUserCoach
              ? (isSleeper ? 'MY BAY' : 'MY ROW')
              : (isSleeper ? 'BAY VIEW' : 'ROW VIEW')}
          </AppText>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setViewMode('full')}
          style={[styles.modeTab, viewMode === 'full' && styles.modeTabActive]}
        >
          <Compass size={13} color={viewMode === 'full' ? Colors.primary : Colors.textMuted} style={{ marginRight: 6 }} />
          <AppText
            variant="micro"
            weight="heavy"
            color={viewMode === 'full' ? 'orange' : 'muted'}
            letterSpacing={0.5}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            FULL COACH
          </AppText>
        </TouchableOpacity>
      </View>

      {/* 4. Layout Rendering Area */}
      {viewMode === 'focused' ? (
        <View style={styles.focusedSection}>
          {/* Row / Bay Stepper & Pill Strip */}
          <View style={styles.navigatorBar}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setSelectedCabinNum((prev) => Math.max(1, prev - 1))}
              disabled={selectedCabinNum <= 1}
              style={[styles.stepBtn, selectedCabinNum <= 1 && styles.stepBtnDisabled]}
            >
              <ChevronLeft size={16} color={selectedCabinNum <= 1 ? Colors.textMuted : Colors.textPrimary} />
            </TouchableOpacity>

            <ScrollView
              ref={pillScrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.pillStripContent}
            >
              {cabins.map((c) => {
                const isSelected = c.cabinNumber === selectedCabinNum;
                const isUserHere = isViewingUserCoach && c.cabinNumber === userCabin?.cabinNumber;

                return (
                  <TouchableOpacity
                    key={`pill_${c.cabinNumber}`}
                    activeOpacity={0.8}
                    onPress={() => {
                      setSelectedCabinNum(c.cabinNumber);
                      setInspectedSeat(null);
                    }}
                    style={[
                      styles.unitPill,
                      isSelected && styles.unitPillSelected,
                      isUserHere && !isSelected && styles.unitPillUser,
                    ]}
                  >
                    <AppText
                      variant="micro"
                      weight="heavy"
                      color={isSelected ? 'dark' : isUserHere ? 'orange' : 'secondary'}
                    >
                      {`${isSleeper ? 'BAY' : 'ROW'} ${c.cabinNumber}`}
                    </AppText>
                    {isUserHere && isSelected ? (
                      <AppText variant="micro" weight="heavy" color="dark" style={{ fontSize: 9 }}>
                        {' '}(YOU)
                      </AppText>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setSelectedCabinNum((prev) => Math.min(cabins.length, prev + 1))}
              disabled={selectedCabinNum >= cabins.length}
              style={[styles.stepBtn, selectedCabinNum >= cabins.length && styles.stepBtnDisabled]}
            >
              <ChevronRight size={16} color={selectedCabinNum >= cabins.length ? Colors.textMuted : Colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Quick jump to user's unit button if scrolled away */}
          {isViewingUserCoach && userCabin && selectedCabinNum !== userCabin.cabinNumber && (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                setSelectedCabinNum(userCabin.cabinNumber);
                setInspectedSeat(null);
              }}
              style={styles.jumpToUserBtn}
            >
              <ArrowLeft size={11} color={Colors.primary} style={{ marginRight: 5 }} />
              <AppText variant="micro" weight="heavy" color="orange">
                JUMP TO YOUR {isSleeper ? 'BAY' : 'ROW'} ({userCabin.cabinNumber})
              </AppText>
            </TouchableOpacity>
          )}

          {/* Active Cabin / Bay Renderer */}
          {currentCabin ? (
            <View style={styles.unitDisplayWrapper}>
              {isSleeper ? renderSleeperBay(currentCabin, false) : renderChairRow(currentCabin, false)}
            </View>
          ) : null}
        </View>
      ) : (
        /* Full Coach Scrollable Blueprint */
        <View style={styles.fullCoachSection}>
          {/* Front Coach Entrance Indicator */}
          <View style={styles.coachDoorHeader}>
            <View style={styles.doorLine} />
            <View style={styles.doorHeaderBadge}>
              <DoorOpen size={12} color={Colors.textMuted} style={{ marginRight: 6 }} />
              <AppText variant="micro" weight="heavy" color="muted" style={styles.doorHeaderLabel}>
                FRONT ENTRANCE · RESTROOMS
              </AppText>
            </View>
            <View style={styles.doorLine} />
          </View>

          {/* Scrollable coach container */}
          <ScrollView
            nestedScrollEnabled
            showsVerticalScrollIndicator
            style={styles.fullCoachScrollView}
            contentContainerStyle={styles.fullCoachScrollContent}
          >
            {cabins.map((c) =>
              isSleeper ? renderSleeperBay(c, true) : renderChairRow(c, true)
            )}
          </ScrollView>

          {/* Rear Coach Entrance Indicator */}
          <View style={styles.coachDoorFooter}>
            <View style={styles.doorLine} />
            <View style={styles.doorHeaderBadge}>
              <DoorClosed size={12} color={Colors.textMuted} style={{ marginRight: 6 }} />
              <AppText variant="micro" weight="heavy" color="muted" style={styles.doorHeaderLabel}>
                REAR ENTRANCE · RESTROOMS
              </AppText>
            </View>
            <View style={styles.doorLine} />
          </View>
        </View>
      )}

      {/* 5. Inspected Seat Detail Pill (when user taps any seat) */}
      {inspectedSeat ? (
        <View style={styles.inspectedSeatPill}>
          <AppText variant="tiny" weight="heavy" color="primary">
            {isSleeper ? 'Berth' : 'Seat'} {inspectedSeat.number}:{' '}
            <AppText variant="tiny" weight="bold" color="orange">
              {getSeatTypeName(inspectedSeat.type)} ({inspectedSeat.type})
            </AppText>
          </AppText>
          <TouchableOpacity
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            onPress={() => setInspectedSeat(null)}
          >
            <AppText variant="micro" weight="heavy" color="secondary" style={{ marginLeft: 12 }}>
              CLEAR
            </AppText>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* 6. Clean Seat Legend */}
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendBox, styles.legendBoxUser]} />
          <AppText variant="micro" color="secondary">Your Seat</AppText>
        </View>
        <View style={styles.legendItem}>
          <View style={styles.legendBox} />
          <AppText variant="micro" color="secondary">Standard</AppText>
        </View>
        <View style={styles.legendItem}>
          <AppText variant="micro" weight="heavy" color="muted">[W]</AppText>
          <AppText variant="micro" color="secondary" style={{ marginLeft: 3 }}>Window</AppText>
        </View>
        <View style={styles.legendItem}>
          <AppText variant="micro" weight="heavy" color="muted">[A]</AppText>
          <AppText variant="micro" color="secondary" style={{ marginLeft: 3 }}>Aisle</AppText>
        </View>
      </View>

      {/* 7. Coach Class Amenities */}
      <View style={styles.amenitiesContainer}>
        {classAmenities.map((am, idx) => {
          const Icon = am.icon;
          return (
            <View key={`amenity_${idx}`} style={styles.amenityChip}>
              <Icon size={12} color={Colors.primary} style={{ marginRight: 5 }} />
              <AppText variant="micro" color="secondary" numberOfLines={1}>
                {am.label}
              </AppText>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: Spacing.screenPadding,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    marginTop: Spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  userCoachTag: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  badgePill: {
    backgroundColor: Colors.surfaceHigh,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  specialHeroBox: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceHigh,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    marginTop: Spacing.xs,
  },
  specialIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surfaceHighest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userSeatBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceHigh,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.borderMedium,
    marginTop: Spacing.xs,
  },
  userSeatBadge: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 54,
  },
  userSeatDetails: {
    flex: 1,
    marginLeft: 12,
  },
  inspectingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceHigh,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    marginTop: Spacing.xs,
  },
  platformPillarBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceLowest,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 8,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  modeTabsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceLowest,
    borderRadius: 10,
    padding: 3,
    marginTop: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    overflow: 'hidden',
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderRadius: 7,
    overflow: 'hidden',
  },
  modeTabActive: {
    backgroundColor: Colors.surfaceHighest,
  },
  focusedSection: {
    marginTop: Spacing.sm,
  },
  navigatorBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.xs,
  },
  stepBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  stepBtnDisabled: {
    opacity: 0.35,
  },
  pillStripContent: {
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  unitPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceHigh,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginHorizontal: 3,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  unitPillSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  unitPillUser: {
    borderColor: Colors.primary,
  },
  jumpToUserBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    paddingVertical: 5,
    paddingHorizontal: 12,
    marginBottom: 4,
  },
  unitDisplayWrapper: {
    marginTop: 6,
  },
  fullCoachSection: {
    marginTop: Spacing.sm,
  },
  coachDoorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  coachDoorFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
  doorHeaderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: Colors.surfaceLowest,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  doorLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.borderSubtle,
  },
  doorHeaderLabel: {
    letterSpacing: 0.5,
  },
  fullCoachScrollView: {
    maxHeight: 380,
    backgroundColor: Colors.surfaceLowest,
    borderRadius: 12,
    padding: 8,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  fullCoachScrollContent: {
    paddingBottom: 8,
  },
  // Seat boxes
  seatBox: {
    width: 38,
    height: 42,
    borderRadius: 8,
    backgroundColor: Colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    margin: 2,
  },
  sideBerthBox: {
    width: 44,
  },
  userSeatBox: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  inspectedSeatBox: {
    borderColor: Colors.primary,
    backgroundColor: Colors.surfaceHighest,
  },
  seatTypeTag: {
    fontSize: 9,
    marginTop: 1,
  },
  // Sleeper Bay layout
  bayContainer: {
    backgroundColor: Colors.surfaceLowest,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  userBayContainer: {
    borderColor: Colors.borderMedium,
    backgroundColor: 'rgba(245, 51, 44, 0.04)',
  },
  bayHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  youBayBadge: {
    backgroundColor: 'rgba(245, 51, 44, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  bayBodyRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'space-between',
  },
  bayMainBlock: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  benchColumn: {
    flex: 1,
    alignItems: 'center',
  },
  benchSideLabel: {
    fontSize: 9,
    marginBottom: 4,
  },
  berthStack: {
    alignItems: 'center',
  },
  bayFacingSpacer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  facingLine: {
    width: 1,
    height: 16,
    backgroundColor: Colors.borderSubtle,
  },
  bayAisleColumn: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  aisleDottedLine: {
    flex: 1,
    width: 1,
    backgroundColor: Colors.borderSubtle,
  },
  aisleText: {
    fontSize: 8,
    marginVertical: 4,
  },
  baySideBlock: {
    alignItems: 'center',
    paddingLeft: 4,
  },
  // Chair Car row layout
  chairRowContainer: {
    backgroundColor: Colors.surfaceLowest,
    borderRadius: 12,
    padding: 8,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userChairRowContainer: {
    borderColor: Colors.borderMedium,
    backgroundColor: 'rgba(245, 51, 44, 0.04)',
  },
  chairSeatsGroup: {
    flex: 1,
  },
  windowLabel: {
    fontSize: 8,
    marginBottom: 2,
    paddingHorizontal: 4,
  },
  seatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chairAisleBlock: {
    width: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  chairAisleLine: {
    width: 2,
    height: 38,
    borderRadius: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  // Inspected Seat Pill
  inspectedSeatPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceHigh,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.borderMedium,
  },
  // Legend
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
    paddingTop: Spacing.xs,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  legendBox: {
    width: 10,
    height: 10,
    borderRadius: 3,
    backgroundColor: Colors.surfaceHighest,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    marginRight: 4,
  },
  legendBoxUser: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  // Amenities
  amenitiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: Spacing.sm,
    paddingTop: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  amenityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceLowest,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    marginRight: 6,
    marginTop: 6,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
});
