/* AttendEase - Vanilla JavaScript + LocalStorage
   Data is stored in this browser only; this is not secure multi-user authentication. */

const STORAGE_KEY = "attendEaseData";
const defaultData = () => ({
  profile: { name: "", college: "", course: "" },
  subjects: [],
  attendance: [],
  timetable: [],
  settings: { theme: "light", overallTarget: 75 }
});

let appData = defaultData();
let calendarCursor = new Date();
let toastTimer;

const $ = (id) => document.getElementById(id);
const safeText = (value) => String(value ?? "").replace(/[&<>"']/g, c => ({
  "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
}[c]));
const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
};

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      appData = {
        ...defaultData(),
        ...parsed,
        profile: { ...defaultData().profile, ...(parsed.profile || {}) },
        settings: { ...defaultData().settings, ...(parsed.settings || {}) },
        subjects: Array.isArray(parsed.subjects) ? parsed.subjects : [],
        attendance: Array.isArray(parsed.attendance) ? parsed.attendance : [],
        timetable: Array.isArray(parsed.timetable) ? parsed.timetable : []
      };
    }
  } catch (error) {
    console.error("Could not read saved AttendEase data:", error);
    showToast("Saved data could not be read. A fresh profile will be started.");
  }
}

function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
    return true;
  } catch (error) {
    console.error("Could not save AttendEase data:", error);
    showToast("Could not save data. Browser storage may be full.");
    return false;
  }
}

