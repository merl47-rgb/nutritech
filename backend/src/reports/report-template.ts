import { familyGuidance } from '../nutrition/family-guidance';
export interface ReportData {
  codigo: string;
  fecha: string;
  autor: string;
  paciente: string;
  expediente: string;
  fecha_nacimiento?: string;
  sexo?: 'M' | 'F';
  direccion?: string | null;
  comunidad?: string | null;
  responsables?: { nombre: string; parentesco: string; principal: boolean }[];
  peso_referencia?: {
    sexo: 'M' | 'F';
    edad_dias: number;
    referencia: { mediana_kg: number; menos2_kg: number; mas2_kg: number };
    fuente: { titulo: string; url: string };
    sha256: string;
  } | null;
  evaluacion: string;
  estado_evaluacion: string;
  centro: string;
  orientacion: string;
  guardada: string;
  hash_orientacion: string;
  calculo: {
    guia_familiar?: ReturnType<typeof familyGuidance>;
    version_motor: string;
    entrada: {
      sexo?: 'M' | 'F';
      edad_dias: number;
      peso_kg: string;
      talla_cm: string;
      tipo_medicion: string;
      edema: string;
      evaluado_en: string;
    };
    referencias_sha256: string;
    reglas_sha256: string;
    version_consolidacion: string;
    orientacion: {
      version: string;
      version_reglas: string;
      indicadores: {
        indicador: string;
        estado?: string;
        regla?: string | null;
        z: number | null;
        clasificacion: string | null;
        motivo: string;
        recomendacion: string;
        fuentes: { titulo: string; url: string }[];
      }[];
      avisos: { texto: string; fuente?: { titulo: string; url: string } }[];
    };
  };
  valoraciones: {
    autor: string;
    fecha: string;
    decision: string;
    valoracion: string;
    acciones: string;
  }[];
  alertas: {
    codigo: string;
    titulo: string;
    mensaje: string;
    estado: string;
    politica: string | null;
    historial: {
      autor: string;
      fecha: string;
      estado: string;
      comentario: string | null;
    }[];
  }[];
}
export const escapeHtml = (value: string | number | null | undefined) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (char) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        char
      ]!,
  );
const e = escapeHtml;
const date = (value: string) =>
  new Date(value).toLocaleString('es-GT', { timeZone: 'America/Guatemala' });
