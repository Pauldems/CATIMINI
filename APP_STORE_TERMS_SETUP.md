# Configuration des Conditions d'Utilisation dans App Store Connect

## Liens requis par Apple

Apple exige que les applications avec des abonnements auto-renouvelables incluent des liens fonctionnels vers :
1. Les Conditions d'Utilisation (EULA)
2. La Politique de Confidentialité

## Emplacements des liens dans l'app

✅ **Dans le binaire de l'app** (COMPLÉTÉ) :
- Modal Premium : Liens en bas du modal vers les deux documents
- Écran Paramètres : Boutons séparés pour chaque document
- Navigation fonctionnelle vers les écrans dédiés

## Configuration dans App Store Connect

### Option 1 : Utiliser les Conditions d'Utilisation Apple standard

1. Dans la **Description de l'app**, ajoutez ce texte :
```
Conditions d'utilisation Apple standard : https://www.apple.com/legal/internet-services/itunes/dev/stdeula/
```

### Option 2 : Utiliser des Conditions d'Utilisation personnalisées

1. Connectez-vous à App Store Connect
2. Sélectionnez votre app "Créno"
3. Allez dans l'onglet "App Information" (Informations sur l'app)
4. Faites défiler jusqu'à la section "License Agreement" (Contrat de licence)
5. Cliquez sur "Edit" (Modifier)
6. Collez le contenu du fichier `assets/terms-of-use.html` (sans les balises HTML)
7. Sauvegardez

### Politique de Confidentialité

1. Dans App Store Connect, allez dans votre app
2. Section "App Privacy" (Confidentialité de l'app)
3. Ajoutez l'URL de votre politique de confidentialité hébergée
4. Ou dans la description de l'app, ajoutez :
```
Politique de confidentialité : [URL de votre politique hébergée]
```

## URLs des documents

Si vous devez héberger les documents en ligne :
- Politique de confidentialité : `assets/privacy-policy.html`
- Conditions d'utilisation : `assets/terms-of-use.html`

Ces fichiers peuvent être hébergés sur :
- GitHub Pages
- Votre site web
- Firebase Hosting
- Tout service d'hébergement statique

## Vérification finale

Avant de resoumettre l'app :
1. ✅ Les liens sont présents dans le modal Premium
2. ✅ Les liens sont accessibles depuis les Paramètres
3. ✅ Les écrans affichent correctement les documents
4. ⏳ Les liens sont ajoutés dans App Store Connect
5. ⏳ La description de l'app mentionne les conditions d'utilisation

## Exemple de description App Store

```
Créno - Planifiez vos événements en groupe !

[Votre description actuelle...]

Abonnement Premium :
- Prix : 0,99 € par mois
- Renouvellement automatique mensuel
- Fonctionnalités : Indisponibilités et groupes illimités

Conditions d'utilisation : https://www.apple.com/legal/internet-services/itunes/dev/stdeula/
Politique de confidentialité : [Votre URL]

La gestion de l'abonnement se fait dans les paramètres de votre compte App Store.
```