function showToast(message) {
  const toast = $("toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
}

function openModal(id) { $(id).classList.remove("hidden"); }
function closeModal(id) { $(id).classList.add("hidden"); }

function subjectStats(subjectId) {
  const records = appData.attendance.filter(r => r.subjectId === subjectId && r.status !== "Cancelled");
  const attended = records.filter(r => r.status === "Present").length;
  const total = records.length;
  return { total, attended, absent: total - attended, percentage: total ? attended / total * 100 : 0 };
}

function overallStats() {
  const records = appData.attendance.filter(r => r.status !== "Cancelled");
  const attended = records.filter(r => r.status === "Present").length;
  const total = records.length;
  return { total, attended, absent: total - attended, percentage: total ? attended / total * 100 : 0 };
}

// Maximum consecutive future absences while maintaining target.
// floor(attended / targetFraction - total), with floating-point tolerance.
function safeBunks(attended, total, targetPercent) {
  const target = Number(targetPercent) / 100;
  if (!Number.isFinite(target) || target <= 0 || target > 1 || total === 0) return null;
  if (attended / total + 1e-10 < target) return 0;
  return Math.max(0, Math.floor((attended / target) - total + 1e-10));
}

function classesToRecover(attended, total, targetPercent) {
  const target = Number(targetPercent) / 100;
  if (!Number.isFinite(target) || target <= 0 || target > 1) return null;
  if (total === 0) return 0;
  if (attended / total + 1e-10 >= target) return 0;
  return Math.max(0, Math.ceil((target * total - attended) / (1 - target) - 1e-10));
}

function navigate(pageId) {
  document.querySelectorAll(".page").forEach(p => p.classList.toggle("active", p.id === pageId));
  document.querySelectorAll(".nav-link[data-page]").forEach(b => b.classList.toggle("active", b.dataset.page === pageId));
  const names = {dashboard:"Dashboard",subjects:"My Subjects",calculator:"Bunk Calculator",analytics:"Analytics",calendar:"Attendance Calendar",timetable:"Timetable"};
  $("pageTitle").textContent = names[pageId] || "AttendEase";
  $("sidebar").classList.remove("open");
  if (pageId === "analytics") drawAllCharts();
  if (pageId === "calendar") renderCalendar();
}

function renderProfile() {
  const name = appData.profile.name || "Student";
  $("studentGreeting").textContent = name.split(" ")[0];
  $("profileAvatar").textContent = name.trim().charAt(0).toUpperCase() || "S";
  document.title = `AttendEase | ${name}`;
}

function renderSubjectOptions() {
  const options = appData.subjects.map(s => `<option value="${safeText(s.id)}">${safeText(s.name)}</option>`).join("");
  ["attendanceSubject","calculatorSubject","recoverySubject","timetableSubject"].forEach(id => {
    const el = $(id);
    const previous = el.value;
    el.innerHTML = `<option value="">Choose subject</option>${options}`;
    if (appData.subjects.some(s => s.id === previous)) el.value = previous;
  });
}

function renderDashboard() {
  const stats = overallStats();
  const target = Number(appData.settings.overallTarget || 75);
  $("overallPercentage").textContent = `${stats.percentage.toFixed(1)}%`;
  $("totalClasses").textContent = stats.total;
  $("attendedClasses").textContent = stats.attended;
  const bunks = safeBunks(stats.attended, stats.total, target);
  $("safeBunks").textContent = bunks === null ? "—" : bunks;
  $("overallStatus").textContent = stats.total ? (stats.percentage >= target ? `Above your ${target}% target` : `Below your ${target}% target`) : "No attendance recorded yet";
  $("calcOverallPercentage").textContent = `${stats.percentage.toFixed(1)}%`;
  $("calcTotalClasses").textContent = stats.total;
  $("calcAttendedClasses").textContent = stats.attended;
  $("overallTarget").value = target;

  const list = $("dashboardSubjects");
  if (!appData.subjects.length) {
    list.innerHTML = `<div class="empty-state">No subjects added yet. Add your first subject to begin.</div>`;
  } else {
    list.innerHTML = appData.subjects.slice(0,5).map(s => {
      const st = subjectStats(s.id);
      const colorClass = st.percentage >= Number(s.target) ? "good" : st.percentage >= Number(s.target)-10 ? "warning" : "";
      return `<div><div class="subject-progress-head"><span>${safeText(s.name)}</span><small>${st.percentage.toFixed(1)}% · ${st.attended}/${st.total} classes</small></div><div class="progress-track"><div class="progress-fill ${colorClass}" style="width:${st.percentage}%;background:${safeText(s.color)}"></div></div></div>`;
    }).join("");
  }

  const recent = [...appData.attendance].sort((a,b) => b.date.localeCompare(a.date)).slice(0,6);
  $("recentAttendance").innerHTML = recent.length ? recent.map(r => {
    const subject = appData.subjects.find(s => s.id === r.subjectId);
    return `<tr><td>${safeText(subject?.name || "Deleted subject")}</td><td>${formatDate(r.date)}</td><td><span class="status-pill status-${r.status.toLowerCase()}">${r.status}</span></td></tr>`;
  }).join("") : `<tr><td colspan="3" class="empty-cell">No attendance records yet.</td></tr>`;
  drawOverviewChart();
}

function renderSubjects() {
  const container = $("allSubjects");
  if (!appData.subjects.length) {
    container.innerHTML = `<div class="empty-state">No subjects yet. Select <strong>Add subject</strong> to start tracking your attendance.</div>`;
    return;
  }
  container.innerHTML = appData.subjects.map(s => {
    const st = subjectStats(s.id);
    const bunks = safeBunks(st.attended, st.total, s.target);
    const recovery = classesToRecover(st.attended, st.total, s.target);
    return `<article class="subject-card">
      <div class="subject-card-top"><div><h3><i class="subject-color-dot" style="background:${safeText(s.color)}"></i>${safeText(s.name)}</h3><span class="subject-code">${safeText(s.code || "No subject code")} · Target ${Number(s.target)}%</span></div><button class="action-link" data-delete-subject="${safeText(s.id)}" title="Delete subject">Delete</button></div>
      <div class="subject-percent">${st.percentage.toFixed(1)}%</div>
      <p class="subject-meta">${st.attended} attended out of ${st.total} conducted classes</p>
      <div class="progress-track"><div class="progress-fill" style="width:${st.percentage}%;background:${safeText(s.color)}"></div></div>
      <div class="subject-actions"><button class="small-button" data-mark-subject="${safeText(s.id)}">＋ Mark class</button><button class="small-button" data-edit-subject="${safeText(s.id)}">Edit</button><button class="small-button" data-subject-calc="${safeText(s.id)}">Calculate bunks</button></div>
      <p class="subject-meta" style="margin-top:12px">${bunks === null ? "Record a class to calculate bunks." : bunks > 0 ? `${bunks} safe bunk(s) at ${s.target}% target` : recovery > 0 ? `Attend ${recovery} consecutive class(es) to recover` : "No safe bunks at this target."}</p>
    </article>`;
  }).join("");
}

function updateCalculator() {
  const overall = overallStats();
  const target = Math.min(100, Math.max(1, Number($("overallTarget").value) || 75));
  appData.settings.overallTarget = target;
  const bunk = safeBunks(overall.attended, overall.total, target);
  const recovery = classesToRecover(overall.attended, overall.total, target);
  const box = $("overallBunkResult");
  if (!overall.total) { box.className = "result-box"; box.textContent = "Mark some classes first to calculate your safe bunks."; }
  else if (bunk > 0) { box.className = "result-box success"; box.textContent = `You can miss up to ${bunk} consecutive class(es) and remain at or above ${target}%.`; }
  else if (recovery > 0) { box.className = "result-box warning"; box.textContent = `You are below ${target}%. Attend the next ${recovery} consecutive class(es) to reach your target.`; }
  else { box.className = "result-box success"; box.textContent = `You are at your target. Avoid missing the next class if you want to maintain your percentage.`; }

  const subjectId = $("calculatorSubject").value;
  const subject = appData.subjects.find(s => s.id === subjectId);
  if (!subject) {
    $("calcSubjectPercentage").textContent = "0%"; $("calcSubjectTotal").textContent = "0"; $("calcSubjectAttended").textContent = "0";
    $("subjectBunkResult").textContent = "Select a subject to calculate safe bunks.";
  } else {
    const st = subjectStats(subjectId);
    $("calcSubjectPercentage").textContent = `${st.percentage.toFixed(1)}%`;
    $("calcSubjectTotal").textContent = st.total;
    $("calcSubjectAttended").textContent = st.attended;
    const b = safeBunks(st.attended, st.total, subject.target);
    const r = classesToRecover(st.attended, st.total, subject.target);
    const sb = $("subjectBunkResult");
    if (!st.total) { sb.className = "result-box"; sb.textContent = "No classes recorded for this subject yet."; }
    else if (b > 0) { sb.className = "result-box success"; sb.textContent = `You can safely miss ${b} more class(es) at your ${subject.target}% target.`; }
    else if (r > 0) { sb.className = "result-box warning"; sb.textContent = `Attend ${r} consecutive class(es) to reach ${subject.target}%.`; }
    else { sb.className = "result-box success"; sb.textContent = "You are at your required attendance target. Be careful with future absences."; }
  }

  const recoveryId = $("recoverySubject").value;
  const recoverySubject = appData.subjects.find(s => s.id === recoveryId);
  const rb = $("recoveryResult");
  if (!recoverySubject) { rb.textContent = "Select a subject to calculate your recovery plan."; rb.className = "result-box"; }
  else {
    const st = subjectStats(recoveryId);
    const needed = classesToRecover(st.attended, st.total, recoverySubject.target);
    if (!st.total) { rb.textContent = "No classes recorded yet. Your first attended class will start your attendance record."; rb.className = "result-box"; }
    else if (needed === 0) { rb.textContent = `Great! You are already at or above ${recoverySubject.target}%.`; rb.className = "result-box success"; }
    else { rb.textContent = `Attend the next ${needed} consecutive classes in ${recoverySubject.name} to reach ${recoverySubject.target}%.`; rb.className = "result-box warning"; }
  }
}

function renderTimetable() {
  const days = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
  const sorted = [...appData.timetable].sort((a,b) => days.indexOf(a.day)-days.indexOf(b.day) || a.start.localeCompare(b.start));
  $("timetableBody").innerHTML = sorted.length ? sorted.map(item => {
    const subject = appData.subjects.find(s => s.id === item.subjectId);
    return `<tr><td class="timetable-day">${item.day}</td><td>${safeText(subject?.name || "Deleted subject")}</td><td>${safeText(item.start)}</td><td>${safeText(item.end)}</td><td>${safeText(item.room || "—")}</td><td><button class="action-link" data-delete-timetable="${safeText(item.id)}">Remove</button></td></tr>`;
  }).join("") : `<tr><td colspan="6" class="empty-cell">No timetable added yet.</td></tr>`;
}

function renderAll() {
  renderProfile();
  renderSubjectOptions();
  renderDashboard();
  renderSubjects();
  renderTimetable();
  updateCalculator();
  renderCalendar();
  applyTheme();
}

function formatDate(iso) {
  if (!iso) return "—";
  const [y,m,d] = iso.split("-").map(Number);
  return new Date(y,m-1,d).toLocaleDateString(undefined,{day:"numeric",month:"short",year:"numeric"});
}

function drawCanvas(canvasId, type) {
  const canvas = $(canvasId);
  if (!canvas || !canvas.getContext) return;
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(260, rect.width || 300);
  const height = Math.max(170, rect.height || 220);
  const dpr = window.devicePixelRatio || 1;
  canvas.width = width*dpr; canvas.height = height*dpr;
  const ctx = canvas.getContext("2d");
  ctx.scale(dpr,dpr);
  const styles = getComputedStyle(document.body);
  const text = styles.getPropertyValue("--muted").trim() || "#85839a";
  const border = styles.getPropertyValue("--border").trim() || "#eeedf5";
  const primary = styles.getPropertyValue("--primary").trim() || "#7966d9";
  const green = "#299d81", red = "#d85f72", orange = "#e69b35";
  ctx.clearRect(0,0,width,height);
  ctx.font = "11px DM Sans, sans-serif";
  ctx.fillStyle = text;

  if (type === "doughnut") {
    const st = overallStats(), total = st.attended + st.absent;
    const cx=width/2, cy=height/2-4, radius=Math.min(width,height)*.31;
    ctx.lineWidth=20;ctx.lineCap="round";ctx.beginPath();ctx.strokeStyle=border;ctx.arc(cx,cy,radius,0,Math.PI*2);ctx.stroke();
    if(total){let start=-Math.PI/2;[[st.attended,green],[st.absent,red]].forEach(([v,color])=>{if(!v)return;const end=start+(v/total)*Math.PI*2;ctx.beginPath();ctx.strokeStyle=color;ctx.arc(cx,cy,radius,start,end);ctx.stroke();start=end;});}
    ctx.fillStyle=styles.getPropertyValue("--text").trim();ctx.textAlign="center";ctx.font="700 22px Manrope, sans-serif";ctx.fillText(total?`${Math.round(st.attended/total*100)}%`:"0%",cx,cy+5);
    ctx.font="10px DM Sans";ctx.fillStyle=text;ctx.fillText("attendance",cx,cy+22);
    return;
  }
  if (type === "bars") {
    const subjects=appData.subjects.slice(0,8);const pad={l:34,r:12,t:15,b:48};const plotW=width-pad.l-pad.r,plotH=height-pad.t-pad.b;
    [0,25,50,75,100].forEach(v=>{const y=pad.t+plotH-(v/100)*plotH;ctx.strokeStyle=border;ctx.beginPath();ctx.moveTo(pad.l,y);ctx.lineTo(width-pad.r,y);ctx.stroke();ctx.fillStyle=text;ctx.textAlign="right";ctx.fillText(v,pad.l-8,y+3);});
    if(!subjects.length){ctx.textAlign="center";ctx.fillText("Add subjects to see performance",width/2,height/2);return;}
    const slot=plotW/subjects.length,bw=Math.min(32,slot*.55);
    subjects.forEach((s,i)=>{const p=subjectStats(s.id).percentage;const x=pad.l+i*slot+(slot-bw)/2;const h=plotH*p/100;ctx.fillStyle=s.color||primary;ctx.beginPath();ctx.roundRect(x,pad.t+plotH-h,bw,h,5);ctx.fill();ctx.save();ctx.translate(x+bw/2,height-pad.b+12);ctx.rotate(-.35);ctx.textAlign="right";ctx.fillStyle=text;ctx.fillText(s.name.slice(0,13),0,0);ctx.restore();});
  }
  if (type === "trend") {
    const pad={l:32,r:12,t:15,b:35},plotW=width-pad.l-pad.r,plotH=height-pad.t-pad.b;
    const labels=[];const values=[];
    for(let i=13;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);const iso=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;labels.push(d.getDate());values.push(appData.attendance.filter(r=>r.date===iso&&r.status!=="Cancelled").length);}
    const max=Math.max(3,...values);
    [0,Math.ceil(max/2),max].forEach(v=>{const y=pad.t+plotH-(v/max)*plotH;ctx.strokeStyle=border;ctx.beginPath();ctx.moveTo(pad.l,y);ctx.lineTo(width-pad.r,y);ctx.stroke();ctx.fillStyle=text;ctx.textAlign="right";ctx.fillText(v,pad.l-7,y+3);});
    const pts=values.map((v,i)=>({x:pad.l+(i/(values.length-1))*plotW,y:pad.t+plotH-(v/max)*plotH}));
    ctx.strokeStyle=primary;ctx.lineWidth=2.5;ctx.beginPath();pts.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();
    pts.forEach((p,i)=>{ctx.fillStyle=primary;ctx.beginPath();ctx.arc(p.x,p.y,3,0,Math.PI*2);ctx.fill();if(i%2===0){ctx.fillStyle=text;ctx.textAlign="center";ctx.fillText(labels[i],p.x,height-10);}});
  }
}

