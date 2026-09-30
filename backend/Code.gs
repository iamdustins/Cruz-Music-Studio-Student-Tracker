/**
 * Cruz Music Studio - Student Attendance Tracker
 * Google Apps Script Backend (Code.gs)
 * 
 * Features:
 * - 4-digit PIN authentication (Admin, Teacher, Family)
 * - Family-level PIN supporting multiple children per family
 * - Two-way attendance & tardiness confirmation (Parent & Teacher)
 * - Travel Teacher "Running Late / ETA" alert system with 15-minute studio notice policy enforcement
 * - Single-tap attendance logging (Attended, Late Student, Late Teacher, Missed, Rescheduled)
 * - Automatic unique 4-digit PIN generation
 * - Setup function to initialize Google Sheet tabs & headers automatically
 */

// --- CONFIGURATION ---
const SHEET_NAMES = {
  SETTINGS: 'Settings',
  TEACHERS: 'Teachers',
  FAMILIES_STUDENTS: 'Families_Students',
  ATTENDANCE: 'Attendance',
  TRAVEL_ALERTS: 'Travel_Alerts'
};

/**
 * Serves web requests (GET).
 */
function doGet(e) {
  try {
    const params = e ? e.parameter : {};
    const action = params.action;

    let response = { success: false, error: 'No valid action provided' };

    if (action === 'verifyPin') {
      response = handleVerifyPin(params.pin);
    } else if (action === 'getTeacherRoster') {
      response = handleGetTeacherRoster(params.teacherId, params.date);
    } else if (action === 'getFamilyData') {
      response = handleGetFamilyData(params.familyId);
    } else if (action === 'getAdminOverview') {
      response = handleGetAdminOverview();
    } else if (action === 'getTravelAlerts') {
      response = handleGetTravelAlerts(params.date, params.teacherId, params.studentId);
    } else if (action === 'generatePin') {
      response = { success: true, pin: generateUniquePin() };
    } else if (action === 'ping') {
      response = { success: true, message: 'Cruz Music Studio Tracker API is active!' };
    }

    return ContentService.createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Serves web requests (POST).
 */
function doPost(e) {
  try {
    let payload = {};
    if (e && e.postData && e.postData.contents) {
      payload = JSON.parse(e.postData.contents);
    }

    const action = payload.action;
    let response = { success: false, error: 'Unknown POST action: ' + action };

    if (action === 'verifyPin') {
      response = handleVerifyPin(payload.pin);
    } else if (action === 'recordAttendance') {
      response = handleRecordAttendance(payload.records);
    } else if (action === 'parentConfirmAttendance') {
      response = handleParentConfirmAttendance(payload.data);
    } else if (action === 'sendTravelAlert') {
      response = handleSendTravelAlert(payload.data);
    } else if (action === 'ackTravelAlert') {
      response = handleAckTravelAlert(payload.alertId, payload.ackMessage);
    } else if (action === 'addFamilyStudent') {
      response = handleAddFamilyStudent(payload.data);
    } else if (action === 'addTeacher') {
      response = handleAddTeacher(payload.data);
    } else if (action === 'updateStudent') {
      response = handleUpdateStudent(payload.studentId, payload.data);
    }

    return ContentService.createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// ==========================================
// 1. PIN VERIFICATION & ROUTING
// ==========================================

function handleVerifyPin(pin) {
  if (!pin) return { success: false, error: 'PIN is required' };
  const cleanPin = String(pin).trim();
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. Check Admin PIN (Settings tab)
  const settingsSheet = ss.getSheetByName(SHEET_NAMES.SETTINGS);
  if (settingsSheet) {
    const adminPin = String(settingsSheet.getRange('B2').getValue()).trim();
    if (cleanPin === adminPin) {
      const studioName = settingsSheet.getRange('B1').getValue() || 'Cruz Music Studio';
      return {
        success: true,
        role: 'admin',
        studioName: studioName
      };
    }
  }

  // 2. Check Teacher PINs
  const teacherSheet = ss.getSheetByName(SHEET_NAMES.TEACHERS);
  if (teacherSheet) {
    const data = teacherSheet.getDataRange().getValues();
    // Headers: [Teacher ID, Teacher Name, 4-Digit PIN, Instrument(s), Email, Phone, Active]
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const rowPin = String(row[2]).trim();
      const isActive = String(row[6]).toUpperCase().startsWith('Y') || row[6] === true;
      if (rowPin === cleanPin && isActive) {
        const teacher = {
          id: row[0],
          name: row[1],
          instruments: row[3],
          email: row[4],
          phone: row[5]
        };
        return {
          success: true,
          role: 'teacher',
          teacher: teacher
        };
      }
    }
  }

  // 3. Check Family PINs
  const famSheet = ss.getSheetByName(SHEET_NAMES.FAMILIES_STUDENTS);
  if (famSheet) {
    const data = famSheet.getDataRange().getValues();
    // Headers: [Family ID, Parent Name, Family 4-Digit PIN, Parent Phone, Parent Email, Student ID, Student Name, Instrument, Assigned Teacher ID, Day, Time, Status]
    const matchedStudents = [];
    let familyInfo = null;

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const rowPin = String(row[2]).trim();
      const status = String(row[11]).toLowerCase();

      if (rowPin === cleanPin && (status === 'active' || status === 'y' || status === '')) {
        if (!familyInfo) {
          familyInfo = {
            familyId: row[0],
            parentName: row[1],
            pin: rowPin,
            parentPhone: row[3],
            parentEmail: row[4]
          };
        }
        matchedStudents.push({
          studentId: row[5],
          studentName: row[6],
          instrument: row[7],
          teacherId: row[8],
          day: row[9],
          time: row[10]
        });
      }
    }

    if (familyInfo) {
      return {
        success: true,
        role: 'family',
        family: familyInfo,
        students: matchedStudents
      };
    }
  }

  return { success: false, error: 'Invalid PIN. Please check with Cruz Music Studio administration.' };
}

// ==========================================
// 2. TEACHER ROSTER & ATTENDANCE
// ==========================================

function handleGetTeacherRoster(teacherId, targetDate) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const famSheet = ss.getSheetByName(SHEET_NAMES.FAMILIES_STUDENTS);
  const attSheet = ss.getSheetByName(SHEET_NAMES.ATTENDANCE);
  const alertsSheet = ss.getSheetByName(SHEET_NAMES.TRAVEL_ALERTS);

  if (!famSheet) return { success: false, error: 'Families_Students sheet missing' };

  const famData = famSheet.getDataRange().getValues();
  const students = [];

  // Filter students for this teacher
  for (let i = 1; i < famData.length; i++) {
    const row = famData[i];
    const rowTeacherId = String(row[8]).trim();
    const status = String(row[11]).toLowerCase();
    
    if (rowTeacherId === String(teacherId).trim() && (status === 'active' || status === 'y' || status === '')) {
      students.push({
        familyId: row[0],
        parentName: row[1],
        parentPhone: row[3],
        parentEmail: row[4],
        studentId: row[5],
        studentName: row[6],
        instrument: row[7],
        teacherId: row[8],
        day: row[9],
        time: row[10]
      });
    }
  }

  // Get attendance for targetDate (defaults to today in YYYY-MM-DD)
  const dateStr = targetDate || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  const attendanceMap = {};

  if (attSheet) {
    const attData = attSheet.getDataRange().getValues();
    // Headers: [Record ID, Date, Student ID, Teacher ID, Status, Lesson #, Teacher Notes, Parent Status, Parent Notes, Parent Confirmed At, Logged At]
    for (let j = 1; j < attData.length; j++) {
      const row = attData[j];
      const recDate = formatDateValue(row[1]);
      const recStudentId = String(row[2]).trim();

      if (recDate === dateStr) {
        attendanceMap[recStudentId] = {
          recordId: row[0],
          date: recDate,
          studentId: recStudentId,
          teacherId: row[3],
          status: row[4], // Attended, Late (Student), Late (Teacher), Missed, Rescheduled
          lessonNumber: row[5],
          notes: row[6],
          parentStatus: row[7] || '',
          parentNotes: row[8] || '',
          parentConfirmedAt: row[9] || '',
          loggedAt: row[10] || ''
        };
      }
    }
  }

  // Get today's travel alerts for this teacher
  const alertsByStudent = {};
  if (alertsSheet) {
    const alertData = alertsSheet.getDataRange().getValues();
    for (let a = 1; a < alertData.length; a++) {
      const row = alertData[a];
      const aDate = formatDateValue(row[1]);
      const aTeacher = String(row[2]).trim();
      const aStudent = String(row[3]).trim();
      if (aDate === dateStr && aTeacher === String(teacherId).trim()) {
        alertsByStudent[aStudent] = {
          alertId: row[0],
          date: aDate,
          teacherId: row[2],
          studentId: aStudent,
          scheduledTime: row[4],
          delayMins: row[5],
          reason: row[6],
          message: row[7],
          sentAt: row[8],
          policyStatus: row[9],
          parentAcknowledged: row[10],
          parentAckMessage: row[11],
          parentAckAt: row[12]
        };
      }
    }
  }

  // Merge attendance status and alerts into student list
  const roster = students.map(s => {
    return {
      ...s,
      attendance: attendanceMap[s.studentId] || {
        status: 'Unmarked',
        lessonNumber: '',
        notes: '',
        parentStatus: '',
        parentNotes: ''
      },
      activeAlert: alertsByStudent[s.studentId] || null
    };
  });

  return {
    success: true,
    teacherId: teacherId,
    date: dateStr,
    roster: roster
  };
}

function handleRecordAttendance(records) {
  if (!records || !Array.isArray(records)) {
    return { success: false, error: 'Expected records array' };
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let attSheet = ss.getSheetByName(SHEET_NAMES.ATTENDANCE);
  if (!attSheet) {
    attSheet = ss.insertSheet(SHEET_NAMES.ATTENDANCE);
    attSheet.appendRow([
      'Record ID', 'Date', 'Student ID', 'Teacher ID', 'Status', 'Lesson #',
      'Teacher Notes', 'Parent Status', 'Parent Notes', 'Parent Confirmed At', 'Logged At'
    ]);
  }

  const attData = attSheet.getDataRange().getValues();
  const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
  let updatedCount = 0;
  let insertedCount = 0;

  records.forEach(rec => {
    const cleanDate = formatDateValue(rec.date);
    const cleanStudentId = String(rec.studentId).trim();
    let existingRowIndex = -1;

    for (let i = 1; i < attData.length; i++) {
      const rowDate = formatDateValue(attData[i][1]);
      const rowStudentId = String(attData[i][2]).trim();
      if (rowDate === cleanDate && rowStudentId === cleanStudentId) {
        existingRowIndex = i + 1;
        break;
      }
    }

    if (existingRowIndex > 0) {
      // Update existing record
      attSheet.getRange(existingRowIndex, 4).setValue(rec.teacherId || '');
      attSheet.getRange(existingRowIndex, 5).setValue(rec.status);
      attSheet.getRange(existingRowIndex, 6).setValue(rec.lessonNumber || '');
      attSheet.getRange(existingRowIndex, 7).setValue(rec.notes || '');
      attSheet.getRange(existingRowIndex, 11).setValue(timestamp);
      updatedCount++;
    } else {
      // Insert new record
      const recordId = 'ATT-' + Utilities.getUuid().substring(0, 8).toUpperCase();
      attSheet.appendRow([
        recordId,
        cleanDate,
        cleanStudentId,
        rec.teacherId || '',
        rec.status,
        rec.lessonNumber || '',
        rec.notes || '',
        '', // Parent Status initially empty
        '', // Parent Notes initially empty
        '', // Parent Confirmed At
        timestamp
      ]);
      insertedCount++;
    }
  });

  return {
    success: true,
    updated: updatedCount,
    inserted: insertedCount
  };
}

// ==========================================
// 3. TWO-WAY ATTENDANCE CONFIRMATION (PARENTS)
// ==========================================

function handleParentConfirmAttendance(data) {
  if (!data || !data.recordId) {
    return { success: false, error: 'Record ID is required for parent confirmation' };
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const attSheet = ss.getSheetByName(SHEET_NAMES.ATTENDANCE);
  if (!attSheet) return { success: false, error: 'Attendance sheet missing' };

  const attData = attSheet.getDataRange().getValues();
  const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
  let targetRow = -1;

  for (let i = 1; i < attData.length; i++) {
    if (String(attData[i][0]).trim() === String(data.recordId).trim()) {
      targetRow = i + 1;
      break;
    }
  }

  if (targetRow < 0) {
    return { success: false, error: 'Attendance record not found' };
  }

  // Update Parent Confirmation columns (Columns 8, 9, 10: Parent Status, Parent Notes, Parent Confirmed At)
  attSheet.getRange(targetRow, 8).setValue(data.parentStatus || 'Confirmed');
  attSheet.getRange(targetRow, 9).setValue(data.parentNotes || '');
  attSheet.getRange(targetRow, 10).setValue(timestamp);

  return {
    success: true,
    recordId: data.recordId,
    parentStatus: data.parentStatus,
    confirmedAt: timestamp
  };
}

// ==========================================
// 4. TRAVEL TEACHER DELAY ALERTS & 15-MIN POLICY
// ==========================================

function handleSendTravelAlert(data) {
  if (!data || !data.teacherId || !data.studentId) {
    return { success: false, error: 'Teacher ID and Student ID are required' };
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let alertsSheet = ss.getSheetByName(SHEET_NAMES.TRAVEL_ALERTS);
  if (!alertsSheet) {
    alertsSheet = ss.insertSheet(SHEET_NAMES.TRAVEL_ALERTS);
    alertsSheet.appendRow([
      'Alert ID', 'Date', 'Teacher ID', 'Student ID', 'Scheduled Time',
      'Estimated Delay', 'Reason', 'Teacher Message', 'Sent At',
      'Policy Notice Status', 'Parent Acknowledged', 'Parent Ack Message', 'Parent Ack At'
    ]);
  }

  const dateStr = data.date || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  const now = new Date();
  const timestamp = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');

  // Policy Compliance Check: Studio requires alert at least 15 minutes before scheduled lesson
  let policyStatus = 'Policy Met (15+ min notice)';
  if (data.scheduledTime) {
    try {
      // Parse scheduledTime string (e.g. "4:00 PM" or "16:00")
      const timeMatch = data.scheduledTime.match(/(\d+):(\d+)\s*(AM|PM)?/i);
      if (timeMatch) {
        let hours = parseInt(timeMatch[1], 10);
        const mins = parseInt(timeMatch[2], 10);
        const ampm = timeMatch[3] ? timeMatch[3].toUpperCase() : null;
        if (ampm === 'PM' && hours < 12) hours += 12;
        if (ampm === 'AM' && hours === 12) hours = 0;

        const schedDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, mins, 0);
        const diffMinutes = Math.round((schedDate.getTime() - now.getTime()) / (60 * 1000));

        if (diffMinutes < 15) {
          policyStatus = 'LATE NOTICE (<15 min notice - Policy Alert)';
        }
      }
    } catch (e) {
      // If parsing fails, preserve default
    }
  }

  const alertId = 'ALERT-' + Utilities.getUuid().substring(0, 8).toUpperCase();
  alertsSheet.appendRow([
    alertId,
    dateStr,
    data.teacherId,
    data.studentId,
    data.scheduledTime || '',
    data.delayMins || '15 mins',
    data.reason || 'Traffic Delay',
    data.message || 'Running behind due to traffic. Will make up time!',
    timestamp,
    policyStatus,
    'Pending',
    '',
    ''
  ]);

  return {
    success: true,
    alertId: alertId,
    policyStatus: policyStatus,
    sentAt: timestamp
  };
}

function handleAckTravelAlert(alertId, ackMessage) {
  if (!alertId) return { success: false, error: 'Alert ID required' };
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const alertsSheet = ss.getSheetByName(SHEET_NAMES.TRAVEL_ALERTS);
  if (!alertsSheet) return { success: false, error: 'Travel_Alerts sheet missing' };

  const data = alertsSheet.getDataRange().getValues();
  const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
  let targetRow = -1;

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === String(alertId).trim()) {
      targetRow = i + 1;
      break;
    }
  }

  if (targetRow < 0) return { success: false, error: 'Alert not found' };

  alertsSheet.getRange(targetRow, 11).setValue('Yes');
  alertsSheet.getRange(targetRow, 12).setValue(ackMessage || 'Acknowledged by parent');
  alertsSheet.getRange(targetRow, 13).setValue(timestamp);

  return {
    success: true,
    alertId: alertId,
    acknowledgedAt: timestamp
  };
}

function handleGetTravelAlerts(date, teacherId, studentId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const alertsSheet = ss.getSheetByName(SHEET_NAMES.TRAVEL_ALERTS);
  if (!alertsSheet) return { success: true, alerts: [] };

  const data = alertsSheet.getDataRange().getValues();
  const cleanDate = date ? formatDateValue(date) : Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  const results = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const rDate = formatDateValue(row[1]);
    const rTeacher = String(row[2]).trim();
    const rStudent = String(row[3]).trim();

    const dateMatch = !cleanDate || rDate === cleanDate;
    const teacherMatch = !teacherId || rTeacher === String(teacherId).trim();
    const studentMatch = !studentId || rStudent === String(studentId).trim();

    if (dateMatch && teacherMatch && studentMatch) {
      results.push({
        alertId: row[0],
        date: rDate,
        teacherId: row[2],
        studentId: row[3],
        scheduledTime: row[4],
        delayMins: row[5],
        reason: row[6],
        message: row[7],
        sentAt: row[8],
        policyStatus: row[9],
        parentAcknowledged: row[10],
        parentAckMessage: row[11],
        parentAckAt: row[12]
      });
    }
  }

  return { success: true, alerts: results };
}

