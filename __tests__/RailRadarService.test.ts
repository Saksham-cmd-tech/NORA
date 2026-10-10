import {
  getCoachPosition,
  getLiveTrainStatus,
  fetchTrainName,
} from '../src/services/railRadarService';
import { getTrainName, registerTrainName } from '../src/utils/stationLookup';

jest.setTimeout(15000);

describe('RailRadarService Caching & Quota Protection', () => {
  it('should return coach position for train 26101 with permanent cache', async () => {
    const coach1 = await getCoachPosition('26101');
    expect(coach1).toBeDefined();
    expect(coach1.trainNumber).toBe('26101');
    expect(coach1.rake.length).toBeGreaterThan(0);
    expect(coach1.blueprints?.CC).toBeDefined();

    // Second call should return cached version instantly
    const coach2 = await getCoachPosition('26101');
    expect(coach2.isCached).toBe(true);
    expect(coach2.trainNumber).toBe('26101');
  });

  it('should return live train status for train 26101 with rate-limit cooldown', async () => {
    const live1 = await getLiveTrainStatus('26101');
    expect(live1).toBeDefined();
    expect(live1.trainNumber).toBe('26101');
    expect(live1.currentLocation).toBeDefined();
    expect(live1.route.length).toBeGreaterThan(0);

    // Immediate second call should be served from cooldown cache (isCached: true)
    const live2 = await getLiveTrainStatus('26101');
    expect(live2.isCached).toBe(true);
  });

  it('should dynamically resolve passenger cabin and seat from blueprint', async () => {
    const coachData = await getCoachPosition('26101');
    const userCoachCode = 'C5';
    const userSeatNum = 64;

    const matchedCoach = coachData.rake.find(c => c.code === userCoachCode);
    expect(matchedCoach).toBeDefined();
    expect(matchedCoach?.classType).toBe('CC');

    const blueprint = coachData.blueprints?.[matchedCoach!.classType!];
    expect(blueprint).toBeDefined();
    expect(blueprint?.cabins.length).toBeGreaterThan(0);

    const userCabin = blueprint?.cabins.find(c =>
      c.main.some(s => s.number === userSeatNum) ||
      c.side.some(s => s.number === userSeatNum)
    );
    expect(userCabin).toBeDefined();
    expect(userCabin?.cabinNumber).toBe(13);

    const userSeat = userCabin?.side.find(s => s.number === userSeatNum);
    expect(userSeat).toBeDefined();
    expect(userSeat?.number).toBe(64);
    expect(userSeat?.type).toBe('WS');

    // Verify Row 12 has 55, 56, 57 (main) | 58, 59 (side)
    const row12 = blueprint?.cabins.find(c => c.cabinNumber === 12);
    expect(row12).toBeDefined();
    expect(row12?.main.map(s => s.number)).toEqual([55, 56, 57]);
    expect(row12?.side.map(s => s.number)).toEqual([58, 59]);

    // Verify Row 13 has 60, 61, 62 (main) | 63, 64 (side)
    const row13 = blueprint?.cabins.find(c => c.cabinNumber === 13);
    expect(row13).toBeDefined();
    expect(row13?.main.map(s => s.number)).toEqual([60, 61, 62]);
    expect(row13?.side.map(s => s.number)).toEqual([63, 64]);
  });

  it('should resolve train name locally or via dynamic registration', async () => {
    // 1. Static train lookup
    const name1 = await fetchTrainName('11039');
    expect(name1).toBe('Maharashtra Express');

    // 2. Dynamic registration of previously unmapped train
    registerTrainName('99999', 'Special Express');
    const name2 = await fetchTrainName('99999');
    expect(name2).toBe('Special Express');
    expect(getTrainName('99999')).toBe('Special Express');
  });
});
