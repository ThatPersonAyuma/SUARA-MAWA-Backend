const admin = require('firebase-admin');

// Decode the Base64 service account key from environment variables
const serviceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;

if (!serviceAccountBase64) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_BASE64 environment variable is not set.');
}

// Decode and parse the JSON key
const serviceAccountJson = Buffer.from(serviceAccountBase64, 'base64').toString('ascii');
const serviceAccount = JSON.parse(serviceAccountJson);

// Initialize the Firebase Admin SDK
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

console.log("Firebase Admin SDK initialized successfully.");

// Export the messaging service for use in our API
export const messaging = admin.messaging();
// This module safely initializes the Firebase Admin SDK and exports the messaging instance for us to use in our API endpoints.