function drawOverviewChart(){drawCanvas("overviewChart","doughnut");}
function drawAllCharts(){drawCanvas("subjectChart","bars");drawCanvas("distributionChart","doughnut");drawCanvas("trendChart","trend");}

function renderCalendar() {
  const grid=$("calendarGrid"); if(!grid)return;
  const year=calendarCursor.getFullYear(), month=calendarCursor.getMonth();
  $("calendarMonth").textContent=new Date(year,month,1).toLocaleDateString(undefined,{month:"long",year:"numeric"});
  const names=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  let html=names.map(n=>`<div class="calendar-day-name">${n}</div>`).join("");
  const first=new Date(year,month,1).getDay(),days=new Date(year,month+1,0).getDate(),prevDays=new Date(year,month,0).getDate();
  for(let i=0;i<42;i++){
    let day, date, other=false;
    if(i<first){day=prevDays-first+i+1;date=new Date(year,month-1,day);other=true;}
    else if(i>=first+days){day=i-first-days+1;date=new Date(year,month+1,day);other=true;}
    else{day=i-first+1;date=new Date(year,month,day);}
    const iso=`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
    const records=appData.attendance.filter(r=>r.date===iso);
    const markers=[...new Set(records.map(r=>r.status))].map(s=>`<i style="background:${s==="Present"?"#299d81":s==="Absent"?"#d85f72":"#aaa7b6"}"></i>`).join("");
    const today=iso===todayISO()?"today":"";
    html+=`<button class="calendar-day ${other?"muted-day":""} ${today}" data-calendar-date="${iso}" aria-label="${iso}, ${records.length} records">${day}<span class="calendar-markers">${markers}</span></button>`;
  }
  grid.innerHTML=html;
}

