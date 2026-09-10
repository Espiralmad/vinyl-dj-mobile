// Prueba de la detección del final de una canción.
//
// Es la pieza que decide cuándo entra el siguiente tema, y equivocarse aquí se
// oye: o corta un final bonito, o deja tres segundos de silencio en medio de la
// sesión. Como no se puede comprobar mirando la pantalla, se prueba con temas
// inventados de los que sabemos cómo acaban.
//
// Correr con:  node probar-salida.mjs

import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

// La función se lee del propio index.html, para probar exactamente el código
// que va a correr en el teléfono y no una copia que se quede vieja.
const html = readFileSync(new URL("./index.html", import.meta.url), "utf8");
const desde = html.indexOf("const MEZCLA_MAX");
const hasta = html.indexOf("// ---------------------------------------------------------------------------\n// La cola y el automix");
assert.ok(desde > 0 && hasta > desde, "no encontré analizarSalida en index.html");
const { analizarSalida, MEZCLA_MAX, MEZCLA_SECA } =
  await import("data:text/javascript," + encodeURIComponent(
    html.slice(desde, hasta) + "\nexport { analizarSalida, MEZCLA_MAX, MEZCLA_SECA };"
  ));

const SR = 44100;

/**
 * Un tema de mentira.
 *
 * `tramos` son pares [segundos, volumen]: [[170,1],[20,'fade'],[5,0]] es un
 * tema que suena fuerte casi tres minutos, se desvanece veinte segundos y
 * termina con cinco de silencio.
 */
function tema(tramos) {
  const total = tramos.reduce((s, [seg]) => s + seg, 0);
  const datos = new Float32Array(Math.round(total * SR));
  let i = 0;
  for (const [seg, vol] of tramos) {
    const n = Math.round(seg * SR);
    for (let k = 0; k < n && i < datos.length; k++, i++) {
      const amp = vol === "fade" ? 1 - k / n : vol;
      // Una onda cualquiera: lo que importa es su nivel, no cómo suene.
      datos[i] = amp * Math.sin((2 * Math.PI * 220 * i) / SR);
    }
  }
  return {
    sampleRate: SR,
    duration: total,
    length: datos.length,
    getChannelData: () => datos,
  };
}

let hechas = 0;
function prova(nombre, fn) {
  fn();
  hechas++;
  console.log("  ✓ " + nombre);
}

console.log("\nFinal de la canción");

prova("un fade largo se aprovecha para mezclar encima", () => {
  const r = analizarSalida(tema([[150, 1], [20, "fade"]]));
  assert.ok(Math.abs(r.finAudible - 170) < 2, `finAudible=${r.finAudible}, esperaba ~170`);
  // Mezcla durante el fade, sin pasarse del tope.
  assert.ok(r.duracion > 8, `duracion=${r.duracion}, esperaba usar el fade`);
  assert.ok(r.duracion <= MEZCLA_MAX, `duracion=${r.duracion} supera el máximo`);
});

prova("un corte seco solo solapa unos segundos", () => {
  const r = analizarSalida(tema([[170, 1]]));
  assert.ok(Math.abs(r.finAudible - 170) < 1, `finAudible=${r.finAudible}`);
  assert.ok(r.duracion <= MEZCLA_SECA + 0.1, `duracion=${r.duracion}, esperaba <= ${MEZCLA_SECA}`);
  assert.ok(r.duracion >= 2, `duracion=${r.duracion}, demasiado corta`);
});

prova("el silencio final no se arrastra", () => {
  // Ocho segundos de nada al final del fichero: entrar ahí sería un bache.
  const r = analizarSalida(tema([[160, 1], [8, 0]]));
  assert.ok(r.finAudible < 163, `finAudible=${r.finAudible}, se comió el silencio`);
  assert.ok(r.finAudible > 157, `finAudible=${r.finAudible}, cortó demasiado pronto`);
});

prova("fade y silencio a la vez: mezcla en el fade, no en el silencio", () => {
  const r = analizarSalida(tema([[140, 1], [15, "fade"], [6, 0]]));
  assert.ok(r.finAudible < 158, `finAudible=${r.finAudible}, incluyó el silencio`);
  assert.ok(r.inicio > 140, `inicio=${r.inicio}, empezó antes del fade`);
  assert.ok(r.inicio < r.finAudible, "el inicio va antes del final");
});

prova("un tema flojo entero no se confunde con un fade", () => {
  // Grabado bajo de principio a fin: la referencia es relativa, así que debe
  // comportarse igual que uno fuerte y no creer que lleva media hora bajando.
  const r = analizarSalida(tema([[170, 0.12]]));
  assert.ok(r.duracion <= MEZCLA_SECA + 0.1, `duracion=${r.duracion}`);
  assert.ok(Math.abs(r.finAudible - 170) < 1, `finAudible=${r.finAudible}`);
});

prova("un tema muy corto no rompe nada", () => {
  const r = analizarSalida(tema([[1.5, 1]]));
  assert.ok(r.finAudible > 0 && r.inicio >= 0, "devuelve algo usable");
  assert.ok(r.inicio <= r.finAudible, "el inicio no se va detrás del final");
});

prova("silencio total: no se cuelga ni devuelve disparates", () => {
  const r = analizarSalida(tema([[30, 0]]));
  assert.ok(Number.isFinite(r.inicio) && Number.isFinite(r.duracion), "números válidos");
  assert.ok(r.inicio >= 0, "el inicio no es negativo");
});

prova("la mezcla siempre cae dentro del tema", () => {
  for (const t of [
    [[200, 1], [25, "fade"]],
    [[90, 0.8], [3, "fade"]],
    [[240, 1], [1, 0]],
  ]) {
    const b = tema(t);
    const r = analizarSalida(b);
    assert.ok(r.inicio >= 0, `inicio negativo en ${JSON.stringify(t)}`);
    assert.ok(r.inicio <= b.duration, `inicio fuera del tema en ${JSON.stringify(t)}`);
    assert.ok(r.duracion > 0, `duración nula en ${JSON.stringify(t)}`);
  }
});

console.log(`\n${hechas} comprobaciones, todas correctas.\n`);
