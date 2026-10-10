import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { CoachLayout, isSleeperClass, getSeatTypeName } from '../src/components/coach/CoachLayout';
import { buildVandeBharatCCBlueprint, build3ABlueprint } from '../src/services/railService';

describe('CoachLayout Component', () => {
  it('correctly detects sleeper classes', () => {
    expect(isSleeperClass('3A')).toBe(true);
    expect(isSleeperClass('2A')).toBe(true);
    expect(isSleeperClass('SL')).toBe(true);
    expect(isSleeperClass('3E')).toBe(true);
    expect(isSleeperClass('1A')).toBe(true);
    expect(isSleeperClass('CC')).toBe(false);
    expect(isSleeperClass('EC')).toBe(false);
    expect(isSleeperClass('2S')).toBe(false);
  });

  it('translates seat type abbreviations into friendly names', () => {
    expect(getSeatTypeName('WS')).toBe('Window Seat');
    expect(getSeatTypeName('MS')).toBe('Middle Seat');
    expect(getSeatTypeName('AS')).toBe('Aisle Seat');
    expect(getSeatTypeName('LB')).toBe('Lower Berth');
    expect(getSeatTypeName('UB')).toBe('Upper Berth');
    expect(getSeatTypeName('SL')).toBe('Side Lower');
    expect(getSeatTypeName('SU')).toBe('Side Upper');
  });

  it('renders Chair Car (CC) layout with user seat highlighted', async () => {
    let root: any;
    await act(async () => {
      root = ReactTestRenderer.create(
        <CoachLayout
          coachCode="C2"
          coachClass="CC"
          userCoach="C2"
          userSeat="22"
          userBerthType="AS"
          blueprint={buildVandeBharatCCBlueprint()}
          platformPillar={19}
          platformNumber="5"
          positionDesc="Rear of train"
        />
      );
    });
    expect(root).toBeDefined();
    const json = JSON.stringify(root.toJSON());
    expect(json).toContain('C2');
    expect(json).toContain('YOUR COACH');
    expect(json).toContain('22');
    expect(json).toContain('Platform Pillar #');
  });

  it('renders Sleeper (3A) layout with user berth and bay navigation', async () => {
    let root: any;
    await act(async () => {
      root = ReactTestRenderer.create(
        <CoachLayout
          coachCode="B2"
          coachClass="3A"
          userCoach="B2"
          userSeat="35"
          userBerthType="UB"
          blueprint={build3ABlueprint()}
          platformPillar={14}
          platformNumber="3"
        />
      );
    });
    expect(root).toBeDefined();
    const json = JSON.stringify(root.toJSON());
    expect(json).toContain('B2');
    expect(json).toContain('35');
    expect(json).toContain('BAY 5');
  });

  it('renders specialized Pantry Car view cleanly without errors', async () => {
    let root: any;
    await act(async () => {
      root = ReactTestRenderer.create(
        <CoachLayout
          coachCode="PC"
          coachClass="PC"
          userCoach="C2"
          userSeat="22"
        />
      );
    });
    expect(root).toBeDefined();
    const json = JSON.stringify(root.toJSON());
    expect(json).toContain('PC');
    expect(json).toContain('PANTRY CAR (PC)');
    expect(json).toContain('Commercial train kitchen & meal assembly');
  });
});
