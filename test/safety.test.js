const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");

const paddocks=fs.readFileSync("paddocks.html","utf8");
const administration=fs.readFileSync("administration.html","utf8");
const adminScript=fs.readFileSync("assets/js/administration.js","utf8");
const realtime=fs.readFileSync("assets/js/status-realtime.js","utf8");

test("la bêta Firebase est verrouillée en lecture seule",()=>{
  assert.match(paddocks,/const FIREBASE_READ_ONLY = true;/);
  assert.match(paddocks,/Bêta sécurisée[^<]+lecture seule/);
});

test("chaque action Firebase sensible possède un verrou",()=>{
  for(const name of ["enablePushNotifications","createBlockage","deleteBlockage","cancelReservation","saveRestriction","deleteRestriction","saveHours"]){
    const start=paddocks.indexOf(`function ${name}`);
    assert.notEqual(start,-1,`${name} doit exister`);
    assert.match(paddocks.slice(start,start+420),/FIREBASE_READ_ONLY/,`${name} doit être verrouillée`);
  }
});

test("l’administration utilise uniquement Cloudflare bêta",()=>{
  assert.match(adminScript,/ecurie-notifications-beta\.damiensiri-pro\.workers\.dev/);
  assert.doesNotMatch(adminScript,/ecurie-notifications-prod/);
  assert.match(realtime,/ecurie-notifications-beta\.damiensiri-pro\.workers\.dev/);
  assert.doesNotMatch(realtime,/ecurie-notifications-prod/);
  assert.match(administration,/>BÊTA</);
});
