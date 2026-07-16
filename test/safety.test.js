const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");

const paddocks=fs.readFileSync("paddocks.html","utf8");
const administration=fs.readFileSync("administration.html","utf8");
const adminScript=fs.readFileSync("assets/js/administration.js","utf8");
const realtime=fs.readFileSync("assets/js/status-realtime.js","utf8");
const shell=fs.readFileSync("assets/js/backstage-shell.js","utf8");

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

test("la navigation et les paramètres ne sont pas dupliqués",()=>{
  assert.doesNotMatch(administration,/class="admin-tabs"/);
  assert.match(administration,/data-admin-section="settings"/);
  assert.match(shell,/\["Paramètres","administration\.html\?section=settings"/);
  assert.ok(shell.indexOf('["Paramètres"')>shell.indexOf('["Utilisateurs"'));
});

test("l’éditeur des espaces est une fenêtre modale",()=>{
  assert.match(administration,/class="space-editor-overlay"/);
  assert.match(administration,/role="dialog" aria-modal="true"/);
  assert.match(adminScript,/document\.body\.classList\.add\("space-editor-open"\)/);
});
