(function(){
  const byId=id=>document.getElementById(id);
  const elements={apiUrl:byId("apiUrl"),token:byId("adminToken"),connect:byId("connectBtn"),connection:byId("connectionStatus"),
    form:byId("userForm"),firstName:byId("firstName"),lastName:byId("lastName"),email:byId("email"),cardNumber:byId("cardNumber"),
    role:byId("role"),password:byId("temporaryPassword"),createStatus:byId("createStatus"),refresh:byId("refreshBtn"),list:byId("usersList")};
  elements.apiUrl.value=localStorage.getItem("notifications_beta_api_url")||"https://ecurie-notifications-beta.damiensiri-pro.workers.dev";
  elements.token.value=localStorage.getItem("notifications_beta_admin_token")||"";
  function status(element,message,type=""){element.textContent=message;element.className="status"+(type?" "+type:"");}
  async function api(path,options={}){
    const base=elements.apiUrl.value.trim().replace(/\/$/,"");const token=elements.token.value;
    if(!base||!token)throw new Error("Adresse API et jeton requis");
    const response=await fetch(base+path,{...options,headers:{authorization:"Bearer "+token,...(options.body?{"content-type":"application/json"}:{})}});
    const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error||`Erreur ${response.status}`);return data;
  }
  function render(users){
    if(!users.length){elements.list.innerHTML='<p class="empty">Aucun compte bêta.</p>';return;}
    elements.list.replaceChildren(...users.map(user=>{
      const row=document.createElement("article");row.className="user-row";
      const copy=document.createElement("div");const name=document.createElement("strong");name.textContent=`${user.firstName} ${user.lastName}`;
      const meta=document.createElement("div");meta.className="user-meta";meta.textContent=`${user.email} · ${user.role} · ${user.status}${user.mustChangePassword?" · mot de passe temporaire":""}`;copy.append(name,meta);
      const actions=document.createElement("div");actions.className="user-actions";
      const reset=document.createElement("button");reset.type="button";reset.className="secondary";reset.textContent="Réinitialiser";reset.onclick=()=>resetPassword(user);
      const toggle=document.createElement("button");toggle.type="button";toggle.className=user.status==="active"?"danger":"secondary";toggle.textContent=user.status==="active"?"Désactiver":"Réactiver";toggle.onclick=()=>changeStatus(user);
      actions.append(reset,toggle);row.append(copy,actions);return row;
    }));
  }
  async function load(){status(elements.connection,"Chargement…");try{const users=await api("/api/admin/users");localStorage.setItem("notifications_beta_api_url",elements.apiUrl.value.trim());localStorage.setItem("notifications_beta_admin_token",elements.token.value);render(users);status(elements.connection,`${users.length} compte(s) bêta.`,"success");}catch(error){status(elements.connection,error.message,"error");}}
  async function changeStatus(user){try{await api(`/api/admin/users/${user.id}`,{method:"PATCH",body:JSON.stringify({status:user.status==="active"?"disabled":"active"})});await load();}catch(error){status(elements.connection,error.message,"error");}}
  async function resetPassword(user){const value=prompt(`Nouveau mot de passe temporaire pour ${user.firstName} (12 caractères minimum)`);if(value===null)return;try{await api(`/api/admin/users/${user.id}`,{method:"PATCH",body:JSON.stringify({temporaryPassword:value})});status(elements.connection,"Mot de passe temporaire remplacé et sessions fermées.","success");await load();}catch(error){status(elements.connection,error.message,"error");}}
  elements.form.addEventListener("submit",async event=>{event.preventDefault();status(elements.createStatus,"Création…");try{await api("/api/admin/users",{method:"POST",body:JSON.stringify({firstName:elements.firstName.value,lastName:elements.lastName.value,email:elements.email.value,cardNumber:elements.cardNumber.value,role:elements.role.value,temporaryPassword:elements.password.value})});elements.form.reset();status(elements.createStatus,"Compte bêta créé.","success");await load();}catch(error){status(elements.createStatus,error.message,"error");}});
  elements.connect.addEventListener("click",load);elements.refresh.addEventListener("click",load);if(elements.token.value)load();
})();
