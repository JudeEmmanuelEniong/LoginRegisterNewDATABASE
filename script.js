document.addEventListener("DOMContentLoaded", function () {

  // PAGE SWITCH
  function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    window.scrollTo(0, 0);
  }
  window.showPage = showPage;

  // TOGGLE PASSWORD
  window.togglePassword = function(inputId, icon) {
    const input = document.getElementById(inputId);
    input.type = input.type === 'password' ? 'text' : 'password';
    icon.classList.toggle('visible');
  };

  // TOAST
  window.showToast = function(message, type = "success") {
    const toast = document.getElementById("toast");
    if (!toast) return;
    const icon = type === 'success' ? '✅' : '❌';
    toast.innerHTML = `<span style="font-size:1.1rem;">${icon}</span> ${message}`;
    toast.className = "toast show " + type;
    setTimeout(() => { toast.className = "toast"; }, 3000);
  };

  // LOGIN
  window.doLogin = function() {
    const id   = document.getElementById('loginId').value.trim();
    const pass = document.getElementById('loginPass').value;

    if (!id || !pass) {
      showToast('Please enter ID and password.', 'error');
      return;
    }

    fetch('login.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, password: pass })
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        if (data.role === 'admin') {
          showPage('adminPage');
          updateStats();
          renderAnnouncements();
          showToast(data.message, 'success');
        } else if (data.role === 'student') {
          localStorage.setItem('loggedStudent', JSON.stringify(data.student));
          showPage('studentPage');
          loadStudentDashboard();
          showToast(data.message, 'success');
        }
      } else {
        showToast(data.message, 'error');
      }
    })
    .catch(() => showToast('Connection error. Make sure XAMPP is running.', 'error'));
  };

  // REGISTER
  const form = document.getElementById("registerForm");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();

      const id     = document.getElementById("regId").value.trim();
      const last   = document.getElementById("regLast").value.trim();
      const first  = document.getElementById("regFirst").value.trim();
      const middle = document.getElementById("regMiddle").value.trim();
      const level  = document.getElementById("regLevel").value;
      const course = document.getElementById("regCourse").value;
      const email  = document.getElementById("regEmail").value.trim();
      const pass   = document.getElementById("regPass").value;
      const repeat = document.getElementById("regRepeatPass").value;
      const address= document.getElementById("regAddress").value.trim();

      if (!id)           { showToast("ID Number is required!", "error"); return; }
      if (!last)         { showToast("Last Name is required!", "error"); return; }
      if (!first)        { showToast("First Name is required!", "error"); return; }
      if (!email)        { showToast("Email is required!", "error"); return; }
      if (!pass)         { showToast("Password is required!", "error"); return; }
      if (pass !== repeat) { showToast("Passwords do not match!", "error"); return; }
      if (course === "") { showToast("Please select a course!", "error"); return; }

      fetch('register.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, last, first, middle, level, course, email, password: pass, address })
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          showToast(data.message, 'success');
          form.reset();
          setTimeout(() => showPage("loginPage"), 1500);
        } else {
          showToast(data.message, 'error');
        }
      })
      .catch(() => showToast('Connection error. Make sure XAMPP is running.', 'error'));
    });
  }

});

/* ══ ADMIN DATA ══ */
let students      = [];
let sitins        = [];
let announcements = [];
let sitCounter    = 1;
let chartInstance = null;

/* ══ LOGOUT ══ */
window.doLogout = function() {
  localStorage.removeItem('loggedStudent');
  showPage('loginPage');
  showToast('Logged out successfully.', 'success');
};

/* ══ ADMIN TABS ══ */
window.showAdminTab = function(tabId) {
  document.querySelectorAll('.admin-tab').forEach(t => t.style.display = 'none');
  document.getElementById(tabId).style.display = 'block';
  document.querySelectorAll('.admin-link').forEach(l => l.classList.remove('active-tab'));
  if (tabId === 'tabStudents')  { loadStudents(); }
  if (tabId === 'tabViewSitin') { loadSitins(); }
  if (tabId === 'tabReports')   { renderReportsChart(); }
  if (tabId === 'tabHome')      { updateStats(); renderAnnouncements(); }
};

