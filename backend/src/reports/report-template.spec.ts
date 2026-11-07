import { escapeHtml, reportHtml, type ReportData } from './report-template';
import { familyGuidance } from '../nutrition/family-guidance';
export const fixture: ReportData = {
  codigo: 'REPORTE-DE-PRUEBA',
  fecha: '2026-09-17T12:00:00Z',
  autor: 'medico_prueba',
  paciente: 'Paciente sintético',
  expediente: 'TEST-001',
  evaluacion: 'EVALUACION-PRUEBA',
  estado_evaluacion: 'ANULADA',
  centro: 'Centro de prueba',
  orientacion: 'ORIENTACION-PRUEBA',
  guardada: '2026-09-17T11:00:00Z',
  hash_orientacion: 'a'.repeat(64),
  calculo: {
    version_motor: 'v2',
    entrada: {
      edad_dias: 731,
      peso_kg: '12',
      talla_cm: '85',
      tipo_medicion: 'TALLA_DE_PIE',
      edema: 'NO',
      evaluado_en: '2026-09-17T10:00:00Z',
    },
    referencias_sha256: 'b'.repeat(64),
    reglas_sha256: 'c'.repeat(64),
    version_consolidacion: 'v1',
    orientacion: {
      version: 'v1',
      version_reglas: 'v1',
      indicadores: [
        {
          indicador: 'P_T',
          z: -3.004,
          clasificacion: 'Emaciación severa',
          motivo: 'Puntaje sin redondear menor que -3',
          recomendacion: 'Revisión médica del hallazgo.',
          fuentes: [
            { titulo: 'Fuente de prueba', url: 'https://example.test/' },
          ],
        },
      ],
      avisos: [
        {
          texto: 'Datos de demostración.',
          fuente: {
            titulo: 'Fuente del aviso',
            url: 'https://example.test/aviso',
          },
        },
      ],
    },
  },
  valoraciones: [],
  alertas: [],
};
describe('Reporte imprimible', () => {
  it('escapa contenido y atributos HTML', () =>
    expect(escapeHtml(`<script a="x">&'</script>`)).toBe(
      '&lt;script a=&quot;x&quot;&gt;&amp;&#39;&lt;/script&gt;',
    ));
  it('conserva etiqueta calculada, estado anulado y ausencia explícita de valoración', () => {
    const html = reportHtml(fixture);
    expect(html).toContain('Para la madre, el padre o responsable');
    expect(html).toContain('Posibles factores');
    expect(html).toContain('-3.00');
    expect(html).toContain('Emaciación severa');
    expect(html).toContain('ANULADA');
    expect(html).toContain('Sin valoración médica registrada');
    expect(html).toContain('no descarta riesgo clínico');
    expect(html).toContain('Fuente del aviso');
    expect(html).toContain('https://example.test/aviso');
    expect(html).not.toContain('<script');
  });
  it('conserva textos extensos y todas las entradas sin truncar', () => {
    const html = reportHtml({
      ...fixture,
      valoraciones: Array.from({ length: 25 }, (_, i) => ({
        autor: 'Médico',
        fecha: fixture.fecha,
        decision: 'DIFIERE',
        valoracion:
          `Entrada ${i} <img src=x onerror=alert(1)>` + ' texto'.repeat(300),
        acciones: 'Acción documentada.',
      })),
    });
    expect(html).toContain('Entrada 24');
    expect(html).toContain('&lt;img');
    expect(html).not.toContain('<img');
    expect(html).toContain('white-space:pre-wrap');
  });
  it('incluye la revisión concreta y qué hacer si se confirma en el reporte guardado', () => {
    const guide = familyGuidance([], 'DESCONOCIDO', true, {
      avisos: [
        {
          codigo: 'T_E:CALIDAD',
          titulo: 'Revisar longitud: 30 cm',
          detalle: 'Medida por confirmar <script>.',
        },
      ],
      explicacion: 'Una medida fuera de la referencia puede ser real.',
      comprobar: 'Solicita repetir la medida.',
      si_se_confirma: 'Conserva el valor real y solicita valoración.',
      fuente: { titulo: 'OMS Anthro', url: 'https://www.who.int/' },
    });
    const html = reportHtml({
      ...fixture,
      calculo: {
        ...fixture.calculo,
        entrada: { ...fixture.calculo.entrada, edema: 'DESCONOCIDO' },
        guia_familiar: guide,
      },
    });
    expect(html).toContain('Revisar longitud: 30 cm');
    expect(html).toContain('Conserva el valor real');
    expect(html).toContain('Esto no significa que el niño la tenga');
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<script>');
  });
});

describe('Ficha familiar resumida', () => {
  const family: ReportData = {
    ...fixture,
    estado_evaluacion: 'REGISTRADA',
    fecha_nacimiento: '2024-09-16',
    sexo: 'F',
    direccion: 'Casa de prueba <script>alert(1)</script>',
    comunidad: 'Aldea Sector Méndez, Génova Costa Cuca',
    responsables: [
      { nombre: 'Ana Pérez <img>', parentesco: 'MADRE', principal: true },
    ],
    peso_referencia: {
      sexo: 'F',
      edad_dias: 731,
      referencia: { mediana_kg: 11.5, menos2_kg: 9.2, mas2_kg: 14.6 },
      fuente: {
        titulo: 'OMS',
        url: 'https://www.who.int/tools/child-growth-standards/standards/weight-for-age',
      },
      sha256: 'e'.repeat(64),
    },
  };
  it('muestra nacimiento, responsable, domicilio, medidas y la hora de Guatemala sin códigos en la ficha', () => {
    const html = reportHtml(family);
    const cover = html.split('<details class="technical">')[0];
    expect(cover).toContain('16/09/2024');
    expect(cover).toContain('17/09/2026 a las 04:00');
    expect(cover).toContain('Ana Pérez &lt;img&gt;');
    expect(cover).toContain('Aldea Sector Méndez');
    expect(cover).toContain('12 kg');
    expect(cover).toContain('85 cm');
    expect(cover).toContain('11.50 kg');
    expect(cover).toContain('9.20 a 14.60 kg');
    expect(cover).toContain('no es un peso obligatorio');
    for (const code of [
      fixture.codigo,
      fixture.evaluacion,
      fixture.orientacion,
      fixture.expediente,
      fixture.hash_orientacion,
    ])
      expect(cover).not.toContain(code);
    expect(html).toContain(fixture.evaluacion);
    expect(html).toContain('.technical{display:none!important}');
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<img>');
  });
  it('no inventa familiares, direcciones ni peso cuando esos datos faltan', () => {
    const html = reportHtml({ ...fixture, peso_referencia: null });
    expect(html).toContain('No se ha vinculado un padre o encargado');
    expect(html).toContain('Dirección no registrada');
    expect(html).toContain('Comunidad no registrada');
    expect(html).toContain('No se pudo verificar una referencia');
    expect(html).not.toContain('Franja de referencia:');
  });
});
