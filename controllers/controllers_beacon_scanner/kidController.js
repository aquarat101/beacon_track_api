// kidsController.js
const { db } = require('../../firebase');
const fetch = require('node-fetch');

const LINE_TOKEN = process.env.CHANNEL_ACCESS_TOKEN || '';

/**
 * GET /api/kids/beacons
 * คืน set ของ beaconId ทั้งหมด (array)
 */
const getKidsBeacons = async (req, res) => {
  try {
    const snap = await db.collection('kids').get();
    const beacons = snap.docs.map(d => d.data().beaconId).filter(Boolean);
    return res.json({ success: true, data: Array.from(new Set(beacons)) });
  } catch (e) {
    console.error('getKidsBeacons', e);
    return res.status(500).json({ success: false, message: e.message });
  }
};

/**
 * POST /api/kids/updateStatus
 * body: { beaconId, beaconName, lat, lng, timestampMs (optional) }
 * - หา kid โดย beaconId
 * - อัปเดต lastLat/lastLng/lastSeenAt/lastZoneId/status
 * - ถ้า status เปลี่ยนจาก offline -> online: สร้าง beacon_zone_hits และส่ง LINE
 */
const updateKidStatus = async (req, res) => {
  try {
    const { beaconId, beaconName, lat, lng, timestampMs } = req.body;
    if (!beaconId) return res.status(400).json({ success: false, message: 'beaconId required' });

    // find kid
    const q = await db.collection('kids').where('beaconId', '==', beaconId).limit(1).get();
    if (q.empty) return res.status(404).json({ success: false, message: 'kid not found' });

    const doc = q.docs[0];
    const kid = doc.data();
    const now = timestampMs ? new Date(Number(timestampMs)) : new Date();

    // find closest zone server-side? we expect client to have zones and compute closest; but we can try to read lastZoneId from kid or compute later.
    // For parity, we use kid.lastZoneId if present OR try to find nearest zone based on given lat/lng
    let lastZoneId = kid.lastZoneId || '';
    if ((!lastZoneId || lastZoneId === '') && lat && lng) {
      // try to compute by comparing to places (simple nearest)
      const placesSnap = await db.collection('places').get();
      let best = null;
      let bestDist = Infinity;
      placesSnap.forEach(pdoc => {
        const pdata = pdoc.data();
        const plat = Number(pdata.lat);
        const plng = Number(pdata.lng);
        if (isNaN(plat) || isNaN(plng)) return;
        const d = distanceMeters(lat, lng, plat, plng);
        if (d < bestDist) { bestDist = d; best = pdoc.id; }
      });
      if (best) lastZoneId = best;
    }

    const updates = {
      lastLat: lat ?? kid.lastLat ?? null,
      lastLng: lng ?? kid.lastLng ?? null,
      lastSeenAt: now,
      lastZoneId: lastZoneId || kid.lastZoneId || ''
    };

    const prevStatus = kid.status || 'offline';
    let statusChangedToOnline = false;
    if (prevStatus !== 'online') {
      updates.status = 'online';
      statusChangedToOnline = true;
    }

    await doc.ref.update(updates);

    // if status changed to online -> create beacon_zone_hits and send LINE
    if (statusChangedToOnline) {
      const zoneDoc = lastZoneId ? await db.collection('places').doc(lastZoneId).get() : null;
      const zoneObj = zoneDoc && zoneDoc.exists ? zoneDoc.data() : null;
      const hit = {
        zoneId: lastZoneId || '',
        userId: zoneObj?.userId || kid.userId || '',
        type: zoneObj?.type || 'Other',
        beaconId,
        beaconName: beaconName || kid.name || '',
        device_lat: lat ?? null,
        device_lng: lng ?? null,
        state: 'Inside',
        timestamp: now
      };
      await db.collection('beacon_zone_hits').add(hit);

      // send LINE if parent userId exists
      const parentUserId = kid.userId;
      if (parentUserId) {
        const dateStr = formatDate(now);
        const msg = [
          {
            type: 'flex',
            altText: `Beacon Alert: ${kid.name || 'kid'}`,
            contents: {
              type: 'bubble',
              body: {
                type: 'box',
                layout: 'vertical',
                spacing: 'md',
                contents: [
                  { type: 'text', text: 'Piyo! Piyo!', weight: 'bold', color: '#1DB446', size: 'lg' },
                  { type: 'text', text: `${kid.name || 'A child'} has reached ${zoneObj?.name || 'a place'}`, wrap: true, color: '#555555', size: 'md' },
                  { type: 'text', text: `Time: ${dateStr}`, wrap: true, color: '#969494', size: 'sm' }
                ]
              }
            }
          }
        ];
        await sendLineMessage(parentUserId, msg);
      }
    }

    return res.json({ success: true, message: 'updated', updates });
  } catch (e) {
    console.error('updateKidStatus error', e);
    return res.status(500).json({ success: false, message: e.message });
  }
};

