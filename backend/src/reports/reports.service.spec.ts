import { createHash } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { ServiceUnavailableException } from '@nestjs/common';
import { ReportsService } from './reports.module';
import { type ReportData } from './report-template';
import { PrismaService } from '../prisma/prisma.service';
import { GrowthService } from '../growth/growth.service';

function setup() {
  const calculation: ReportData['calculo'] = {
    version_motor: 'prueba',
    referencias_sha256: 'a',
    reglas_sha256: 'b',
    version_consolidacion: 'c',
    entrada: {
      sexo: 'F',
      edad_dias: 731,
      peso_kg: '12',
      talla_cm: '85',
      tipo_medicion: 'TALLA_DE_PIE',
      edema: 'NO',
      evaluado_en: '2026-09-17T15:30:00Z',
    },
    orientacion: {
      version: '1',
      version_reglas: '1',
      indicadores: [],
      avisos: [],
    },
  };
  const content = JSON.stringify(calculation);
  const row = {
    id: 1n,
    codigo_publico: 'orientacion',
    contenido: content,
    contenido_sha256: createHash('sha256').update(content).digest('hex'),
    guardado_en: new Date('2026-09-17T15:30:00Z'),
    valoraciones_medicas: [],
    alertas: [],
    evaluacion: {
      codigo_publico: 'evaluacion',
      estado: 'REGISTRADA',
      centros_salud: { nombre: 'Centro DEMO' },
      ninos: {
        id: 2n,
        codigo_expediente: 'DEMO-2026-001',
        primer_nombre: 'Sofía DEMO',
        segundo_nombre: null,
        primer_apellido: 'Prueba',
        segundo_apellido: null,
        fecha_nacimiento: new Date('2024-09-16T00:00:00Z'),
        sexo_biologico: 'M',
        direccion_referencia: 'Casa DEMO',
        comunidades: {
          nombre: 'Morelia',
          municipio: 'Génova Costa Cuca',
          departamento: 'Quetzaltenango',
        },
        nino_responsable: [
          {
            es_principal: true,
            parentesco: 'MADRE',
            responsables: { nombres: 'Ana DEMO', apellidos: 'Prueba' },
          },
        ],
      },
    },
  };
  const tx = {
    $queryRaw: jest.fn().mockResolvedValue([]),
    reportes_generados: {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest
        .fn<
          Promise<Record<string, never>>,
          [Prisma.reportes_generadosCreateArgs]
        >()
        .mockResolvedValue({}),
    },
    orientaciones_guardadas: {
      findUnique: jest
        .fn<
          Promise<typeof row>,
          [Prisma.orientaciones_guardadasFindUniqueArgs]
        >()
        .mockResolvedValue(row),
    },
    usuarios: {
      findUniqueOrThrow: jest.fn().mockResolvedValue({ codigo_acceso: 'demo' }),
    },
    registros_auditoria: { create: jest.fn().mockResolvedValue({}) },
  };
  const db = {
    $transaction: jest.fn((fn: (client: typeof tx) => unknown) => fn(tx)),
  };
  const growth = {
    reference: jest.fn().mockResolvedValue({
      sexo: 'F',
      edad_dias: 731,
      referencia: { mediana_kg: 11.5, menos2_kg: 9.2, mas2_kg: 14.6 },
      fuente: { titulo: 'OMS', url: 'https://www.who.int/' },
      sha256: 'd',
    }),
  };
  const service = new ReportsService(
    db as unknown as PrismaService,
    growth as unknown as GrowthService,
  );
  return { tx, growth, service };
}
const dto = {
  evaluacion: 'evaluacion',
  orientacion: 'orientacion',
  solicitud_id: 'solicitud',
};
describe('Generación del reporte familiar', () => {
  it('conserva la referencia de la evaluación y vincula solo los responsables de ese niño', async () => {
    const { tx, growth, service } = setup();
    await service.create(dto, 3n);
    expect(growth.reference).toHaveBeenCalledWith('F', 731);
    const query = tx.orientaciones_guardadas.findUnique.mock.calls[0][0] as {
      include: {
        evaluacion: {
          include: {
            ninos: {
              include: {
                nino_responsable: {
                  where: { responsables: { activo: boolean } };
                };
              };
            };
          };
        };
      };
    };
    expect(
      query.include.evaluacion.include.ninos.include.nino_responsable.where,
    ).toEqual({ responsables: { activo: true } });
    const saved = tx.reportes_generados.create.mock.calls[0][0].data as {
      contenido_html: string;
      hash_sha256: Buffer;
      tipo_reporte: string;
    };
    expect(saved.contenido_html).toContain('Ana DEMO Prueba');
    expect(saved.contenido_html).toContain('Casa DEMO');
    expect(saved.contenido_html).toContain('Morelia');
    expect(saved.contenido_html).toContain('09:30');
    expect(saved.tipo_reporte).toBe('EVALUACION_FAMILIAR_V2');
    expect(saved.hash_sha256).toEqual(
      createHash('sha256').update(saved.contenido_html).digest(),
    );
  });
  it('permite emitir la ficha si la referencia no está verificada, sin inventar un peso', async () => {
    const { tx, growth, service } = setup();
    growth.reference.mockRejectedValue(new ServiceUnavailableException());
    await service.create(dto, 3n);
    const html = tx.reportes_generados.create.mock.calls[0][0].data
      .contenido_html as string;
    expect(html).toContain('No se pudo verificar una referencia');
    expect(html).not.toContain('11.50 kg');
  });
  it('un reintento devuelve la copia existente y no reescribe el reporte histórico', async () => {
    const { tx, growth, service } = setup();
    tx.reportes_generados.findUnique.mockResolvedValue({
      codigo_publico: 'copia-anterior',
      orientacion: {
        codigo_publico: 'orientacion',
        evaluacion: { codigo_publico: 'evaluacion' },
      },
    });
    expect(await service.create(dto, 3n)).toEqual({
      codigo_publico: 'copia-anterior',
    });
    expect(growth.reference).not.toHaveBeenCalled();
    expect(tx.reportes_generados.create).not.toHaveBeenCalled();
  });
});
