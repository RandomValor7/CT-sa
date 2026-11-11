function neutralizar(valor) {
  const texto = valor === null || valor === undefined ? '' : String(valor);
  return /^[=+\-@\t\r]/.test(texto) ? `'${texto}` : texto;
}

function celda(valor) {
  const texto = neutralizar(valor);
  return /[",\r\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

export function generarCsv(encabezados, filas) {
  const lineas = [encabezados.map(celda).join(',')];
  for (const fila of filas) lineas.push(fila.map(celda).join(','));
  return `﻿${lineas.join('\r\n')}\r\n`;
}
