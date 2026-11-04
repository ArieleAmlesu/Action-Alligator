# Action Alligator 🐊

Estensione per **Firefox** che ti ricorda di **applicare** ciò che hai già imparato da libri, video, corsi ed esperienze.

- Ti mostra sempre **un'azione specifica** ("Quando apro il portatile, scrivo le 3 priorità"), mai frasi generiche.
- **Non aggiunge mai attrito all'imparare**: niente blocchi, niente overlay, niente video fermati.
- Funziona **solo sul tuo computer**: nessun server, nessuna analytics, nessuna richiesta di rete.

---

## 1. Requisiti (una volta sola)

Installa questi tre programmi su Windows:

1. **Node.js LTS**: <https://nodejs.org> → pulsante "LTS" → installa con le opzioni predefinite.
2. **Git**: <https://git-scm.com/download/win> → installa con le opzioni predefinite.
3. **Firefox** (versione 128 o più recente).

Per controllare che siano installati, apri il **Prompt dei comandi** (tasto Windows, scrivi `cmd`, Invio) e scrivi:

```
node -v
git --version
```

Devono comparire due numeri di versione.

> Se usi PowerShell e compare un errore tipo "npm.ps1 non può essere caricato", usa il **Prompt dei comandi** (`cmd`) invece di PowerShell: tutti i comandi qui sotto funzionano lì.

## 2. Scaricare e compilare

Nel Prompt dei comandi:

```
cd %USERPROFILE%\Documents
git clone https://github.com/ArieleAmlesu/Action-Alligator.git
cd Action-Alligator
npm install
npm run build
```

Alla fine trovi l'estensione pronta nella cartella `.output\firefox-mv3`.

## 3. Prova veloce (temporanea)

1. Apri Firefox e scrivi nella barra degli indirizzi: `about:debugging`
2. A sinistra clicca **Questo Firefox**.
3. Clicca **Carica componente aggiuntivo temporaneo…**
4. Scegli il file `Documents\Action-Alligator\.output\firefox-mv3\manifest.json`.

⚠️ **Così l'estensione sparisce quando chiudi Firefox** e i dati di prova vanno persi. Per usarla davvero segui il punto 4.

## 4. Installazione permanente (firmata da Mozilla, non pubblica)

Firefox accetta in modo permanente solo estensioni firmate da Mozilla. La firma è gratuita e l'estensione **non** viene pubblicata nel catalogo: resta solo tua.

1. Nel Prompt dei comandi, dentro la cartella del progetto:
   ```
   npm run zip
   ```
   Nella cartella `.output` trovi due file:
   - `action-alligator-<versione>-firefox.zip` → l'estensione
   - `action-alligator-<versione>-sources.zip` → il codice sorgente
2. Vai su <https://addons.mozilla.org/developers> e accedi (o crea un account Firefox gratuito).
3. Clicca **Invia un nuovo componente aggiuntivo**.
4. Scegli **"Distribuzione autonoma"** (*On your own*), **non** "Su questo sito".
5. Carica il file `action-alligator-<versione>-firefox.zip`.
6. Se chiede se il codice è stato generato o minimizzato da strumenti, rispondi **Sì** e carica `action-alligator-<versione>-sources.zip`. Per chi deve ricompilarlo, le istruzioni sono quelle del punto 2 di questo README.
7. Completa l'invio. Dopo qualche minuto la versione risulta firmata: nella pagina della versione scarica il file **.xpi**.
8. Trascina il file `.xpi` in una finestra di Firefox e conferma **Aggiungi**.
   In alternativa: `about:addons` → icona dell'ingranaggio → **Installa componente aggiuntivo da file…**

### La nuova scheda

Action Alligator sostituisce la pagina della nuova scheda con **la Tana**. La prima volta che apri una nuova scheda, Firefox può chiederti se vuoi **mantenere le modifiche** fatte dall'estensione: clicca **Mantieni le modifiche** (*Keep Changes*). Altrimenti Firefox ripristina la nuova scheda normale e la Tana non compare.

Per vedere la Tana puoi anche cliccare l'icona dell'alligatore nella barra degli strumenti → **Apri la Tana**.

## 5. Aggiornamenti

1. **Esporta i tuoi dati**: icona dell'alligatore → Apri la Tana → **Impostazioni** → **Esporta JSON**. Conserva il file.
2. Nel Prompt dei comandi, dentro la cartella del progetto:
   ```
   git pull
   npm install
   ```
3. Apri `package.json` con un editor di testo e **alza il numero di versione**, per esempio da `"version": "0.1.0"` a `"version": "0.1.1"`. Mozilla rifiuta una versione già usata.
4. Crea i nuovi zip:
   ```
   npm run zip
   ```
