# Halal Food Spots

Statische Webseite mit:

- Supabase-Datenbank
- Leaflet-Karte
- OpenStreetMap
- Suchleiste
- Restaurantliste

## Auf GitHub hochladen

1. Repository öffnen.
2. `Add file` → `Upload files`.
3. Alle Dateien aus diesem Ordner hochladen.
4. `Commit changes` anklicken.

## Auf Vercel veröffentlichen

1. In Vercel `Add New` → `Project`.
2. GitHub-Repository auswählen.
3. Framework Preset: `Other`.
4. Build Command leer lassen.
5. Output Directory leer lassen.
6. `Deploy` anklicken.

## Wichtig

Die Supabase-Tabelle heißt im Code `Halalfood`.

Für Marker müssen diese Spalten vorhanden und ausgefüllt sein:

- `latitude`
- `longitude`

Die Webseite nutzt nur den öffentlichen Publishable Key. Niemals einen Secret- oder Service-Role-Key in `app.js` eintragen.
