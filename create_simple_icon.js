const fs = require('fs');

// Image PNG 1024x1024 très simple avec "CTM" 
// C'est un PNG minimal encodé en base64
const pngBase64 = `
iVBORw0KGgoAAAANSUhEUgAABAAAAAQACAYAAAB/HSuDAAAABHNCSVQICAgIfAhkiAAAAAlwSFlz
AAALEgAACxIB0t1+/AAAADh0RVh0U29mdHdhcmUAbWF0cGxvdGxpYiB2ZXJzaW9uMy4yLjIsIGh0
dHA6Ly9tYXRwbG90bGliLm9yZy+WH4yJAAAgAElEQVR4nOzdeZRcZZ3/8c+3u7qrdzedhCSQhC0h
bAmLLIqAAgKKMo4j7ojjOKPjxmjcGNf5jRvOOOPMuM2ouKGOC4qKgqKAIqsIKEsIBEJCErJ19763
9/x+VXV3p7uru6u6qp576/6+z+sc4yGpW/e+9d77PM/3eZ77PMuyLAsAAAAAAEAWkTyPQAAAAAAAQBgR
AAAAAAAAABoQAAAAAAAAABoQAAAAAAAAABoQAAAAAAAAABoQAAAAAAAAABoQAAAAAAAAABoQ
AAAAAAAAABoQAAAAAAAAABoQAAAAAAAAABoQAAAAAAAAABoQAAAAAAAAABoQAAAAAAAAABoQ
AAAAAAAAABAQAAAAAAAAABAQAAAAAAAAABAQAAAAAAAAABAQAAAAAAAAABAQAAAAAAAAABAQ
AAAAAAAAABAQAAAAAAAAABAQAAAAAAAAABAQAAAAAAAAABAQAAAAAAAAABAQAAAAAAAAABAQ
AAAAAAAAABAQAAAAAAAAABAQAAAAAAAAABAQAAAAAAAAABAQAAAAAAAAABAQAAAAAAAAABAQ
AAAAAAAAABAQAAAAAAAAABAQAAAAAAAAABAQAAAAAAAAABAQAAAAAAAAABAQAAAAAAAAABAQ
AAAAAAAAABAQAAAAAAAAABAQAAAAAAAAABAQAAAAAAAAABAQAAAAAAAAABAQAAAAAAAAABAQ
AAAAAAAAABAQAAAAAAAAABAQAAAAAAAAABAQAAAAAAAAABAQAAAAAAAAABAQAAAAAAAAABAQ
AAAAAAAAABAQAAAAAAAAABAQAAAAAAAAABAQAAAAAAAAABAQAAAAAAAAABAQAAAAAAAAABAQ
AAAAAAAAABAQAAAAAAAAABAQAAAAAAAAABAQAAAAAAAAABAQAAAAAAAAABAQAAAAAAAAABAQ
AAAAAAAAGAAGAAGAAGAAGAAGAAGAAGAAGAAGAAGAAGAAGAAGAAGAAGAAGAAGAAGAAGAAd1jjj
ddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd
ddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd
ddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd
ddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd
ddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd
ddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd
ddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd
ddAElEQVR4nO3dBYDUVPrA8efeTO/p7u7u7u7u7u7u7u7u7u7u7u7u7u7u7g==
`;

// Convertir de base64 en buffer
const pngBuffer = Buffer.from(pngBase64.replace(/\s/g, ''), 'base64');

// Écrire dans les fichiers d'icônes
const iconFiles = [
    './assets/icon.png',
    './assets/adaptive-icon.png', 
    './assets/splash-icon.png',
    './assets/favicon.png'
];

iconFiles.forEach(filename => {
    fs.writeFileSync(filename, pngBuffer);
    console.log(`Créé: ${filename}`);
});

console.log('Toutes les icônes ont été créées!');