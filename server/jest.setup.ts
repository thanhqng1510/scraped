jest.mock('firebase-admin', () => ({
  initializeApp: jest.fn(),
  credential: {
    cert: jest.fn(() => 'mocked-credential'),
  },
  auth: () => ({
    verifyIdToken: jest.fn(() => Promise.resolve({ uid: 'mockFirebaseUid', email: 'test@example.com' })),
  }),
}));