/**
 * POST /api/kids/checkOffline
 * body: { detectedBeacons: { beaconId: lastSeenMs, ... } }
*
* Backend will:
* - Iterate kids collection
* - For each kid: check last seen (from detectedBeacons map) and current stored status:
*   - If now - lastSeen > OFFLINE_COOLDOWN && status === 'online' -> set offline, create beacon_zone_exits, send LINE
*   - If status === 'offline' -> re-alert logic based on alertCounter / lastOfflineAt
*/
const OFFLINE_COOLDOWN = 120 * 1000; // 2 minutes

const checkOffline = async (req, res) => {
  try {
    const { detectedBeacons = {} } = req.body;
    const nowMs = Date.now();

    const kidsSnap = await db.collection('kids').get();
    const ops = [];

    kidsSnap.forEach(doc => {
      const k = doc.data();
      const beaconId = k.beaconId;
      if (!beaconId) return;
      const lastSeen = detectedBeacons[beaconId] || 0;
      const status = k.status || 'offline';
      const parentUserId = k.userId;
      const alertCounter = typeof k.alertCounter === 'number' ? k.alertCounter : 0;
      const kidName = k.name || 'No name';
      const lastZoneId = k.lastZoneId || '';

      // offline detection
      if ((nowMs - lastSeen) > OFFLINE_COOLDOWN && status === 'online') {
        // mark offline
        const offlineTimestamp = new Date();
        const updatePromise = doc.ref.update({
          status: 'offline',
          lastOfflineAt: offlineTimestamp,
          alertCounter: 0
        }).then(async () => {
          // find place name+type if possible
          let placeName = 'unknown place';
          let placeType = 'Other';
          if (lastZoneId) {
            const placeDoc = await db.collection('places').doc(lastZoneId).get();
            if (placeDoc.exists) {
              const pd = placeDoc.data();
              placeName = pd.name || placeName;
              placeType = pd.type || placeType;
            }
          }

          // create beacon_zone_exits
          const zoneExit = {
            zoneId: lastZoneId,
            userId: parentUserId,
            beaconId,
            type: placeType,
            state: 'Outside',
            timestamp: offlineTimestamp
          };
          await db.collection('beacon_zone_exits').add(zoneExit);

          // send LINE
          if (parentUserId) {
            const msg = [
              {
                type: 'flex',
                altText: `Offline Alert: ${kidName}`,
                contents: {
                  type: 'bubble',
                  body: {
                    type: 'box',
                    layout: 'vertical',
                    spacing: 'md',
                    contents: [
                      { type: 'text', text: 'Piyo! Piyo!', weight: 'bold', color: '#1DB446', size: 'lg' },
                      { type: 'text', text: `${kidName} is now offline at ${placeName}`, wrap: true, color: '#555555', size: 'md' },
                      { type: 'text', text: `Time: ${formatDate(offlineTimestamp)}`, wrap: true, color: '#969494', size: 'sm' }
                    ]
                  }
                }
              }
            ];
            await sendLineMessage(parentUserId, msg);
          }
        }).catch(err => console.error('error marking offline', err));
        ops.push(updatePromise);
      } else if (status === 'offline') {
        // re-alert logic
        const lastOfflineAt = k.lastOfflineAt ? new Date(k.lastOfflineAt._seconds ? k.lastOfflineAt._seconds * 1000 : k.lastOfflineAt).getTime() : 0;
        if (lastOfflineAt) {
          const intervals = [2 * 60 * 1000, 5 * 60 * 1000, 10 * 60 * 1000];
          if (alertCounter < 3) {
            const elapsed = nowMs - lastOfflineAt;
            const trigger = intervals.slice(0, alertCounter + 1).reduce((a, b) => a + b, 0);
            if (elapsed >= trigger) {
              // send re-alert
              const t = Math.floor(elapsed / 60000);
              const timeStr = t >= 60 ? `${Math.floor(t / 60)}h ${t % 60}m` : `${t}m`;
              const when = new Date();
              const msg = [
                {
                  type: 'flex',
                  altText: `Re-alert: ${kidName}`,
                  contents: {
                    type: 'bubble',
                    body: {
                      type: 'box',
                      layout: 'vertical',
                      spacing: 'md',
                      contents: [
                        { type: 'text', text: 'Piyo! Piyo!', weight: 'bold', color: '#1DB446', size: 'lg' },
                        { type: 'text', text: `${kidName}, No kid found since last seen (~${timeStr} ago)`, wrap: true, color: '#555555', size: 'md' },
                        { type: 'text', text: `Time: ${formatDate(when)}`, wrap: true, color: '#969494', size: 'sm' }
                      ]
                    }
                  }
                }
              ];
              const p = sendLineMessage(parentUserId, msg).then(async () => {
                await doc.ref.update({ alertCounter: alertCounter + 1 });
              });
              ops.push(p);
            }
          }
        }
      }
    });

    await Promise.all(ops);
    return res.json({ success: true, message: 'offline check done' });
  } catch (e) {
    console.error('checkOffline error', e);
    return res.status(500).json({ success: false, message: e.message });
  }
};

