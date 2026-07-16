const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");

const paddocks=fs.readFileSync("paddocks.html","utf8");
const administration=fs.readFileSync("administration.html","utf8");
const adminScript=fs.readFileSync("assets/js/administration.js","utf8");
const realtime=fs.readFileSync("assets/js/status-realtime.js","utf8");
const shell=fs.readFileSync("assets/js/backstage-shell.js","utf8");
const pushSettings=fs.readFileSync("assets/js/backstage-push.js","utf8");
const users=fs.readFileSync("assets/js/users.js","utf8");
const usersPage=fs.readFileSync("users.html","utf8");

test("le planning Backstage utilise uniquement Cloudflare D1 bêta",()=>{
  assert.match(paddocks,/ecurie-notifications-beta\.damiensiri-pro\.workers\.dev/);
  assert.match(paddocks,/Bêta Cloudflare\/D1/);
  assert.doesNotMatch(paddocks,/firebase-app-compat|firebase-firestore-compat|firebaseConfig|\.collection\(/);
});

test("les comptes utilisent uniquement le Worker Cloudflare bêta",()=>{
  assert.match(users,/ecurie-notifications-beta\.damiensiri-pro\.workers\.dev/);
  assert.doesNotMatch(users,/prod|firebase/i);
  assert.match(usersPage,/BÊTA · D1/);
  assert.match(shell,/\["Utilisateurs","users\.html"/);
});

test("chaque action paddock sensible appelle l’API D1 bêta",()=>{
  for(const name of ["createBlockage","deleteBlockage","cancelReservation","saveRestriction","deleteRestriction","saveHours"]){
    const start=paddocks.indexOf(`function ${name}`);
    assert.notEqual(start,-1,`${name} doit exister`);
    assert.match(paddocks.slice(start,start+1800),/paddockAdminApi/,`${name} doit utiliser D1`);
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

test("les notifications Backstage utilisent OneSignal et l’API Cloudflare bêta",()=>{
  assert.doesNotMatch(paddocks,/id="enablePushBtn"/);
  assert.match(administration,/id="enablePushBtn"/);
  assert.match(administration,/OneSignalSDK\.page\.js/);
  assert.doesNotMatch(administration,/firebase/i);
  assert.match(pushSettings,/api\/admin\/push\/subscription/);
  assert.match(pushSettings,/ecurie-notifications-beta\.damiensiri-pro\.workers\.dev/);
});
