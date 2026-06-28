export const seededUsers = {
  password: 'exam-demo-2026',
  teacher: {
    email: 'teacher@example.test',
    displayName: 'Taylor Teacher',
  },
  otherTeacher: {
    email: 'morgan.teacher@example.test',
    displayName: 'Morgan Teacher',
  },
  studentAda: {
    email: 'ada.student@example.test',
    displayName: 'Ada Student',
  },
  studentNoah: {
    email: 'noah.student@example.test',
    displayName: 'Noah Student',
  },
} as const;

export const seededExam = {
  title: 'Foundations of Arithmetic',
  choicePrompt: 'What is 7 + 5?',
  numericPrompt: 'What is the value of 3 x 4?',
} as const;
