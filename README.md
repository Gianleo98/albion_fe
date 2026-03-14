# Albus (Albion FE)

Frontend per **Albus** — tracker dei prezzi di mercato per Albion Online.

## Funzionalità

### Home — Material Prices (Lymhurst)
- Prezzi di vendita e acquisto per Cloth, Leather, Planks e Metal Bar (T5–T8, enchantment 0–3)
- Pulsante aggiornamento forzato con popup di conferma
- Indicatore API calls rimanenti
- Icona ufficiale Albion Online

### Black Market
- Lista completa degli item del Black Market (armi, armature, offhand, accessori) dal T4 al T8
- Ordinamento dinamico: per Tier, Nome, Prezzo (ASC/DESC)
- Default: Prezzo DESC
- Pulsante aggiornamento forzato con popup di conferma
- Progress bar durante l'aggiornamento

## Tech Stack

- React 19, TypeScript 5.9
- Ionic 8, Capacitor 8
- Vite 5
- Axios

## Sviluppo

```bash
npm install
npm run dev
```

L'app si avvia su `http://localhost:5173` e si connette al backend sulla porta **1997**.

## Build APK

```bash
npm run apk
```