/* ══ MODAL HELPERS ══ */
window.closeModal = function(id) {
  document.getElementById(id).classList.remove('open');
};
function openModal(id) {
  document.getElementById(id).classList.add('open');
}

/* ══ LOAD STUDENTS FROM DATABASE ══ */
function loadStudents() {
  fetch('students.php?action=getAll')
  .then(res => res.json())
  .then(data => {
    students = data.students || [];
    renderStudents();
    updateStats();
  })
  .catch(() => showToast('Failed to load students.', 'error'));
}

/* ══ LOAD SITINS FROM DATABASE ══ */
function loadSitins() {
  fetch('sitin.php?action=getAll')
  .then(res => res.json())
  .then(data => {
    sitins = data.sitins || [];
    renderSitins();
  })
  .catch(() => showToast('Failed to load sit-ins.', 'error'));
}

/* ══ STATS ══ */
function updateStats() {
  fetch('students.php?action=stats')
  .then(res => res.json())
  .then(data => {
    document.getElementById('statRegistered').textContent = data.registered || 0;
    document.getElementById('statCurrent').textContent   = data.current || 0;
    document.getElementById('statTotal').textContent     = data.total || 0;
    renderPurposeChart(data.purposes || []);
  })
  .catch(() => {
    document.getElementById('statRegistered').textContent = 0;
    document.getElementById('statCurrent').textContent   = 0;
    document.getElementById('statTotal').textContent     = 0;
  });
}

/* ══ PIE CHART ══ */
function renderPurposeChart(purposes) {
  const labels = purposes.map(p => p.purpose);
  const counts = purposes.map(p => p.count);
  const colors = ['#4e73df','#e74a3b','#f6c23e','#1cc88a','#36b9cc','#858796'];

  if (chartInstance) chartInstance.destroy();
  const ctx = document.getElementById('purposeChart');
  if (!ctx) return;

  chartInstance = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: labels.length ? labels : ['No Data'],
      datasets: [{ data: counts.length ? counts : [1], backgroundColor: colors }]
    },
    options: {
      plugins: { legend: { position: 'bottom', labels: { font: { size: 11 } } } }
    }
  });
}

/* ══ ANNOUNCEMENTS ══ */
window.postAnnouncement = function() {
  const txt = document.getElementById('annInput').value.trim();
  if (!txt) { showToast('Please enter an announcement.', 'error'); return; }

  fetch('announcements.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'post', message: txt })
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      document.getElementById('annInput').value = '';
      renderAnnouncements();
      showToast('Announcement posted!', 'success');
    }
  })
  .catch(() => showToast('Failed to post announcement.', 'error'));
};

function renderAnnouncements() {
  fetch('announcements.php?action=getAll')
  .then(res => res.json())
  .then(data => {
    const c = document.getElementById('annContainer');
    if (!c) return;
    const list = data.announcements || [];
    if (list.length === 0) {
      c.innerHTML = '<p style="color:#888;font-size:0.85rem;">No announcements yet.</p>';
      return;
    }
    c.innerHTML = list.map(a => `
      <div class="ann-item">
        <div class="ann-meta">${a.posted_by} | ${a.posted_at}</div>
        <div class="ann-text">${a.message}</div>
      </div>
    `).join('');
  })
  .catch(() => {});
}

/* ══ SEARCH STUDENT ══ */
window.openSearchModal = function() {
  document.getElementById('searchInput').value = '';
  document.getElementById('searchResult').innerHTML = '';
  openModal('searchModal');
};