5. Su <https://addons.mozilla.org/developers> → **I miei componenti aggiuntivi** → Action Alligator → **Carica nuova versione** → di nuovo "Distribuzione autonoma" → carica il nuovo zip (e il nuovo zip dei sorgenti se lo chiede).
6. Scarica il nuovo `.xpi` firmato e trascinalo in Firefox: si installa **sopra** il vecchio. I dati restano, perché l'ID dell'estensione è sempre lo stesso (`action-alligator@ariel.local`).
7. Se qualcosa è andato storto con i dati: Impostazioni → **Importa JSON** → scegli il file esportato al punto 1.

---

## Come funziona

### Le azioni

Ogni azione ha: **quando** (il momento), **farò** (l'azione), una **versione da 2 minuti** e un tipo (**ricorrente** o **una volta sola**). Facoltativamente la **fonte** da cui l'hai imparata.

- **Massimo 3 azioni attive.** Le altre aspettano nella **Palude**. Se provi ad attivarne una quarta, la Tana ti chiede quale chiudere.
- **Fatta**:
  - per le ricorrenti fa salire il livello e allunga l'attesa: 1, 2, 4, 7, 14, 30 giorni;
  - al quinto Fatta ti chiede **"È diventata abitudine?"**. Sì: la ricontrolla ogni 30 giorni e libera il posto. No: torna a un ritmo di 7 giorni;
  - per le singole va nella **Pancia** e libera il posto.
- **Non ancora**: torna domani. Al terzo di fila ti propone **Rimpicciolisci**, **Cambia momento** o **Butta**.
- **Più tardi**: torna fra 2 ore.
- **La faccio alle…**: tra 30 minuti, stasera o domani (orari modificabili nelle impostazioni). Crea un promemoria a quell'ora.
- **La domenica** la Tana ti propone una revisione di 5 minuti.

### La fame dell'alligatore

Parte da 4 e va da 0 a 10:

| Cosa succede | Fame |
|---|---|
| Un giorno con azioni in scadenza e nessuna Fatta | +1 |
| Ogni 2 promemoria ignorati | +1 |
| Non ancora | +0,5 |
| Fatta | −3 |
| Silenzio, Più tardi, La faccio alle… | 0 |

Gli stati sono: **Sazio** (0-2), **Vigile** (3-5), **Affamato** (6-8) e **Feroce** (9-10). Più ha fame, più promemoria al giorno può mandarti: 1, 2, 3 o 4.

### Promemoria

- Arrivano a orari casuali **dentro gli orari attivi**.
- Non arrivano mai nelle finestre di silenzio, né durante il **Silenzio** (45 minuti, dal popup, senza penalità), né se non stai usando il computer.
- Le notifiche di Firefox non hanno pulsanti: **clicca la notifica** e si apre la Tana con l'azione evidenziata.
- Una notifica chiusa, o non cliccata entro 30 minuti, conta come ignorata.

### Post-it (facoltativo, spento di default)

Nelle impostazioni puoi attivare un piccolo post-it, solo sui siti che scegli. Firefox ti chiede il permesso **solo per quei siti**. È un riquadro piccolo nell'angolo in basso a sinistra: si chiude con la ×, sparisce a schermo intero e non ferma mai i video.

## Privacy

- Tutti i dati restano in `browser.storage.local`, sul tuo computer.
- Nessun server, nessuna analytics, nessun codice remoto.
- Nella build di produzione una Content Security Policy (`connect-src 'none'`) impedisce alle pagine dell'estensione qualsiasi richiesta di rete, anche per errore.
- Permessi:

| Permesso | A cosa serve |
|---|---|
| `storage` | Salvare i dati |
| `alarms` | Programmare i promemoria |
| `notifications` | Mostrarli |
| `idle` | Inviarli solo quando stai usando il computer |
| `scripting` | Mostrare il post-it, solo sui siti che autorizzi tu |

## Per sviluppatori

| Comando | Cosa fa |
|---|---|
| `npm run dev` | Avvia Firefox con l'estensione e il ricaricamento automatico |
| `npm run build` | Crea la build Firefox MV3 in `.output/firefox-mv3` |
| `npm run zip` | Crea lo zip per Firefox e lo zip dei sorgenti in `.output/` |
| `npm test` | Esegue i test (Vitest) |
| `npm run compile` | Controlla i tipi TypeScript |
| `npm run lint:firefox` | Controlla la build con `web-ext lint` (va lanciato dopo `build`) |

La logica (ritmo, fame, pianificazione, messaggi) sta in funzioni pure in `src/core/`, separate dalle API del browser, ed è coperta dai test in `tests/`.

L'icona è disegnata in `assets/icon.svg`. Per rigenerare i PNG serve Playwright installato a livello globale: `node scripts/render-icons.mjs`.
