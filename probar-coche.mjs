// Prueba del modo coche.
//
// El modo coche es lo que suena con el iPhone bloqueado en el coche: si deja
// de pasar de tema o se atasca, nadie lo ve hasta que hay silencio en mitad
// del viaje. Esta prueba abre la app en Chrome sin ventana, mete tres temas
// inventados en la biblioteca y comprueba que pase de tema solo (saltando el
// silencio del final), los botones, la salida y que recuerde por dónde iba.
//
// No sustituye a probarlo en el iPhone —lo del bloqueo solo lo dice el
// teléfono, ver prueba-fondo.html—, pero caza lo que se rompa al tocar código.
//
// Correr con:  node probar-coche.mjs
// Necesita Google Chrome instalado y python3 (para servir la página).

import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = dirname(fileURLToPath(import.meta.url));
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PUERTO_WEB = 8771, PUERTO_CDP = 9333, APP = `http://127.0.0.1:${PUERTO_WEB}/index.html`;
const OUT = mkdtempSync(join(tmpdir(), 'probar-coche-'));
const sleep = ms => new Promise(r => setTimeout(r, ms));

const web = spawn('python3', ['-m', 'http.server', String(PUERTO_WEB), '--bind', '127.0.0.1'], { cwd: AQUI, stdio: 'ignore' });
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PUERTO_CDP}`, `--user-data-dir=${join(OUT, 'perfil')}`,
  '--autoplay-policy=no-user-gesture-required', '--disable-gpu', '--no-first-run', 'about:blank'], { stdio: 'ignore' });
const acabar = code => { try { chrome.kill(); } catch {} try { web.kill(); } catch {} process.exit(code); };

let page;
for (let i = 0; i < 60 && !page; i++) {
  try { page = (await (await fetch(`http://127.0.0.1:${PUERTO_CDP}/json/list`)).json()).find(t => t.type === 'page'); }
  catch { await sleep(250); }
}
if (!page) { console.error('No arrancó Chrome.'); acabar(2); }

const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise(r => ws.onopen = r);
let seq = 0; const pend = new Map(); const errores = [];
ws.onmessage = ev => {
  const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); }
  else if (m.method === 'Runtime.exceptionThrown') errores.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
  else if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errores.push('console.error: ' + m.params.args.map(a => a.value ?? a.description).join(' '));
};
const send = (method, params = {}) => new Promise(r => { const i = ++seq; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async expr => {
  const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true, userGesture: true });
  if (r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || JSON.stringify(r.result.exceptionDetails));
  return r.result.result.value;
};
const foto = async nombre => {
  const r = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(join(OUT, nombre + '.png'), Buffer.from(r.result.data, 'base64'));
};
const vertical = () => send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true, screenOrientation: { type: 'portraitPrimary', angle: 0 } });
const horizontal = () => send('Emulation.setDeviceMetricsOverride', { width: 844, height: 390, deviceScaleFactor: 2, mobile: true, screenOrientation: { type: 'landscapePrimary', angle: 90 } });

const fallos = [];
const comprobar = (ok, txt) => { console.log((ok ? '  ✓ ' : '  ✗ ') + txt); if (!ok) fallos.push(txt); };