function showDayDetails(date) {
  const records=appData.attendance.filter(r=>r.date===date);
  $("dayModalTitle").textContent=formatDate(date);
  $("dayModalContent").innerHTML=records.length?records.map(r=>{
    const s=appData.subjects.find(x=>x.id===r.subjectId);
    return `<div class="day-record"><strong>${safeText(s?.name||"Deleted subject")}</strong><span class="status-pill status-${r.status.toLowerCase()}">${r.status}</span></div>`;
  }).join(""):`<p class="muted">No attendance records for this date.</p>`;
  openModal("dayModal");
}

function printReport() {
  const stats=overallStats();
  if(!appData.subjects.length){showToast("Add subjects before generating a report.");return;}
  const reportWindow=window.open("","_blank");
  if(!reportWindow){showToast("Allow pop-ups to print the report.");return;}
  const rows=appData.subjects.map(s=>{const st=subjectStats(s.id);return `<tr><td>${safeText(s.name)}</td><td>${st.attended}</td><td>${st.total}</td><td>${st.percentage.toFixed(1)}%</td><td>${s.target}%</td></tr>`;}).join("");
  reportWindow.document.write(`<!DOCTYPE html><html><head><title>AttendEase Attendance Report</title><style>body{font:14px Arial;padding:35px;color:#222}h1{color:#6552c4}p{color:#666}table{border-collapse:collapse;width:100%;margin-top:25px}th,td{border:1px solid #ddd;padding:12px;text-align:left}th{background:#f0edff}.summary{padding:15px;background:#f7f5ff;border-radius:8px;margin:20px 0}@media print{button{display:none}}</style></head><body><h1>AttendEase</h1><h2>Attendance Report</h2><p>${safeText(appData.profile.name)} · ${safeText(appData.profile.college)} · ${safeText(appData.profile.course)}</p><p>Generated: ${new Date().toLocaleString()}</p><div class="summary"><strong>Overall attendance: ${stats.percentage.toFixed(1)}%</strong><br>Classes attended: ${stats.attended} / ${stats.total}</div><table><thead><tr><th>Subject</th><th>Present</th><th>Conducted</th><th>Attendance</th><th>Target</th></tr></thead><tbody>${rows}</tbody></table><p>Note: This report is generated from data saved in this browser.</p><script>window.onload=()=>window.print();<\/script></body></html>`);
  reportWindow.document.close();
}

