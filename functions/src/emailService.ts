import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getAuth } from 'firebase-admin/auth';
import { Resend } from 'resend';

// Interface pour les données de l'email
interface EmailData {
  email: string;
  displayName: string;
}

// Fonction pour envoyer l'email de vérification
export const sendVerificationEmail = onCall(
  { 
    secrets: ['RESEND_API_KEY'],
    cors: true 
  },
  async (request) => {
    try {
      // Vérifier que l'utilisateur est authentifié
      if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Utilisateur non authentifié');
      }

      const { email, displayName } = request.data as EmailData;

      // Valider les données
      if (!email || !displayName) {
        throw new HttpsError('invalid-argument', 'Email et nom requis');
      }

      // Configurer Resend
      const apiKey = process.env.RESEND_API_KEY;
      if (!apiKey) {
        throw new HttpsError('failed-precondition', 'Clé API Resend manquante');
      }
      
      const resend = new Resend(apiKey);

      // Générer le lien de vérification
      const actionCodeSettings = {
        url: 'https://catimini-256a1.firebaseapp.com',
        handleCodeInApp: true,
      };

      const verificationLink = await getAuth().generateEmailVerificationLink(
        email,
        actionCodeSettings
      );

      // Template HTML magnifique pour Créno
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Vérification Email - Créno</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background-color: #FAFAFA;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #FAFAFA; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: rgba(255, 255, 255, 0.95); border-radius: 28px; box-shadow: 0 12px 24px rgba(26, 59, 92, 0.15); padding: 0; margin: 0;">
                  
                  <!-- Header avec logo -->
                  <tr>
                    <td style="padding: 40px 40px 20px 40px; text-align: center; background: linear-gradient(135deg, #1A3B5C 0%, #2C5882 100%); border-radius: 28px 28px 0 0;">
                      <h1 style="color: #FFFFFF; font-size: 42px; font-weight: 800; margin: 0; letter-spacing: 1px;">Créno</h1>
                      <p style="color: #FFB800; font-size: 18px; font-weight: 600; margin: 8px 0 0 0;">Trouvez une dispo</p>
                    </td>
                  </tr>
                  
                  <!-- Contenu principal -->
                  <tr>
                    <td style="padding: 40px;">
                      <h2 style="color: #1A3B5C; font-size: 28px; font-weight: 800; margin: 0 0 20px 0; text-align: center;">Bienvenue ${displayName} ! 🎉</h2>
                      
                      <p style="color: #2C3E50; font-size: 16px; line-height: 24px; margin: 0 0 20px 0; text-align: center;">
                        Merci de vous être inscrit sur <strong>Créno</strong> ! Pour commencer à organiser vos événements avec vos amis, veuillez vérifier votre adresse email.
                      </p>
                      
                      <div style="text-align: center; margin: 40px 0;">
                        <a href="${verificationLink}" 
                           style="display: inline-block; background: linear-gradient(135deg, #1A3B5C 0%, #2C5882 100%); color: #FFFFFF; text-decoration: none; padding: 16px 32px; border-radius: 18px; font-size: 18px; font-weight: 800; letter-spacing: 0.5px; box-shadow: 0 6px 12px rgba(26, 59, 92, 0.3);">
                          ✅ Vérifier mon email
                        </a>
                      </div>
                      
                      <div style="background-color: rgba(255, 184, 0, 0.1); border-left: 4px solid #FFB800; padding: 20px; margin: 30px 0; border-radius: 0 12px 12px 0;">
                        <h3 style="color: #1A3B5C; font-size: 18px; font-weight: 700; margin: 0 0 10px 0;">🚀 Prêt à commencer ?</h3>
                        <p style="color: #2C3E50; font-size: 14px; line-height: 20px; margin: 0;">
                          Une fois votre email vérifié, vous pourrez créer votre premier groupe, inviter vos amis et organiser des événements en toute simplicité !
                        </p>
                      </div>
                      
                      <p style="color: #6B7280; font-size: 14px; line-height: 20px; margin: 30px 0 0 0; text-align: center;">
                        Si vous n'avez pas créé ce compte, ignorez cet email.<br>
                        Ce lien expirera dans 24 heures.
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="padding: 20px 40px 40px 40px; text-align: center; background-color: #F8F9FA; border-radius: 0 0 28px 28px; border-top: 1px solid #E5E7EB;">
                      <p style="color: #6B7280; font-size: 14px; margin: 0;">
                        © 2025 Créno - Organisez vos événements en toute simplicité
                      </p>
                    </td>
                  </tr>
                  
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `;

      // Envoyer l'email avec Resend
      const { error } = await resend.emails.send({
        from: 'Créno <noreply@resend.dev>', // Domaine gratuit Resend
        to: email,
        subject: '🎉 Bienvenue sur Créno ! Vérifiez votre email',
        html: htmlContent,
        text: `Bienvenue ${displayName} ! Cliquez sur ce lien pour vérifier votre email : ${verificationLink}`
      });

      if (error) {
        throw new HttpsError('internal', `Erreur Resend: ${error.message}`);
      }

      return { 
        success: true, 
        message: 'Email de vérification envoyé avec succès',
        emailId: email 
      };

    } catch (error) {
      console.error('Erreur envoi email:', error);
      throw new HttpsError('internal', 'Erreur lors de l\'envoi de l\'email');
    }
  }
);