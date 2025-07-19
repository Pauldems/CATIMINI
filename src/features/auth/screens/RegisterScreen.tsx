import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { NotificationConsentModal } from '../../profile/components/NotificationConsentModal';
import {
  createUserWithEmailAndPassword,
  updateProfile,
  sendEmailVerification,
} from 'firebase/auth';
import { doc, setDoc, collection, query, getDocs, addDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { auth, db } from '../../../config/firebase';
import { Colors } from '../../../theme/colors';

export default function RegisterScreen({ navigation }: any) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showNotificationConsent, setShowNotificationConsent] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const handleRegister = async () => {
    if (!name || !email || !password || !confirmPassword) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Erreur', 'Les mots de passe ne correspondent pas');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Erreur', 'Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    if (!acceptedTerms) {
      Alert.alert('Erreur', 'Vous devez accepter les conditions d\'utilisation et la politique de confidentialité');
      return;
    }

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await updateProfile(user, { displayName: name });

      // Envoyer l'email de vérification Firebase
      await sendEmailVerification(user, {
        url: 'https://catimini-256a1.firebaseapp.com',
        handleCodeInApp: true,
      });
      console.log('Email de vérification envoyé via Firebase');

      await setDoc(doc(db, 'users', user.uid), {
        id: user.uid,
        email: user.email,
        displayName: name,
        createdAt: new Date(),
        notificationsEnabled: false, // Par défaut désactivées jusqu'au consentement
        emailVerified: false, // Email non vérifié initialement
      });
      
      // Déconnecter l'utilisateur car l'email n'est pas vérifié
      await auth.signOut();
      
      // Afficher message de vérification au lieu de la modal
      Alert.alert(
        'Compte créé avec succès',
        'Un email de vérification a été envoyé à votre adresse email. Veuillez vérifier votre email avant de vous connecter.',
        [
          { 
            text: 'OK', 
            onPress: () => navigation.reset({ index: 0, routes: [{ name: 'Login' }] }) 
          }
        ]
      );
    } catch (error: any) {
      Alert.alert('Erreur', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationConsent = async (accepted: boolean) => {
    try {
      if (auth.currentUser) {
        await setDoc(doc(db, 'users', auth.currentUser.uid), {
          notificationsEnabled: accepted,
        }, { merge: true });
      }
      
      setShowNotificationConsent(false);
      Alert.alert(
        'Compte créé avec succès',
        'Votre compte a été créé. Vous pouvez maintenant vous connecter.',
        [{ text: 'OK', onPress: () => navigation.reset({ index: 0, routes: [{ name: 'Login' }] }) }]
      );
    } catch (error) {
      console.log('Erreur mise à jour préférences notifications:', error);
      setShowNotificationConsent(false);
      navigation.navigate('Login');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <Text style={styles.title}>Créer un compte</Text>
        <Text style={styles.subtitle}>Rejoignez vos amis sur Créno</Text>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Nom"
            placeholderTextColor="#999"
            value={name}
            onChangeText={setName}
          />

          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#999"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <TextInput
            style={styles.input}
            placeholder="Mot de passe"
            placeholderTextColor="#999"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TextInput
            style={styles.input}
            placeholder="Confirmer le mot de passe"
            placeholderTextColor="#999"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />

          <View style={styles.termsContainer}>
            <TouchableOpacity
              style={styles.checkbox}
              onPress={() => setAcceptedTerms(!acceptedTerms)}
            >
              <View style={[styles.checkboxInner, acceptedTerms && styles.checkboxChecked]}>
                {acceptedTerms && (
                  <Text style={styles.checkboxText}>✓</Text>
                )}
              </View>
            </TouchableOpacity>
            <Text style={styles.termsText}>
              <Text style={styles.termsLabel}>J'accepte les </Text>
              <Text 
                style={styles.termsLink}
                onPress={() => navigation.navigate('PrivacyPolicy')}
              >
                conditions d'utilisation et la politique de confidentialité
              </Text>
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Inscription...' : "S'inscrire"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.linkText}>
              Déjà un compte ? Se connecter
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      
      <NotificationConsentModal
        visible={showNotificationConsent}
        onAccept={() => handleNotificationConsent(true)}
        onDecline={() => handleNotificationConsent(false)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 40,
    fontWeight: '800',
    color: '#1A3B5C',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 18,
    color: '#FFB800',
    textAlign: 'center',
    marginBottom: 50,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  form: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 28,
    padding: 24,
    shadowColor: '#1A3B5C',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 15,
    backdropFilter: 'blur(10px)',
  },
  input: {
    height: 56,
    backgroundColor: '#F8F9FA',
    borderRadius: 18,
    paddingHorizontal: 20,
    fontSize: 16,
    marginBottom: 18,
    color: '#1A3B5C',
    borderWidth: 0,
    shadowColor: '#1A3B5C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    fontWeight: '500',
  },
  button: {
    height: 56,
    backgroundColor: '#1A3B5C',
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    shadowColor: '#1A3B5C',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  linkButton: {
    marginTop: 24,
    alignItems: 'center',
  },
  linkText: {
    color: '#1A3B5C',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 16,
    marginBottom: 8,
  },
  checkbox: {
    marginRight: 12,
    marginTop: 2,
  },
  checkboxInner: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#1A3B5C',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  checkboxChecked: {
    backgroundColor: '#1A3B5C',
    borderColor: '#1A3B5C',
  },
  checkboxText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  termsText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 18,
    color: '#1A3B5C',
    fontWeight: '500',
  },
  termsLabel: {
    fontSize: 14,
    color: '#1A3B5C',
    fontWeight: '500',
  },
  termsLink: {
    fontSize: 14,
    color: '#FFB800',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});