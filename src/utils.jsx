function parseTripDays(dates) {
  const MONTHS = {Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11};
  const m = dates?.match(/([A-Z][a-z]+)\s+(\d+).*?([A-Z][a-z]+)\s+(\d+)/);
  if (!m) return ["Day 1","Day 2","Day 3"];
  const start = new Date(2026, MONTHS[m[1]], parseInt(m[2]));
  const end   = new Date(2026, MONTHS[m[3]], parseInt(m[4]));
  const days  = [];
  for (let d = new Date(start); d <= end && days.length < 7; d.setDate(d.getDate()+1))
    days.push(d.toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"}));
  return days.length ? days : ["Day 1","Day 2","Day 3"];
}

function countDays(dates) {
  const MONTHS = {Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11};
  const m = dates?.match(/(\w+ \d+).*?(\w+ \d+)/);
  if (!m) return 3;
  try {
    const pd = s => { const p=s.trim().split(" "); return new Date(2026,MONTHS[p[0]],parseInt(p[1])); };
    return Math.max(1, Math.min(7, Math.round((pd(m[2])-pd(m[1]))/86400000)));
  } catch(e) { return 3; }
}

// ─────────────────────────────────────────────
// NAV BAR
// ─────────────────────────────────────────────
export { parseTripDays, countDays };