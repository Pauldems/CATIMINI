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
import { signInWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { auth } from '../../../config/firebase';
import { Colors } from '../../../theme/colors';

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }

    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Vérifier si l'email est vérifié
      if (!user.emailVerified) {
        Alert.alert(
          'Email non vérifié',
          'Vous devez vérifier votre email avant de vous connecter. Voulez-vous renvoyer l\'email de vérification ?',
          [
            { text: 'Annuler', style: 'cancel' },
            { 
              text: 'Renvoyer', 
              onPress: async () => {
                try {
                  await sendEmailVerification(user);
                  Alert.alert('Email envoyé', 'Un nouvel email de vérification a été envoyé.');
                } catch (error) {
                  Alert.alert('Erreur', 'Impossible d\'envoyer l\'email de vérification.');
                }
              }
            }
          ]
        );
        
        // Déconnecter l'utilisateur
        await auth.signOut();
        return;
      }
      
      // Email vérifié, connexion réussie
      console.log('Connexion réussie, email vérifié');
      
    } catch (error: any) {
      Alert.alert('Erreur', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <Text style={styles.title}>Créno</Text>
        <Text style={styles.subtitle}>Trouvez une dispo</Text>

        <View style={styles.form}>
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

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Connexion...' : 'Se connecter'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => navigation.navigate('Register')}
          >
            <Text style={styles.linkText}>
              Pas encore de compte ? S'inscrire
            </Text>
          </TouchableOpacity>
        </View>
      </View>
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
    fontSize: 48,
    fontWeight: '800',
    color: '#1A3B5C',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 1,
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
});