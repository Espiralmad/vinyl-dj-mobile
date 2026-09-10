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

## Automático (cola de temas)

Botón central de la lista con ▶. **+ Temas** elige varios ficheros de Archivos/iCloud
y guarda una copia en el teléfono (IndexedDB), para que la cola siga ahí la próxima
vez. **▶ Empezar** alterna los dos platos y cruza el crossfader solo, en el punto
donde cada tema deja de sonar fuerte (`analizarSalida`).

## Modo coche

**🚗 Modo coche** en la portada, o **🚗 Coche** en el panel del automático. Pantalla
sencilla (vertical u horizontal) que reproduce la misma cola con un `<audio>`
normal, sin platos:

- Sigue sonando y pasa de tema **con el iPhone bloqueado**, y sale en la pantalla
  de bloqueo y en CarPlay («A reproducir») con título y portada.
- Los botones del volante / CarPlay / AirPods hacen play, pausa, siguiente y anterior.
- Salta el silencio del final de cada tema. **Sin fundido**: iOS no deja cambiar
  el volumen de un `<audio>`.
- Recuerda por dónde iba. Si iOS la pausa (llamada, desconectar el coche) **no
  vuelve a arrancar sola**, para no ponerse a sonar por el altavoz al bajar.

Por qué así y no con los platos: `prueba-fondo.html` (10-sep-2026, iOS 18.7). Con el
iPhone bloqueado, Web Audio se interrumpe y la app se congela; un `<audio>` sigue.
Una web no puede tener icono propio en la pantalla de CarPlay (eso es solo de apps
nativas).

## Pruebas

```
node probar-salida.mjs   # dónde acaba cada tema (automix y modo coche)
node probar-coche.mjs    # modo coche en Chrome sin ventana (necesita Chrome)
```

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
