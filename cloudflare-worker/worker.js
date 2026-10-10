/* eslint-disable no-bitwise */
/* global crypto, TextEncoder, TextDecoder, btoa, atob, Response, URL, fetch */
/**
 * NORA Rail Proxy - Direct NTES Cloudflare Worker
 * 
 * 100% Pure Web Standard APIs (Zero imports, Zero Node dependencies)
 * Runs natively in Cloudflare Workers without any compatibility flags or external libraries.
 * 
 * Queries official National Train Enquiry System (NTES) mobile endpoint:
 * POST https://enquiry.indianrail.gov.in/crisns/AppServAnd
 */

// 1. Pure JavaScript MD5 (RFC 1321) - Zero imports required
function md5(string) {
  function safeAdd(x, y) {
    const lsw = (x & 0xffff) + (y & 0xffff);
    const msw = (x >> 16) + (y >> 16) + (lsw >> 16);
    return (msw << 16) | (lsw & 0xffff);
  }
  function bitRotateLeft(num, cnt) {
    return (num << cnt) | (num >>> (32 - cnt));
  }
  function md5cmn(q, a, b, x, s, t) {
    return safeAdd(bitRotateLeft(safeAdd(safeAdd(a, q), safeAdd(x, t)), s), b);
  }
  function md5ff(a, b, c, d, x, s, t) {
    return md5cmn((b & c) | (~b & d), a, b, x, s, t);
  }
  function md5gg(a, b, c, d, x, s, t) {
    return md5cmn((b & d) | (c & ~d), a, b, x, s, t);
  }
  function md5hh(a, b, c, d, x, s, t) {
    return md5cmn(b ^ c ^ d, a, b, x, s, t);
  }
  function md5ii(a, b, c, d, x, s, t) {
    return md5cmn(c ^ (b | ~d), a, b, x, s, t);
  }
  function binlMD5(x, len) {
    x[len >> 5] |= 0x80 << (len % 32);
    x[(((len + 64) >>> 9) << 4) + 14] = len;
    let a = 1732584193;
    let b = -271733879;
    let c = -1732584194;
    let d = 271733878;
    for (let i = 0; i < x.length; i += 16) {
      const olda = a;
      const oldb = b;
      const oldc = c;
      const oldd = d;
      a = md5ff(a, b, c, d, x[i], 7, -680876936);
      d = md5ff(d, a, b, c, x[i + 1], 12, -389564586);
      c = md5ff(c, d, a, b, x[i + 2], 17, 606105819);
      b = md5ff(b, c, d, a, x[i + 3], 22, -1044525330);
      a = md5ff(a, b, c, d, x[i + 4], 7, -176418897);
      d = md5ff(d, a, b, c, x[i + 5], 12, 1200080426);
      c = md5ff(c, d, a, b, x[i + 6], 17, -1473231341);
      b = md5ff(b, c, d, a, x[i + 7], 22, -45705983);
      a = md5ff(a, b, c, d, x[i + 8], 7, 1770035416);
      d = md5ff(d, a, b, c, x[i + 9], 12, -1958414417);
      c = md5ff(c, d, a, b, x[i + 10], 17, -42063);
      b = md5ff(b, c, d, a, x[i + 11], 22, -1990404162);
      a = md5ff(a, b, c, d, x[i + 12], 7, 1804603682);
      d = md5ff(d, a, b, c, x[i + 13], 12, -40341101);
      c = md5ff(c, d, a, b, x[i + 14], 17, -1502002290);
      b = md5ff(b, c, d, a, x[i + 15], 22, 1236535329);

      a = md5gg(a, b, c, d, x[i + 1], 5, -165796510);
      d = md5gg(d, a, b, c, x[i + 6], 9, -1069501632);
      c = md5gg(c, d, a, b, x[i + 11], 14, 643717713);
      b = md5gg(b, c, d, a, x[i], 20, -373897302);
      a = md5gg(a, b, c, d, x[i + 5], 5, -701558691);
      d = md5gg(d, a, b, c, x[i + 10], 9, 38016083);
      c = md5gg(c, d, a, b, x[i + 15], 14, -660478335);
      b = md5gg(b, c, d, a, x[i + 4], 20, -405537848);
      a = md5gg(a, b, c, d, x[i + 9], 5, 568446438);
      d = md5gg(d, a, b, c, x[i + 14], 9, -1019803690);
      c = md5gg(c, d, a, b, x[i + 3], 14, -187363961);
      b = md5gg(b, c, d, a, x[i + 8], 20, 1163531501);
      a = md5gg(a, b, c, d, x[i + 13], 5, -1444681467);
      d = md5gg(d, a, b, c, x[i + 2], 9, -51403784);
      c = md5gg(c, d, a, b, x[i + 7], 14, 1735328473);
      b = md5gg(b, c, d, a, x[i + 12], 20, -1926607734);

      a = md5hh(a, b, c, d, x[i + 5], 4, -378558);
      d = md5hh(d, a, b, c, x[i + 8], 11, -2022574463);
      c = md5hh(c, d, a, b, x[i + 11], 16, 1839030562);
      b = md5hh(b, c, d, a, x[i + 14], 23, -35309556);
      a = md5hh(a, b, c, d, x[i + 1], 4, -1530992060);
      d = md5hh(d, a, b, c, x[i + 4], 11, 1272893353);
      c = md5hh(c, d, a, b, x[i + 7], 16, -155497632);
      b = md5hh(b, c, d, a, x[i + 10], 23, -1094730640);
      a = md5hh(a, b, c, d, x[i + 13], 4, 681279174);
      d = md5hh(d, a, b, c, x[i], 11, -358537222);
      c = md5hh(c, d, a, b, x[i + 3], 16, -722521979);
      b = md5hh(b, c, d, a, x[i + 6], 23, 76029189);
      a = md5hh(a, b, c, d, x[i + 9], 4, -640364487);
      d = md5hh(d, a, b, c, x[i + 12], 11, -421815835);
      c = md5hh(c, d, a, b, x[i + 15], 16, 530742520);
      b = md5hh(b, c, d, a, x[i + 2], 23, -995338651);

      a = md5ii(a, b, c, d, x[i], 6, -198630844);
      d = md5ii(d, a, b, c, x[i + 7], 10, 1126891415);
      c = md5ii(c, d, a, b, x[i + 14], 15, -1416354905);
      b = md5ii(b, c, d, a, x[i + 5], 21, -57434055);
      a = md5ii(a, b, c, d, x[i + 12], 6, 1700485571);
      d = md5ii(d, a, b, c, x[i + 3], 10, -1894986606);
      c = md5ii(c, d, a, b, x[i + 10], 15, -1051523);
      b = md5ii(b, c, d, a, x[i + 1], 21, -2054922799);
      a = md5ii(a, b, c, d, x[i + 8], 6, 1873313359);
      d = md5ii(d, a, b, c, x[i + 15], 10, -30611744);
      c = md5ii(c, d, a, b, x[i + 6], 15, -1560198380);
      b = md5ii(b, c, d, a, x[i + 13], 21, 1309151649);
      a = md5ii(a, b, c, d, x[i + 4], 6, -145523070);
      d = md5ii(d, a, b, c, x[i + 11], 10, -1120210379);
      c = md5ii(c, d, a, b, x[i + 2], 15, 718787259);
      b = md5ii(b, c, d, a, x[i + 9], 21, -343485551);

      a = safeAdd(a, olda);
      b = safeAdd(b, oldb);
      c = safeAdd(c, oldc);
      d = safeAdd(d, oldd);
    }
    return [a, b, c, d];
  }
  function binl2rstr(input) {
    let output = '';
    for (let i = 0; i < input.length * 32; i += 8) {
      output += String.fromCharCode((input[i >> 5] >>> (i % 32)) & 0xff);
    }
    return output;
  }
  function rstr2binl(input) {
    const output = [];
    for (let i = 0; i < input.length * 8; i += 8) {
      output[i >> 5] |= (input.charCodeAt(i / 8) & 0xff) << (i % 32);
    }
    return output;
  }
  function rstr2hex(input) {
    const hexTab = '0123456789ABCDEF';
    let output = '';
    for (let i = 0; i < input.length; i++) {
      const x = input.charCodeAt(i);
      output += hexTab.charAt((x >>> 4) & 0x0f) + hexTab.charAt(x & 0x0f);
    }
    return output;
  }
  return rstr2hex(binl2rstr(binlMD5(rstr2binl(unescape(encodeURIComponent(string))), unescape(encodeURIComponent(string)).length * 8)));
}