window.searchStudent = function() {
  const q = document.getElementById('searchInput').value.trim();
  if (!q) { showToast('Enter a name or ID to search.', 'error'); return; }

  fetch(`students.php?action=search&q=${encodeURIComponent(q)}`)
  .then(res => res.json())
  .then(data => {
    const box = document.getElementById('searchResult');
    const found = data.students || [];
    if (found.length === 0) {
      box.innerHTML = '<p style="color:#e74c3c;">No student found.</p>';
      return;
    }
    box.innerHTML = found.map(s => `
      <div style="border:1px solid #eee;padding:10px;border-radius:6px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;">
        <div>
          <strong>${s.id}</strong> — ${s.last_name}, ${s.first_name}<br>
          <small style="color:#888;">${s.course} | Year ${s.year_level} | Sessions: ${s.sessions}</small>
        </div>
        <button class="btn-blue" onclick="loadSitIn('${s.id}','${s.last_name}, ${s.first_name}','${s.sessions}')">Sit In</button>
      </div>
    `).join('');
  })
  .catch(() => showToast('Search failed.', 'error'));
};

/* ══ SIT-IN MODAL ══ */
window.openSitInModal = function() {
  document.getElementById('siId').value      = '';
  document.getElementById('siName').value    = '';
  document.getElementById('siSession').value = '';
  document.getElementById('siPurpose').value = '';
  document.getElementById('siLab').value     = '';
  openModal('sitInModal');
};

window.loadSitIn = function(id, name, sessions) {
  document.getElementById('siId').value      = id;
  document.getElementById('siName').value    = name;
  document.getElementById('siSession').value = sessions;
  closeModal('searchModal');
  openModal('sitInModal');
};

window.confirmSitIn = function() {
  const id      = document.getElementById('siId').value;
  const purpose = document.getElementById('siPurpose').value;
  const lab     = document.getElementById('siLab').value.trim();

  if (!id)      { showToast('No student selected.', 'error');     return; }
  if (!purpose) { showToast('Please select a purpose.', 'error'); return; }
  if (!lab)     { showToast('Please enter a lab.', 'error');      return; }

  fetch('sitin.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'sitIn', student_id: id, purpose, lab })
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      closeModal('sitInModal');
      updateStats();
      showToast('Sit-in recorded successfully!', 'success');
    } else {
      showToast(data.message, 'error');
    }
  })
  .catch(() => showToast('Failed to record sit-in.', 'error'));
};

/* ══ STUDENTS TABLE ══ */
function renderStudents() {
  const q       = (document.getElementById('studSearch')?.value || '').toLowerCase();
  const perPage = parseInt(document.getElementById('studEntries')?.value || 10);
  const filtered = students.filter(s =>
    s.id.toLowerCase().includes(q) ||
    (s.last_name + ' ' + s.first_name).toLowerCase().includes(q) ||
    s.course.toLowerCase().includes(q)
  );

  const body = document.getElementById('studBody');
  if (!body) return;

  if (filtered.length === 0) {
    body.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#888;padding:20px;">No data available</td></tr>';
  } else {
    body.innerHTML = filtered.slice(0, perPage).map(s => `
      <tr>
        <td>${s.id}</td>
        <td>${s.last_name}, ${s.first_name}</td>
        <td>${s.year_level}</td>
        <td>${s.course}</td>
        <td>${s.sessions}</td>
        <td style="display:flex;gap:6px;">
          <button class="btn-sm-blue" onclick="editStudent('${s.id}')">Edit</button>
          <button class="btn-sm-red" onclick="deleteStudent('${s.id}')">Delete</button>
        </td>
      </tr>
    `).join('');
  }

  const info = document.getElementById('studInfo');
  if (info) info.textContent = `Showing ${Math.min(filtered.length, perPage)} of ${filtered.length} entries`;
}