try {
  await send('Runtime.enable'); await send('Page.enable');
  await vertical();
  await send('Page.navigate', { url: APP }); await sleep(1500);

  // --- etiquetas ID3 ---
  console.log('Etiquetas ID3');
  const et = await ev(`(()=>{
    function frame(id, bytes){ const h=new Uint8Array(10+bytes.length); for(let i=0;i<4;i++) h[i]=id.charCodeAt(i);
      const n=bytes.length; h[4]=(n>>>24)&255; h[5]=(n>>>16)&255; h[6]=(n>>>8)&255; h[7]=n&255; h.set(bytes,10); return h; }
    const t=[0, ...Array.from('Hola Mundo').map(c=>c.charCodeAt(0)), 0];
    const a=[1, 0xFF,0xFE]; for(const ch of 'Artista Ñ'){ const c=ch.charCodeAt(0); a.push(c&255, c>>8); } a.push(0,0);
    const f1=frame('TIT2', new Uint8Array(t)), f2=frame('TPE1', new Uint8Array(a));
    const size=f1.length+f2.length;
    const u8=new Uint8Array(10+size); u8.set([0x49,0x44,0x33,3,0,0,(size>>21)&127,(size>>14)&127,(size>>7)&127,size&127]);
    u8.set(f1,10); u8.set(f2,10+f1.length);
    return id3Textos(u8); })()`);
  comprobar(et && et.titulo === 'Hola Mundo' && et.artista === 'Artista Ñ', `lee título y artista (latin1 y UTF-16): ${JSON.stringify(et)}`);

  // --- sembrar la biblioteca: tres temas de los que se sabe cómo acaban ---
  await ev(`(async()=>{
    function wavBlob(tono, silencio, f){ const sr=22050, n=Math.round((tono+silencio)*sr), b=new ArrayBuffer(44+n*2), v=new DataView(b);
      const s=(o,t)=>{ for(let i=0;i<t.length;i++) v.setUint8(o+i,t.charCodeAt(i)); };
      s(0,'RIFF'); v.setUint32(4,36+n*2,true); s(8,'WAVE'); s(12,'fmt '); v.setUint32(16,16,true); v.setUint16(20,1,true); v.setUint16(22,1,true);
      v.setUint32(24,sr,true); v.setUint32(28,sr*2,true); v.setUint16(32,2,true); v.setUint16(34,16,true); s(36,'data'); v.setUint32(40,n*2,true);
      for(let i=0;i<n;i++){ const t=i/sr; v.setInt16(44+i*2, t<tono ? Math.round(0.5*Math.sin(2*Math.PI*f*t)*32767) : 0, true); }
      return new Blob([b],{type:'audio/wav'}); }
    const temas=[['Uno con silencio.wav',6,3,330],['Dos seco.wav',5,0,440],['Tres con silencio.wav',4,2,550]];
    for(const [n,a,b,f] of temas) await guardarTema({id:claveFichero(n), nome:n, blob:wavBlob(a,b,f), addedAt:Date.now()});
    await guardarEstado('fila', temas.map(t=>claveFichero(t[0])));
    await guardarEstado('cochePos', null);
  })()`);

  // --- entrar desde la portada y dejarlo sonar ---
  console.log('Cola');
  await ev(`document.getElementById('cocheBtn').click()`);
  const t0 = Date.now(); const cambios = []; let ultimo = null, fotoHecha = false;
  while (Date.now() - t0 < 18000) {
    const e = await ev(`({pos:coche.pos, id:coche.id, paused:cocheAudio.paused, fin:coche.terminado,
      titulo:document.querySelector('[data-coche-titulo]').textContent,
      ms:navigator.mediaSession.metadata && navigator.mediaSession.metadata.title,
      aviso:document.querySelector('[data-coche-aviso]').textContent})`);
    const clave = e.id + '|' + e.fin;
    if (e.id && clave !== ultimo) { cambios.push({ s: (Date.now() - t0) / 1000, ...e }); ultimo = clave; }
    if (!fotoHecha && Date.now() - t0 > 3000) { await foto('coche-vertical'); fotoHecha = true; }
    await sleep(200);
  }
  for (const c of cambios) console.log(`    ${c.s.toFixed(1)} s → tema ${c.pos + 1} «${c.titulo}»${c.fin ? ' [FIN] ' + c.aviso : ''}`);
  const at = n => cambios.find(c => c.pos === n && !c.fin);
  comprobar(at(0) && !at(0).paused, 'arranca por el primer tema y suena');
  comprobar(at(1) && at(1).s > 5 && at(1).s < 7.5, `salta el silencio del final del tema 1 (cambia a los ${at(1)?.s.toFixed(1)} s; dura 9, se oye hasta el 6)`);
  comprobar(at(2) && at(2).s - at(1).s > 4.5 && at(2).s - at(1).s < 6.5, 'el tema 2, que acaba en seco, se oye entero');
  const fin = cambios.find(c => c.fin);
  comprobar(fin && at(2) && fin.s - at(2).s > 3.5 && fin.s - at(2).s < 5.5, 'el tema 3 acaba al dejar de oírse y la cola termina');
  comprobar(cambios.some(c => c.ms === 'Tres con silencio'), 'la pantalla de bloqueo recibe el título');

  await horizontal(); await sleep(600); await foto('coche-horizontal'); await vertical(); await sleep(300);

  // --- botones ---
  console.log('Botones');
  await ev(`document.querySelector('[data-coche-play]').click()`); await sleep(1200);
  let e = await ev(`({pos:coche.pos, paused:cocheAudio.paused, fin:coche.terminado})`);
  comprobar(e.pos === 0 && !e.paused && !e.fin, '▶ al final vuelve a empezar la cola');
  await ev(`document.querySelector('[data-coche-sig]').click()`); await sleep(800);
  e = await ev(`({pos:coche.pos, paused:cocheAudio.paused})`);
  comprobar(e.pos === 1 && !e.paused, '⏭ pasa al siguiente');
  await ev(`document.querySelector('[data-coche-ant]').click()`); await sleep(800);
  e = await ev(`({pos:coche.pos})`);
  comprobar(e.pos === 0, '⏮ al principio de un tema vuelve al anterior');
  await ev(`document.querySelector('[data-coche-play]').click()`); await sleep(400);
  e = await ev(`({paused:cocheAudio.paused, boton:document.querySelector('[data-coche-play]').classList.contains('sonando')})`);
  comprobar(e.paused && !e.boton, '❚❚ pausa y el botón lo refleja');
  await sleep(300);
  const guardado = await ev(`leerEstado('cochePos')`);
  comprobar(guardado && guardado.pos === 0, 'guarda por dónde va');

  // --- salir a los platos y volver ---
  console.log('Salir y volver');
  await ev(`document.querySelector('[data-coche-salir]').click()`); await sleep(500);
  e = await ev(`({visible:document.getElementById('coche').classList.contains('show'), ctx:!!ctx,
    splash:document.getElementById('splash').style.display, clase:document.body.classList.contains('en-coche'),
    ms:navigator.mediaSession.metadata})`);
  comprobar(!e.visible && e.ctx && e.splash === 'none' && !e.clase && !e.ms, 'vuelve a los platos, con el motor de audio creado y sin título en el sistema');
  await ev(`document.querySelector('[data-coche]').click()`); await sleep(1000);
  e = await ev(`({pos:coche.pos, paused:cocheAudio.paused})`);
  comprobar(e.pos === 0 && !e.paused, 'al volver a entrar sigue por el mismo tema');
  const analisis = await ev(`Promise.all(automix.fila.map(id=>leerEstado('salida:'+id)))`);
  comprobar(analisis.every(a => a && a.finAudible > 0), `el análisis de cada tema queda guardado (${analisis.map(a => a && a.finAudible.toFixed(1)).join(' / ')} s)`);
} catch (err) {
  fallos.push(String(err)); console.error(err);
}

console.log('Errores de la página: ' + (errores.length ? '\n  ' + errores.join('\n  ') : 'ninguno'));
console.log(`Capturas en ${OUT}`);
console.log(fallos.length || errores.length ? `\n${fallos.length} comprobaciones fallidas.` : '\nTodo correcto.');
ws.close();
acabar(fallos.length || errores.length ? 1 : 0);