// ==========================================
// 5. FAMILY PORTAL DATA
// ==========================================

function handleGetFamilyData(familyId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const famSheet = ss.getSheetByName(SHEET_NAMES.FAMILIES_STUDENTS);
  const attSheet = ss.getSheetByName(SHEET_NAMES.ATTENDANCE);
  const alertsSheet = ss.getSheetByName(SHEET_NAMES.TRAVEL_ALERTS);
  const teacherSheet = ss.getSheetByName(SHEET_NAMES.TEACHERS);

  if (!famSheet) return { success: false, error: 'Families_Students sheet missing' };

  // Teacher lookup map for names
  const teacherNames = {};
  if (teacherSheet) {
    const tData = teacherSheet.getDataRange().getValues();
    for (let t = 1; t < tData.length; t++) {
      teacherNames[String(tData[t][0]).trim()] = tData[t][1];
    }
  }

  // Get all students belonging to this family
  const famData = famSheet.getDataRange().getValues();
  const students = [];
  let familyInfo = null;

  for (let i = 1; i < famData.length; i++) {
    const row = famData[i];
    if (String(row[0]).trim() === String(familyId).trim()) {
      if (!familyInfo) {
        familyInfo = {
          familyId: row[0],
          parentName: row[1],
          pin: row[2],
          parentPhone: row[3],
          parentEmail: row[4]
        };
      }
      students.push({
        studentId: row[5],
        studentName: row[6],
        instrument: row[7],
        teacherId: row[8],
        teacherName: teacherNames[String(row[8]).trim()] || row[8],
        day: row[9],
        time: row[10]
      });
    }
  }

  if (!familyInfo) {
    return { success: false, error: 'Family not found' };
  }

  const studentIds = students.map(s => s.studentId);
  const attendanceByStudent = {};
  studentIds.forEach(id => attendanceByStudent[id] = []);

  if (attSheet) {
    const attData = attSheet.getDataRange().getValues();
    for (let j = 1; j < attData.length; j++) {
      const row = attData[j];
      const sid = String(row[2]).trim();
      if (attendanceByStudent[sid]) {
        attendanceByStudent[sid].push({
          recordId: row[0],
          date: formatDateValue(row[1]),
          teacherId: row[3],
          teacherName: teacherNames[String(row[3]).trim()] || row[3],
          status: row[4],
          lessonNumber: row[5],
          notes: row[6],
          parentStatus: row[7] || '',
          parentNotes: row[8] || '',
          parentConfirmedAt: row[9] || '',
          loggedAt: row[10] || ''
        });
      }
    }
  }

  // Active travel alerts for today for this family's students
  const todayStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  const activeAlerts = [];
  if (alertsSheet) {
    const aData = alertsSheet.getDataRange().getValues();
    for (let a = 1; a < aData.length; a++) {
      const row = aData[a];
      const aDate = formatDateValue(row[1]);
      const aStudentId = String(row[3]).trim();
      if (aDate === todayStr && studentIds.indexOf(aStudentId) !== -1) {
        activeAlerts.push({
          alertId: row[0],
          date: aDate,
          teacherId: row[2],
          teacherName: teacherNames[String(row[2]).trim()] || row[2],
          studentId: aStudentId,
          scheduledTime: row[4],
          delayMins: row[5],
          reason: row[6],
          message: row[7],
          sentAt: row[8],
          policyStatus: row[9],
          parentAcknowledged: row[10],
          parentAckMessage: row[11],
          parentAckAt: row[12]
        });
      }
    }
  }

  // Sort attendance newest first
  for (const sid in attendanceByStudent) {
    attendanceByStudent[sid].sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  return {
    success: true,
    family: familyInfo,
    students: students,
    attendance: attendanceByStudent,
    activeAlerts: activeAlerts
  };
}

// ==========================================
// 6. ADMIN OVERVIEW & ROSTER MANAGEMENT
// ==========================================

function handleGetAdminOverview() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const teacherSheet = ss.getSheetByName(SHEET_NAMES.TEACHERS);
  const famSheet = ss.getSheetByName(SHEET_NAMES.FAMILIES_STUDENTS);
  const attSheet = ss.getSheetByName(SHEET_NAMES.ATTENDANCE);
  const alertsSheet = ss.getSheetByName(SHEET_NAMES.TRAVEL_ALERTS);
  const settingsSheet = ss.getSheetByName(SHEET_NAMES.SETTINGS);

  const teachers = [];
  if (teacherSheet) {
    const data = teacherSheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      teachers.push({
        id: data[i][0],
        name: data[i][1],
        pin: data[i][2],
        instruments: data[i][3],
        email: data[i][4],
        phone: data[i][5],
        active: data[i][6]
      });
    }
  }

  const familiesStudents = [];
  if (famSheet) {
    const data = famSheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      familiesStudents.push({
        familyId: data[i][0],
        parentName: data[i][1],
        pin: data[i][2],
        parentPhone: data[i][3],
        parentEmail: data[i][4],
        studentId: data[i][5],
        studentName: data[i][6],
        instrument: data[i][7],
        teacherId: data[i][8],
        day: data[i][9],
        time: data[i][10],
        status: data[i][11]
      });
    }
  }

  const recentAttendance = [];
  if (attSheet) {
    const data = attSheet.getDataRange().getValues();
    const startIdx = Math.max(1, data.length - 60);
    for (let i = startIdx; i < data.length; i++) {
      recentAttendance.unshift({
        recordId: data[i][0],
        date: formatDateValue(data[i][1]),
        studentId: data[i][2],
        teacherId: data[i][3],
        status: data[i][4],
        lessonNumber: data[i][5],
        notes: data[i][6],
        parentStatus: data[i][7] || '',
        parentNotes: data[i][8] || '',
        parentConfirmedAt: data[i][9] || '',
        loggedAt: data[i][10] || ''
      });
    }
  }

  const travelAlerts = [];
  if (alertsSheet) {
    const aData = alertsSheet.getDataRange().getValues();
    const aStart = Math.max(1, aData.length - 40);
    for (let a = aStart; a < aData.length; a++) {
      travelAlerts.unshift({
        alertId: aData[a][0],
        date: formatDateValue(aData[a][1]),
        teacherId: aData[a][2],
        studentId: aData[a][3],
        scheduledTime: aData[a][4],
        delayMins: aData[a][5],
        reason: aData[a][6],
        message: aData[a][7],
        sentAt: aData[a][8],
        policyStatus: aData[a][9],
        parentAcknowledged: aData[a][10],
        parentAckMessage: aData[a][11],
        parentAckAt: aData[a][12]
      });
    }
  }

  const studioName = settingsSheet ? settingsSheet.getRange('B1').getValue() : 'Cruz Music Studio';
  const adminPin = settingsSheet ? settingsSheet.getRange('B2').getValue() : '9900';

  return {
    success: true,
    studioName: studioName,
    adminPin: adminPin,
    totalTeachers: teachers.length,
    totalStudents: familiesStudents.length,
    teachers: teachers,
    familiesStudents: familiesStudents,
    recentAttendance: recentAttendance,
    travelAlerts: travelAlerts
  };
}

