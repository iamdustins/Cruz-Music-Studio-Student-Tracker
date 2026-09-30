/**
 * Cruz Music Studio - Demo & Offline Data
 * Used for instant testing and local preview before Google Sheet deployment.
 */
window.CMS_MOCK_DATA = {
  settings: {
    studioName: 'Cruz Music Studio',
    adminPin: '9900',
    contactEmail: 'info@cruzmusicstudio.com',
    phone: '(555) 234-CRUZ',
    noticePolicyMinutes: 15 // Studio policy: 15 minutes minimum notice for travel delays
  },
  teachers: [
    { id: 'T101', name: 'David Cruz', pin: '1101', instruments: 'Guitar, Bass', email: 'david@cruzmusicstudio.com', phone: '(555) 234-1001', active: 'Yes' },
    { id: 'T102', name: 'Sarah Jenkins', pin: '1102', instruments: 'Piano, Voice', email: 'sarah@cruzmusicstudio.com', phone: '(555) 234-1002', active: 'Yes' },
    { id: 'T103', name: 'Marcus Thorne', pin: '1103', instruments: 'Drums, Percussion', email: 'marcus@cruzmusicstudio.com', phone: '(555) 234-1003', active: 'Yes' },
    { id: 'T104', name: 'Elena Rostova', pin: '1104', instruments: 'Violin, Viola', email: 'elena@cruzmusicstudio.com', phone: '(555) 234-1004', active: 'Yes' },
    { id: 'T105', name: 'Carlos Mendez', pin: '1105', instruments: 'Classical Guitar, Ukulele', email: 'carlos@cruzmusicstudio.com', phone: '(555) 234-1005', active: 'Yes' },
    { id: 'T106', name: 'Hannah Kim', pin: '1106', instruments: 'Piano', email: 'hannah@cruzmusicstudio.com', phone: '(555) 234-1006', active: 'Yes' },
    { id: 'T107', name: 'Julian Vance', pin: '1107', instruments: 'Saxophone, Flute', email: 'julian@cruzmusicstudio.com', phone: '(555) 234-1007', active: 'Yes' },
    { id: 'T108', name: 'Maya Lin', pin: '1108', instruments: 'Voice', email: 'maya@cruzmusicstudio.com', phone: '(555) 234-1008', active: 'Yes' },
    { id: 'T109', name: 'Liam O\'Connor', pin: '1109', instruments: 'Cello, Double Bass', email: 'liam@cruzmusicstudio.com', phone: '(555) 234-1009', active: 'Yes' },
    { id: 'T110', name: 'Rachel Sterling', pin: '1110', instruments: 'Piano, Music Theory', email: 'rachel@cruzmusicstudio.com', phone: '(555) 234-1010', active: 'Yes' }
  ],
  families: [
    {
      familyId: 'FAM-101',
      parentName: 'Maria Miller',
      pin: '4421',
      parentPhone: '(555) 831-2910',
      parentEmail: 'maria.miller@email.com',
      students: [
        { studentId: 'STU-201', studentName: 'Leo Miller', instrument: 'Piano', teacherId: 'T102', day: 'Tuesday', time: '4:00 PM', status: 'Active' },
        { studentId: 'STU-202', studentName: 'Maya Miller', instrument: 'Violin', teacherId: 'T104', day: 'Tuesday', time: '4:45 PM', status: 'Active' }
      ]
    },
    {
      familyId: 'FAM-102',
      parentName: 'Robert Davis',
      pin: '7819',
      parentPhone: '(555) 441-9921',
      parentEmail: 'rdavis@email.com',
      students: [
        { studentId: 'STU-203', studentName: 'Ethan Davis', instrument: 'Guitar', teacherId: 'T101', day: 'Wednesday', time: '5:00 PM', status: 'Active' }
      ]
    },
    {
      familyId: 'FAM-103',
      parentName: 'Grace Chen',
      pin: '5133',
      parentPhone: '(555) 321-7788',
      parentEmail: 'grace.chen@email.com',
      students: [
        { studentId: 'STU-204', studentName: 'Chloe Chen', instrument: 'Piano', teacherId: 'T102', day: 'Tuesday', time: '3:30 PM', status: 'Active' },
        { studentId: 'STU-205', studentName: 'Lucas Chen', instrument: 'Drums', teacherId: 'T103', day: 'Thursday', time: '4:15 PM', status: 'Active' }
      ]
    },
    {
      familyId: 'FAM-104',
      parentName: 'Anthony Lopez',
      pin: '3391',
      parentPhone: '(555) 762-1102',
      parentEmail: 'tony.lopez@email.com',
      students: [
        { studentId: 'STU-206', studentName: 'Sofia Lopez', instrument: 'Voice', teacherId: 'T102', day: 'Tuesday', time: '5:00 PM', status: 'Active' }
      ]
    },
    {
      familyId: 'FAM-105',
      parentName: 'David & Karen Walker',
      pin: '9082',
      parentPhone: '(555) 902-8411',
      parentEmail: 'walker.music@email.com',
      students: [
        { studentId: 'STU-207', studentName: 'Noah Walker', instrument: 'Piano', teacherId: 'T102', day: 'Tuesday', time: '5:30 PM', status: 'Active' },
        { studentId: 'STU-208', studentName: 'Ava Walker', instrument: 'Guitar', teacherId: 'T101', day: 'Wednesday', time: '4:30 PM', status: 'Active' }
      ]
    },
    {
      familyId: 'FAM-106',
      parentName: 'Jennifer Patel',
      pin: '2647',
      parentPhone: '(555) 612-4091',
      parentEmail: 'jenn.patel@email.com',
      students: [
        { studentId: 'STU-209', studentName: 'Aarav Patel', instrument: 'Classical Guitar', teacherId: 'T105', day: 'Monday', time: '4:00 PM', status: 'Active' }
      ]
    }
  ],
  attendance: [
    {
      recordId: 'ATT-001',
      date: '2026-09-15',
      studentId: 'STU-201',
      teacherId: 'T102',
      status: 'Attended',
      lessonNumber: '7',
      notes: 'Worked on Bach Minuet in G. Great wrist position and dynamic control.',
      parentStatus: 'Confirmed Attended',
      parentNotes: 'Thank you! Leo loved practicing with the metronome.',
      parentConfirmedAt: '2026-09-15 18:00:00',
      loggedAt: '2026-09-15 16:32:00'
    },
    {
      recordId: 'ATT-002',
      date: '2026-09-22',
      studentId: 'STU-201',
      teacherId: 'T102',
      status: 'Late (Teacher)',
      lessonNumber: '8',
      notes: 'Freeway accident delayed travel by 12 mins. Added 12 minutes to end of lesson to ensure full lesson time completed.',
      parentStatus: 'Confirmed Late (Teacher)',
      parentNotes: 'Confirmed! Thank you for letting us know in advance and making up the time.',
      parentConfirmedAt: '2026-09-22 17:30:00',
      loggedAt: '2026-09-22 16:45:00'
    },
    {
      recordId: 'ATT-003',
      date: '2026-09-15',
      studentId: 'STU-202',
      teacherId: 'T104',
      status: 'Late (Student)',
      lessonNumber: '6',
      notes: 'Student arrived 10 minutes late due to traffic. Focused on bowing technique and Suzuki Book 1.',
      parentStatus: 'Confirmed Late (Student)',
      parentNotes: 'Sorry that we were running behind today! Thank you so much for your patience.',
      parentConfirmedAt: '2026-09-15 17:45:00',
      loggedAt: '2026-09-15 17:15:00'
    },
    {
      recordId: 'ATT-004',
      date: '2026-09-22',
      studentId: 'STU-202',
      teacherId: 'T104',
      status: 'Rescheduled',
      lessonNumber: '7',
      notes: 'Family notified in advance of school choir recital. Makeup scheduled for Saturday 10:00 AM.',
      parentStatus: 'Confirmed Rescheduled',
      parentNotes: 'Thank you for being so flexible! See you Saturday morning.',
      parentConfirmedAt: '2026-09-21 19:00:00',
      loggedAt: '2026-09-21 18:00:00'
    },
    {
      recordId: 'ATT-005',
      date: '2026-09-22',
      studentId: 'STU-204',
      teacherId: 'T102',
      status: 'Attended',
      lessonNumber: '5',
      notes: 'Fabulous progress on sight-reading and chord inversions.',
      parentStatus: '',
      parentNotes: '',
      parentConfirmedAt: '',
      loggedAt: '2026-09-22 16:00:00'
    },
    {
      recordId: 'ATT-006',
      date: '2026-09-22',
      studentId: 'STU-206',
      teacherId: 'T102',
      status: 'Missed',
      lessonNumber: '9',
      notes: 'No-show without prior notice. Studio policy notified for makeup eligibility.',
      parentStatus: '',
      parentNotes: '',
      parentConfirmedAt: '',
      loggedAt: '2026-09-22 17:35:00'
    }
  ],
  travelAlerts: [
    {
      alertId: 'ALERT-001',
      date: new Date().toISOString().substring(0, 10), // Set to today so it displays live in test
      teacherId: 'T102',
      teacherName: 'Sarah Jenkins',
      studentId: 'STU-201',
      studentName: 'Leo Miller',
      scheduledTime: '4:00 PM',
      delayMins: '15 mins',
      reason: 'Heavy Traffic / Highway Accident',
      message: 'Highway 101 backup due to multi-car accident. Moving slowly now. ETA is 4:15 PM. Will make sure we make up the full 15 minutes at the end of our lesson!',
      sentAt: '3:35 PM',
      policyStatus: 'Policy Met (25 min notice)',
      parentAcknowledged: 'Yes',
      parentAckMessage: 'Thanks for the heads-up Sarah, no problem at all! Drive safe.',
      parentAckAt: '3:38 PM'
    },
    {
      alertId: 'ALERT-002',
      date: new Date().toISOString().substring(0, 10),
      teacherId: 'T104',
      teacherName: 'Elena Rostova',
      studentId: 'STU-202',
      studentName: 'Maya Miller',
      scheduledTime: '4:45 PM',
      delayMins: '20 mins',
      reason: 'Severe Weather / Sudden Rainstorm',
      message: 'Heavy rainstorm and flooded intersection on Oak Avenue. Slow traffic. ETA 5:05 PM. Will make up the time!',
      sentAt: '4:38 PM',
      policyStatus: 'LATE NOTICE (7 min notice - Policy Alert)',
      parentAcknowledged: 'Pending',
      parentAckMessage: '',
      parentAckAt: ''
    }
  ]
};
