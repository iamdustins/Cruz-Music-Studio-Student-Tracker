/**
 * Cruz Music Studio - Student Attendance Tracker Frontend Engine
 */

(function () {
  'use strict';

  // --- LOCAL PERSISTENCE FOR OFFLINE / PREVIEW MODE ---
  const STORAGE_KEY_DATA = 'cruz_studio_mock_db';
  const STORAGE_KEY_GAS = 'cruz_studio_gas_url';

  function getLocalDb() {
    const raw = localStorage.getItem(STORAGE_KEY_DATA);
    if (raw) {
      try { return JSON.parse(raw); } catch (e) { }
    }
    const initial = window.CMS_MOCK_DATA || {};
    localStorage.setItem(STORAGE_KEY_DATA, JSON.stringify(initial));
    return initial;
  }

  function saveLocalDb(data) {
    localStorage.setItem(STORAGE_KEY_DATA, JSON.stringify(data));
  }

  // --- STATE ---
  const state = {
    pinBuffer: '',
    currentUser: null, // { role: 'family'|'teacher'|'admin', data: {...} }
    gasUrl: localStorage.getItem(STORAGE_KEY_GAS) || '',
    familyActiveStudentIdx: 0,
    teacherSelectedDate: new Date().toISOString().substring(0, 10),
    teacherRosterData: []
  };

  // --- DOM REFERENCES ---
  const dom = {
    // Header
    headerUserBlock: document.getElementById('header-user-block'),
    currentUserTag: document.getElementById('current-user-tag'),
    btnLogout: document.getElementById('btn-logout'),

    // Views
    viewLogin: document.getElementById('view-login'),
    viewFamily: document.getElementById('view-family'),
    viewTeacher: document.getElementById('view-teacher'),
    viewAdmin: document.getElementById('view-admin'),

    // PIN Display
    pinDots: [
      document.getElementById('dot-0'),
      document.getElementById('dot-1'),
      document.getElementById('dot-2'),
      document.getElementById('dot-3')
    ],
    pinFeedback: document.getElementById('pin-feedback'),

    // Family Portal
    familyWelcomeName: document.getElementById('family-welcome-name'),
    familyContactSub: document.getElementById('family-contact-sub'),
    familyPinDisplay: document.getElementById('family-pin-display'),
    familyStudentTabs: document.getElementById('family-student-tabs'),
    activeStudentName: document.getElementById('active-student-name'),
    activeStudentInstrument: document.getElementById('active-student-instrument'),
    activeStudentTeacher: document.getElementById('active-student-teacher'),
    activeStudentSchedule: document.getElementById('active-student-schedule'),
    statAttended: document.getElementById('stat-attended'),
    statLate: document.getElementById('stat-late'),
    statMissed: document.getElementById('stat-missed'),
    statRescheduled: document.getElementById('stat-rescheduled'),
    familyAttendanceTbody: document.getElementById('family-attendance-tbody'),

    // Teacher Portal
    teacherPortalName: document.getElementById('teacher-portal-name'),
    teacherPortalInstruments: document.getElementById('teacher-portal-instruments'),
    teacherDateInput: document.getElementById('teacher-date-input'),
    teacherRosterList: document.getElementById('teacher-roster-list'),
    rosterCountLabel: document.getElementById('roster-count-label'),
    btnSaveAllTeacher: document.getElementById('btn-save-all-teacher'),

    // Admin Portal
    adminStudentsTbody: document.getElementById('admin-students-tbody'),
    adminTeachersTbody: document.getElementById('admin-teachers-tbody'),
    adminAttendanceTbody: document.getElementById('admin-attendance-tbody'),
    gasEndpointUrl: document.getElementById('gas-endpoint-url'),
    btnSaveGasUrl: document.getElementById('btn-save-gas-url'),
    btnResetDemoMode: document.getElementById('btn-reset-demo-mode'),
    gasConnectionStatus: document.getElementById('gas-connection-status'),
    btnModalAddStudent: document.getElementById('btn-modal-add-student'),
    btnModalAddTeacher: document.getElementById('btn-modal-add-teacher'),

    // Modals
    modalAddStudent: document.getElementById('modal-add-student'),
    modalAddTeacher: document.getElementById('modal-add-teacher'),
    formAddStudent: document.getElementById('form-add-student'),
    formAddTeacher: document.getElementById('form-add-teacher'),
    newStuTeacherSelect: document.getElementById('new-stu-teacher'),
    newFamilyPinInput: document.getElementById('new-family-pin'),
    btnGenFamilyPin: document.getElementById('btn-gen-family-pin'),
    newTeacherPinInput: document.getElementById('new-teacher-pin'),
    btnGenTeacherPin: document.getElementById('btn-gen-teacher-pin'),

    // Toast
    toast: document.getElementById('toast-notification'),
    toastMsg: document.getElementById('toast-message')
  };

  // ============================================================
  // INITIALIZATION & EVENT LISTENERS
  // ============================================================
  function init() {
    bindKeypadEvents();
    bindHeaderEvents();
    bindAdminTabs();
    bindModalEvents();

    if (state.gasUrl && dom.gasEndpointUrl) {
      dom.gasEndpointUrl.value = state.gasUrl;
    }

    if (dom.teacherDateInput) {
      dom.teacherDateInput.value = state.teacherSelectedDate;
      dom.teacherDateInput.addEventListener('change', (e) => {
        state.teacherSelectedDate = e.target.value;
        loadTeacherRoster();
      });
    }

    if (dom.btnSaveAllTeacher) {
      dom.btnSaveAllTeacher.addEventListener('click', saveAllTeacherAttendance);
    }
  }

  // Toast Helper
  function showToast(message, duration = 3000) {
    if (!dom.toast) return;
    dom.toastMsg.textContent = message;
    dom.toast.classList.add('show');
    setTimeout(() => {
      dom.toast.classList.remove('show');
    }, duration);
  }

  // ============================================================
  // PIN KEYPAD & LOGIN FLOW
  // ============================================================
  function bindKeypadEvents() {
    document.querySelectorAll('.key-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.key;
        handlePinInput(key);
      });
    });

    // Physical Keyboard Listener
    window.addEventListener('keydown', (e) => {
      // Only capture if login view is active and no modal/input is focused
      if (dom.viewLogin.style.display !== 'none' && !isFormInputFocused()) {
        if (/^[0-9]$/.test(e.key)) {
          handlePinInput(e.key);
        } else if (e.key === 'Backspace') {
          handlePinInput('backspace');
        } else if (e.key === 'Escape' || e.key === 'Delete') {
          handlePinInput('clear');
        }
      }
    });
  }

  function isFormInputFocused() {
    const active = document.activeElement;
    return active && (active.tagName === 'INPUT' || active.tagName === 'SELECT' || active.tagName === 'TEXTAREA');
  }

  function handlePinInput(key) {
    if (key === 'clear') {
      state.pinBuffer = '';
    } else if (key === 'backspace') {
      state.pinBuffer = state.pinBuffer.slice(0, -1);
    } else if (/^[0-9]$/.test(key)) {
      if (state.pinBuffer.length < 4) {
        state.pinBuffer += key;
      }
    }

    updatePinDisplay();

    if (state.pinBuffer.length === 4) {
      triggerPinVerification(state.pinBuffer);
    }
  }

  function updatePinDisplay() {
    dom.pinDots.forEach((dot, idx) => {
      if (idx < state.pinBuffer.length) {
        dot.classList.add('filled');
      } else {
        dot.classList.remove('filled');
      }
    });
    dom.pinFeedback.textContent = '';
    dom.pinFeedback.className = 'pin-feedback';
  }

  async function triggerPinVerification(pin) {
    dom.pinFeedback.textContent = 'Verifying PIN...';
    dom.pinFeedback.className = 'pin-feedback loading';

    try {
      let result = null;

      if (state.gasUrl) {
        // Live Google Apps Script API Call
        const url = `${state.gasUrl}?action=verifyPin&pin=${encodeURIComponent(pin)}`;
        const res = await fetch(url);
        result = await res.json();
      } else {
        // Local Demo Verification
        result = localVerifyPin(pin);
      }

      if (result && result.success) {
        dom.pinFeedback.textContent = '';
        state.pinBuffer = '';
        updatePinDisplay();
        loginUser(result);
      } else {
        throw new Error(result.error || 'Invalid PIN. Please try again.');
      }
    } catch (err) {
      dom.pinFeedback.textContent = err.message || 'Invalid PIN entered';
      dom.pinFeedback.className = 'pin-feedback error';
      setTimeout(() => {
        state.pinBuffer = '';
        updatePinDisplay();
      }, 900);
    }
  }

  function localVerifyPin(pin) {
    const db = getLocalDb();

    // 1. Admin PIN
    if (String(db.settings.adminPin).trim() === pin) {
      return {
        success: true,
        role: 'admin',
        studioName: db.settings.studioName || 'Cruz Music Studio'
      };
    }

    // 2. Teacher PIN
    const teacher = (db.teachers || []).find(t => String(t.pin).trim() === pin);
    if (teacher) {
      return {
        success: true,
        role: 'teacher',
        teacher: teacher
      };
    }

    // 3. Family PIN (Multi-student support)
    const family = (db.families || []).find(f => String(f.pin).trim() === pin);
    if (family) {
      return {
        success: true,
        role: 'family',
        family: {
          familyId: family.familyId,
          parentName: family.parentName,
          pin: family.pin,
          parentPhone: family.parentPhone,
          parentEmail: family.parentEmail
        },
        students: family.students
      };
    }

    return { success: false, error: 'PIN not found. Check with studio admin.' };
  }

  // ============================================================
  // USER LOGIN & VIEW ROUTING
  // ============================================================
  function loginUser(authResult) {
    state.currentUser = authResult;
    dom.viewLogin.style.display = 'none';
    dom.headerUserBlock.style.display = 'flex';

    if (authResult.role === 'family') {
      dom.currentUserTag.textContent = `Family: ${authResult.family.parentName}`;
      renderFamilyPortal(authResult);
    } else if (authResult.role === 'teacher') {
      dom.currentUserTag.textContent = `Instructor: ${authResult.teacher.name}`;
      renderTeacherPortal(authResult.teacher);
    } else if (authResult.role === 'admin') {
      dom.currentUserTag.textContent = `Studio Administration`;
      renderAdminPortal();
    }
  }

  function bindHeaderEvents() {
    dom.btnLogout.addEventListener('click', () => {
      state.currentUser = null;
      state.pinBuffer = '';
      updatePinDisplay();
      dom.viewLogin.style.display = 'block';
      dom.viewFamily.style.display = 'none';
      dom.viewTeacher.style.display = 'none';
      dom.viewAdmin.style.display = 'none';
      dom.headerUserBlock.style.display = 'none';
    });
  }

  // ============================================================
  // VIEW: FAMILY / PARENT PORTAL
  // ============================================================
  function renderFamilyPortal(auth) {
    dom.viewFamily.style.display = 'block';
    state.familyActiveStudentIdx = 0;

    const family = auth.family;
    const students = auth.students || [];

    dom.familyWelcomeName.textContent = `Welcome, ${family.parentName}`;
    dom.familyContactSub.textContent = `Primary Contact: ${family.parentPhone || ''} • ${family.parentEmail || ''}`;
    dom.familyPinDisplay.textContent = family.pin;

    // Render Student Tabs for Siblings
    dom.familyStudentTabs.innerHTML = '';
    if (students.length > 1) {
      students.forEach((stu, idx) => {
        const tabBtn = document.createElement('button');
        tabBtn.className = `family-tab-btn ${idx === 0 ? 'active' : ''}`;
        tabBtn.innerHTML = `<span>👤</span> ${stu.studentName} (${stu.instrument})`;
        tabBtn.addEventListener('click', () => {
          document.querySelectorAll('.family-tab-btn').forEach(b => b.classList.remove('active'));
          tabBtn.classList.add('active');
          state.familyActiveStudentIdx = idx;
          updateActiveFamilyStudent(students[idx]);
        });
        dom.familyStudentTabs.appendChild(tabBtn);
      });
      dom.familyStudentTabs.style.display = 'flex';
    } else {
      dom.familyStudentTabs.style.display = 'none';
    }

    if (students.length > 0) {
      updateActiveFamilyStudent(students[0]);
    }
  }

  function updateActiveFamilyStudent(student) {
    const db = getLocalDb();
    const teacher = (db.teachers || []).find(t => t.id === student.teacherId);
    const teacherName = teacher ? teacher.name : (student.teacherId || 'Staff');

    dom.activeStudentName.textContent = student.studentName;
    dom.activeStudentInstrument.textContent = student.instrument;
    dom.activeStudentTeacher.textContent = teacherName;
    dom.activeStudentSchedule.textContent = `${student.day || 'Scheduled'} at ${student.time || 'TBD'}`;

    // Get Attendance records for this student
    const studentRecords = (db.attendance || [])
      .filter(a => a.studentId === student.studentId)
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    // Calculate Stats
    let attended = 0, late = 0, missed = 0, rescheduled = 0;
    studentRecords.forEach(r => {
      const s = (r.status || '').toLowerCase();
      if (s === 'attended') attended++;
      else if (s === 'late') late++;
      else if (s === 'missed') missed++;
      else if (s === 'rescheduled') rescheduled++;
    });

    dom.statAttended.textContent = attended;
    dom.statLate.textContent = late;
    dom.statMissed.textContent = missed;
    dom.statRescheduled.textContent = rescheduled;

    // Render Timeline Table
    dom.familyAttendanceTbody.innerHTML = '';
    if (studentRecords.length === 0) {
      dom.familyAttendanceTbody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; color: var(--text-muted); padding: 30px;">
            No attendance records logged yet for this term.
          </td>
        </tr>
      `;
      return;
    }

    studentRecords.forEach(rec => {
      const tr = document.createElement('tr');
      const recTeacher = (db.teachers || []).find(t => t.id === rec.teacherId);
      const instructorName = recTeacher ? recTeacher.name : teacherName;

      tr.innerHTML = `
        <td style="font-weight: 700;">#${rec.lessonNumber || '-'}</td>
        <td style="color: var(--text-muted); font-size: 0.85rem;">${rec.date}</td>
        <td><span class="status-badge ${rec.status}">${getStatusIcon(rec.status)} ${rec.status}</span></td>
        <td style="font-size: 0.88rem;">${instructorName}</td>
        <td style="font-size: 0.88rem; line-height: 1.4;">${rec.notes || '<em style="color:#94a3b8;">No specific notes logged</em>'}</td>
      `;
      dom.familyAttendanceTbody.appendChild(tr);
    });
  }

  function getStatusIcon(status) {
    switch ((status || '').toLowerCase()) {
      case 'attended': return '🟢';
      case 'late': return '🟡';
      case 'missed': return '🔴';
      case 'rescheduled': return '🔵';
      default: return '⚪';
    }
  }

  // ============================================================
  // VIEW: TEACHER PORTAL
  // ============================================================
  function renderTeacherPortal(teacher) {
    dom.viewTeacher.style.display = 'block';
    dom.teacherPortalName.textContent = `Instructor: ${teacher.name}`;
    dom.teacherPortalInstruments.textContent = `${teacher.instruments || 'Music Lessons'} • Student Attendance Roster`;
    loadTeacherRoster();
  }

  function loadTeacherRoster() {
    const teacherId = state.currentUser.teacher.id;
    const db = getLocalDb();
    const targetDate = state.teacherSelectedDate;

    // Collect all students assigned to this teacher
    const assignedStudents = [];
    (db.families || []).forEach(f => {
      (f.students || []).forEach(s => {
        if (s.teacherId === teacherId && (s.status === 'Active' || !s.status)) {
          assignedStudents.push({
            ...s,
            parentName: f.parentName,
            parentPhone: f.parentPhone,
            parentEmail: f.parentEmail
          });
        }
      });
    });

    dom.rosterCountLabel.textContent = `Assigned Students (${assignedStudents.length})`;

    // Map existing attendance for this date
    state.teacherRosterData = assignedStudents.map(student => {
      const existing = (db.attendance || []).find(a => a.studentId === student.studentId && a.date === targetDate);
      return {
        ...student,
        currentStatus: existing ? existing.status : 'Unmarked',
        lessonNumber: existing ? existing.lessonNumber : '',
        notes: existing ? existing.notes : '',
        recordId: existing ? existing.recordId : null,
        isDirty: false
      };
    });

    renderTeacherStudentCards();
  }

  function renderTeacherStudentCards() {
    dom.teacherRosterList.innerHTML = '';

    if (state.teacherRosterData.length === 0) {
      dom.teacherRosterList.innerHTML = `
        <div style="background:white; border-radius:14px; padding:40px; text-align:center; color:var(--text-muted); border:1px solid var(--border-color);">
          No active students currently assigned to this instructor.
        </div>
      `;
      return;
    }

    state.teacherRosterData.forEach((item, index) => {
      const card = document.createElement('div');
      card.className = `student-card ${item.currentStatus !== 'Unmarked' ? 'saved' : ''}`;
      card.id = `student-card-${item.studentId}`;

      card.innerHTML = `
        <div class="student-card-header">
          <div class="student-name-block">
            <h3>${item.studentName}</h3>
            <div class="student-sub">
              <span class="instrument-tag">${item.instrument}</span>
              <span>• Schedule: ${item.day || 'Day'} at ${item.time || 'Time'}</span>
              <span>• Parent: ${item.parentName} (${item.parentPhone || ''})</span>
            </div>
          </div>
        </div>

        <!-- 4 Quick Attendance Action Buttons -->
        <div class="status-buttons">
          <button type="button" class="btn-status attended ${item.currentStatus === 'Attended' ? 'active' : ''}" data-idx="${index}" data-status="Attended">
            <span class="status-icon">🟢</span>
            <span>Attended</span>
          </button>
          <button type="button" class="btn-status late ${item.currentStatus === 'Late' ? 'active' : ''}" data-idx="${index}" data-status="Late">
            <span class="status-icon">🟡</span>
            <span>Late</span>
          </button>
          <button type="button" class="btn-status missed ${item.currentStatus === 'Missed' ? 'active' : ''}" data-idx="${index}" data-status="Missed">
            <span class="status-icon">🔴</span>
            <span>Missed</span>
          </button>
          <button type="button" class="btn-status rescheduled ${item.currentStatus === 'Rescheduled' ? 'active' : ''}" data-idx="${index}" data-status="Rescheduled">
            <span class="status-icon">🔵</span>
            <span>Rescheduled</span>
          </button>
        </div>

        <!-- Lesson # and Practice Notes -->
        <div class="card-inputs">
          <div>
            <input type="text" class="input-sm lesson-no-input" placeholder="Lesson #" value="${item.lessonNumber || ''}" data-idx="${index}">
          </div>
          <div>
            <input type="text" class="input-sm notes-input" placeholder="Practice homework & lesson notes (visible to parent)..." value="${item.notes || ''}" data-idx="${index}">
          </div>
          <div>
            <button type="button" class="btn-save-row" data-idx="${index}">Save</button>
          </div>
        </div>
      `;

      // Event Listeners for buttons inside this card
      card.querySelectorAll('.btn-status').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = parseInt(btn.dataset.idx, 10);
          const newStatus = btn.dataset.status;
          setTeacherAttendanceStatus(idx, newStatus);
        });
      });

      const lessonInput = card.querySelector('.lesson-no-input');
      lessonInput.addEventListener('input', (e) => {
        const idx = parseInt(e.target.dataset.idx, 10);
        state.teacherRosterData[idx].lessonNumber = e.target.value;
        state.teacherRosterData[idx].isDirty = true;
      });

      const notesInput = card.querySelector('.notes-input');
      notesInput.addEventListener('input', (e) => {
        const idx = parseInt(e.target.dataset.idx, 10);
        state.teacherRosterData[idx].notes = e.target.value;
        state.teacherRosterData[idx].isDirty = true;
      });

      const saveBtn = card.querySelector('.btn-save-row');
      saveBtn.addEventListener('click', () => {
        const idx = parseInt(saveBtn.dataset.idx, 10);
        saveSingleAttendanceRecord(idx);
      });

      dom.teacherRosterList.appendChild(card);
    });
  }

  function setTeacherAttendanceStatus(index, newStatus) {
    const item = state.teacherRosterData[index];
    item.currentStatus = newStatus;
    item.isDirty = true;

    // If lesson number is empty and marked Attended, auto-fill reasonable estimate
    if (!item.lessonNumber && newStatus === 'Attended') {
      item.lessonNumber = '1';
    }

    renderTeacherStudentCards();
    // Auto-save on single tap
    saveSingleAttendanceRecord(index);
  }

  async function saveSingleAttendanceRecord(index) {
    const item = state.teacherRosterData[index];
    if (item.currentStatus === 'Unmarked') {
      showToast('Please select an attendance status (Attended, Late, Missed, or Rescheduled).');
      return;
    }

    const rec = {
      date: state.teacherSelectedDate,
      studentId: item.studentId,
      teacherId: state.currentUser.teacher.id,
      status: item.currentStatus,
      lessonNumber: item.lessonNumber || '',
      notes: item.notes || ''
    };

    try {
      if (state.gasUrl) {
        // Post to Google Apps Script
        await fetch(state.gasUrl, {
          method: 'POST',
          body: JSON.stringify({ action: 'recordAttendance', records: [rec] })
        });
      }

      // Save locally to mock DB
      const db = getLocalDb();
      if (!db.attendance) db.attendance = [];

      const existingIdx = db.attendance.findIndex(a => a.studentId === rec.studentId && a.date === rec.date);
      if (existingIdx >= 0) {
        db.attendance[existingIdx] = { ...db.attendance[existingIdx], ...rec, loggedAt: new Date().toISOString() };
      } else {
        db.attendance.push({
          recordId: 'ATT-' + Math.floor(100000 + Math.random() * 900000),
          ...rec,
          loggedAt: new Date().toISOString()
        });
      }
      saveLocalDb(db);

      item.isDirty = false;
      showToast(`Saved attendance for ${item.studentName}: ${item.currentStatus}`);
      renderTeacherStudentCards();
    } catch (err) {
      showToast('Error saving: ' + err.message);
    }
  }

  async function saveAllTeacherAttendance() {
    const recordsToSave = state.teacherRosterData
      .filter(item => item.currentStatus !== 'Unmarked')
      .map(item => ({
        date: state.teacherSelectedDate,
        studentId: item.studentId,
        teacherId: state.currentUser.teacher.id,
        status: item.currentStatus,
        lessonNumber: item.lessonNumber || '',
        notes: item.notes || ''
      }));

    if (recordsToSave.length === 0) {
      showToast('No student attendance status selected yet.');
      return;
    }

    try {
      if (state.gasUrl) {
        await fetch(state.gasUrl, {
          method: 'POST',
          body: JSON.stringify({ action: 'recordAttendance', records: recordsToSave })
        });
      }

      const db = getLocalDb();
      if (!db.attendance) db.attendance = [];

      recordsToSave.forEach(rec => {
        const existingIdx = db.attendance.findIndex(a => a.studentId === rec.studentId && a.date === rec.date);
        if (existingIdx >= 0) {
          db.attendance[existingIdx] = { ...db.attendance[existingIdx], ...rec, loggedAt: new Date().toISOString() };
        } else {
          db.attendance.push({
            recordId: 'ATT-' + Math.floor(100000 + Math.random() * 900000),
            ...rec,
            loggedAt: new Date().toISOString()
          });
        }
      });
      saveLocalDb(db);

      showToast(`Saved all ${recordsToSave.length} attendance records!`);
      loadTeacherRoster();
    } catch (err) {
      showToast('Error saving all: ' + err.message);
    }
  }

  // ============================================================
  // VIEW: STUDIO ADMIN DASHBOARD
  // ============================================================
  function renderAdminPortal() {
    dom.viewAdmin.style.display = 'block';
    renderAdminStudentsTable();
    renderAdminTeachersTable();
    renderAdminAttendanceTable();
    populateTeacherDropdown();
  }

  function bindAdminTabs() {
    document.querySelectorAll('.admin-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.admin-tab').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.admin-tab-content').forEach(c => c.style.display = 'none');

        btn.classList.add('active');
        const targetId = btn.dataset.tab;
        const targetEl = document.getElementById(targetId);
        if (targetEl) targetEl.style.display = 'block';
      });
    });

    if (dom.btnSaveGasUrl) {
      dom.btnSaveGasUrl.addEventListener('click', async () => {
        const url = dom.gasEndpointUrl.value.trim();
        state.gasUrl = url;
        localStorage.setItem(STORAGE_KEY_GAS, url);

        if (!url) {
          dom.gasConnectionStatus.textContent = 'Disconnected. Using local preview demo mode.';
          dom.gasConnectionStatus.style.color = 'var(--text-muted)';
          return;
        }

        dom.gasConnectionStatus.textContent = 'Testing connection to Google Apps Script...';
        dom.gasConnectionStatus.style.color = 'var(--accent-gold-dark)';

        try {
          const res = await fetch(`${url}?action=ping`);
          const data = await res.json();
          if (data.success) {
            dom.gasConnectionStatus.textContent = ' Connected to Google Apps Script successfully!';
            dom.gasConnectionStatus.style.color = 'var(--status-attended)';
            showToast('Google Sheet connection verified!');
          } else {
            throw new Error(data.error || 'Server error');
          }
        } catch (e) {
          dom.gasConnectionStatus.textContent = '⚠️ Could not reach script. Check URL or deploy permissions (Anyone).';
          dom.gasConnectionStatus.style.color = 'var(--status-missed)';
        }
      });
    }

    if (dom.btnResetDemoMode) {
      dom.btnResetDemoMode.addEventListener('click', () => {
        if (confirm('Reset all demo data back to default initial records?')) {
          localStorage.removeItem(STORAGE_KEY_DATA);
          localStorage.removeItem(STORAGE_KEY_GAS);
          state.gasUrl = '';
          if (dom.gasEndpointUrl) dom.gasEndpointUrl.value = '';
          dom.gasConnectionStatus.textContent = 'Reset to demo mode.';
          renderAdminStudentsTable();
          renderAdminTeachersTable();
          renderAdminAttendanceTable();
          showToast('Demo data reset!');
        }
      });
    }
  }

  function renderAdminStudentsTable() {
    const db = getLocalDb();
    dom.adminStudentsTbody.innerHTML = '';

    (db.families || []).forEach(f => {
      (f.students || []).forEach(s => {
        const teacher = (db.teachers || []).find(t => t.id === s.teacherId);
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td style="font-weight: 700; color: var(--primary-navy);">${s.studentName}</td>
          <td><span class="instrument-tag">${s.instrument}</span></td>
          <td>${teacher ? teacher.name : s.teacherId}</td>
          <td style="font-size: 0.85rem; color: var(--text-muted);">${s.day || ''} ${s.time || ''}</td>
          <td>${f.parentName} <br><small style="color:#64748b;">${f.parentPhone || ''}</small></td>
          <td><span style="font-family: monospace; font-size: 1rem; font-weight: 800; background: #FEF9C3; padding: 2px 8px; border-radius: 6px; color: #854D0E;">${f.pin}</span></td>
          <td><span style="color: var(--status-attended); font-weight: 700; font-size: 0.8rem;">● Active</span></td>
        `;
        dom.adminStudentsTbody.appendChild(tr);
      });
    });
  }

  function renderAdminTeachersTable() {
    const db = getLocalDb();
    dom.adminTeachersTbody.innerHTML = '';

    (db.teachers || []).forEach(t => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-weight: 600; color: var(--text-muted);">${t.id}</td>
        <td style="font-weight: 700;">${t.name}</td>
        <td><span style="font-family: monospace; font-size: 1rem; font-weight: 800; background: #EFF6FF; padding: 2px 8px; border-radius: 6px; color: #1E40AF;">${t.pin}</span></td>
        <td>${t.instruments || ''}</td>
        <td style="font-size: 0.85rem;">${t.email || '-'}</td>
        <td style="font-size: 0.85rem;">${t.phone || '-'}</td>
        <td><span style="color: var(--status-attended); font-weight: 700; font-size: 0.8rem;">● Yes</span></td>
      `;
      dom.adminTeachersTbody.appendChild(tr);
    });
  }

  function renderAdminAttendanceTable() {
    const db = getLocalDb();
    dom.adminAttendanceTbody.innerHTML = '';

    const records = (db.attendance || []).slice(-30).reverse();
    if (records.length === 0) {
      dom.adminAttendanceTbody.innerHTML = `
        <tr><td colspan="6" style="text-align:center; padding: 20px; color: var(--text-muted);">No attendance logged yet.</td></tr>
      `;
      return;
    }

    records.forEach(rec => {
      let studentName = rec.studentId;
      (db.families || []).forEach(f => {
        const found = (f.students || []).find(s => s.studentId === rec.studentId);
        if (found) studentName = found.studentName;
      });

      const teacher = (db.teachers || []).find(t => t.id === rec.teacherId);
      const teacherName = teacher ? teacher.name : rec.teacherId;

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-size: 0.85rem; color: var(--text-muted);">${rec.date}</td>
        <td style="font-weight: 700;">${studentName}</td>
        <td>${teacherName}</td>
        <td><span class="status-badge ${rec.status}">${getStatusIcon(rec.status)} ${rec.status}</span></td>
        <td style="font-weight: 600;">#${rec.lessonNumber || '-'}</td>
        <td style="font-size: 0.85rem; color: var(--text-muted);">${rec.notes || '-'}</td>
      `;
      dom.adminAttendanceTbody.appendChild(tr);
    });
  }

  // ============================================================
  // MODALS & UNIQUE PIN GENERATION
  // ============================================================
  function bindModalEvents() {
    if (dom.btnModalAddStudent) {
      dom.btnModalAddStudent.addEventListener('click', () => {
        populateTeacherDropdown();
        dom.newFamilyPinInput.value = generateUniquePinLocal();
        dom.modalAddStudent.classList.add('open');
      });
    }

    if (dom.btnModalAddTeacher) {
      dom.btnModalAddTeacher.addEventListener('click', () => {
        dom.newTeacherPinInput.value = generateUniquePinLocal();
        dom.modalAddTeacher.classList.add('open');
      });
    }

    if (dom.btnGenFamilyPin) {
      dom.btnGenFamilyPin.addEventListener('click', () => {
        dom.newFamilyPinInput.value = generateUniquePinLocal();
      });
    }

    if (dom.btnGenTeacherPin) {
      dom.btnGenTeacherPin.addEventListener('click', () => {
        dom.newTeacherPinInput.value = generateUniquePinLocal();
      });
    }

    // Submit Add Student Form
    if (dom.formAddStudent) {
      dom.formAddStudent.addEventListener('submit', (e) => {
        e.preventDefault();
        saveNewStudentFromModal();
      });
    }

    // Submit Add Teacher Form
    if (dom.formAddTeacher) {
      dom.formAddTeacher.addEventListener('submit', (e) => {
        e.preventDefault();
        saveNewTeacherFromModal();
      });
    }
  }

  function populateTeacherDropdown() {
    const db = getLocalDb();
    if (!dom.newStuTeacherSelect) return;
    dom.newStuTeacherSelect.innerHTML = '';
    (db.teachers || []).forEach(t => {
      const opt = document.createElement('option');
      opt.value = t.id;
      opt.textContent = `${t.name} (${t.instruments || 'Music'})`;
      dom.newStuTeacherSelect.appendChild(opt);
    });
  }

  function generateUniquePinLocal() {
    const db = getLocalDb();
    const used = new Set();
    if (db.settings && db.settings.adminPin) used.add(String(db.settings.adminPin).trim());
    (db.teachers || []).forEach(t => used.add(String(t.pin).trim()));
    (db.families || []).forEach(f => used.add(String(f.pin).trim()));

    let candidate = '';
    let attempts = 0;
    while (attempts < 2000) {
      candidate = String(Math.floor(1000 + Math.random() * 9000));
      if (!used.has(candidate)) return candidate;
      attempts++;
    }
    return String(Math.floor(1000 + Math.random() * 9000));
  }

  function saveNewStudentFromModal() {
    const stuName = document.getElementById('new-stu-name').value.trim();
    const parentName = document.getElementById('new-parent-name').value.trim();
    const parentPhone = document.getElementById('new-parent-phone').value.trim();
    const parentEmail = document.getElementById('new-parent-email').value.trim();
    const instrument = document.getElementById('new-stu-instrument').value.trim();
    const teacherId = dom.newStuTeacherSelect.value;
    const day = document.getElementById('new-stu-day').value;
    const time = document.getElementById('new-stu-time').value.trim();
    const pin = dom.newFamilyPinInput.value.trim();

    const db = getLocalDb();
    if (!db.families) db.families = [];

    // Check if this family PIN already exists (adding a sibling!)
    let family = db.families.find(f => String(f.pin).trim() === pin);
    if (!family) {
      family = {
        familyId: 'FAM-' + (100 + db.families.length + 1),
        parentName: parentName,
        pin: pin,
        parentPhone: parentPhone,
        parentEmail: parentEmail,
        students: []
      };
      db.families.push(family);
    }

    const studentId = 'STU-' + Math.floor(200 + Math.random() * 800);
    family.students.push({
      studentId: studentId,
      studentName: stuName,
      instrument: instrument,
      teacherId: teacherId,
      day: day,
      time: time,
      status: 'Active'
    });

    saveLocalDb(db);
    closeModals();
    renderAdminStudentsTable();
    showToast(`Added student ${stuName} with Family PIN ${pin}!`);
    dom.formAddStudent.reset();
  }

  function saveNewTeacherFromModal() {
    const name = document.getElementById('new-teacher-name').value.trim();
    const instruments = document.getElementById('new-teacher-instruments').value.trim();
    const email = document.getElementById('new-teacher-email').value.trim();
    const phone = document.getElementById('new-teacher-phone').value.trim();
    const pin = dom.newTeacherPinInput.value.trim();

    const db = getLocalDb();
    if (!db.teachers) db.teachers = [];

    const newTeacherId = 'T' + (101 + db.teachers.length);
    db.teachers.push({
      id: newTeacherId,
      name: name,
      pin: pin,
      instruments: instruments,
      email: email,
      phone: phone,
      active: 'Yes'
    });

    saveLocalDb(db);
    closeModals();
    renderAdminTeachersTable();
    populateTeacherDropdown();
    showToast(`Added instructor ${name} with PIN ${pin}!`);
    dom.formAddTeacher.reset();
  }

  function closeModals() {
    if (dom.modalAddStudent) dom.modalAddStudent.classList.remove('open');
    if (dom.modalAddTeacher) dom.modalAddTeacher.classList.remove('open');
  }

  // Helper for quick click demo chips on login screen
  function quickFillPin(code) {
    state.pinBuffer = code;
    updatePinDisplay();
    triggerPinVerification(code);
  }

  // Expose global interface for inline onclicks
  window.app = {
    init,
    quickFillPin,
    closeModals
  };

  // Run on load
  document.addEventListener('DOMContentLoaded', init);

})();
