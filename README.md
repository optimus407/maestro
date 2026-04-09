# App de Facturación Electrónica (Paraguay) - Demo

Aplicación web simple (HTML/CSS/JS) para crear una **factura electrónica demo** adaptada al flujo local de Paraguay.

## Incluye

- Carga de datos de factura, emisor y receptor.
- Gestión de ítems con IVA 10%, IVA 5% o exento.
- Cálculo automático de:
  - subtotal gravado 10%
  - subtotal gravado 5%
  - exento
  - IVA liquidado por tasa
  - total de la factura
- Guardado/carga de borrador en `localStorage`.
- Exportación a JSON.
- Impresión del comprobante.

## Uso

1. Abrí `index.html` en tu navegador.
2. Completá los campos.
3. Agregá los ítems necesarios.
4. Exportá JSON o imprimí.

## Importante

Esta app es una plantilla educativa y **no reemplaza la integración oficial con SIFEN/DNIT** para emisión legal en producción.
