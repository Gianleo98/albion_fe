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

### APK release (firmato)

Lo script `npm run apk:release` (e `npm run icon`) genera un APK firmato. Il keystore si trova in `android/albion.keystore`.

**Dati di firma (stesso pattern di pukedex_fe):**

| Parametro    | Valore |
|-------------|--------|
| File        | `android/albion.keystore` |
| Alias       | `albion` |
| Password store | `albion123` (in `android/app/build.gradle`) |
| Password chiave | `albion123` |
| Algoritmo   | RSA 2048 bit |
| Validità    | ~27 anni |

> **IMPORTANTE:** Il keystore è nel `.gitignore` e non viene committato. Conservalo in un posto sicuro. Se lo perdi, non potrai più aggiornare l'app con la stessa firma (il Play Store lo richiede).

**Output APK release:**
```
android\app\build\outputs\apk\release\app-release.apk
```

**Ricreare il keystore (se necessario):**
```bash
# Con JAVA_HOME impostato (PowerShell):
& "$env:JAVA_HOME\bin\keytool.exe" -genkeypair -v -storetype PKCS12 -keystore android/albion.keystore -alias albion -keyalg RSA -keysize 2048 -validity 10000 -storepass albion123 -keypass albion123 -dname "CN=Albus, OU=App, O=Janraion, L=City, ST=State, C=IT"
```
Dopo aver creato un nuovo keystore, le password sono già in `android/app/build.gradle` (se usi `albion123`).