/* ══ SIT-IN TABLE ══ */
function renderSitins() {
  const q       = (document.getElementById('sitSearch')?.value || '').toLowerCase();
  const perPage = parseInt(document.getElementById('sitEntries')?.value || 10);
  const filtered = sitins.filter(s =>
    s.student_id.toLowerCase().includes(q) ||
    s.student_name.toLowerCase().includes(q)
  );

  const body = document.getElementById('sitBody');
  if (!body) return;

  if (filtered.length === 0) {
    body.innerHTML = '<tr><td colspan="8" style="text-align:center;color:#888;padding:20px;">No data available</td></tr>';
  } else {
    body.innerHTML = filtered.slice(0, perPage).map(s => `
      <tr>
        <td>${s.sit_id}</td>
        <td>${s.student_id}</td>
        <td>${s.student_name}</td>
        <td>${s.purpose}</td>
        <td>${s.lab}</td>
        <td>${s.session_num}</td>
        <td><span style="padding:3px 10px;border-radius:12px;font-size:0.75rem;font-weight:600;background:${s.status==='Active'?'#d4edda':'#f8d7da'};color:${s.status==='Active'?'#155724':'#721c24'};">${s.status}</span></td>
        <td><button class="btn-sm-red" onclick="endSitIn(${s.sit_id})">End</button></td>
      </tr>
    `).join('');
  }

  const info = document.getElementById('sitInfo');
  if (info) info.textContent = `Showing ${Math.min(filtered.length, perPage)} of ${filtered.length} entries`;
}

window.endSitIn = function(sitId) {
  fetch('sitin.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'endSitIn', sit_id: sitId })
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      loadSitins();
      updateStats();
      showToast('Sit-in ended.', 'success');
    }
  })
  .catch(() => showToast('Failed to end sit-in.', 'error'));
};

/* ══ ADD / EDIT STUDENT ══ */
window.openAddStudentModal = function() {
  document.getElementById('studentModalTitle').textContent = 'Add Student';
  document.getElementById('editStudId').value = '';
  document.getElementById('sId').value        = '';
  document.getElementById('sLast').value      = '';
  document.getElementById('sFirst').value     = '';
  document.getElementById('sLevel').value     = '';
  document.getElementById('sCourse').value    = '';
  document.getElementById('sSessions').value  = '30';
  document.getElementById('sId').readOnly     = false;
  openModal('studentModal');
};

window.editStudent = function(id) {
  const s = students.find(x => x.id === id);
  if (!s) return;
  document.getElementById('studentModalTitle').textContent = 'Edit Student';
  document.getElementById('editStudId').value = s.id;
  document.getElementById('sId').value        = s.id;
  document.getElementById('sLast').value      = s.last_name;
  document.getElementById('sFirst').value     = s.first_name;
  document.getElementById('sLevel').value     = s.year_level;
  document.getElementById('sCourse').value    = s.course;
  document.getElementById('sSessions').value  = s.sessions;
  document.getElementById('sId').readOnly     = true;
  openModal('studentModal');
};

window.saveStudent = function() {
  const editId   = document.getElementById('editStudId').value;
  const id       = document.getElementById('sId').value.trim();
  const last     = document.getElementById('sLast').value.trim();
  const first    = document.getElementById('sFirst').value.trim();
  const level    = document.getElementById('sLevel').value;
  const course   = document.getElementById('sCourse').value;
  const sessions = parseInt(document.getElementById('sSessions').value);

  if (!id || !last || !first || !level || !course) {
    showToast('Please fill all fields.', 'error'); return;
  }

  fetch('students.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: editId ? 'edit' : 'add', id, last, first, level, course, sessions, editId })
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      showToast(data.message, 'success');
      closeModal('studentModal');
      loadStudents();
    } else {
      showToast(data.message, 'error');
    }
  })
  .catch(() => showToast('Failed to save student.', 'error'));
};

window.deleteStudent = function(id) {
  if (!confirm('Delete this student?')) return;
  fetch('students.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'delete', id })
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      showToast('Student deleted.', 'success');
      loadStudents();
    }
  })
  .catch(() => showToast('Failed to delete student.', 'error'));
};

window.resetAllSessions = function() {
  if (!confirm('Reset ALL student sessions to 30?')) return;
  fetch('students.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'resetSessions' })
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      showToast('All sessions reset to 30.', 'success');
      loadStudents();
    }
  })
  .catch(() => showToast('Failed to reset sessions.', 'error'));
};

