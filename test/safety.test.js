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
const liberte=fs.readFileSync("liberte.html","utf8");
const liberteScript=fs.readFileSync("assets/js/liberte.js","utf8");
const home=fs.readFileSync("index.html","utf8");
const billing=fs.readFileSync("billing.html","utf8");
const billingScript=fs.readFileSync("assets/js/billing.js","utf8");
const homeSummary=fs.readFileSync("assets/js/home-summary.js","utf8");

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

test("le formulaire de réservation client conserve un vrai bouton de soumission",()=>{
  assert.match(paddocks,/id="adminReservationSubmit" type="submit"/);
  assert.match(paddocks,/if \(!button\.hasAttribute\("type"\)\) button\.type = "button"/);
  assert.match(paddocks,/adminReservationForm"\)\.addEventListener\("submit", createAdminReservation\)/);
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

test("l’onglet Liberté centralise les demandes sans supprimer leur rappel Paddocks",()=>{
  assert.match(shell,/\["Liberté","liberte\.html"/);
  assert.match(liberte,/id="liberteRequestForm"/);
  assert.match(liberte,/id="exceptionForm"/);
  assert.match(liberte,/id="liberteRequestList"/);
  assert.match(liberteScript,/ecurie-notifications-beta\.damiensiri-pro\.workers\.dev/);
  assert.match(liberteScript,/api\/admin\/liberte/);
  assert.doesNotMatch(liberte+liberteScript,/firebase/i);
  assert.match(paddocks,/id="paddockRequestList"/);
  assert.match(paddocks,/href="liberte\.html"/);
});

test("l’accueil donne accès à Liberté, à la facturation et aux thèmes bêta",()=>{
  assert.match(home,/href="liberte\.html"/);
  assert.match(home,/href="billing\.html"/);
  assert.match(home,/https:\/\/damiensiri\.github\.io\/push2-beta\/admin\.html/);
  assert.match(shell,/\["À facturer","billing\.html"/);
  assert.match(shell,/\["Thèmes","https:\/\/damiensiri\.github\.io\/push2-beta\/admin\.html"/);
});

test("la facturation consolidée reste sur Cloudflare D1 bêta",()=>{
  assert.match(billing,/BÊTA · D1/);
  assert.match(billingScript,/api\/admin\/billing/);
  assert.match(billingScript,/ecurie-notifications-beta\.damiensiri-pro\.workers\.dev/);
  assert.doesNotMatch(billing+billingScript,/firebase/i);
});

test("l’accueil récapitule uniquement les actions D1 à traiter",()=>{
  assert.match(home,/id="summaryBilling"/);
  assert.match(home,/id="summaryOrders"/);
  assert.match(home,/id="summaryRequests"/);
  assert.match(home,/id="summaryUsers"/);
  assert.match(homeSummary,/api\/admin\/billing/);
  assert.match(homeSummary,/api\/admin\/orders/);
  assert.match(homeSummary,/api\/admin\/liberte/);
  assert.match(homeSummary,/api\/admin\/users/);
  assert.doesNotMatch(homeSummary,/planning|reservations/i);
});
