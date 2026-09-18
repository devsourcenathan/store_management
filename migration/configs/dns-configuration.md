# ============================================
# Guide de configuration DNS
# ============================================
# Ce document explique comment configurer les DNS
# pour la nouvelle architecture

## Architecture Cible

```
                    ┌─────────────────┐
                    │   DNS Provider  │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
        ┌─────────┐   ┌──────────┐   ┌──────────┐
        │ Vercel  │   │   EC2    │   │  Neon    │
        │Frontend │   │ Backend  │   │ Database │
        └─────────┘   └──────────┘   └──────────┘
```

## Enregistrements DNS à configurer

### 1. Frontend (Vercel)

| Type | Nom | Valeur | TTL |
|------|-----|--------|-----|
| CNAME | stock | cname.vercel-dns.com | 300 |
| CNAME | stock | cname.vercel-dns.com | 300 |
| CNAME | stockn | cname.vercel-dns.com | 300 |
| CNAME | new | cname.vercel-dns.com | 300 |

### 2. Backend (EC2)

| Type | Nom | Valeur | TTL |
|------|-----|--------|-----|
| A | stockapi | <IP_EC2_NOUVEAU> | 300 |

## Instructions par provider DNS

### Cloudflare

1. Connectez-vous à Cloudflare
2. Sélectionnez votre domaine (sekuu.com, byevastore.com)
3. Allez dans DNS > Records
4. Ajoutez/modifiez les enregistrements

### Route 53 (AWS)

1. Connectez-vous à Route 53
2. Sélectionnez votre zone
3. Cliquez sur Create Record
4. Ajoutez les enregistrements

### Vercel (automatique)

Vercel peut gérer les DNS automatiquement si vous utilisez les nameservers Vercel.

## Vérification

Après la configuration, vérifiez avec:

```bash
# Vérifier le DNS du frontend
nslookup stock.sekuu.com

# Vérifier le DNS du backend
nslookup stockapi.sekuu.com

# Vérifier la propagation
dig stock.sekuu.com
dig stockapi.sekuu.com
```

## Temps de propagation

- Cloudflare: 5 minutes
- Route 53: 60 secondes
- Autres: 24-48 heures
