# Configuration CI/CD - Déploiement Automatique

## 🚀 GitHub Actions Configuré

Le déploiement automatique se déclenche à chaque **push sur la branche `main`**.

## 🔐 Secrets GitHub à Configurer

Allez dans **GitHub** > **Settings** > **Secrets and variables** > **Actions** > **New repository secret**

Ajoutez ces 3 secrets :

### 1. `EC2_HOST`
```
13.60.46.53
```

### 2. `EC2_USER`
```
ubuntu
```

### 3. `EC2_SSH_KEY`
Votre clé privée SSH complète (celle que vous utilisez pour vous connecter à EC2).

**Sur votre machine locale** :
```bash
# Afficher votre clé privée
cat ~/.ssh/votre-cle-ec2.pem

# OU si vous utilisez une autre clé
cat ~/.ssh/id_rsa
```

Copiez **TOUT le contenu** (de `-----BEGIN RSA PRIVATE KEY-----` à `-----END RSA PRIVATE KEY-----`) et collez-le comme valeur du secret.

---

## 🎯 Comment ça Fonctionne

1. **Push sur main** :
   ```bash
   git add .
   git commit -m "Nouvelle fonctionnalité"
   git push origin main
   ```

2. **GitHub Actions se déclenche automatiquement** :
   - Se connecte à votre EC2 via SSH
   - Pull le code
   - Lance `./deploy.sh`
   - Build et redémarre les conteneurs

3. **Votre app est mise à jour** en 5-10 minutes !

---

## 📊 Voir les Déploiements

Dans GitHub :
- Onglet **Actions**
- Voir l'historique des déploiements
- Logs en temps réel

---

## ⚠️ Important

- Le fichier `.env` sur EC2 **NE SERA PAS modifié** (sécurité)
- Seul le code est mis à jour
- Les conteneurs sont reconstruits automatiquement

---

## 🧪 Tester

Faites un petit changement :
```bash
# Modifier un fichier
echo "# Test CI/CD" >> README.md

# Commit et push
git add README.md
git commit -m "Test CI/CD"
git push origin main
```

Puis vérifiez dans l'onglet **Actions** de GitHub !
