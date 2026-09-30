/**
 * Cruz Music Studio - Student Attendance & Travel Teacher Tracker
 * Frontend Client Engine
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
    familyTravelAlertsContainer: document.getElementById('family-travel-alerts-container'),
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
    adminAlertsTbody: document.getElementById('admin-alerts-tbody'),
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

    // Travel Delay Modal (Teacher)
    modalTravelAlert: document.getElementById('modal-travel-alert'),
    formTravelAlert: document.getElementById('form-travel-alert'),
    alertStudentId: document.getElementById('alert-student-id'),
    alertScheduledTime: document.getElementById('alert-scheduled-time'),
    alertModalStudentName: document.getElementById('alert-modal-student-name'),
    alertModalSchedule: document.getElementById('alert-modal-schedule'),
    policyComplianceBox: document.getElementById('policy-compliance-box'),
    alertDelayInput: document.getElementById('alert-delay-input'),
    alertReasonSelect: document.getElementById('alert-reason-select'),
    alertMessageInput: document.getElementById('alert-message-input'),

    // Parent Confirm Modal
    modalParentConfirm: document.getElementById('modal-parent-confirm'),
    formParentConfirm: document.getElementById('form-parent-confirm'),
    confirmRecordId: document.getElementById('confirm-record-id'),
    confirmStudentId: document.getElementById('confirm-student-id'),
    confirmModalLessonTitle: document.getElementById('confirm-modal-lesson-title'),
    confirmModalTeacherName: document.getElementById('confirm-modal-teacher-name'),
    confirmStatusSelect: document.getElementById('confirm-status-select'),
    confirmParentNotes: document.getElementById('confirm-parent-notes'),

    // Parent Ack Travel Alert Modal
    modalAckAlert: document.getElementById('modal-ack-alert'),
    formAckAlert: document.getElementById('form-ack-alert'),
    ackAlertId: document.getElementById('ack-alert-id'),
    ackMessageInput: document.getElementById('ack-message-input'),

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
    bindTravelAlertEvents();

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

    window.addEventListener('keydown', (e) => {
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
        const url = `${state.gasUrl}?action=verifyPin&pin=${encodeURIComponent(pin)}`;
        const res = await fetch(url);
        result = await res.json();
      } else {
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

    // Render Live Travel Alerts if any exist today for family's students
    renderFamilyTravelAlerts(students);

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

  function renderFamilyTravelAlerts(students) {
    const db = getLocalDb();
    const todayStr = new Date().toISOString().substring(0, 10);
    const studentIds = students.map(s => s.studentId);

    // Find alerts for today matching these student IDs
    const relevantAlerts = (db.travelAlerts || []).filter(a => {
      return a.date === todayStr && studentIds.includes(a.studentId);
    });

    dom.familyTravelAlertsContainer.innerHTML = '';

    if (relevantAlerts.length === 0) {
      dom.familyTravelAlertsContainer.style.display = 'none';
      return;
    }

    dom.familyTravelAlertsContainer.style.display = 'flex';

    relevantAlerts.forEach(alert => {
      const banner = document.createElement('div');
      const isAck = alert.parentAcknowledged === 'Yes';
      banner.className = `travel-alert-banner ${isAck ? 'acknowledged' : ''}`;

      const targetStudent = students.find(s => s.studentId === alert.studentId);
      const studentName = targetStudent ? targetStudent.studentName : 'Student';
      const isPolicyMet = (alert.policyStatus || '').toLowerCase().includes('policy met');

      banner.innerHTML = `
        <div class="alert-header-row">
          <div class="alert-title-wrap">
            <div class="alert-icon-car">🚗</div>
            <div>
              <h4>Travel Delay Alert: ${alert.teacherName || 'Instructor'} is running ~${alert.delayMins || '15 mins'} late</h4>
              <p>For ${studentName}'s Lesson (Scheduled: ${alert.scheduledTime || 'Today'}) • Reason: ${alert.reason || 'Traffic'}</p>
            </div>
          </div>
          <div>
            <span class="policy-badge ${isPolicyMet ? 'met' : 'late'}">
              ${isPolicyMet ? '✓ 15+ Min Policy Notice' : '⚠️ Late Notice (<15 min)'}
            </span>
          </div>
        </div>

        <div class="alert-message-box">
          <strong>Teacher Note:</strong> "${alert.message || 'Running behind due to traffic. Will make up time!'}"
        </div>

        <div class="alert-action-row">
          <div style="font-size: 0.8rem; color: #78350F;">
            Sent at ${alert.sentAt || 'Today'}
          </div>
          <div>
            ${isAck ? `
              <div class="parent-ack-text">
                ✓ Acknowledged: "${alert.parentAckMessage || 'Received'}" (${alert.parentAckAt || ''})
              </div>
            ` : `
              <button type="button" class="btn-primary" style="background:#B45309; padding:6px 14px; font-size:0.82rem;" onclick="app.openAckAlertModal('${alert.alertId}')">
                💬 Reply / Acknowledge Notice
              </button>
            `}
          </div>
        </div>
      `;
      dom.familyTravelAlertsContainer.appendChild(banner);
    });
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
      else if (s.includes('late')) late++;
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
          <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 30px;">
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
      const isConfirmed = rec.parentStatus && rec.parentStatus.trim() !== '';

      const statusCleanClass = getStatusCleanClass(rec.status);

      tr.innerHTML = `
        <td style="font-weight: 700;">#${rec.lessonNumber || '-'}</td>
        <td style="color: var(--text-muted); font-size: 0.85rem;">${rec.date}</td>
        <td>
          <span class="status-badge ${statusCleanClass}">
            ${getStatusIcon(rec.status)} ${formatStatusLabel(rec.status)}
          </span>
        </td>
        <td style="font-size: 0.88rem;">${instructorName}</td>
        <td>
          <div class="notes-stack">
            <div class="teacher-note-bubble">
              <strong>🎵 Instructor Note:</strong> ${rec.notes || '<em style="color:#94a3b8;">Lesson held, no extra note logged</em>'}
            </div>
            ${rec.parentNotes ? `
              <div class="parent-note-bubble">
                <strong>💬 Family Note:</strong> "${rec.parentNotes}"
              </div>
            ` : ''}
          </div>
        </td>
        <td>
          ${isConfirmed ? `
            <div class="confirmed-chip">
              <span>✓</span>
              <span>${rec.parentStatus}</span>
            </div>
            <div style="margin-top: 4px;">
              <button class="demo-chip" style="font-size:0.7rem; padding:2px 6px;" onclick="app.openParentConfirmModal('${rec.recordId}', '${student.studentId}')">
                ✏️ Edit Note
              </button>
            </div>
          ` : `
            <button class="btn-confirm-action" onclick="app.openParentConfirmModal('${rec.recordId}', '${student.studentId}')">
              ✓ Confirm / Add Note
            </button>
          `}
        </td>
      `;
      dom.familyAttendanceTbody.appendChild(tr);
    });
  }

  function getStatusCleanClass(status) {
    const s = (status || '').toLowerCase();
    if (s.includes('late') && s.includes('teacher')) return 'LateTeacher';
    if (s.includes('late')) return 'LateStudent';
    if (s.includes('attend')) return 'Attended';
    if (s.includes('miss')) return 'Missed';
    if (s.includes('resched')) return 'Rescheduled';
    return 'Attended';
  }

  function formatStatusLabel(status) {
    if (!status) return 'Attended';
    if (status === 'Late (Teacher)') return 'Late (Teacher)';
    if (status === 'Late (Student)') return 'Late (Student)';
    return status;
  }

  function getStatusIcon(status) {
    const s = (status || '').toLowerCase();
    if (s.includes('teacher')) return '🟠';
    if (s.includes('late')) return '🟡';
    if (s.includes('attend')) return '🟢';
    if (s.includes('miss')) return '🔴';
    if (s.includes('resched')) return '🔵';
    return '⚪';
  }

  // ============================================================
  // VIEW: TEACHER PORTAL & STUDENT CARDS
  // ============================================================
  function renderTeacherPortal(teacher) {
    dom.viewTeacher.style.display = 'block';
    dom.teacherPortalName.textContent = `Instructor: ${teacher.name}`;
    dom.teacherPortalInstruments.textContent = `${teacher.instruments || 'Music Lessons'} • Today's Travel Student Roster`;
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

    // Map existing attendance and travel alerts for targetDate
    state.teacherRosterData = assignedStudents.map(student => {
      const existingAtt = (db.attendance || []).find(a => a.studentId === student.studentId && a.date === targetDate);
      const existingAlert = (db.travelAlerts || []).find(a => a.studentId === student.studentId && a.date === targetDate && a.teacherId === teacherId);

      return {
        ...student,
        currentStatus: existingAtt ? existingAtt.status : 'Unmarked',
        lessonNumber: existingAtt ? existingAtt.lessonNumber : '',
        notes: existingAtt ? existingAtt.notes : '',
        parentStatus: existingAtt ? existingAtt.parentStatus : '',
        parentNotes: existingAtt ? existingAtt.parentNotes : '',
        recordId: existingAtt ? existingAtt.recordId : null,
        activeAlert: existingAlert || null,
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

      const hasAlert = item.activeAlert !== null;

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
          <div>
            <button type="button" class="btn-travel-delay" onclick="app.openTravelAlertModal('${item.studentId}')">
              🚗 ${hasAlert ? 'Update Travel Delay' : 'Travel Delay Alert'}
            </button>
          </div>
        </div>

        ${hasAlert ? `
          <div class="card-alert-badge">
            <div>
              <strong>🚗 Travel Notice Active:</strong> +${item.activeAlert.delayMins} (${item.activeAlert.reason})
              • <span style="font-size:0.75rem;">${item.activeAlert.policyStatus}</span>
            </div>
            <div>
              ${item.activeAlert.parentAcknowledged === 'Yes' ? `
                <span style="color:#065F46; font-weight:700; font-size:0.75rem;">
                  ✓ Parent Replied: "${item.activeAlert.parentAckMessage || 'Acknowledged'}"
                </span>
              ` : `
                <span style="color:#92400E; font-size:0.75rem;">Waiting for parent reply...</span>
              `}
            </div>
          </div>
        ` : ''}

        <!-- 5 Attendance Status Buttons (Including Student and Teacher Tardiness) -->
        <div class="status-buttons">
          <button type="button" class="btn-status attended ${item.currentStatus === 'Attended' ? 'active' : ''}" data-idx="${index}" data-status="Attended">
            <span class="status-icon">🟢</span>
            <span>Attended</span>
          </button>
          <button type="button" class="btn-status late-student ${item.currentStatus === 'Late (Student)' ? 'active' : ''}" data-idx="${index}" data-status="Late (Student)">
            <span class="status-icon">🟡</span>
            <span>Student Tardy</span>
          </button>
          <button type="button" class="btn-status late-teacher ${item.currentStatus === 'Late (Teacher)' ? 'active' : ''}" data-idx="${index}" data-status="Late (Teacher)">
            <span class="status-icon">🟠</span>
            <span>Teacher Tardy</span>
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
            <input type="text" class="input-sm notes-input" placeholder="Teacher notes, practice homework, or make-up time details..." value="${item.notes || ''}" data-idx="${index}">
          </div>
          <div>
            <button type="button" class="btn-save-row" data-idx="${index}">Save</button>
          </div>
        </div>

        ${item.parentNotes ? `
          <div class="card-parent-feedback">
            <span>💬</span>
            <div>
              <strong>Parent Note from ${item.parentName}:</strong> "${item.parentNotes}"
              <span style="font-size:0.75rem; color:#15803d; margin-left:6px;">(${item.parentStatus || 'Confirmed'})</span>
            </div>
          </div>
        ` : ''}
      `;

      // Status button events
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

    if (!item.lessonNumber && newStatus === 'Attended') {
      item.lessonNumber = '1';
    }

    // Auto-suggest makeup note if teacher is tardy
    if (newStatus === 'Late (Teacher)' && (!item.notes || item.notes.trim() === '')) {
      item.notes = 'Travel delay. Will add makeup time to ensure full lesson is completed.';
    }

    renderTeacherStudentCards();
    saveSingleAttendanceRecord(index);
  }

  async function saveSingleAttendanceRecord(index) {
    const item = state.teacherRosterData[index];
    if (item.currentStatus === 'Unmarked') {
      showToast('Please select an attendance status.');
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
        await fetch(state.gasUrl, {
          method: 'POST',
          body: JSON.stringify({ action: 'recordAttendance', records: [rec] })
        });
      }

      const db = getLocalDb();
      if (!db.attendance) db.attendance = [];

      const existingIdx = db.attendance.findIndex(a => a.studentId === rec.studentId && a.date === rec.date);
      if (existingIdx >= 0) {
        db.attendance[existingIdx] = { ...db.attendance[existingIdx], ...rec, loggedAt: new Date().toISOString() };
      } else {
        db.attendance.push({
          recordId: 'ATT-' + Math.floor(100000 + Math.random() * 900000),
          ...rec,
          parentStatus: '',
          parentNotes: '',
          parentConfirmedAt: '',
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
            parentStatus: '',
            parentNotes: '',
            parentConfirmedAt: '',
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
  // TRAVEL DELAY ALERT & 15-MINUTE POLICY SYSTEM
  // ============================================================
  function bindTravelAlertEvents() {
    // Delay duration chips
    document.querySelectorAll('#delay-duration-chips .chip-option').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('#delay-duration-chips .chip-option').forEach(c => c.classList.remove('selected'));
        chip.classList.add('selected');
        dom.alertDelayInput.value = chip.dataset.val;
      });
    });

    // Submit Travel Alert Form
    if (dom.formTravelAlert) {
      dom.formTravelAlert.addEventListener('submit', (e) => {
        e.preventDefault();
        submitTravelAlert();
      });
    }

    // Submit Parent Confirm Form
    if (dom.formParentConfirm) {
      dom.formParentConfirm.addEventListener('submit', (e) => {
        e.preventDefault();
        submitParentConfirm();
      });
    }

    // Submit Parent Ack Alert Form
    if (dom.formAckAlert) {
      dom.formAckAlert.addEventListener('submit', (e) => {
        e.preventDefault();
        submitAckAlert();
      });
    }
  }

  function openTravelAlertModal(studentId) {
    const student = state.teacherRosterData.find(s => s.studentId === studentId);
    if (!student) return;

    dom.alertStudentId.value = student.studentId;
    dom.alertScheduledTime.value = student.time || '';
    dom.alertModalStudentName.textContent = `${student.studentName} (${student.instrument})`;
    dom.alertModalSchedule.textContent = `${student.day || 'Today'} at ${student.time || 'Scheduled Time'}`;

    // Live 15-minute Studio Policy Validation
    const now = new Date();
    const timeMatch = (student.time || '').match(/(\d+):(\d+)\s*(AM|PM)?/i);
    let diffMinutes = 30; // fallback default

    if (timeMatch) {
      let hours = parseInt(timeMatch[1], 10);
      const mins = parseInt(timeMatch[2], 10);
      const ampm = timeMatch[3] ? timeMatch[3].toUpperCase() : null;
      if (ampm === 'PM' && hours < 12) hours += 12;
      if (ampm === 'AM' && hours === 12) hours = 0;

      const schedDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, mins, 0);
      diffMinutes = Math.round((schedDate.getTime() - now.getTime()) / (60 * 1000));
    }

    if (diffMinutes >= 15) {
      dom.policyComplianceBox.style.background = '#ECFDF5';
      dom.policyComplianceBox.style.color = '#065F46';
      dom.policyComplianceBox.style.border = '1px solid #A7F3D0';
      dom.policyComplianceBox.innerHTML = `
        <strong>🟢 Studio Policy Met:</strong> You are reporting this travel delay <strong>${diffMinutes} minutes</strong> in advance (15+ min notice required). Both the family and administration will receive this notification.
      `;
    } else {
      dom.policyComplianceBox.style.background = '#FEF2F2';
      dom.policyComplianceBox.style.color = '#991B1B';
      dom.policyComplianceBox.style.border = '1px solid #FECACA';
      dom.policyComplianceBox.innerHTML = `
        <strong>⚠️ Studio Policy Alert:</strong> You are reporting this only <strong>${Math.max(0, diffMinutes)} minutes</strong> before the scheduled lesson. Studio policy strictly requires at least <strong>15 minutes advance notice</strong> for travel delays. This will be flagged for administration.
      `;
    }

    // Default note
    if (!dom.alertMessageInput.value) {
      dom.alertMessageInput.value = 'Running behind due to traffic. Will make sure we make up the full time today or add it to our next lesson!';
    }

    dom.modalTravelAlert.classList.add('open');
  }

  async function submitTravelAlert() {
    const studentId = dom.alertStudentId.value;
    const scheduledTime = dom.alertScheduledTime.value;
    const delayMins = dom.alertDelayInput.value;
    const reason = dom.alertReasonSelect.value;
    const message = dom.alertMessageInput.value.trim();

    const teacher = state.currentUser.teacher;
    const now = new Date();
    const timeMatch = (scheduledTime || '').match(/(\d+):(\d+)\s*(AM|PM)?/i);
    let policyStatus = 'Policy Met (15+ min notice)';

    if (timeMatch) {
      let hours = parseInt(timeMatch[1], 10);
      const mins = parseInt(timeMatch[2], 10);
      const ampm = timeMatch[3] ? timeMatch[3].toUpperCase() : null;
      if (ampm === 'PM' && hours < 12) hours += 12;
      if (ampm === 'AM' && hours === 12) hours = 0;
      const schedDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, mins, 0);
      const diffMinutes = Math.round((schedDate.getTime() - now.getTime()) / (60 * 1000));
      if (diffMinutes < 15) {
        policyStatus = `LATE NOTICE (${Math.max(0, diffMinutes)} min notice - Policy Alert)`;
      } else {
        policyStatus = `Policy Met (${diffMinutes} min notice)`;
      }
    }

    const alertObj = {
      alertId: 'ALERT-' + Math.floor(100000 + Math.random() * 900000),
      date: state.teacherSelectedDate,
      teacherId: teacher.id,
      teacherName: teacher.name,
      studentId: studentId,
      scheduledTime: scheduledTime,
      delayMins: delayMins,
      reason: reason,
      message: message,
      sentAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      policyStatus: policyStatus,
      parentAcknowledged: 'Pending',
      parentAckMessage: '',
      parentAckAt: ''
    };

    try {
      if (state.gasUrl) {
        await fetch(state.gasUrl, {
          method: 'POST',
          body: JSON.stringify({ action: 'sendTravelAlert', data: alertObj })
        });
      }

      const db = getLocalDb();
      if (!db.travelAlerts) db.travelAlerts = [];
      db.travelAlerts.push(alertObj);
      saveLocalDb(db);

      closeModals();
      loadTeacherRoster();
      showToast(`Travel delay alert sent! (${delayMins} delay)`);
    } catch (err) {
      showToast('Error sending delay alert: ' + err.message);
    }
  }

  function openAckAlertModal(alertId) {
    dom.ackAlertId.value = alertId;
    dom.ackMessageInput.value = 'No problem, drive safe!';
    dom.modalAckAlert.classList.add('open');
  }

  async function submitAckAlert() {
    const alertId = dom.ackAlertId.value;
    const replyMsg = dom.ackMessageInput.value.trim();

    try {
      if (state.gasUrl) {
        await fetch(state.gasUrl, {
          method: 'POST',
          body: JSON.stringify({ action: 'ackTravelAlert', alertId: alertId, ackMessage: replyMsg })
        });
      }

      const db = getLocalDb();
      if (db.travelAlerts) {
        const item = db.travelAlerts.find(a => a.alertId === alertId);
        if (item) {
          item.parentAcknowledged = 'Yes';
          item.parentAckMessage = replyMsg;
          item.parentAckAt = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
      }
      saveLocalDb(db);

      closeModals();
      showToast('Reply sent to instructor!');
      renderFamilyTravelAlerts(state.currentUser.students);
    } catch (err) {
      showToast('Error sending reply: ' + err.message);
    }
  }

  // ============================================================
  // TWO-WAY ATTENDANCE CONFIRMATION (PARENTS)
  // ============================================================
  function openParentConfirmModal(recordId, studentId) {
    const db = getLocalDb();
    const rec = (db.attendance || []).find(a => a.recordId === recordId);
    if (!rec) return;

    dom.confirmRecordId.value = recordId;
    dom.confirmStudentId.value = studentId;

    const teacher = (db.teachers || []).find(t => t.id === rec.teacherId);
    dom.confirmModalLessonTitle.textContent = `Lesson #${rec.lessonNumber || '-'} on ${rec.date}`;
    dom.confirmModalTeacherName.textContent = teacher ? teacher.name : (rec.teacherId || 'Instructor');

    if (rec.parentStatus) {
      dom.confirmStatusSelect.value = rec.parentStatus;
    } else if (rec.status === 'Late (Teacher)') {
      dom.confirmStatusSelect.value = 'Confirmed Late (Teacher)';
    } else if (rec.status === 'Late (Student)') {
      dom.confirmStatusSelect.value = 'Confirmed Late (Student)';
    } else if (rec.status === 'Rescheduled') {
      dom.confirmStatusSelect.value = 'Confirmed Rescheduled';
    } else {
      dom.confirmStatusSelect.value = 'Confirmed Attended';
    }

    dom.confirmParentNotes.value = rec.parentNotes || '';
    dom.modalParentConfirm.classList.add('open');
  }

  async function submitParentConfirm() {
    const recordId = dom.confirmRecordId.value;
    const parentStatus = dom.confirmStatusSelect.value;
    const parentNotes = dom.confirmParentNotes.value.trim();

    try {
      if (state.gasUrl) {
        await fetch(state.gasUrl, {
          method: 'POST',
          body: JSON.stringify({
            action: 'parentConfirmAttendance',
            data: { recordId, parentStatus, parentNotes }
          })
        });
      }

      const db = getLocalDb();
      if (db.attendance) {
        const item = db.attendance.find(a => a.recordId === recordId);
        if (item) {
          item.parentStatus = parentStatus;
          item.parentNotes = parentNotes;
          item.parentConfirmedAt = new Date().toISOString();
        }
      }
      saveLocalDb(db);

      closeModals();
      showToast('Attendance confirmed with teacher & administration!');
      const currentStu = state.currentUser.students[state.familyActiveStudentIdx];
      updateActiveFamilyStudent(currentStu);
    } catch (err) {
      showToast('Error saving confirmation: ' + err.message);
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
    renderAdminAlertsTable();
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
          renderAdminAlertsTable();
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

    const records = (db.attendance || []).slice(-35).reverse();
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
        <td><span class="status-badge ${getStatusCleanClass(rec.status)}">${getStatusIcon(rec.status)} ${formatStatusLabel(rec.status)}</span></td>
        <td style="font-weight: 600;">#${rec.lessonNumber || '-'}</td>
        <td>
          <div style="font-size: 0.85rem;">
            <div><strong>Teacher:</strong> ${rec.notes || '-'}</div>
            ${rec.parentNotes ? `
              <div style="color: #854d0e; margin-top: 3px;">
                <strong>Parent (${rec.parentStatus || 'Confirmed'}):</strong> "${rec.parentNotes}"
              </div>
            ` : '<div style="color:#94a3b8; font-size:0.75rem;">(Pending parent confirmation)</div>'}
          </div>
        </td>
      `;
      dom.adminAttendanceTbody.appendChild(tr);
    });
  }

  function renderAdminAlertsTable() {
    const db = getLocalDb();
    dom.adminAlertsTbody.innerHTML = '';

    const alerts = (db.travelAlerts || []).slice().reverse();
    if (alerts.length === 0) {
      dom.adminAlertsTbody.innerHTML = `
        <tr><td colspan="8" style="text-align:center; padding: 20px; color: var(--text-muted);">No travel delay alerts recorded.</td></tr>
      `;
      return;
    }

    alerts.forEach(a => {
      let studentName = a.studentId;
      (db.families || []).forEach(f => {
        const found = (f.students || []).find(s => s.studentId === a.studentId);
        if (found) studentName = found.studentName;
      });

      const teacher = (db.teachers || []).find(t => t.id === a.teacherId);
      const teacherName = teacher ? teacher.name : (a.teacherName || a.teacherId);
      const isPolicyMet = (a.policyStatus || '').toLowerCase().includes('policy met');

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-size:0.85rem;">${a.date} <br><small style="color:var(--text-muted);">${a.sentAt || ''}</small></td>
        <td style="font-weight: 700;">${teacherName}</td>
        <td>${studentName}</td>
        <td>${a.scheduledTime || '-'}</td>
        <td><strong style="color:#b45309;">+${a.delayMins || '-'}</strong></td>
        <td style="font-size: 0.85rem; max-width: 250px;">
          <div><strong>${a.reason}</strong></div>
          <div style="color:var(--text-muted); margin-top:2px;">"${a.message}"</div>
        </td>
        <td>
          <span class="policy-badge ${isPolicyMet ? 'met' : 'late'}">
            ${isPolicyMet ? '✓ Policy Met' : '⚠️ LATE NOTICE (<15m)'}
          </span>
        </td>
        <td>
          ${a.parentAcknowledged === 'Yes' ? `
            <span style="color:#065F46; font-weight:700; font-size:0.82rem;">✓ Replied:</span>
            <div style="font-size:0.8rem; color:#15803d;">"${a.parentAckMessage || 'Received'}"</div>
          ` : `
            <span style="color:#94a3b8; font-size:0.8rem;">Pending reply</span>
          `}
        </td>
      `;
      dom.adminAlertsTbody.appendChild(tr);
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

    if (dom.formAddStudent) {
      dom.formAddStudent.addEventListener('submit', (e) => {
        e.preventDefault();
        saveNewStudentFromModal();
      });
    }

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
    if (dom.modalTravelAlert) dom.modalTravelAlert.classList.remove('open');
    if (dom.modalParentConfirm) dom.modalParentConfirm.classList.remove('open');
    if (dom.modalAckAlert) dom.modalAckAlert.classList.remove('open');
  }

  // Quick preset text helpers
  function insertAlertPreset(text) {
    if (!dom.alertMessageInput) return;
    dom.alertMessageInput.value = dom.alertMessageInput.value ? `${dom.alertMessageInput.value} ${text}` : text;
  }

  function insertParentPreset(text) {
    if (!dom.confirmParentNotes) return;
    dom.confirmParentNotes.value = dom.confirmParentNotes.value ? `${dom.confirmParentNotes.value} ${text}` : text;
  }

  function insertAckPreset(text) {
    if (!dom.ackMessageInput) return;
    dom.ackMessageInput.value = text;
  }

  function quickFillPin(code) {
    state.pinBuffer = code;
    updatePinDisplay();
    triggerPinVerification(code);
  }

  // Global API
  window.app = {
    init,
    quickFillPin,
    closeModals,
    openTravelAlertModal,
    openParentConfirmModal,
    openAckAlertModal,
    insertAlertPreset,
    insertParentPreset,
    insertAckPreset
  };

  document.addEventListener('DOMContentLoaded', init);

})();