/* ══ REPORTS CHART ══ */
function renderReportsChart() {
  fetch('sitin.php?action=reports')
  .then(res => res.json())
  .then(data => {
    const ctx = document.getElementById('reportsChart');
    if (!ctx) return;
    const purposes = data.reports || [];
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: purposes.map(p => p.purpose),
        datasets: [{
          label: 'Sit-in Count',
          data: purposes.map(p => p.count),
          backgroundColor: ['#4e73df','#e74a3b','#f6c23e','#1cc88a','#36b9cc','#858796']
        }]
      },
      options: {
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true } }
      }
    });
  })
  .catch(() => {});
} 

window.showStudentTab = function(tabId) {
  document.querySelectorAll('#studentPage .admin-tab').forEach(t => t.style.display = 'none');
  document.getElementById(tabId).style.display = 'block';

  // Active tab highlight (safe)
  document.querySelectorAll('#studentPage .admin-link').forEach(l => l.classList.remove('active-tab'));
  const navLink = document.getElementById('sNav-' + tabId);
  if (navLink) navLink.classList.add('active-tab');

  const student = JSON.parse(localStorage.getItem('loggedStudent'));
  if (!student) return;

  /* ===== HISTORY TAB ===== */
  if (tabId === 'tabHistory') {
    loadStudentHistory();
  }

  /* ===== RESERVATION TAB ===== */
  if (tabId === 'tabReservation') {
    const resIdEl   = document.getElementById('resStudentId');
    const resNameEl = document.getElementById('resStudentName');
    const resSessEl = document.getElementById('resSessions');

    if (resIdEl)   resIdEl.value   = student.id;
    if (resNameEl) resNameEl.value = student.last + ', ' + student.first;
    if (resSessEl) resSessEl.value = student.sessions;
  }

  /* ===== EDIT PROFILE TAB ===== */
  if (tabId === 'tabEditProfile') {

    // Sidebar summary
    const set = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val || '—';
    };

    set('summaryId', student.id);
    set('summaryName', student.first + ' ' + student.last);
    set('summaryCourse', student.course);
    set('summaryLevel', student.level);

    const sessEl = document.getElementById('summarySessions');
    if (sessEl) sessEl.textContent = student.sessions ?? '—';

    // Load profile picture
    loadProfilePic(student.id);

    // Form fields
    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.value = val || '';
    };

    setVal('epId', student.id);
    setVal('epFirst', student.first);
    setVal('epLast', student.last);
    setVal('epMiddle', student.middle || '');
    setVal('epLevel', student.level);
    setVal('editEmail', student.email);
    setVal('editAddress', student.address);

    const courseEl = document.getElementById('epCourse');
    if (courseEl && student.course) {
      const match = Array.from(courseEl.options)
        .find(o => o.value === student.course || o.text === student.course);
      courseEl.value = match ? match.value : '';
    }

    // Clear passwords
    setVal('editPassword', '');
    setVal('editPasswordConfirm', '');

    // Hide message
    const msg = document.getElementById('profileUpdateMsg');
    if (msg) msg.style.display = 'none';
  };

    // Form fields
    const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
    setVal('epId',      student.id);
    setVal('epFirst',   student.first);
    setVal('epLast',    student.last);
    setVal('epMiddle',  student.middle);
    setVal('epLevel',   student.level);
    setVal('editEmail', student.email);
    setVal('editAddress', student.address);

    // Course dropdown
    const courseEl = document.getElementById('epCourse');
    if (courseEl && student.course) {
      const match = Array.from(courseEl.options).find(o => o.value === student.course || o.text === student.course);
      courseEl.value = match ? match.value : '';
    }

    // Clear password fields
    setVal('editPassword', '');
    setVal('editPasswordConfirm', '');

    // Hide success msg
    const msg = document.getElementById('profileUpdateMsg');
    if (msg) msg.style.display = 'none';
  };