function handleAddFamilyStudent(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const famSheet = ss.getSheetByName(SHEET_NAMES.FAMILIES_STUDENTS);
  if (!famSheet) return { success: false, error: 'Sheet Families_Students missing' };

  let pin = data.pin;
  if (!pin || String(pin).trim() === '') {
    pin = generateUniquePin();
  }

  const familyId = data.familyId || ('FAM-' + (famSheet.getLastRow() + 100));
  const studentId = data.studentId || ('STU-' + (famSheet.getLastRow() + 200));

  famSheet.appendRow([
    familyId,
    data.parentName || '',
    pin,
    data.parentPhone || '',
    data.parentEmail || '',
    studentId,
    data.studentName || '',
    data.instrument || '',
    data.teacherId || '',
    data.day || '',
    data.time || '',
    'Active'
  ]);

  return {
    success: true,
    familyId: familyId,
    studentId: studentId,
    pin: pin
  };
}

function handleAddTeacher(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const teacherSheet = ss.getSheetByName(SHEET_NAMES.TEACHERS);
  if (!teacherSheet) return { success: false, error: 'Sheet Teachers missing' };

  let pin = data.pin;
  if (!pin || String(pin).trim() === '') {
    pin = generateUniquePin();
  }

  const teacherId = data.id || ('T' + (100 + teacherSheet.getLastRow()));

  teacherSheet.appendRow([
    teacherId,
    data.name || '',
    pin,
    data.instruments || '',
    data.email || '',
    data.phone || '',
    'Yes'
  ]);

  return {
    success: true,
    teacherId: teacherId,
    pin: pin
  };
}

