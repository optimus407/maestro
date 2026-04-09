const ids = [
  "fecha",
  "moneda",
  "timbrado",
  "establecimiento",
  "puntoExpedicion",
  "numero",
  "emisorNombre",
  "emisorRuc",
  "emisorDireccion",
  "receptorNombre",
  "receptorRuc",
  "receptorDireccion"
];

const $ = (id) => document.getElementById(id);
const tablaBody = document.querySelector("#tablaItems tbody");
const itemTemplate = $("itemTemplate");

$("fecha").valueAsDate = new Date();

function formatMoney(value, currency = "PYG") {
  const locale = currency === "USD" ? "en-US" : "es-PY";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "USD" ? 2 : 0
  }).format(value);
}

function newItem(data = {}) {
  const row = itemTemplate.content.firstElementChild.cloneNode(true);
  row.querySelector(".descripcion").value = data.descripcion || "";
  row.querySelector(".cantidad").value = data.cantidad ?? 1;
  row.querySelector(".precio").value = data.precio ?? 0;
  row.querySelector(".iva").value = String(data.iva ?? 10);

  row.addEventListener("input", updateTotals);
  row.querySelector(".eliminar").addEventListener("click", () => {
    row.remove();
    updateTotals();
  });

  tablaBody.appendChild(row);
  updateTotals();
}

function getItems() {
  return Array.from(tablaBody.querySelectorAll("tr")).map((row) => ({
    descripcion: row.querySelector(".descripcion").value.trim(),
    cantidad: Number(row.querySelector(".cantidad").value) || 0,
    precio: Number(row.querySelector(".precio").value) || 0,
    iva: Number(row.querySelector(".iva").value) || 0
  }));
}

function updateTotals() {
  const moneda = $("moneda").value;
  let total10 = 0;
  let total5 = 0;
  let totalExento = 0;

  Array.from(tablaBody.querySelectorAll("tr")).forEach((row) => {
    const cantidad = Number(row.querySelector(".cantidad").value) || 0;
    const precio = Number(row.querySelector(".precio").value) || 0;
    const iva = Number(row.querySelector(".iva").value) || 0;
    const subtotal = cantidad * precio;

    if (iva === 10) total10 += subtotal;
    else if (iva === 5) total5 += subtotal;
    else totalExento += subtotal;

    row.querySelector(".subtotal").textContent = formatMoney(subtotal, moneda);
  });

  const iva10 = total10 / 11;
  const iva5 = total5 / 21;
  const totalFactura = total10 + total5 + totalExento;

  $("total10").textContent = formatMoney(total10, moneda);
  $("total5").textContent = formatMoney(total5, moneda);
  $("totalExento").textContent = formatMoney(totalExento, moneda);
  $("iva10").textContent = formatMoney(iva10, moneda);
  $("iva5").textContent = formatMoney(iva5, moneda);
  $("totalFactura").textContent = formatMoney(totalFactura, moneda);
}

function buildInvoicePayload() {
  const payload = {
    metadata: {
      tipoDocumento: "Factura Electrónica (Demo)",
      generadoEn: new Date().toISOString()
    },
    factura: Object.fromEntries(ids.map((id) => [id, $(id).value])),
    items: getItems()
  };

  return payload;
}

function saveDraft() {
  const payload = buildInvoicePayload();
  localStorage.setItem("factura-paraguay-demo", JSON.stringify(payload));
  alert("Borrador guardado en este navegador.");
}

function loadDraft() {
  const saved = localStorage.getItem("factura-paraguay-demo");
  if (!saved) {
    alert("No hay borrador guardado.");
    return;
  }

  const payload = JSON.parse(saved);
  ids.forEach((id) => {
    $(id).value = payload.factura?.[id] ?? "";
  });

  tablaBody.innerHTML = "";
  (payload.items || []).forEach((item) => newItem(item));
  if ((payload.items || []).length === 0) newItem();
  updateTotals();
}

function exportJson() {
  const data = JSON.stringify(buildInvoicePayload(), null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `factura-${$("fecha").value || "sin-fecha"}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function validateRuc(value) {
  return /^\d{5,8}-[\dkK]$/.test(value) || /^\d{6,10}$/.test(value);
}

function beforePrint() {
  const emisorRuc = $("emisorRuc").value.trim();
  if (emisorRuc && !validateRuc(emisorRuc)) {
    alert("El RUC del emisor tiene un formato inválido.");
    return;
  }

  window.print();
}

$("agregarItem").addEventListener("click", () => newItem());
$("guardar").addEventListener("click", saveDraft);
$("cargar").addEventListener("click", loadDraft);
$("exportar").addEventListener("click", exportJson);
$("imprimir").addEventListener("click", beforePrint);
$("moneda").addEventListener("change", updateTotals);

newItem({ descripcion: "Servicio profesional", cantidad: 1, precio: 100000, iva: 10 });