async function checkOfflineServerSide() {
  try {
    const nowMs = Date.now();
    const kidsSnap = await db.collection('kids').get();
    const ops = [];

    kidsSnap.forEach(doc => {
      const k = doc.data();
      const beaconId = k.beaconId;
      if (!beaconId) return;

      const lastSeenAt = k.lastSeenAt ? new Date(k.lastSeenAt._seconds ? k.lastSeenAt._seconds * 1000 : k.lastSeenAt).getTime() : 0;
      const status = k.status || 'offline';
      const parentUserId = k.userId;
      const alertCounter = typeof k.alertCounter === 'number' ? k.alertCounter : 0;
      const kidName = k.name || 'No name';
      const lastZoneId = k.lastZoneId || '';

      // offline detection
      if ((nowMs - lastSeenAt) > OFFLINE_COOLDOWN && status === 'online') {
        const offlineTimestamp = new Date();
        const p = doc.ref.update({
          status: 'offline',
          lastOfflineAt: offlineTimestamp,
          alertCounter: 0
        }).then(async () => {
          // get place info
          let placeName = 'unknown place', placeType = 'Other';
          if (lastZoneId) {
            const placeDoc = await db.collection('places').doc(lastZoneId).get();
            if (placeDoc.exists) {
              const pd = placeDoc.data();
              placeName = pd.name || placeName;
              placeType = pd.type || placeType;
            }
          }

          // create beacon_zone_exits
          const zoneExit = {
            zoneId: lastZoneId,
            userId: parentUserId,
            beaconId,
            type: placeType,
            state: 'Outside',
            timestamp: offlineTimestamp
          };
          await db.collection('beacon_zone_exits').add(zoneExit);

          // send LINE
          if (parentUserId) {
            const msg = [
              {
                type: 'flex',
                altText: `Offline Alert: ${kidName}`,
                contents: {
                  type: 'bubble',
                  body: {
                    type: 'box',
                    layout: 'vertical',
                    spacing: 'md',
                    contents: [
                      { type: 'text', text: 'Piyo! Piyo!', weight: 'bold', color: '#1DB446', size: 'lg' },
                      { type: 'text', text: `${kidName} is now offline at ${placeName}`, wrap: true, color: '#555555', size: 'md' },
                      { type: 'text', text: `Time: ${formatDate(offlineTimestamp)}`, wrap: true, color: '#969494', size: 'sm' }
                    ]
                  }
                }
              }
            ];
            await sendLineMessage(parentUserId, msg);
          }
        }).catch(err => console.error('error marking offline', err));

        ops.push(p);
      } else if (status === 'offline') {
        // re-alert logic (เหมือนเดิม)
        const lastOfflineAt = k.lastOfflineAt ? new Date(k.lastOfflineAt._seconds ? k.lastOfflineAt._seconds * 1000 : k.lastOfflineAt).getTime() : 0;
        if (lastOfflineAt) {
          const intervals = [2 * 60 * 1000, 5 * 60 * 1000, 10 * 60 * 1000];
          if (alertCounter < 3) {
            const elapsed = nowMs - lastOfflineAt;
            const trigger = intervals.slice(0, alertCounter + 1).reduce((a, b) => a + b, 0);
            if (elapsed >= trigger) {
              const t = Math.floor(elapsed / 60000);
              const timeStr = t >= 60 ? `${Math.floor(t / 60)}h ${t % 60}m` : `${t}m`;
              const when = new Date();
              const msg = [
                {
                  type: 'flex',
                  altText: `Re-alert: ${kidName}`,
                  contents: {
                    type: 'bubble',
                    body: {
                      type: 'box',
                      layout: 'vertical',
                      spacing: 'md',
                      contents: [
                        { type: 'text', text: 'Piyo! Piyo!', weight: 'bold', color: '#1DB446', size: 'lg' },
                        { type: 'text', text: `${kidName}, No kid found since last seen (~${timeStr} ago)`, wrap: true, color: '#555555', size: 'md' },
                        { type: 'text', text: `Time: ${formatDate(when)}`, wrap: true, color: '#969494', size: 'sm' }
                      ]
                    }
                  }
                }
              ];
              const p = sendLineMessage(parentUserId, msg).then(async () => {
                await doc.ref.update({ alertCounter: alertCounter + 1 });
              });
              ops.push(p);
            }
          }
        }
      }
    });

    await Promise.all(ops);
    console.log('✅ Server-side offline check done');
  } catch (e) {
    console.error('checkOfflineServerSide error', e);
  }
}

// run every 2 mins
setInterval(checkOfflineServerSide, 2 * 60 * 1000);

// small helpers
function distanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = v => v * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

async function sendLineMessage(to, messages) {
  if (!LINE_TOKEN) {
    console.warn('LINE token not configured, skip');
    return null;
  }
  try {
    const resp = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LINE_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ to, messages })
    });
    return resp;
  } catch (e) {
    console.error('sendLineMessage error', e);
  }
}

function formatDate(d) {
  try {
    const dt = d instanceof Date ? d : new Date(d);
    return dt.toLocaleString('en-GB'); // dd/mm/yyyy hh:mm:ss
  } catch (e) { return '' }
}


module.exports = {
  getKidsBeacons,
  updateKidStatus,
  checkOffline
};