export function reportHtml(d: ReportData) {
  const family =
    d.calculo.guia_familiar &&
    ['NUTRITECH-FAMILIA-2', 'NUTRITECH-FAMILIA-3'].includes(
      d.calculo.guia_familiar.version,
    )
      ? d.calculo.guia_familiar
      : familyGuidance(
          d.calculo.orientacion.indicadores,
          d.calculo.entrada.edema,
        );
  const sources = [
    ...new Map(
      [
        ...d.calculo.orientacion.indicadores.flatMap((i) => i.fuentes),
        ...d.calculo.orientacion.avisos.flatMap((a) =>
          a.fuente ? [a.fuente] : [],
        ),
        ...(family.revision_medidas ? [family.revision_medidas.fuente] : []),
      ].map((s) => [s.url, s]),
    ).values(),
  ];
  const birth = d.fecha_nacimiento?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const birthLabel = birth
    ? `${birth[3]}/${birth[2]}/${birth[1]}`
    : 'No registrada';
  const relations: Record<string, string> = {
    MADRE: 'Madre',
    PADRE: 'Padre',
    TUTOR: 'Encargado/a',
    ABUELO_A: 'Abuelo/a',
    OTRO: 'Responsable',
  };
  const states: Record<string, string> = {
    PENDIENTE: 'Pendiente',
    EN_REVISION: 'En revisión',
    RESUELTA: 'Resuelta',
    DESCARTADA: 'Descartada',
  };
  const measureDate = new Date(d.calculo.entrada.evaluado_en);
  const day = measureDate.toLocaleDateString('es-GT', {
    timeZone: 'America/Guatemala',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const time = measureDate.toLocaleTimeString('es-GT', {
    timeZone: 'America/Guatemala',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  const reference = d.peso_referencia?.referencia;
  const kg = (value: number) => value.toFixed(2);
  const caregivers = d.responsables?.length
    ? d.responsables
        .map(
          (r) =>
            `<span class="caregiver"><strong>${e(r.nombre)}</strong> · ${e(relations[r.parentesco] ?? 'Responsable')}${r.principal ? ' · Principal' : ''}</span>`,
        )
        .join('')
    : 'No se ha vinculado un padre o encargado al expediente.';
  const pendingEdema = d.calculo.entrada.edema === 'DESCONOCIDO';
  const confirmedEdema = d.calculo.entrada.edema === 'SI';
  const alerts = [
    ...new Map(d.alertas.map((a) => [a.titulo + a.estado, a])).values(),
  ];
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>NutriTech · Reporte de ${e(d.paciente)}</title><style>
 @page{size:A4;margin:14mm} *{box-sizing:border-box} body{font:11pt/1.45 Arial,sans-serif;color:#2F3A45;margin:0;background:white} main{max-width:185mm;margin:24px auto;padding:0 12px} h1{font-size:23pt;color:#2563A6;margin:0} h1 span{color:#2E8B70} h2{font-size:14pt;color:#2563A6;margin:18px 0 8px;break-after:avoid} h3{font-size:11pt;break-after:avoid;margin:6px 0} p{margin:6px 0;overflow-wrap:anywhere} header{border-bottom:3px solid #2E8B70;padding-bottom:12px;margin-bottom:16px}.subtitle{font-size:14pt;font-weight:700}.meta,.hint{font-size:9pt;color:#6B7280}.profile{display:grid;grid-template-columns:1fr 1fr;gap:12px 18px}.wide{grid-column:1/-1}.label{display:block;font-size:9pt;color:#6B7280;margin-bottom:2px}.name{font-size:18pt;color:#2563A6}.caregiver{display:block}.cards{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:12px 0}.card{padding:12px;border-radius:10px;background:#E8F1FA;border:1px solid #cfdfef}.card.reference{background:#E8F5EF;border-color:#c5dfd5}.value{display:block;color:#2563A6;font-size:19pt;font-weight:700}.reference .value{color:#2E8B70}.range{padding:10px 12px;background:#E8F5EF;border-radius:8px}.notice{padding:12px 14px;border-left:4px solid #2563A6;background:#E8F1FA;border-radius:6px}.warning{border-left-color:#E89532;background:#fff4e7}.alert-list{margin:8px 0;padding-left:20px}.alert-list li{margin:4px 0}.text{white-space:pre-wrap;overflow-wrap:anywhere}.entry{padding:8px 0;border-bottom:1px solid #d9e2ed}.technical{margin-top:20px;border-top:1px solid #d9e2ed;padding-top:12px}.technical summary{cursor:pointer;color:#2563A6;font-weight:700}.technical table{width:100%;border-collapse:collapse;font-size:10pt}.technical td,.technical th{padding:7px;border:1px solid #cbd5e1;text-align:left;vertical-align:top;overflow-wrap:anywhere}.technical th{background:#E8F1FA}.hash{font-family:monospace;font-size:8pt;overflow-wrap:anywhere}thead{display:table-header-group}tr,.card,.profile,.notice,.range{break-inside:avoid}footer{border-top:1px solid #d9e2ed;margin-top:16px;padding-top:8px;font-size:9pt;color:#6B7280}a{color:#2563A6}@media(max-width:560px){main{padding:16px;margin:0}.cards{grid-template-columns:1fr}.profile{grid-template-columns:1fr}.wide{grid-column:auto}}@media print{main{max-width:none;margin:0;padding:0}body{font-size:10pt}.technical{display:none!important}.cards{display:table;width:100%;border-spacing:6px 0}.card{display:table-cell;width:33.33%}.profile{display:block}.profile>div{display:inline-block;vertical-align:top;width:49%;margin-bottom:10px}.profile>.wide{display:block;width:100%}a{color:inherit}}
 </style></head><body><main>
 <header><h1>NUTRI<span>TECH</span></h1><p class="subtitle">Reporte de crecimiento infantil</p><p>${e(d.centro)}</p></header>
 ${d.estado_evaluacion === 'ANULADA' ? '<p class="notice warning"><strong>Evaluación ANULADA.</strong> Esta medición fue anulada y no debe utilizarse para tomar decisiones.</p>' : ''}
 <section class="profile" aria-label="Datos del niño y su familia">
 <div class="wide"><span class="label">Nombre del niño o niña</span><strong class="name">${e(d.paciente)}</strong></div>
 <div><span class="label">Fecha de nacimiento</span><strong>${e(birthLabel)}</strong></div>
 <div><span class="label">Edad al medir · Sexo</span><strong>${e(d.calculo.entrada.edad_dias)} días · ${d.sexo === 'M' ? 'Masculino' : d.sexo === 'F' ? 'Femenino' : 'No registrado'}</strong></div>
 <div class="wide"><span class="label">Madre, padre o encargado</span>${caregivers}</div>
 <div class="wide"><span class="label">Dónde vive</span><p>${e(d.comunidad || 'Comunidad no registrada')}</p><p>${e(d.direccion || 'Dirección no registrada')}</p></div>
 </section>
 <h2>Medidas de este control</h2><p><strong>${e(day)} a las ${e(time)}</strong> · Hora de Guatemala</p>
 <div class="cards">
 <div class="card"><span class="label">Peso medido</span><strong class="value">${e(d.calculo.entrada.peso_kg)} kg</strong></div>
 <div class="card"><span class="label">${d.calculo.entrada.tipo_medicion === 'LONGITUD_ACOSTADO' ? 'Longitud acostado' : 'Estatura de pie'}</span><strong class="value">${e(d.calculo.entrada.talla_cm)} cm</strong></div>
 <div class="card reference"><span class="label">Peso de referencia por edad</span><strong class="value">${reference ? `${e(kg(reference.mediana_kg))} kg` : 'No disponible'}</strong><span class="hint">Referencia central OMS</span></div>
 </div>
 ${reference ? `<p class="range"><strong>Franja de referencia:</strong> ${e(kg(reference.menos2_kg))} a ${e(kg(reference.mas2_kg))} kg, según su edad y sexo.</p>` : '<p class="hint">No se pudo verificar una referencia de peso para esta evaluación.</p>'}
 <p class="hint">Cada niño crece a su ritmo. Esta referencia no es un peso obligatorio ni una meta de tratamiento; se interpreta junto con su talla y el control de salud.</p>
 <h2>Resultado y siguiente paso</h2><div class="notice${family.revision_medidas || family.aviso_medidas || pendingEdema || confirmedEdema ? ' warning' : ''}"><h3>${e(family.titulo)}</h3><p><strong>Qué hacer:</strong> ${e(family.siguiente_paso)}</p>${family.revision_medidas ? `<p><strong>Si la medida se confirma:</strong> ${e(family.revision_medidas.si_se_confirma)}</p>` : ''}</div>
 ${pendingEdema ? '<p class="hint">Falta revisar la hinchazón en ambos pies. Esto no significa que el niño la tenga; el personal de salud debe comprobarla antes de interpretar el peso.</p>' : confirmedEdema ? '<p class="notice warning">Se registró hinchazón en ambos pies. Puede aumentar el peso y requiere valoración profesional.</p>' : ''}
 ${alerts.length ? `<h3>Alertas para seguimiento</h3><ul class="alert-list">${alerts.map((a) => `<li><strong>${e(a.titulo)}</strong> · ${e(states[a.estado] ?? a.estado)}</li>`).join('')}</ul>` : '<p class="hint">Sin alertas de seguimiento registradas. Esto no descarta riesgo clínico.</p>'}
 ${d.valoraciones.length ? `<h2>Indicaciones del profesional de salud</h2>${d.valoraciones.map((v) => `<div class="entry"><p class="text">${e(v.valoracion)}</p><p class="text"><strong>Indicaciones:</strong> ${e(v.acciones)}</p><p class="meta">${e(v.autor)} · ${e(date(v.fecha))}</p></div>`).join('')}` : ''}
 <footer><p>Orientación de apoyo para la familia. La decisión médica corresponde al profesional de salud.</p><p>Emitido: ${e(date(d.fecha))} (Guatemala). ${reference ? `<a href="${e(d.peso_referencia!.fuente.url)}">Referencia OMS de peso para la edad</a>.` : ''}</p></footer>
 <details class="technical"><summary>Ver detalle para el personal de salud y trazabilidad</summary>
 <p class="meta">Código del reporte: ${e(d.codigo)} · Expediente: ${e(d.expediente)} · Evaluación: ${e(d.evaluacion)} · Estado: ${e(d.estado_evaluacion)} · Generado por: ${e(d.autor)}</p>
 <h2>Para la madre, el padre o responsable</h2>
 ${family.revision_medidas ? family.revision_medidas.avisos.map((a) => `<div class="entry"><h3>${e(a.titulo)}</h3><p>${e(a.detalle)}</p></div>`).join('') : ''}
 ${family.comparaciones.map((c) => `<div class="entry"><h3>${e(c.pregunta)}</h3><p>${e(c.resultado)}</p><p>${e(c.explicacion)}</p></div>`).join('')}
 <h3>Posibles factores que conviene revisar</h3><p>${e(family.factores)}</p><p>${e(family.nota)}</p>
 <h2>Detalle para el personal de salud</h2><p class="meta">Orientación ${e(d.orientacion)} · Guardada: ${e(date(d.guardada))} (Guatemala)</p><p class="meta">Los puntajes se muestran a dos decimales. Las clasificaciones usan el valor completo conservado.</p>
 <table><thead><tr><th>Indicador</th><th>Puntaje Z</th><th>Clasificación orientativa</th></tr></thead><tbody>${d.calculo.orientacion.indicadores.map((i) => `<tr><td>${e(i.indicador)}</td><td>${i.z === null ? 'No disponible' : e(i.z.toFixed(2))}</td><td>${e(i.clasificacion ?? 'Requiere revisión / sin clasificación automática')}</td></tr>`).join('')}</tbody></table>
 ${d.calculo.orientacion.indicadores.map((i) => `<div class="entry"><h3>${e(i.indicador)}</h3><p>${e(i.recomendacion)}</p><p class="meta">Motivo: ${e(i.motivo)}</p></div>`).join('')}
 <ul>${d.calculo.orientacion.avisos.map((a) => `<li>${e(a.texto)}</li>`).join('')}</ul>
 <h2>Valoraciones médicas registradas</h2>${d.valoraciones.length ? d.valoraciones.map((v) => `<div class="entry"><h3>${e(v.decision)} · ${e(v.autor)}</h3><p class="meta">${e(date(v.fecha))} (Guatemala)</p><p class="text">${e(v.valoracion)}</p><p class="text"><strong>Acciones indicadas:</strong> ${e(v.acciones)}</p></div>`).join('') : '<p>Sin valoración médica registrada a la fecha de generación.</p>'}
 <h2>Alertas y seguimiento</h2><p class="meta">Los estados describen el seguimiento del aviso, no una prioridad clínica.</p>${d.alertas.length ? d.alertas.map((a) => `<div class="entry"><h3>${e(a.titulo)} · ${e(a.estado)}</h3><p>${e(a.mensaje)}</p><p class="meta">Alerta: ${e(a.codigo)} · Política: ${e(a.politica ?? 'Registro anterior')}</p><ol>${a.historial.map((h) => `<li><strong>${e(h.estado)}</strong> · ${e(h.autor)} · ${e(date(h.fecha))}<p class="text">${e(h.comentario)}</p></li>`).join('')}</ol></div>`).join('') : '<p>Sin alertas registradas para esta orientación. Esto no descarta riesgo clínico.</p>'}
 <h2>Fuentes y trazabilidad</h2><ul>${sources.map((s) => `<li>${e(s.titulo)}<p class="meta">${e(s.url)}</p></li>`).join('')}</ul>
 <p class="meta">Motor: ${e(d.calculo.version_motor)} · Reglas: ${e(d.calculo.orientacion.version_reglas)} · Orientación: ${e(d.calculo.orientacion.version)} · Consolidación: ${e(d.calculo.version_consolidacion)}</p>
 <p class="hash">SHA-256 orientación: ${e(d.hash_orientacion)}</p><p class="hash">SHA-256 referencias: ${e(d.calculo.referencias_sha256)}</p><p class="hash">SHA-256 reglas: ${e(d.calculo.reglas_sha256)}</p><p class="meta">Documento confidencial para revisión profesional. Identificación del paciente y centro tomadas al generar el reporte. No incluye una firma digital certificada.</p>

 ${d.peso_referencia ? `<p class="hash">SHA-256 referencia de peso por edad: ${e(d.peso_referencia.sha256)}</p><p class="meta">Franja mostrada: −2 a +2 desviaciones estándar. Fuente: ${e(d.peso_referencia.fuente.url)}</p>` : ''}
 </details></main></body></html>`;
}