// 2. Pure Native Web Crypto AES-128-CBC
const KEY_BYTES = new TextEncoder().encode('8EA4DB2CC1EB3DC5');
const IV_BYTES = new TextEncoder().encode('7DC5EB3BB4DB6EA8');
const SCKEY = '645fbc1e56e23365f2f3c204ae0899f6';
const NTES_URL = 'https://enquiry.indianrail.gov.in/crisns/AppServAnd';

function bytesToHex(bytes) {
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0').toUpperCase();
  }
  return hex;
}

function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

function bytesToBase64(bytes) {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) {
    bin += String.fromCharCode(bytes[i]);
  }
  return btoa(bin);
}

function base64ToBytes(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    bytes[i] = bin.charCodeAt(i);
  }
  return bytes;
}

async function encryptPayload(text) {
  const key = await crypto.subtle.importKey('raw', KEY_BYTES, { name: 'AES-CBC' }, false, ['encrypt']);
  const plainBytes = new TextEncoder().encode(text);
  const encBuffer = await crypto.subtle.encrypt({ name: 'AES-CBC', iv: IV_BYTES }, key, plainBytes);
  const b64 = bytesToBase64(new Uint8Array(encBuffer));
  return bytesToHex(new TextEncoder().encode(b64));
}

async function decryptPayload(hexStr) {
  let cleanHex = hexStr;
  if (cleanHex.includes('#')) cleanHex = cleanHex.split('#')[1];
  const b64Bytes = hexToBytes(cleanHex);
  const b64Str = new TextDecoder().decode(b64Bytes);
  const cipherBytes = base64ToBytes(b64Str);
  const key = await crypto.subtle.importKey('raw', KEY_BYTES, { name: 'AES-CBC' }, false, ['decrypt']);
  const decBuffer = await crypto.subtle.decrypt({ name: 'AES-CBC', iv: IV_BYTES }, key, cipherBytes);
  return JSON.parse(new TextDecoder().decode(decBuffer));
}

