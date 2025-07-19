// Test des fonctions Firebase récupérées
const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { getFunctions, httpsCallable } = require('firebase/functions');

const firebaseConfig = {
  apiKey: "AIzaSyApPmmL0e_ewgdwqKGv9Rp796i0pdY9Pg0",
  authDomain: "catimini-256a1.firebaseapp.com",
  projectId: "catimini-256a1",
  storageBucket: "catimini-256a1.firebasestorage.app",
  messagingSenderId: "426239063773",
  appId: "1:426239063773:web:eb996e6651a50b9ef48d34"
};

// Initialiser Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const functions = getFunctions(app);

async function testFunctions() {
  try {
    console.log('🔄 Test des fonctions Firebase récupérées...');
    
    // Optionnel : s'authentifier si nécessaire
    // await signInWithEmailAndPassword(auth, 'test@example.com', 'password');
    
    // Tester la fonction testNotification
    console.log('📱 Test de la fonction testNotification...');
    const testNotificationFunction = httpsCallable(functions, 'testNotification');
    
    const result = await testNotificationFunction({
      title: '🧪 Test depuis script',
      message: 'Test des fonctions Firebase récupérées',
      testMode: true // Mode test pour ne pas créer dans Firestore
    });
    
    console.log('✅ Résultat testNotification:', result.data);
    
    // Tester la fonction sendVerificationEmail
    console.log('📧 Test de la fonction sendVerificationEmail...');
    const sendVerificationEmailFunction = httpsCallable(functions, 'sendVerificationEmail');
    
    // Note: cette fonction nécessite une authentification
    try {
      const emailResult = await sendVerificationEmailFunction({
        email: 'test@example.com',
        displayName: 'Test User'
      });
      console.log('✅ Résultat sendVerificationEmail:', emailResult.data);
    } catch (error) {
      console.log('⚠️ sendVerificationEmail nécessite une authentification (normal):', error.message);
    }
    
    console.log('🎉 Test terminé avec succès !');
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  }
}

// Exécuter le test
testFunctions();