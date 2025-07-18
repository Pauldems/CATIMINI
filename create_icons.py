#!/usr/bin/env python3
from PIL import Image, ImageDraw, ImageFont
import os

def create_ctm_icon(size, filename):
    # Créer une image avec fond blanc
    img = Image.new('RGB', (size, size), 'white')
    draw = ImageDraw.Draw(img)
    
    # Calculer la taille de police proportionnelle
    font_size = int(size * 0.25)
    
    try:
        # Essayer d'utiliser une police système
        font = ImageFont.truetype("/System/Library/Fonts/Arial.ttf", font_size)
    except:
        try:
            font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", font_size)
        except:
            # Utiliser la police par défaut si aucune autre n'est trouvée
            font = ImageFont.load_default()
    
    # Calculer la position pour centrer le texte
    text = "CTM"
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    
    x = (size - text_width) // 2
    y = (size - text_height) // 2
    
    # Dessiner le texte en noir
    draw.text((x, y), text, fill='black', font=font)
    
    # Sauvegarder l'image
    img.save(filename, 'PNG')
    print(f"Créé: {filename} ({size}x{size})")

# Créer les différentes tailles d'icônes
icons = [
    (1024, './assets/icon.png'),           # Icône principale
    (1024, './assets/adaptive-icon.png'),  # Icône Android adaptive
    (512, './assets/splash-icon.png'),     # Écran de démarrage
    (32, './assets/favicon.png')           # Favicon web
]

for size, filename in icons:
    create_ctm_icon(size, filename)

print("Toutes les icônes ont été créées avec succès!")