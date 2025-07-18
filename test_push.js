// Test direct de notification push
const testPushNotification = async () => {
  const message = {
    to: 'ExponentPushToken[VBNmcmJ9SgkBQeDlIJbn6X]', // Votre token
    sound: 'default',
    title: '🧪 Test Direct',
    body: 'Test notification directe via API Expo',
    data: { test: true },
    priority: 'high',
  };

  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    const result = await response.json();
    console.log('Résultat:', result);
  } catch (error) {
    console.error('Erreur:', error);
  }
};

testPushNotification();