// ==========================================
// 7. UNIQUE 4-DIGIT PIN GENERATOR
// ==========================================

function generateUniquePin() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const usedPins = new Set();

  const setSheet = ss.getSheetByName(SHEET_NAMES.SETTINGS);
  if (setSheet) {
    usedPins.add(String(setSheet.getRange('B2').getValue()).trim());
  }

  const tSheet = ss.getSheetByName(SHEET_NAMES.TEACHERS);
  if (tSheet) {
    const tData = tSheet.getDataRange().getValues();
    for (let i = 1; i < tData.length; i++) {
      usedPins.add(String(tData[i][2]).trim());
    }
  }

  const fSheet = ss.getSheetByName(SHEET_NAMES.FAMILIES_STUDENTS);
  if (fSheet) {
    const fData = fSheet.getDataRange().getValues();
    for (let i = 1; i < fData.length; i++) {
      usedPins.add(String(fData[i][2]).trim());
    }
  }

  let attempts = 0;
  while (attempts < 1000) {
    const candidate = String(Math.floor(1000 + Math.random() * 9000));
    if (!usedPins.has(candidate)) {
      return candidate;
    }
    attempts++;
  }

  return String(Math.floor(1000 + Math.random() * 9000));
}

// ==========================================
// 8. SETUP HELPER: AUTO-INITIALIZE GOOGLE SHEET
// ==========================================

function initializeStudioSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Tab 1: Settings
  let setSheet = ss.getSheetByName(SHEET_NAMES.SETTINGS);
  if (!setSheet) setSheet = ss.insertSheet(SHEET_NAMES.SETTINGS);
  setSheet.clear();
  setSheet.getRange('A1:B3').setValues([
    ['Studio Name', 'Cruz Music Studio'],
    ['Admin PIN', '9900'],
    ['Contact Email', 'info@cruzmusicstudio.com']
  ]);
  setSheet.getRange('A1:A3').setFontWeight('bold');
  setSheet.setColumnWidth(1, 150);
  setSheet.setColumnWidth(2, 250);

  // Tab 2: Teachers
  let tSheet = ss.getSheetByName(SHEET_NAMES.TEACHERS);
  if (!tSheet) tSheet = ss.insertSheet(SHEET_NAMES.TEACHERS);
  tSheet.clear();
  tSheet.getRange('A1:G1').setValues([[
    'Teacher ID', 'Teacher Name', '4-Digit PIN', 'Instrument(s)', 'Email', 'Phone', 'Active (Yes/No)'
  ]]);
  tSheet.getRange('A1:G1').setBackground('#1e293b').setFontColor('#ffffff').setFontWeight('bold');
  tSheet.setFrozenRows(1);

  // 10 initial sample teachers
  tSheet.getRange(2, 1, 10, 7).setValues([
    ['T101', 'David Cruz', '1101', 'Guitar, Bass', 'david@cruzmusicstudio.com', '(555) 234-1001', 'Yes'],
    ['T102', 'Sarah Jenkins', '1102', 'Piano, Voice', 'sarah@cruzmusicstudio.com', '(555) 234-1002', 'Yes'],
    ['T103', 'Marcus Thorne', '1103', 'Drums, Percussion', 'marcus@cruzmusicstudio.com', '(555) 234-1003', 'Yes'],
    ['T104', 'Elena Rostova', '1104', 'Violin, Viola', 'elena@cruzmusicstudio.com', '(555) 234-1004', 'Yes'],
    ['T105', 'Carlos Mendez', '1105', 'Classical Guitar, Ukulele', 'carlos@cruzmusicstudio.com', '(555) 234-1005', 'Yes'],
    ['T106', 'Hannah Kim', '1106', 'Piano', 'hannah@cruzmusicstudio.com', '(555) 234-1006', 'Yes'],
    ['T107', 'Julian Vance', '1107', 'Saxophone, Flute', 'julian@cruzmusicstudio.com', '(555) 234-1007', 'Yes'],
    ['T108', 'Maya Lin', '1108', 'Voice', 'maya@cruzmusicstudio.com', '(555) 234-1008', 'Yes'],
    ['T109', 'Liam O\'Connor', '1109', 'Cello, Double Bass', 'liam@cruzmusicstudio.com', '(555) 234-1009', 'Yes'],
    ['T110', 'Rachel Sterling', '1110', 'Piano, Music Theory', 'rachel@cruzmusicstudio.com', '(555) 234-1010', 'Yes']
  ]);
  tSheet.autoResizeColumns(1, 7);

  // Tab 3: Families & Students
  let fSheet = ss.getSheetByName(SHEET_NAMES.FAMILIES_STUDENTS);
  if (!fSheet) fSheet = ss.insertSheet(SHEET_NAMES.FAMILIES_STUDENTS);
  fSheet.clear();
  fSheet.getRange('A1:L1').setValues([[
    'Family ID', 'Parent Name', 'Family 4-Digit PIN', 'Parent Phone', 'Parent Email',
    'Student ID', 'Student Name', 'Instrument', 'Assigned Teacher ID', 'Day', 'Time', 'Status'
  ]]);
  fSheet.getRange('A1:L1').setBackground('#1e293b').setFontColor('#ffffff').setFontWeight('bold');
  fSheet.setFrozenRows(1);

  // Sample Families
  fSheet.getRange(2, 1, 5, 12).setValues([
    ['FAM-101', 'Maria Miller', '4421', '(555) 831-2910', 'maria.miller@email.com', 'STU-201', 'Leo Miller', 'Piano', 'T102', 'Tuesday', '4:00 PM', 'Active'],
    ['FAM-101', 'Maria Miller', '4421', '(555) 831-2910', 'maria.miller@email.com', 'STU-202', 'Maya Miller', 'Violin', 'T104', 'Tuesday', '4:45 PM', 'Active'],
    ['FAM-102', 'Robert Davis', '7819', '(555) 441-9921', 'rdavis@email.com', 'STU-203', 'Ethan Davis', 'Guitar', 'T101', 'Wednesday', '5:00 PM', 'Active'],
    ['FAM-103', 'Grace Chen', '5133', '(555) 321-7788', 'grace.chen@email.com', 'STU-204', 'Chloe Chen', 'Piano', 'T106', 'Thursday', '3:30 PM', 'Active'],
    ['FAM-103', 'Grace Chen', '5133', '(555) 321-7788', 'grace.chen@email.com', 'STU-205', 'Lucas Chen', 'Drums', 'T103', 'Thursday', '4:15 PM', 'Active']
  ]);
  fSheet.autoResizeColumns(1, 12);

  // Tab 4: Attendance Log with Two-Way Fields
  let attSheet = ss.getSheetByName(SHEET_NAMES.ATTENDANCE);
  if (!attSheet) attSheet = ss.insertSheet(SHEET_NAMES.ATTENDANCE);
  attSheet.clear();
  attSheet.getRange('A1:K1').setValues([[
    'Record ID', 'Date', 'Student ID', 'Teacher ID', 'Status', 'Lesson #',
    'Teacher Notes', 'Parent Status', 'Parent Notes', 'Parent Confirmed At', 'Logged At'
  ]]);
  attSheet.getRange('A1:K1').setBackground('#1e293b').setFontColor('#ffffff').setFontWeight('bold');
  attSheet.setFrozenRows(1);

  // Sample Attendance Logs
  attSheet.getRange(2, 1, 4, 11).setValues([
    ['ATT-001', '2026-09-15', 'STU-201', 'T102', 'Attended', '7', 'Practiced G Major scale and Minuet in G. Excellent rhythm.', 'Confirmed Attended', 'Thank you! Leo loved the lesson.', '2026-09-15 18:00:00', '2026-09-15 16:32:00'],
    ['ATT-002', '2026-09-22', 'STU-201', 'T102', 'Late (Teacher)', '8', 'Traffic delay on I-95. Added 10 minutes to end of lesson to make up time.', 'Confirmed Late (Teacher)', 'Confirmed, thanks for making up the 10 minutes!', '2026-09-22 17:30:00', '2026-09-22 16:45:00'],
    ['ATT-003', '2026-09-15', 'STU-202', 'T104', 'Late (Student)', '6', 'Student arrived 10 mins late; worked on bow posture and Suzuki book 1.', 'Confirmed Late (Student)', 'Sorry we were running behind today! Thank you for your patience.', '2026-09-15 17:45:00', '2026-09-15 17:15:00'],
    ['ATT-004', '2026-09-22', 'STU-202', 'T104', 'Rescheduled', '7', 'Family notified ahead; rescheduled to Saturday 10:00 AM.', 'Confirmed Rescheduled', 'Looking forward to Saturday morning makeup.', '2026-09-21 19:00:00', '2026-09-21 18:00:00']
  ]);
  attSheet.autoResizeColumns(1, 11);

  // Tab 5: Travel Alerts Log
  let alertsSheet = ss.getSheetByName(SHEET_NAMES.TRAVEL_ALERTS);
  if (!alertsSheet) alertsSheet = ss.insertSheet(SHEET_NAMES.TRAVEL_ALERTS);
  alertsSheet.clear();
  alertsSheet.getRange('A1:M1').setValues([[
    'Alert ID', 'Date', 'Teacher ID', 'Student ID', 'Scheduled Time',
    'Estimated Delay', 'Reason', 'Teacher Message', 'Sent At',
    'Policy Notice Status', 'Parent Acknowledged', 'Parent Ack Message', 'Parent Ack At'
  ]]);
  alertsSheet.getRange('A1:M1').setBackground('#854d0e').setFontColor('#ffffff').setFontWeight('bold');
  alertsSheet.setFrozenRows(1);

  // Sample Travel Alerts
  alertsSheet.getRange(2, 1, 2, 13).setValues([
    [
      'ALERT-001', '2026-09-22', 'T102', 'STU-201', '4:00 PM',
      '15 mins', 'Highway Traffic / Accident', 'Accident on I-95, moving slowly. ETA 4:15 PM. Will make up the 15 mins at end of lesson!',
      '2026-09-22 15:35:00', 'Policy Met (15+ min notice)', 'Yes', 'No problem, drive safe!', '2026-09-22 15:40:00'
    ],
    [
      'ALERT-002', '2026-09-22', 'T104', 'STU-202', '4:45 PM',
      '20 mins', 'Severe Weather / Rain', 'Heavy storm on route. ETA 5:05 PM. Will make up time.',
      '2026-09-22 16:38:00', 'LATE NOTICE (<15 min notice - Policy Alert)', 'Pending', '', ''
    ]
  ]);
  alertsSheet.autoResizeColumns(1, 13);

  Logger.log('Cruz Music Studio sheets initialized successfully with Travel Alerts & Two-Way Attendance!');
}

// --- UTILITIES ---
function formatDateValue(val) {
  if (!val) return '';
  if (val instanceof Date) {
    return Utilities.formatDate(val, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  const str = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    return str.substring(0, 10);
  }
  return str;
}