function applyTheme() {
  const dark=appData.settings.theme==="dark";
  document.body.classList.toggle("dark",dark);
  $("themeIcon").textContent=dark?"☀":"☾";
  $("themeText").textContent=dark?"Light mode":"Dark mode";
  requestAnimationFrame(()=>{drawOverviewChart();if($("analytics").classList.contains("active"))drawAllCharts();});
}

function initProfile() {
  if(!appData.profile.name){$("profileModalTitle").textContent="Welcome to AttendEase!";$("profileSubmit").textContent="Get started →";$("cancelProfile").classList.add("hidden");openModal("profileModal");}
  else closeModal("profileModal");
}

function bindEvents() {
  document.querySelectorAll(".nav-link[data-page]").forEach(b=>b.addEventListener("click",()=>navigate(b.dataset.page)));
  document.querySelectorAll("[data-goto]").forEach(b=>b.addEventListener("click",()=>navigate(b.dataset.goto)));
  $("menuToggle").addEventListener("click",()=>$("sidebar").classList.toggle("open"));
  $("profileAvatar").addEventListener("click",()=>{ $("profileModalTitle").textContent="Edit your profile";$("profileSubmit").textContent="Save profile";$("cancelProfile").classList.remove("hidden");$("studentName").value=appData.profile.name;$("studentCollege").value=appData.profile.college;$("studentCourse").value=appData.profile.course;openModal("profileModal");});
  $("cancelProfile").addEventListener("click",()=>closeModal("profileModal"));
  $("profileForm").addEventListener("submit",e=>{e.preventDefault();const name=$("studentName").value.trim();if(!name){showToast("Please enter your name.");return;}appData.profile={name,college:$("studentCollege").value.trim(),course:$("studentCourse").value.trim()};saveData();renderProfile();closeModal("profileModal");showToast("Student profile saved!");});
  $("themeToggle").addEventListener("click",()=>{appData.settings.theme=appData.settings.theme==="dark"?"light":"dark";saveData();applyTheme();});
  $("addSubjectBtn").addEventListener("click",()=>{ $("subjectForm").reset();$("subjectTarget").value=75;$("subjectModalTitle").textContent="Add new subject";$("subjectForm").dataset.editId="";openModal("subjectModal");});
  $("subjectForm").addEventListener("submit",e=>{e.preventDefault();const name=$("subjectName").value.trim();const target=Number($("subjectTarget").value);if(!name||target<1||target>100){showToast("Enter a valid subject name and target (1–100%).");return;}const editId=$("subjectForm").dataset.editId;const item={name,code:$("subjectCode").value.trim(),target,color:$("subjectColor").value};if(editId){const s=appData.subjects.find(x=>x.id===editId);if(s)Object.assign(s,item);}else appData.subjects.push({id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),...item});saveData();closeModal("subjectModal");renderAll();showToast(editId?"Subject updated.":"Subject added successfully.");});
  $("allSubjects").addEventListener("click",e=>{const del=e.target.closest("[data-delete-subject]");const mark=e.target.closest("[data-mark-subject]");const edit=e.target.closest("[data-edit-subject]");const calc=e.target.closest("[data-subject-calc]");if(del){const id=del.dataset.deleteSubject;if(confirm("Delete this subject and all its attendance records?")){appData.subjects=appData.subjects.filter(s=>s.id!==id);appData.attendance=appData.attendance.filter(r=>r.subjectId!==id);appData.timetable=appData.timetable.filter(t=>t.subjectId!==id);saveData();renderAll();showToast("Subject deleted.");}}if(mark){openAttendanceModal(mark.dataset.markSubject);}if(edit){const s=appData.subjects.find(x=>x.id===edit.dataset.editSubject);if(s){$("subjectName").value=s.name;$("subjectCode").value=s.code;$("subjectTarget").value=s.target;$("subjectColor").value=s.color;$("subjectForm").dataset.editId=s.id;$("subjectModalTitle").textContent="Edit subject";openModal("subjectModal");}}if(calc){navigate("calculator");$("calculatorSubject").value=calc.dataset.subjectCalc;updateCalculator();}});
  $("quickMarkBtn").addEventListener("click",()=>openAttendanceModal());
  function openAttendanceModal(subjectId=""){if(!appData.subjects.length){showToast("Add a subject first.");navigate("subjects");return;}renderSubjectOptions();$("attendanceForm").reset();$("attendanceDate").value=todayISO();if(subjectId)$("attendanceSubject").value=subjectId;openModal("attendanceModal");}
  $("attendanceForm").addEventListener("submit",e=>{e.preventDefault();const subjectId=$("attendanceSubject").value,date=$("attendanceDate").value,status=$("attendanceStatus").value;if(!appData.subjects.some(s=>s.id===subjectId)||!date){showToast("Choose a subject and date.");return;}const existing=appData.attendance.find(r=>r.subjectId===subjectId&&r.date===date);if(existing){existing.status=status;}else{appData.attendance.push({id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),subjectId,date,status});}saveData();closeModal("attendanceModal");renderAll();showToast(existing?"Attendance record updated.":"Attendance marked successfully.");});
  $("overallTarget").addEventListener("input",()=>{updateCalculator();});
  ["calculatorSubject","recoverySubject"].forEach(id=>$(id).addEventListener("change",updateCalculator));
  $("addTimetableBtn").addEventListener("click",()=>{if(!appData.subjects.length){showToast("Add a subject first.");navigate("subjects");return;}renderSubjectOptions();$("timetableForm").reset();openModal("timetableModal");});
  $("timetableForm").addEventListener("submit",e=>{e.preventDefault();const subjectId=$("timetableSubject").value,start=$("startTime").value,end=$("endTime").value;if(end<=start){showToast("End time must be after start time.");return;}appData.timetable.push({id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),subjectId,day:$("timetableDay").value,start,end,room:$("classRoom").value.trim()});saveData();closeModal("timetableModal");renderTimetable();showToast("Class added to timetable.");});
  $("timetableBody").addEventListener("click",e=>{const b=e.target.closest("[data-delete-timetable]");if(b){appData.timetable=appData.timetable.filter(t=>t.id!==b.dataset.deleteTimetable);saveData();renderTimetable();showToast("Timetable class removed.");}});
  $("calendarGrid").addEventListener("click",e=>{const b=e.target.closest("[data-calendar-date]");if(b)showDayDetails(b.dataset.calendarDate);});
  $("prevMonth").addEventListener("click",()=>{calendarCursor.setMonth(calendarCursor.getMonth()-1);renderCalendar();});
  $("nextMonth").addEventListener("click",()=>{calendarCursor.setMonth(calendarCursor.getMonth()+1);renderCalendar();});
  $("downloadReport").addEventListener("click",printReport);$("analyticsDownload").addEventListener("click",printReport);
  document.querySelectorAll("[data-close]").forEach(b=>b.addEventListener("click",()=>closeModal(b.dataset.close)));
  document.querySelectorAll(".modal").forEach(m=>m.addEventListener("click",e=>{if(e.target===m&&m.id!=="profileModal")closeModal(m.id);}));
  document.addEventListener("keydown",e=>{if(e.key==="Escape")document.querySelectorAll(".modal:not(.hidden)").forEach(m=>{if(m.id!=="profileModal"||appData.profile.name)closeModal(m.id);});});
  window.addEventListener("resize",()=>{drawOverviewChart();if($("analytics").classList.contains("active"))drawAllCharts();});
}

function init() {
  loadData();
  $("currentDate").textContent=new Date().toLocaleDateString(undefined,{day:"numeric",month:"short",year:"numeric"});
  $("year").textContent=new Date().getFullYear();
  bindEvents();
  renderAll();
  initProfile();
}

document.addEventListener("DOMContentLoaded",init);
