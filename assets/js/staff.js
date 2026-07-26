(()=>{
"use strict";
const API=(localStorage.getItem("notifications_beta_api_url")||"https://ecurie-notifications-beta.damiensiri-pro.workers.dev").replace(/\/$/,"");
const TOKEN=localStorage.getItem("notifications_beta_admin_token")||"";
const TYPES={work:"Travail",rest:"Repos",leave:"Congés",sick:"Arrêt maladie",absence:"Absence"};
const $=id=>document.getElementById(id);
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
function monthLabel(month){return new Intl.DateTimeFormat("fr-FR",{month:"long",year:"numeric",timeZone:"UTC"}).format(parseDate(month+"-01"))}
function dateLabel(value){return new Intl.DateTimeFormat("fr-FR",{weekday:"long",day:"numeric",month:"long",year:"numeric",timeZone:"UTC"}).format(parseDate(value))}
function rowDate(value){return new Intl.DateTimeFormat("fr-FR",{weekday:"short",day:"2-digit",month:"2-digit",timeZone:"UTC"}).format(parseDate(value)).replace(".","")}
function shortDate(value){return new Intl.DateTimeFormat("fr-FR",{day:"2-digit",month:"2-digit",timeZone:"UTC"}).format(parseDate(value))}
function minutes(start,end){if(!start||!end)return 0;const [sh,sm]=start.split(":").map(Number),[eh,em]=end.split(":").map(Number);return Math.max(0,eh*60+em-sh*60-sm)}
function shiftMinutes(shift){return shift?.status==="work"?minutes(shift.morningStart,shift.morningEnd)+minutes(shift.afternoonStart,shift.afternoonEnd):0}
function duration(value){const total=Math.max(0,Number(value)||0);return`${Math.floor(total/60)}h${String(total%60).padStart(2,"0")}`}
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
function monthDates(){
  const first=state.month+"-01";const date=parseDate(first);date.setUTCMonth(date.getUTCMonth()+1);date.setUTCDate(0);
  return Array.from({length:date.getUTCDate()},(_,index)=>`${state.month}-${String(index+1).padStart(2,"0")}`);
}
function workText(shift){
  if(!shift)return'<span class="rest-label">Repos</span>';
  if(shift.status!=="work")return esc(TYPES[shift.status]||shift.status);
  const lines=[];
  if(shift.morningStart&&shift.morningEnd)lines.push(`${shift.morningStart}–${shift.morningEnd}`);
  if(shift.afternoonStart&&shift.afternoonEnd)lines.push(`${shift.afternoonStart}–${shift.afternoonEnd}`);
  return lines.join("<br>")||"Travail";
}
function monthTotal(employeeId){
  return state.shifts.filter(shift=>shift.employeeId===employeeId&&shift.date.startsWith(state.month)).reduce((sum,shift)=>sum+shiftMinutes(shift),0);
}
function renderEmployees(){
  $("employeeList").innerHTML=state.employees.map(employee=>`<div class="employee-chip" style="--employee-color:${employee.color}">
    <span class="employee-dot"></span>
    <button class="employee-edit" type="button" data-edit-employee="${employee.id}">${esc(employee.name)}</button>
    <button class="employee-delete" type="button" data-delete-employee="${employee.id}" aria-label="Supprimer ${esc(employee.name)}">×</button>
  </div>`).join("");
  document.querySelectorAll("[data-edit-employee]").forEach(button=>button.onclick=()=>editEmployee(Number(button.dataset.editEmployee)));
  document.querySelectorAll("[data-delete-employee]").forEach(button=>button.onclick=()=>deleteEmployee(Number(button.dataset.deleteEmployee)));
}
function renderSummary(){
  $("monthTitle").textContent=monthLabel(state.month).replace(/^./,letter=>letter.toUpperCase());
  $("monthRange").textContent=`01/${state.month.slice(5)} → ${monthDates().length}/${state.month.slice(5)}`;
  $("monthSummary").innerHTML=state.employees.map(employee=>`<article class="summary-card" style="--employee-color:${employee.color}">
    <span>${esc(employee.name)}</span><strong>${duration(monthTotal(employee.id))}</strong><span>sur le mois</span>
  </article>`).join("");
}
function renderCopyControls(){
  const options=weeks().map(days=>`<option value="${days[0]}">Semaine ${isoWeek(days[0])} · ${shortDate(days[0])}</option>`).join("");
  $("copySourceWeek").innerHTML=options;$("copyTargetWeek").innerHTML=options;
  if(weeks().length>1)$("copyTargetWeek").selectedIndex=1;
}
function renderMonth(){
  const map=shiftMap();const today=new Date().toISOString().slice(0,10);const dates=monthDates();
  let rows="";let currentWeek="";
  dates.forEach(date=>{
    const monday=addDays(date,-((parseDate(date).getUTCDay()+6)%7));
    if(monday!==currentWeek){
      currentWeek=monday;
      rows+=`<tr class="week-divider"><th colspan="${state.employees.length+2}">Semaine ${isoWeek(date)} · ${shortDate(monday)} au ${shortDate(addDays(monday,6))}</th></tr>`;
    }
    const cells=state.employees.map(employee=>{
      const shift=map.get(shiftKey(employee.id,date));const total=shiftMinutes(shift);
      return`<td class="month-cell status-${shift?.status||"empty"}${date===today?" today":""}" data-employee="${employee.id}" data-date="${date}">
        <span class="day-main">${workText(shift)}</span>${total?`<span class="day-total">${duration(total)}</span>`:""}
        ${shift?.note?`<span class="day-note">${esc(shift.note)}</span>`:""}
      </td>`;
    }).join("");
    const dayTotal=state.employees.reduce((sum,employee)=>sum+shiftMinutes(map.get(shiftKey(employee.id,date))),0);
    rows+=`<tr><th class="date-cell">${rowDate(date)}</th>${cells}<td class="all-total">${dayTotal?duration(dayTotal):"—"}</td></tr>`;
  });
  const employeeTotals=state.employees.map(employee=>`<td>${duration(monthTotal(employee.id))}</td>`).join("");
  $("staffMonthGrid").innerHTML=`<article class="month-card"><div class="month-scroll">
    <table class="month-table" style="min-width:${Math.max(760,190+state.employees.length*180)}px">
      <thead><tr><th>Date</th>${state.employees.map(employee=>`<th style="--employee-color:${employee.color}">${esc(employee.name)}</th>`).join("")}<th>Total</th></tr></thead>
      <tbody>${rows}</tbody><tfoot><tr><th>Total mois</th>${employeeTotals}<td>${duration(state.employees.reduce((sum,employee)=>sum+monthTotal(employee.id),0))}</td></tr></tfoot>
    </table></div></article>`;
  document.querySelectorAll(".month-cell").forEach(cell=>cell.onclick=()=>openShift(Number(cell.dataset.employee),cell.dataset.date));
  renderEmployees();renderSummary();renderCopyControls();
}
async function load(silent=false){
  if(!silent)setStatus("Chargement…");
  try{state=await api("/api/admin/staff-planning?month="+encodeURIComponent($("staffMonth").value));renderMonth();if(!silent)setStatus("Planning actualisé.","success")}
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
async function deleteEmployee(id){
  const employee=state.employees.find(item=>item.id===id);if(!employee)return;
  if(!confirm(`Supprimer définitivement ${employee.name} et toutes ses heures ?`))return;
  try{await api("/api/admin/staff-planning/employees/"+id,{method:"DELETE"});await load(true);setStatus("Salarié supprimé.","success")}
  catch(error){setStatus(error.message,"error")}
}

$("staffMonth").value=currentMonth();
$("previousMonth").onclick=()=>{const date=parseDate($("staffMonth").value+"-01");date.setUTCMonth(date.getUTCMonth()-1);$("staffMonth").value=iso(date).slice(0,7);load()};
$("nextMonth").onclick=()=>{const date=parseDate($("staffMonth").value+"-01");date.setUTCMonth(date.getUTCMonth()+1);$("staffMonth").value=iso(date).slice(0,7);load()};
$("staffMonth").onchange=()=>load();$("refreshStaff").onclick=()=>load();$("exportStaffPdf").onclick=()=>window.print();
$("copyWeek").onclick=async()=>{
  const sourceStart=$("copySourceWeek").value,targetStart=$("copyTargetWeek").value;
  if(sourceStart===targetStart){setStatus("Choisissez deux semaines différentes.","error");return}
  const targetLabel=$("copyTargetWeek").selectedOptions[0]?.textContent||"la semaine cible";
  if(!confirm(`Remplacer les horaires de ${targetLabel} par ceux de la semaine source ?`))return;
  try{await api("/api/admin/staff-planning/copy-week",{method:"POST",body:JSON.stringify({sourceStart,targetStart})});await load(true);setStatus("Semaine copiée avec succès.","success")}
  catch(error){setStatus(error.message,"error")}
};
$("toggleEmployeeForm").onclick=()=>{$("employeeForm").hidden=!$("employeeForm").hidden;if(!$("employeeForm").hidden)$("employeeName").focus()};
$("employeeForm").onsubmit=async event=>{event.preventDefault();try{await api("/api/admin/staff-planning/employees",{method:"POST",body:JSON.stringify({name:$("employeeName").value,color:$("employeeColor").value})});event.target.reset();$("employeeColor").value="#F27D2C";await load(true);setStatus("Salarié ajouté.","success")}catch(error){setStatus(error.message,"error")}};
$("shiftType").onchange=updateTotal;["morningStart","morningEnd","afternoonStart","afternoonEnd"].forEach(id=>$(id).oninput=updateTotal);
$("closeShiftDialog").onclick=()=>$("shiftDialog").close();
$("shiftForm").onsubmit=async event=>{event.preventDefault();const payload={employeeId:Number($("shiftEmployeeId").value),date:$("shiftIsoDate").value,status:$("shiftType").value,
  morningStart:$("morningStart").value,morningEnd:$("morningEnd").value,afternoonStart:$("afternoonStart").value,afternoonEnd:$("afternoonEnd").value,note:$("shiftNote").value};
  try{await api("/api/admin/staff-planning/shifts",{method:"PUT",body:JSON.stringify(payload)});$("shiftDialog").close();await load(true);setStatus("Journée enregistrée.","success")}catch(error){setStatus(error.message,"error")}};
$("deleteShift").onclick=async()=>{if(!confirm("Effacer cette journée ? Elle sera affichée comme Repos."))return;try{await api(`/api/admin/staff-planning/shifts/${$("shiftEmployeeId").value}/${$("shiftIsoDate").value}`,{method:"DELETE"});$("shiftDialog").close();await load(true);setStatus("Journée remise en repos.","success")}catch(error){setStatus(error.message,"error")}};
load();
})();
