const admin = require('firebase-admin');
require('dotenv').config();

// Caminho para o arquivo de credenciais do Firebase Admin SDK
const serviceAccount = require('./climapp-a5e2d-firebase-adminsdk-fbsvc-267305666f.json');

// Inicializar Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: process.env.FIREBASE_PROJECT_ID || 'climapp-a5e2d'
  });
}

const auth = admin.auth();

module.exports = {
  auth,
  admin
};