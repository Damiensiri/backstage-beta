(()=>{
"use strict";
const API=(localStorage.getItem("notifications_beta_api_url")||"https://ecurie-notifications-beta.damiensiri-pro.workers.dev").replace(/\/$/,"");
const TOKEN=localStorage.getItem("notifications_beta_admin_token")||"";
const $=id=>document.getElementById(id);
const DAYS=["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"];
const TYPES={work:"Travail",rest:"Repos",leave:"Congés",sick:"AT",absence:"Absence"};
let state={employees:[],shifts:[],range:null,month:""};

function esc(value){return String(value??"").replace(/[&<>'"]/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[char]))}
function setStatus(message,type=""){$("staffStatus").textContent=message;$("staffStatus").className="staff-status "+type}
async function api(path,options={}){
  if(!TOKEN)throw Error("Configurez le jeton dans Paramètres");
  const response=await fetch(API+path,{...options,headers:{authorization:"Bearer "+TOKEN,...(options.body?{"content-type":"application/json"}:{})},cache:"no-store"});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw Error(data.error||`Erreur ${response.status}`);
  return data;
}
function iso(date){return date.toISOString().slice(0,10)}
function parseDate(value){return new Date(value+"T12:00:00Z")}
function addDays(value,count){const date=parseDate(value);date.setUTCDate(date.getUTCDate()+count);return iso(date)}
function currentMonth(){const date=new Date();return`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}`}
function monthLabel(month){return new Intl.DateTimeFormat("fr-FR",{month:"long",year:"numeric",timeZone:"UTC"}).format(new Date(month+"-01T12:00:00Z"))}
function dateLabel(value){return new Intl.DateTimeFormat("fr-FR",{weekday:"long",day:"numeric",month:"long",year:"numeric",timeZone:"UTC"}).format(parseDate(value))}
function shortDate(value){return new Intl.DateTimeFormat("fr-FR",{day:"2-digit",month:"2-digit",timeZone:"UTC"}).format(parseDate(value))}
function minutes(start,end){if(!start||!end)return 0;const [sh,sm]=start.split(":").map(Number),[eh,em]=end.split(":").map(Number);return Math.max(0,eh*60+em-sh*60-sm)}
function shiftMinutes(shift){return shift?.status==="work"?minutes(shift.morningStart,shift.morningEnd)+minutes(shift.afternoonStart,shift.afternoonEnd):0}
function duration(value){const minutes=Math.max(0,Number(value)||0);return`${Math.floor(minutes/60)}h${String(minutes%60).padStart(2,"0")}`}
function shiftKey(employeeId,date){return`${employeeId}:${date}`}
function shiftMap(){return new Map(state.shifts.map(shift=>[shiftKey(shift.employeeId,shift.date),shift]))}
function isoWeek(value){
  const date=parseDate(value);const day=(date.getUTCDay()+6)%7;date.setUTCDate(date.getUTCDate()-day+3);
  const firstThursday=new Date(Date.UTC(date.getUTCFullYear(),0,4));const firstDay=(firstThursday.getUTCDay()+6)%7;
  firstThursday.setUTCDate(firstThursday.getUTCDate()-firstDay+3);
  return 1+Math.round((date-firstThursday)/604800000);
}
function weeks(){
  if(!state.range)return[];
  const result=[];let cursor=state.range.start;
  while(cursor<=state.range.end){result.push(Array.from({length:7},(_,index)=>addDays(cursor,index)));cursor=addDays(cursor,7)}
  return result;
}
function workText(shift){
  if(!shift)return"À renseigner";
  if(shift.status!=="work")return TYPES[shift.status]||shift.status;
  const lines=[];
  if(shift.morningStart&&shift.morningEnd)lines.push(`${shift.morningStart}–${shift.morningEnd}`);
  if(shift.afternoonStart&&shift.afternoonEnd)lines.push(`${shift.afternoonStart}–${shift.afternoonEnd}`);
  return lines.join("<br>")||"À renseigner";
}
function monthTotal(employeeId,map){
  return state.shifts.filter(shift=>shift.employeeId===employeeId&&shift.date.startsWith(state.month)).reduce((sum,shift)=>sum+shiftMinutes(shift),0);
}
function renderEmployees(){
  $("employeeList").innerHTML=state.employees.map(employee=>`<div class="employee-chip" style="--employee-color:${employee.color}">
    <span class="employee-dot"></span><button type="button" data-edit-employee="${employee.id}">${esc(employee.name)}</button>
  </div>`).join("");
  document.querySelectorAll("[data-edit-employee]").forEach(button=>button.onclick=()=>editEmployee(Number(button.dataset.editEmployee)));
}
function renderSummary(map){
  $("monthTitle").textContent=monthLabel(state.month).replace(/^./,letter=>letter.toUpperCase());
  $("monthRange").textContent=`${shortDate(state.range.start)} → ${shortDate(state.range.end)}`;
  $("monthSummary").innerHTML=state.employees.map(employee=>`<article class="summary-card" style="--employee-color:${employee.color}">
    <span>${esc(employee.name)}</span><strong>${duration(monthTotal(employee.id,map))}</strong><span>sur le mois civil</span>
  </article>`).join("");
}
function renderWeeks(){
  const map=shiftMap();const today=new Date().toISOString().slice(0,10);
  $("staffWeeks").innerHTML=weeks().map(days=>{
    const weekNumber=isoWeek(days[0]);
    const body=state.employees.map(employee=>{
      const cells=days.map(date=>{
        const shift=map.get(shiftKey(employee.id,date));const total=shiftMinutes(shift);const outside=!date.startsWith(state.month);
        return`<td class="day-cell status-${shift?.status||"empty"}${outside?" outside-month":""}${date===today?" today":""}"
          data-employee="${employee.id}" data-date="${date}">
          <span class="day-main">${workText(shift)}</span>${total?`<span class="day-total">${duration(total)}</span>`:""}
          ${shift?.note?`<span class="day-note">${esc(shift.note)}</span>`:""}
        </td>`;
      }).join("");
      const total=days.reduce((sum,date)=>sum+shiftMinutes(map.get(shiftKey(employee.id,date))),0);
      return`<tr><td class="employee-name" style="--employee-color:${employee.color}">${esc(employee.name)}</td>${cells}<td class="week-total">${duration(total)}</td></tr>`;
    }).join("");
    return`<article class="week-card"><header class="week-heading"><h2>Semaine ${weekNumber}</h2><span>${shortDate(days[0])} → ${shortDate(days[6])}</span></header>
      <div class="week-scroll"><table class="week-table"><thead><tr><th>Salarié</th>${days.map((date,index)=>`<th class="${date.startsWith(state.month)?"":"outside-month"}">${DAYS[index]}<br>${shortDate(date)}</th>`).join("")}<th>Total</th></tr></thead>
      <tbody>${body}</tbody></table></div></article>`;
  }).join("");
  document.querySelectorAll(".day-cell").forEach(cell=>cell.onclick=()=>openShift(Number(cell.dataset.employee),cell.dataset.date));
  renderEmployees();renderSummary(map);
}
async function load(silent=false){
  if(!silent)setStatus("Chargement…");
  try{state=await api("/api/admin/staff-planning?month="+encodeURIComponent($("staffMonth").value));renderWeeks();if(!silent)setStatus("Planning actualisé.","success")}
  catch(error){setStatus(error.message,"error")}
}
function updateTotal(){
  const status=$("shiftType").value;const total=status==="work"?
    minutes($("morningStart").value,$("morningEnd").value)+minutes($("afternoonStart").value,$("afternoonEnd").value):0;
  $("shiftHours").hidden=status!=="work";$("shiftTotal").textContent=duration(total);
}
function openShift(employeeId,date){
  const employee=state.employees.find(item=>item.id===employeeId);const shift=state.shifts.find(item=>item.employeeId===employeeId&&item.date===date);
  $("shiftEmployeeId").value=employeeId;$("shiftIsoDate").value=date;$("shiftEmployee").textContent=employee?.name||"";
  $("shiftDate").textContent=dateLabel(date);$("shiftType").value=shift?.status||"work";
  $("morningStart").value=shift?.morningStart||"";$("morningEnd").value=shift?.morningEnd||"";
  $("afternoonStart").value=shift?.afternoonStart||"";$("afternoonEnd").value=shift?.afternoonEnd||"";
  $("shiftNote").value=shift?.note||"";$("deleteShift").hidden=!shift;updateTotal();$("shiftDialog").showModal();
}
async function editEmployee(id){
  const employee=state.employees.find(item=>item.id===id);if(!employee)return;
  const name=prompt("Nom du salarié",employee.name);if(name===null)return;
  const color=prompt("Couleur au format #RRGGBB",employee.color);if(color===null)return;
  try{await api("/api/admin/staff-planning/employees/"+id,{method:"PATCH",body:JSON.stringify({name,color})});await load(true);setStatus("Salarié modifié.","success")}
  catch(error){setStatus(error.message,"error")}
}
$("staffMonth").value=currentMonth();
$("previousMonth").onclick=()=>{const date=new Date($("staffMonth").value+"-01T12:00:00Z");date.setUTCMonth(date.getUTCMonth()-1);$("staffMonth").value=iso(date).slice(0,7);load()};
$("nextMonth").onclick=()=>{const date=new Date($("staffMonth").value+"-01T12:00:00Z");date.setUTCMonth(date.getUTCMonth()+1);$("staffMonth").value=iso(date).slice(0,7);load()};
$("staffMonth").onchange=()=>load();$("refreshStaff").onclick=()=>load();$("exportStaffPdf").onclick=()=>window.print();
$("toggleEmployeeForm").onclick=()=>{$("employeeForm").hidden=!$("employeeForm").hidden;if(!$("employeeForm").hidden)$("employeeName").focus()};
$("employeeForm").onsubmit=async event=>{event.preventDefault();try{await api("/api/admin/staff-planning/employees",{method:"POST",body:JSON.stringify({name:$("employeeName").value,color:$("employeeColor").value})});event.target.reset();$("employeeColor").value="#F27D2C";await load(true);setStatus("Salarié ajouté.","success")}catch(error){setStatus(error.message,"error")}};
$("shiftType").onchange=updateTotal;["morningStart","morningEnd","afternoonStart","afternoonEnd"].forEach(id=>$(id).oninput=updateTotal);
$("closeShiftDialog").onclick=()=>$("shiftDialog").close();
$("shiftForm").onsubmit=async event=>{event.preventDefault();const payload={employeeId:Number($("shiftEmployeeId").value),date:$("shiftIsoDate").value,status:$("shiftType").value,
  morningStart:$("morningStart").value,morningEnd:$("morningEnd").value,afternoonStart:$("afternoonStart").value,afternoonEnd:$("afternoonEnd").value,note:$("shiftNote").value};
  try{await api("/api/admin/staff-planning/shifts",{method:"PUT",body:JSON.stringify(payload)});$("shiftDialog").close();await load(true);setStatus("Journée enregistrée.","success")}catch(error){setStatus(error.message,"error")}};
$("deleteShift").onclick=async()=>{if(!confirm("Effacer cette journée du planning ?"))return;try{await api(`/api/admin/staff-planning/shifts/${$("shiftEmployeeId").value}/${$("shiftIsoDate").value}`,{method:"DELETE"});$("shiftDialog").close();await load(true);setStatus("Journée effacée.","success")}catch(error){setStatus(error.message,"error")}};
load();
})();
