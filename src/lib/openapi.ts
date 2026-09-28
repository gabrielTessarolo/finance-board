import { z } from 'zod';
import { CLASS_TYPES } from '@/lib/types';
import {
  classCreateSchema,
  classUpdateSchema,
  loginSchema,
  refreshSchema,
  transactionCreateSchema,
  transactionUpdateSchema,
} from '@/lib/api/schemas';

// Corpos de requisição vêm dos mesmos schemas Zod usados na validação.
const fromZod = (schema: z.ZodType) => {
  const json = z.toJSONSchema(schema, { io: 'input' }) as Record<string, unknown>;
  delete json.$schema;
  return json;
};

const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });
const uuid = { type: 'string', format: 'uuid' };
const date = { type: 'string', format: 'date', example: '2026-09-28' };
const money = { type: 'number', example: 149.9 };

const idParam = { name: 'id', in: 'path', required: true, schema: uuid };
const query = (name: string, schema: object, description: string) => ({
  name,
  in: 'query',
  required: false,
  schema,
  description,
});
const monthQuery = query('month', { type: 'string', pattern: '^\\d{4}-(0[1-9]|1[0-2])$', example: '2026-09' }, 'Mês (YYYY-MM). Não combine com from/to.');
const fromQuery = query('from', date, 'Data inicial (inclusive).');
const toQuery = query('to', date, 'Data final (inclusive).');

const json = (schema: object) => ({ 'application/json': { schema } });
const body = (name: string) => ({ required: true, content: json(ref(name)) });
const data = (schema: object) => json({ type: 'object', properties: { data: schema }, required: ['data'] });
const err = (description: string) => ({ description, content: json(ref('Error')) });

const errors = {
  '400': err('Dados inválidos.'),
  '401': err('Token ausente, inválido ou expirado.'),
};
const secured = [{ bearerAuth: [] }];

