# Vinyl DJ Mobile (PWA)

Versión ligera para **pinchar desde el iPhone**: 2 platos + crossfader + EQ de 3 bandas
+ tempo + punto de cue. Web Audio API, instalable en la pantalla de inicio.

No es la app de escritorio portada (imposible): es una app **web nueva** que usa el
audio del navegador. La música se carga desde **Archivos / iCloud Drive** del iPhone.

## Probarla desde el iPhone (misma WiFi)

```
./run.sh
```

Muestra una URL tipo `http://192.168.1.x:8770`. Ábrela en **Safari** del iPhone,
pulsa **Empezar**, y en cada plato **📂 Cargar** para elegir un tema de Archivos/iCloud.

> Por HTTP no se puede "Añadir a pantalla de inicio" como app instalable ni cachear
> offline (el Service Worker exige HTTPS). Para eso, publícala en **GitHub Pages**
> (HTTPS) igual que el Visor 360.

## Controles

- **▶ / ❚❚** — play/pausa.
- **◆ CUE** — reproduciendo: vuelve al punto de cue. Parado: fija el punto de cue aquí.
- **Forma de onda** — toca para saltar a esa posición.
- **TEMPO** — ±16 %.
- **GRAVES / MEDIOS / AGUDOS** — EQ (centro = plano).
- **VOL** — nivel del canal.
- **Crossfader** — mezcla A ⟷ B (doble toque = centrar).

## Límites de iOS (a propósito)

- **Sin pre-escucha por cascos**: iOS manda todo el audio a una sola salida; no hay
  salida separada para monitorización. El crossfader/EQ/faders sí funcionan.
- **Sin biblioteca permanente**: la web no puede navegar tu carpeta; eliges los temas
  con el selector de Archivos. Deja **descargados** (no solo en iCloud) los del set
  para que no haya esperas.
- El **interruptor de silencio** del iPhone puede silenciar el audio del navegador por
  el altavoz; con auriculares/salida externa no afecta.

## Archivos

- `index.html` — toda la app (HTML+CSS+JS autocontenido).
- `manifest.json`, `sw.js` — instalable + caché del "shell" (no de la música).
- `icons/` — iconos (del icono de la app de escritorio).
- `run.sh` — servidor local para pruebas.