/* ══ STUDENT DASHBOARD ══ */
function loadStudentDashboard() {
  const student = JSON.parse(localStorage.getItem('loggedStudent'));
  if (!student) return;

  document.getElementById('stuId').textContent        = student.id;
document.getElementById('stuLevel').textContent     = student.level;
document.getElementById('stuSessions').textContent  = student.sessions;
document.getElementById('stuEmail').textContent     = student.email || 'N/A';
document.getElementById('stuAddress').textContent   = student.address || 'N/A';
document.getElementById('profileName').textContent  = student.last + ', ' + student.first;
document.getElementById('profileCourse').textContent = student.course;

  // Load profile picture
  loadProfilePic(student.id);

document.getElementById('editEmail').value   = student.email || '';
document.getElementById('editAddress').value = student.address || '';

// Populate new edit profile fields
if (document.getElementById('epId'))     document.getElementById('epId').value     = student.id || '';
if (document.getElementById('epFirst'))  document.getElementById('epFirst').value  = student.first || '';
if (document.getElementById('epLast'))   document.getElementById('epLast').value   = student.last || '';
if (document.getElementById('epMiddle')) document.getElementById('epMiddle').value = student.middle || '';
if (document.getElementById('epLevel'))  document.getElementById('epLevel').value  = student.level || '';
const courseEl = document.getElementById('epCourse');
if (courseEl) {
  const opts = Array.from(courseEl.options);
  const match = opts.find(o => o.value === student.course || o.text === student.course);
  if (match) courseEl.value = match.value; else courseEl.value = '';
}

// Profile Summary sidebar — done in showStudentTab instead

  // Load announcements
  fetch('announcements.php?action=getAll')
  .then(res => res.json())
  .then(data => {
    const c = document.getElementById('studentAnnContainer');
    const list = data.announcements || [];
    if (list.length === 0) {
      c.innerHTML = '<p style="color:#888;font-size:0.85rem;">No announcements yet.</p>';
      return;
    }
    c.innerHTML = list.map(a => `
      <div class="ann-item">
        <div class="ann-meta">${a.posted_by} | ${a.posted_at}</div>
        <div class="ann-text">${a.message}</div>
      </div>
    `).join('');
  });

  // Load sit-in history
  fetch(`sitin.php?action=getByStudent&id=${student.id}`)
  .then(res => res.json())
  .then(data => {
    const body = document.getElementById('studentSitinBody');
    const list = data.sitins || [];
    if (list.length === 0) {
      body.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#888;padding:20px;">No sit-in history yet.</td></tr>';
      return;
    }
    body.innerHTML = list.map(s => `
      <tr>
        <td>${s.sit_id}</td>
        <td>${s.purpose}</td>
        <td>${s.lab}</td>
        <td>${s.date_in}</td>
        <td><span style="padding:3px 10px;border-radius:12px;font-size:0.75rem;font-weight:600;
          background:${s.status==='Active'?'#d4edda':'#f8d7da'};
          color:${s.status==='Active'?'#155724':'#721c24'};">${s.status}</span></td>
      </tr>
    `).join('');
  });
}

