/**
 * Cruz Music Studio - Demo & Offline Data
 * Used for instant testing and local preview before Google Sheet deployment.
 */
window.CMS_MOCK_DATA = {
  settings: {
    studioName: 'Cruz Music Studio',
    adminPin: '9900',
    contactEmail: 'info@cruzmusicstudio.com',
    phone: '(555) 234-CRUZ'
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
      notes: 'Worked on Bach Minuet in G. Great wrist position and dynamics.',
      loggedAt: '2026-09-15 16:32:00'
    },
    {
      recordId: 'ATT-002',
      date: '2026-09-22',
      studentId: 'STU-201',
      teacherId: 'T102',
      status: 'Attended',
      lessonNumber: '8',
      notes: 'Began Clementi Sonatina in C. Practice measures 1-12 with metronome at 72 bpm.',
      loggedAt: '2026-09-22 16:31:00'
    },
    {
      recordId: 'ATT-003',
      date: '2026-09-15',
      studentId: 'STU-202',
      teacherId: 'T104',
      status: 'Late',
      lessonNumber: '6',
      notes: 'Arrived 10 minutes late due to traffic. Focused on bowing technique and Suzuki Book 1.',
      loggedAt: '2026-09-15 17:15:00'
    },
    {
      recordId: 'ATT-004',
      date: '2026-09-22',
      studentId: 'STU-202',
      teacherId: 'T104',
      status: 'Rescheduled',
      lessonNumber: '7',
      notes: 'Family notified in advance of soccer tournament. Makeup scheduled for Saturday 10:00 AM.',
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
      loggedAt: '2026-09-22 17:35:00'
    }
  ]
};
