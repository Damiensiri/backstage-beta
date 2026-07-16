(function(){
  const links=[
    ["Accueil","index.html","⌂"],
    ["Espaces","administration.html?section=spaces","🏇"],
    ["Paddocks","paddocks.html","🗓️"],
    ["Notifications","administration.html?section=notifications","🔔"],
    ["Horaires","administration.html?section=general","🕘"],
    ["Alertes","administration.html?section=home-alert","⚠️"],
    ["Utilisateurs","#","👤",true]
  ];
  const button=document.createElement("button");
  button.className="backstage-menu-button";
  button.type="button";
  button.setAttribute("aria-label","Ouvrir le menu");
  button.setAttribute("aria-expanded","false");
  button.textContent="☰";
  const overlay=document.createElement("div");
  overlay.className="backstage-menu-overlay";
  const panel=document.createElement("aside");
  panel.className="backstage-menu";
  panel.setAttribute("aria-label","Navigation du Backstage");
  const title=document.createElement("p");
  title.className="backstage-menu-title";
  title.textContent="Navigation";
  const nav=document.createElement("nav");
  const current=location.pathname.split("/").pop()||"index.html";
  links.forEach(([label,href,icon,disabled])=>{
    const link=document.createElement("a");
    link.href=href;
    link.innerHTML=`<span aria-hidden="true">${icon}</span><span>${label}</span>`;
    if(disabled){link.classList.add("is-disabled");link.setAttribute("aria-disabled","true");}
    if(href.split("?")[0]===current)link.classList.add("is-current");
    nav.append(link);
  });
  panel.append(title,nav);
  document.body.append(button,overlay,panel);
  function toggle(force){
    const open=typeof force==="boolean"?force:!panel.classList.contains("is-open");
    panel.classList.toggle("is-open",open);
    overlay.classList.toggle("is-open",open);
    document.body.classList.toggle("menu-open",open);
    button.textContent=open?"×":"☰";
    button.setAttribute("aria-expanded",String(open));
    button.setAttribute("aria-label",open?"Fermer le menu":"Ouvrir le menu");
  }
  button.addEventListener("click",()=>toggle());
  overlay.addEventListener("click",()=>toggle(false));
  document.addEventListener("keydown",event=>{if(event.key==="Escape")toggle(false);});
})();