export function buildOpenApi() {
  return {
    openapi: '3.1.0',
    info: {
      title: 'FinanceBoard API',
      version: '1.0.0',
      description:
        'API externa (v1) do FinanceBoard.\n\n' +
        '**Autenticação:** obtenha um token em `POST /v1/auth/token` e envie `Authorization: Bearer <accessToken>`. ' +
        'Cada usuário só acessa os próprios dados. Renove o token em `POST /v1/auth/refresh`.\n\n' +
        '**Convenções:** JSON em camelCase; datas em `YYYY-MM-DD`; valores monetários sempre positivos — ' +
        'quem define se é receita ou despesa é a classificação (`isReceipt`).',
    },
    servers: [{ url: '/' }],
    tags: [
      { name: 'Auth' },
      { name: 'Transações' },
      { name: 'Classes' },
    ],
    components: {
      securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
      schemas: {
        Error: {
          type: 'object',
          required: ['error'],
          properties: {
            error: {
              type: 'object',
              required: ['code', 'message'],
              properties: {
                code: { type: 'string', example: 'validation_error' },
                message: { type: 'string' },
                details: {},
              },
            },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: uuid,
            name: { type: 'string' },
            email: { type: 'string', format: 'email' },
            role: { type: 'string', enum: ['admin', 'user'] },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        ClassType: { type: 'string', enum: [...CLASS_TYPES] },
        ItemClass: {
          type: 'object',
          properties: {
            id: uuid,
            name: { type: 'string' },
            type: ref('ClassType'),
            isReceipt: { type: 'boolean', description: 'true = valor somado (receita); false = descontado.' },
            isDefault: { type: 'boolean', description: 'Classe padrão do sistema (somente leitura).' },
            userId: { type: ['string', 'null'], format: 'uuid' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Transaction: {
          type: 'object',
          properties: {
            id: uuid,
            description: { type: 'string' },
            classificationId: uuid,
            classification: {
              type: ['object', 'null'],
              properties: { id: uuid, name: { type: 'string' }, type: ref('ClassType'), isReceipt: { type: 'boolean' } },
            },
            value: money,
            transactionDate: date,
            createdAt: { type: 'string', format: 'date-time' },
            customData: { type: 'object', additionalProperties: true },
            userId: uuid,
          },
        },
        Summary: {
          type: 'object',
          description: 'Transferências internas não entram em receitas/despesas/saldo.',
          properties: {
            from: date,
            to: date,
            receipts: money,
            expenses: money,
            balance: money,
            transfers: money,
            byClass: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  classificationId: uuid,
                  name: { type: 'string' },
                  type: ref('ClassType'),
                  isReceipt: { type: 'boolean' },
                  total: money,
                  count: { type: 'integer' },
                },
              },
            },
          },
        },
        Token: {
          type: 'object',
          properties: {
            accessToken: { type: 'string' },
            refreshToken: { type: 'string' },
            tokenType: { type: 'string', example: 'Bearer' },
            expiresIn: { type: 'integer', description: 'Segundos até expirar.' },
            expiresAt: { type: ['string', 'null'], format: 'date-time' },
          },
        },
        LoginRequest: fromZod(loginSchema),
        RefreshRequest: fromZod(refreshSchema),
        TransactionCreate: fromZod(transactionCreateSchema),
        TransactionUpdate: fromZod(transactionUpdateSchema),
        ClassCreate: fromZod(classCreateSchema),
        ClassUpdate: fromZod(classUpdateSchema),
      },
    },
    paths: {
      '/v1/auth/token': {
        post: {
          tags: ['Auth'],
          summary: 'Obtém um Bearer token (e-mail + senha)',
          requestBody: body('LoginRequest'),
          responses: {
            '200': { description: 'Token emitido.', content: data(ref('Token')) },
            '400': errors['400'],
            '401': err('E-mail ou senha inválidos.'),
          },
        },
      },
      '/v1/auth/refresh': {
        post: {
          tags: ['Auth'],
          summary: 'Renova o token com o refresh token',
          requestBody: body('RefreshRequest'),
          responses: {
            '200': { description: 'Novo token.', content: data(ref('Token')) },
            '400': errors['400'],
            '401': err('Refresh token inválido ou expirado.'),
          },
        },
      },
      '/v1/me': {
        get: {
          tags: ['Auth'],
          summary: 'Usuário autenticado',
          security: secured,
          responses: { '200': { description: 'Perfil.', content: data(ref('User')) }, '401': errors['401'] },
        },
      },
      '/v1/transactions': {
        get: {
          tags: ['Transações'],
          summary: 'Lista transações',
          description: 'Ordenadas da mais recente para a mais antiga. Sem filtro de período, retorna todas (paginadas).',
          security: secured,
          parameters: [
            monthQuery,
            fromQuery,
            toQuery,
            query('classificationId', uuid, 'Filtra por classificação.'),
            query('limit', { type: 'integer', minimum: 1, maximum: 1000, default: 100 }, 'Itens por página.'),
            query('offset', { type: 'integer', minimum: 0, default: 0 }, 'Itens a pular.'),
          ],
          responses: {
            '200': {
              description: 'Lista paginada.',
              content: json({
                type: 'object',
                properties: {
                  data: { type: 'array', items: ref('Transaction') },
                  meta: {
                    type: 'object',
                    properties: { total: { type: 'integer' }, limit: { type: 'integer' }, offset: { type: 'integer' } },
                  },
                },
              }),
            },
            ...errors,
          },
        },
        post: {
          tags: ['Transações'],
          summary: 'Cria uma transação',
          description: 'Se `transactionDate` não for informada, usa a data de hoje (America/Sao_Paulo).',
          security: secured,
          requestBody: body('TransactionCreate'),
          responses: { '201': { description: 'Criada.', content: data(ref('Transaction')) }, ...errors },
        },
      },
      '/v1/transactions/summary': {
        get: {
          tags: ['Transações'],
          summary: 'Totais do período',
          description: 'Sem parâmetros, usa o mês atual.',
          security: secured,
          parameters: [monthQuery, fromQuery, toQuery],
          responses: { '200': { description: 'Resumo.', content: data(ref('Summary')) }, ...errors },
        },
      },
      '/v1/transactions/{id}': {
        parameters: [idParam],
        get: {
          tags: ['Transações'],
          summary: 'Busca uma transação',
          security: secured,
          responses: { '200': { description: 'Transação.', content: data(ref('Transaction')) }, '404': err('Não encontrada.'), ...errors },
        },
        patch: {
          tags: ['Transações'],
          summary: 'Atualiza parcialmente uma transação',
          security: secured,
          requestBody: body('TransactionUpdate'),
          responses: { '200': { description: 'Atualizada.', content: data(ref('Transaction')) }, '404': err('Não encontrada.'), ...errors },
        },
        delete: {
          tags: ['Transações'],
          summary: 'Exclui uma transação',
          security: secured,
          responses: { '204': { description: 'Excluída.' }, '404': err('Não encontrada.'), '401': errors['401'] },
        },
      },
      '/v1/classes': {
        get: {
          tags: ['Classes'],
          summary: 'Lista classes (padrão + próprias)',
          security: secured,
          parameters: [query('type', ref('ClassType'), 'Filtra pelo tipo.')],
          responses: {
            '200': { description: 'Classes.', content: data({ type: 'array', items: ref('ItemClass') }) },
            ...errors,
          },
        },
        post: {
          tags: ['Classes'],
          summary: 'Cria uma classe própria',
          description: 'O nome deve ser único por usuário (sem diferenciar maiúsculas) e diferente das classes padrão.',
          security: secured,
          requestBody: body('ClassCreate'),
          responses: { '201': { description: 'Criada.', content: data(ref('ItemClass')) }, '409': err('Nome já utilizado.'), ...errors },
        },
      },
      '/v1/classes/{id}': {
        parameters: [idParam],
        get: {
          tags: ['Classes'],
          summary: 'Busca uma classe',
          security: secured,
          responses: { '200': { description: 'Classe.', content: data(ref('ItemClass')) }, '404': err('Não encontrada.'), '401': errors['401'] },
        },
        patch: {
          tags: ['Classes'],
          summary: 'Atualiza uma classe própria',
          security: secured,
          requestBody: body('ClassUpdate'),
          responses: {
            '200': { description: 'Atualizada.', content: data(ref('ItemClass')) },
            '403': err('Classe padrão não pode ser alterada.'),
            '404': err('Não encontrada.'),
            '409': err('Nome já utilizado.'),
            ...errors,
          },
        },
        delete: {
          tags: ['Classes'],
          summary: 'Exclui uma classe própria',
          description: 'Bloqueado enquanto houver transações usando a classe.',
          security: secured,
          responses: {
            '204': { description: 'Excluída.' },
            '403': err('Classe padrão não pode ser excluída.'),
            '404': err('Não encontrada.'),
            '409': err('Classe em uso por transações.'),
            '401': errors['401'],
          },
        },
      },
    },
  };
}
