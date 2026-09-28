/**
 * Cruz Music Studio - Student Attendance Tracker
 * Google Apps Script Backend (Code.gs)
 * 
 * Features:
 * - 4-digit PIN authentication (Admin, Teacher, Family)
 * - Family-level PIN supporting multiple children per family
 * - Single-tap attendance logging (Attended, Late, Missed, Rescheduled)
 * - Automatic unique 4-digit PIN generation
 * - Setup function to initialize Google Sheet tabs & headers automatically
 */

// --- CONFIGURATION ---
const SHEET_NAMES = {
  SETTINGS: 'Settings',
  TEACHERS: 'Teachers',
  FAMILIES_STUDENTS: 'Families_Students',
  ATTENDANCE: 'Attendance'
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
          status: row[4], // Attended, Missed, Late, Rescheduled
          lessonNumber: row[5],
          notes: row[6],
          loggedAt: row[7]
        };
      }
    }
  }

  // Merge attendance status into student list
  const roster = students.map(s => {
    return {
      ...s,
      attendance: attendanceMap[s.studentId] || {
        status: 'Unmarked',
        lessonNumber: '',
        notes: ''
      }
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
    attSheet.appendRow(['Record ID', 'Date', 'Student ID', 'Teacher ID', 'Status', 'Lesson #', 'Notes', 'Logged At']);
  }

  const attData = attSheet.getDataRange().getValues();
  const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
  let updatedCount = 0;
  let insertedCount = 0;

  records.forEach(rec => {
    const cleanDate = formatDateValue(rec.date);
    const cleanStudentId = String(rec.studentId).trim();
    let existingRowIndex = -1;

    // Check if attendance row already exists for this student on this date
    for (let i = 1; i < attData.length; i++) {
      const rowDate = formatDateValue(attData[i][1]);
      const rowStudentId = String(attData[i][2]).trim();
      if (rowDate === cleanDate && rowStudentId === cleanStudentId) {
        existingRowIndex = i + 1; // 1-indexed for sheet
        break;
      }
    }

    if (existingRowIndex > 0) {
      // Update existing record
      attSheet.getRange(existingRowIndex, 4).setValue(rec.teacherId || '');
      attSheet.getRange(existingRowIndex, 5).setValue(rec.status);
      attSheet.getRange(existingRowIndex, 6).setValue(rec.lessonNumber || '');
      attSheet.getRange(existingRowIndex, 7).setValue(rec.notes || '');
      attSheet.getRange(existingRowIndex, 8).setValue(timestamp);
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
// 3. FAMILY PORTAL DATA
// ==========================================

function handleGetFamilyData(familyId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const famSheet = ss.getSheetByName(SHEET_NAMES.FAMILIES_STUDENTS);
  const attSheet = ss.getSheetByName(SHEET_NAMES.ATTENDANCE);
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

  // Fetch attendance records for each student
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
          loggedAt: row[7]
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
    attendance: attendanceByStudent
  };
}

// ==========================================
// 4. ADMIN OVERVIEW & ROSTER MANAGEMENT
// ==========================================

function handleGetAdminOverview() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const teacherSheet = ss.getSheetByName(SHEET_NAMES.TEACHERS);
  const famSheet = ss.getSheetByName(SHEET_NAMES.FAMILIES_STUDENTS);
  const attSheet = ss.getSheetByName(SHEET_NAMES.ATTENDANCE);
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
    // Grab last 50 attendance records
    const startIdx = Math.max(1, data.length - 50);
    for (let i = startIdx; i < data.length; i++) {
      recentAttendance.unshift({
        recordId: data[i][0],
        date: formatDateValue(data[i][1]),
        studentId: data[i][2],
        teacherId: data[i][3],
        status: data[i][4],
        lessonNumber: data[i][5],
        notes: data[i][6],
        loggedAt: data[i][7]
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
    recentAttendance: recentAttendance
  };
}

function handleAddFamilyStudent(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const famSheet = ss.getSheetByName(SHEET_NAMES.FAMILIES_STUDENTS);
  if (!famSheet) return { success: false, error: 'Sheet Families_Students missing' };

  // Use provided family PIN or generate a unique one
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
// 5. UNIQUE 4-DIGIT PIN GENERATOR
// ==========================================

function generateUniquePin() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const usedPins = new Set();

  // Collect Admin PIN
  const setSheet = ss.getSheetByName(SHEET_NAMES.SETTINGS);
  if (setSheet) {
    usedPins.add(String(setSheet.getRange('B2').getValue()).trim());
  }

  // Collect Teacher PINs
  const tSheet = ss.getSheetByName(SHEET_NAMES.TEACHERS);
  if (tSheet) {
    const tData = tSheet.getDataRange().getValues();
    for (let i = 1; i < tData.length; i++) {
      usedPins.add(String(tData[i][2]).trim());
    }
  }

  // Collect Family PINs
  const fSheet = ss.getSheetByName(SHEET_NAMES.FAMILIES_STUDENTS);
  if (fSheet) {
    const fData = fSheet.getDataRange().getValues();
    for (let i = 1; i < fData.length; i++) {
      usedPins.add(String(fData[i][2]).trim());
    }
  }

  // Generate random 4-digit code (1000 - 9999) that is NOT in usedPins
  let attempts = 0;
  while (attempts < 1000) {
    const candidate = String(Math.floor(1000 + Math.random() * 9000));
    if (!usedPins.has(candidate)) {
      return candidate;
    }
    attempts++;
  }

  // Fallback fallback if almost all pins used
  return String(Math.floor(1000 + Math.random() * 9000));
}

// ==========================================
// 6. SETUP HELPER: AUTO-INITIALIZE GOOGLE SHEET
// ==========================================

/**
 * RUN THIS FUNCTION ONCE IN THE APPS SCRIPT EDITOR
 * To automatically configure tabs, columns, formats, and sample data!
 */
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

  // Add 10 initial sample teachers
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

  // Tab 3: Families & Students (Multi-student family PIN)
  let fSheet = ss.getSheetByName(SHEET_NAMES.FAMILIES_STUDENTS);
  if (!fSheet) fSheet = ss.insertSheet(SHEET_NAMES.FAMILIES_STUDENTS);
  fSheet.clear();
  fSheet.getRange('A1:L1').setValues([[
    'Family ID', 'Parent Name', 'Family 4-Digit PIN', 'Parent Phone', 'Parent Email',
    'Student ID', 'Student Name', 'Instrument', 'Assigned Teacher ID', 'Day', 'Time', 'Status'
  ]]);
  fSheet.getRange('A1:L1').setBackground('#1e293b').setFontColor('#ffffff').setFontWeight('bold');
  fSheet.setFrozenRows(1);

  // Sample Families (illustrating one family PIN for siblings!)
  fSheet.getRange(2, 1, 5, 12).setValues([
    // Miller Family (2 kids: Leo & Maya, sharing family PIN 4421)
    ['FAM-101', 'Maria Miller', '4421', '(555) 831-2910', 'maria.miller@email.com', 'STU-201', 'Leo Miller', 'Piano', 'T102', 'Tuesday', '4:00 PM', 'Active'],
    ['FAM-101', 'Maria Miller', '4421', '(555) 831-2910', 'maria.miller@email.com', 'STU-202', 'Maya Miller', 'Violin', 'T104', 'Tuesday', '4:45 PM', 'Active'],
    // Davis Family
    ['FAM-102', 'Robert Davis', '7819', '(555) 441-9921', 'rdavis@email.com', 'STU-203', 'Ethan Davis', 'Guitar', 'T101', 'Wednesday', '5:00 PM', 'Active'],
    // Chen Family (2 kids: Chloe & Lucas, sharing family PIN 5133)
    ['FAM-103', 'Grace Chen', '5133', '(555) 321-7788', 'grace.chen@email.com', 'STU-204', 'Chloe Chen', 'Piano', 'T106', 'Thursday', '3:30 PM', 'Active'],
    ['FAM-103', 'Grace Chen', '5133', '(555) 321-7788', 'grace.chen@email.com', 'STU-205', 'Lucas Chen', 'Drums', 'T103', 'Thursday', '4:15 PM', 'Active']
  ]);
  fSheet.autoResizeColumns(1, 12);

  // Tab 4: Attendance Log
  let attSheet = ss.getSheetByName(SHEET_NAMES.ATTENDANCE);
  if (!attSheet) attSheet = ss.insertSheet(SHEET_NAMES.ATTENDANCE);
  attSheet.clear();
  attSheet.getRange('A1:H1').setValues([[
    'Record ID', 'Date', 'Student ID', 'Teacher ID', 'Status', 'Lesson #', 'Notes / Teacher Comments', 'Logged At'
  ]]);
  attSheet.getRange('A1:H1').setBackground('#1e293b').setFontColor('#ffffff').setFontWeight('bold');
  attSheet.setFrozenRows(1);

  // Sample Attendance Logs
  attSheet.getRange(2, 1, 4, 8).setValues([
    ['ATT-001', '2026-09-15', 'STU-201', 'T102', 'Attended', '7', 'Practiced G Major scale and Minuet in G. Excellent rhythm.', '2026-09-15 16:32:00'],
    ['ATT-002', '2026-09-22', 'STU-201', 'T102', 'Attended', '8', 'Introduced Sonatina in C. Practice bars 1-8 daily.', '2026-09-22 16:31:00'],
    ['ATT-003', '2026-09-15', 'STU-202', 'T104', 'Late', '6', 'Arrived 10 mins late; worked on bow posture and Suzuki book 1.', '2026-09-15 17:15:00'],
    ['ATT-004', '2026-09-22', 'STU-202', 'T104', 'Rescheduled', '7', 'Family notified ahead; rescheduled to Saturday 10:00 AM.', '2026-09-21 18:00:00']
  ]);
  attSheet.autoResizeColumns(1, 8);

  Logger.log('Cruz Music Studio sheets initialized successfully!');
}

// --- UTILITIES ---
function formatDateValue(val) {
  if (!val) return '';
  if (val instanceof Date) {
    return Utilities.formatDate(val, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  const str = String(val).trim();
  // If in YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    return str.substring(0, 10);
  }
  return str;
}