async function ntesPost(payload) {
  const wire = `${md5(payload + SCKEY)}#${await encryptPayload(payload)}`;
  const res = await fetch(NTES_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Dalvik/2.1.0 (Linux; Android 11)',
    },
    body: JSON.stringify({ jsonIn: wire }),
  });
  if (!res.ok) throw new Error(`NTES HTTP ${res.status}`);
  const json = await res.json();
  if (!json?.jsonIn) throw new Error('Missing jsonIn response from NTES');
  return decryptPayload(json.jsonIn);
}

function formatTrainName(raw) {
  if (!raw) return '';
  let name = raw
    .toLowerCase()
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
  name = name.replace(/\bExp\b/gi, 'Express');
  name = name.replace(/\bVandebharat\b/gi, 'Vande Bharat Express');
  name = name.replace(/\bRaj\b/gi, 'Rajdhani Express');
  name = name.replace(/\bSfg\b/gi, 'SF Express');
  name = name.replace(/\bJn\b/gi, 'Junction');
  return name.trim();
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const trainNumber = (url.searchParams.get('train') || '').trim();
    const stationCode = (url.searchParams.get('station') || '').trim().toUpperCase();
    const action = (url.searchParams.get('action') || url.searchParams.get('type') || '').trim().toLowerCase();

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=60',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (!trainNumber) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Please provide ?train=XXXXX parameter (e.g. ?train=11039)',
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    let instData;
    try {
      // 1. Get train metadata & recent instances from NTES
      instData = await ntesPost(
        `service=TrainRunningMob&subService=GetTrainInstance&trainNo=${trainNumber}`
      );

      const rawTrainName = instData?.TrainName || '';
      const formattedTrainName = formatTrainName(rawTrainName) || `Train ${trainNumber}`;

      // If user specifically requested train name / info, return immediately!
      if (action === 'name' || action === 'info') {
        return new Response(
          JSON.stringify({
            success: true,
            trainNumber,
            trainName: formattedTrainName,
            rawTrainName,
            trainNameHindi: instData?.TrainNameHindi || '',
            sourceStationCode: (instData?.Src || '').toUpperCase(),
            sourceStationName: formatTrainName(instData?.SrcName || ''),
            destinationStationCode: (instData?.Dstn || '').toUpperCase(),
            destinationStationName: formatTrainName(instData?.DstnName || ''),
          }),
          { status: 200, headers: corsHeaders }
        );
      }

      const instances = instData?.vInstanceList || [];
      const runningInstance = instances.find((i) => i.trainStatus === 1) || instances[0];
      const startDate = runningInstance?.startDate || '';

      // 2. Fetch full running status & station halts
      let live = null;
      if (startDate) {
        try {
          live = await ntesPost(
            `service=TrainRunningMob&subService=ShowFullRunJson&trainNo=${trainNumber}&startDate=${startDate}`
          );
        } catch (liveErr) {
          console.log(`Live telemetry fetch failed for ${trainNumber}:`, liveErr);
        }
      }

      if (!live || !live.STNS) {
        // Return train metadata without live telemetry if train is not actively running today
        return new Response(
          JSON.stringify({
            success: true,
            trainNumber,
            trainName: formattedTrainName,
            rawTrainName,
            sourceStation: formatTrainName(instData?.SrcName || ''),
            sourceStationCode: (instData?.Src || '').toUpperCase(),
            destinationStation: formatTrainName(instData?.DstnName || ''),
            destinationStationCode: (instData?.Dstn || '').toUpperCase(),
            startDate,
            currentStatus: runningInstance?.trainPosition || 'Scheduled Run',
            platform: 'TBD',
            totalCoaches: 0,
            coachPosition: '',
            coaches: [],
            totalStations: 0,
            stations: [],
            lastUpdatedAt: new Date().toISOString(),
            isLive: false,
            isCached: false,
          }),
          { status: 200, headers: corsHeaders }
        );
      }

      const rawStations = live.STNS || [];
      const stations = rawStations.map((s, idx) => ({
        sequence: parseInt(s.Sr || String(idx + 1), 10),
        stationCode: (s.SC || '').toUpperCase(),
        stationName: s.SN || '',
        scheduledArrival: s.STA,
        scheduledDeparture: s.STD,
        expectedArrival: s.ETA,
        expectedDeparture: s.ETD,
        delayArrivalMinutes: s.DARR,
        delayDepartureMinutes: s.DDEP,
        platform: s.PF && s.PF !== 'TBD' ? String(s.PF) : undefined,
        distanceKm: s.DIST,
        isArrived: s.ISA === true,
        isDeparted: s.ISD === true,
        coachPosition: s.arrivalCoachPosition || s.departureCoachPosition,
      }));

      // Find platform for requested station if provided
      let specificPlatform;
      if (stationCode) {
        const matched = stations.find((s) => s.stationCode === stationCode);
        if (matched?.platform) {
          specificPlatform = matched.platform;
        }
      }

      // Coach position layout
      const firstCoachPos = stations[0]?.coachPosition || stations.find((s) => s.coachPosition)?.coachPosition || '';
      const coachList = firstCoachPos
        ? firstCoachPos.split('-').map((code, idx) => ({
            position: idx + 1,
            coachCode: code,
            classType: code.startsWith('C') || code.startsWith('E') ? 'CC' : code.startsWith('B') ? '3A' : code.startsWith('A') ? '2A' : code.startsWith('S') ? 'SL' : 'GEN',
          }))
        : [];

      const payload = {
        success: true,
        trainNumber,
        trainName: live.TNM ? formatTrainName(live.TNM) : formattedTrainName,
        rawTrainName: live.TNM || rawTrainName,
        startDate,
        currentStatus: live.CPOS || runningInstance?.trainPosition || 'Running',
        fullUpdate: live.LUPDFULL || live.CPOS || '',
        currentStation: live.LSTNN || '',
        currentStationCode: live.LSTN || '',
        nextStationPassing: live.NSTNN || '',
        nextStationPassingCode: live.NSTN || '',
        nextHalt: live.NPSTNN || '',
        nextHaltCode: live.NPSTN || '',
        delayMinutes: parseInt(live.LDEL || '0', 10),
        distanceCoveredKm: live.LDSRC || 0,
        totalDistanceKm: live.TTLDIST || 0,
        sourceStation: live.SRCN || formatTrainName(instData?.SrcName || ''),
        sourceStationCode: (live.SRC || instData?.Src || '').toUpperCase(),
        destinationStation: live.DSTN || formatTrainName(instData?.DstnName || ''),
        destinationStationCode: (live.DSTN || instData?.Dstn || '').toUpperCase(),
        platform: specificPlatform || stations[0]?.platform || 'TBD',
        totalCoaches: coachList.length,
        coachPosition: firstCoachPos,
        coaches: coachList,
        totalStations: stations.length,
        stations,
        lastUpdatedAt: new Date().toISOString(),
        isLive: true,
        isCached: false,
      };

      return new Response(JSON.stringify(payload), {
        status: 200,
        headers: corsHeaders,
      });
    } catch (err) {
      if (instData?.TrainName) {
        return new Response(
          JSON.stringify({
            success: true,
            trainNumber,
            trainName: formatTrainName(instData.TrainName),
            rawTrainName: instData.TrainName,
            sourceStation: formatTrainName(instData.SrcName || ''),
            sourceStationCode: (instData.Src || '').toUpperCase(),
            destinationStation: formatTrainName(instData.DstnName || ''),
            destinationStationCode: (instData.Dstn || '').toUpperCase(),
            isLive: false,
          }),
          { status: 200, headers: corsHeaders }
        );
      }

      return new Response(
        JSON.stringify({
          success: false,
          error: err.message || 'Failed to fetch from NTES',
        }),
        { status: 500, headers: corsHeaders }
      );
    }
  },
};