/* ══ SAVE PROFILE ══ */
window.saveProfile = function() {
  const student  = JSON.parse(localStorage.getItem('loggedStudent'));
  const email    = document.getElementById('editEmail').value.trim();
  const address  = document.getElementById('editAddress').value.trim();
  const password = document.getElementById('editPassword').value;
  const confirm  = document.getElementById('editPasswordConfirm').value;
  const first    = document.getElementById('epFirst') ? document.getElementById('epFirst').value.trim() : student.first;
  const last     = document.getElementById('epLast')  ? document.getElementById('epLast').value.trim()  : student.last;
  const middle   = document.getElementById('epMiddle')? document.getElementById('epMiddle').value.trim(): student.middle || '';
  const course   = document.getElementById('epCourse')? document.getElementById('epCourse').value       : student.course;
  const level    = document.getElementById('epLevel') ? document.getElementById('epLevel').value        : student.level;

  if (!first || !last)  { showToast('First and Last name are required!', 'error'); return; }
  if (!email)           { showToast('Email is required!', 'error'); return; }
  if (password && password !== confirm) { showToast('Passwords do not match!', 'error'); return; }

  // Save profile info
  fetch('edit_profile.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: student.id, email, address, password, first_name: first, last_name: last, middle_name: middle, course, year_level: level })
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      // Update localStorage
      student.email   = email;
      student.address = address;
      student.first   = first;
      student.last    = last;
      student.middle  = middle;
      student.course  = course;
      student.level   = level;
      localStorage.setItem('loggedStudent', JSON.stringify(student));

      // Update dashboard display
      document.getElementById('stuEmail').textContent    = email || 'N/A';
      document.getElementById('stuAddress').textContent  = address || 'N/A';
      document.getElementById('profileName').textContent = last + ', ' + first;
      document.getElementById('profileCourse').textContent = course;
      document.getElementById('stuLevel').textContent    = level;

      // Update summary sidebar
      if (document.getElementById('summaryName'))   document.getElementById('summaryName').textContent   = first + ' ' + last;
      if (document.getElementById('summaryCourse')) document.getElementById('summaryCourse').textContent = course;
      if (document.getElementById('summaryLevel'))  document.getElementById('summaryLevel').textContent  = level;

      // Show inline success banner
      const msg = document.getElementById('profileUpdateMsg');
      if (msg) { msg.style.display = 'block'; setTimeout(() => msg.style.display = 'none', 3000); }

      showToast('Profile saved successfully!', 'success');
      document.getElementById('editPassword').value = '';
      document.getElementById('editPasswordConfirm').value = '';
    } else {
      showToast(data.message, 'error');
    }
  })
  .catch(() => showToast('Failed to save profile.', 'error'));
};

/* ══ UPLOAD PROFILE PICTURE ══ */
window.uploadProfilePic = function(input) {
  const student = JSON.parse(localStorage.getItem('loggedStudent'));
  if (!student || !input.files[0]) return;

  const nameEl = document.getElementById('editPicName');
  if (nameEl) nameEl.textContent = input.files[0].name;

  const formData = new FormData();
  formData.append('profile_pic', input.files[0]);
  formData.append('student_id', student.id);

  showToast('Uploading photo...', 'success');

  fetch('upload_pic.php', { method: 'POST', body: formData })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      const url = 'uploads/' + data.filename + '?t=' + Date.now();
      document.querySelectorAll('#profilePicDisplay, #editPicDisplay').forEach(p => {
        p.src = url;
        p.style.cssText = 'width:110px;height:110px;min-width:110px;min-height:110px;max-width:110px;max-height:110px;border-radius:50%;object-fit:cover;display:block;';
      });
      showToast('Profile picture updated!', 'success');
    } else {
      showToast(data.message || 'Upload failed.', 'error');
    }
  })
  .catch(() => showToast('Upload failed.', 'error'));
};

/* ══ LOAD PROFILE PICTURE ══ */
function loadProfilePic(studentId) {
  const defaultSvg = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='50' fill='%23e8e0ff'/%3E%3Ccircle cx='50' cy='38' r='18' fill='%239b6fe8'/%3E%3Cellipse cx='50' cy='85' rx='28' ry='20' fill='%239b6fe8'/%3E%3C/svg%3E";
  const exts = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

  function lockSize(el) {
    el.style.width      = '110px';
    el.style.height     = '110px';
    el.style.minWidth   = '110px';
    el.style.minHeight  = '110px';
    el.style.maxWidth   = '110px';
    el.style.maxHeight  = '110px';
    el.style.borderRadius = '50%';
    el.style.objectFit  = 'cover';
    el.style.display    = 'block';
  }

  let loaded = false;
  let checked = 0;

  exts.forEach(ext => {
    const img = new Image();
    img.onload = function() {
      if (!loaded) {
        loaded = true;
        document.querySelectorAll('#profilePicDisplay, #editPicDisplay').forEach(p => {
          p.src = this.src;
          lockSize(p);
        });
      }
    };
    img.onerror = function() {
      checked++;
      if (checked === exts.length && !loaded) {
        document.querySelectorAll('#profilePicDisplay, #editPicDisplay').forEach(p => {
          p.src = defaultSvg;
          lockSize(p);
        });
      }
    };
    img.src = 'uploads/profile_' + studentId + '.' + ext + '?t=' + Date.now();
  });
}