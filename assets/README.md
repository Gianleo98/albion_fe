# Icona e splash screen per l'app (APK/Android)

Per usare un'**icona personalizzata** nell'APK:

## 1. Dove mettere l'immagine

Metti la tua icona in questa cartella (`assets/`), nella **root del progetto** (accanto a `android/`, `src/`, ecc.).

**Opzione A – Icona singola (più semplice)**  
- Nome file: **`icon.png`**  
- Dimensioni consigliate: **almeno 1024×1024 px** (quadrata, PNG con sfondo trasparente o pieno).

**Opzione B – Icona adattiva (Android 8+)**  
- **`icon-foreground.png`** – figura in primo piano (1024×1024 px).  
- **`icon-background.png`** – sfondo (1024×1024 px).  

Eventualmente puoi aggiungere anche:
- **`splash.png`** – splash screen (almeno 2732×2732 px).  
- **`splash-dark.png`** – splash per tema scuro.

## 2. Generare le risorse Android

Dopo aver messo `icon.png` (o `icon-foreground.png` + `icon-background.png`) in `assets/`:

```bash
npm install @capacitor/assets --save-dev
npm run generate:assets
```

(oppure `npx capacitor-assets generate --android`).

In questo modo vengono create tutte le dimensioni necessarie in `android/app/src/main/res/` (mipmap-* e drawable).

## 3. Ricompilare l'APK

```bash
npm run apk:release
```

(o `npm run apk` per la build di debug).

---

## Comando unico (tutto in automatico)

Con **`assets/icon.png`** già in `assets/`, un solo comando genera le risorse, fa build e produce l'APK release:

```bash
npm run icon
```

Esegue in sequenza: generazione icone Android → build app → sync Capacitor → assemble release APK. L'APK con la nuova icona sarà in `android/app/build/outputs/apk/release/`.

---

**Riassunto:** metti l'immagine in **`assets/icon.png`** (1024×1024 px) e lancia **`npm run icon`** per avere l'APK con l'icona aggiornata.
