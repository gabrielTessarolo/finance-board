-- Classes padrão (disponíveis para todos os usuários, somente leitura)
insert into public.items_classes (name, type, is_receipt, is_default, user_id) values
  -- RECEITA
  ('Salário',                                  'RECEITA', true, true, null),
  ('Outras Receitas',                          'RECEITA', true, true, null),
  ('Reembolsos',                               'RECEITA', true, true, null),
  ('Comissões',                                'RECEITA', true, true, null),
  ('Dividendos',                               'RECEITA', true, true, null),
  -- DESPESA_ESSENCIAL
  ('Aluguel / Financiamento Imobiliário',      'DESPESA_ESSENCIAL', false, true, null),
  ('Energia Elétrica',                         'DESPESA_ESSENCIAL', false, true, null),
  ('Água',                                     'DESPESA_ESSENCIAL', false, true, null),
  ('Internet / TV / Celular',                  'DESPESA_ESSENCIAL', false, true, null),
  ('Transporte',                               'DESPESA_ESSENCIAL', false, true, null),
  ('Alimentação',                              'DESPESA_ESSENCIAL', false, true, null),
  ('Supermercado',                             'DESPESA_ESSENCIAL', false, true, null),
  ('Farmácia',                                 'DESPESA_ESSENCIAL', false, true, null),
  ('Parcelamentos',                            'DESPESA_ESSENCIAL', false, true, null),
  ('Despesas por Cartão',                      'DESPESA_ESSENCIAL', false, true, null),
  -- DESPESA_NAO_ESSENCIAL
  ('Mensalidades',                             'DESPESA_NAO_ESSENCIAL', false, true, null),
  ('Lazer',                                    'DESPESA_NAO_ESSENCIAL', false, true, null),
  ('Compras Pessoais',                         'DESPESA_NAO_ESSENCIAL', false, true, null),
  ('Viagens',                                  'DESPESA_NAO_ESSENCIAL', false, true, null),
  ('Cuidados Pessoais',                        'DESPESA_NAO_ESSENCIAL', false, true, null),
  ('Suplementação',                            'DESPESA_NAO_ESSENCIAL', false, true, null),
  -- OUTRAS_DESPESAS
  ('Projetos Pessoais',                        'OUTRAS_DESPESAS', false, true, null),
  ('Taxas Bancárias / Anuidades',              'OUTRAS_DESPESAS', false, true, null),
  ('Presentes / Doações',                      'OUTRAS_DESPESAS', false, true, null),
  ('Outras Despesas',                          'OUTRAS_DESPESAS', false, true, null),
  -- TRANSFERENCIA_INTERNA
  ('Aplicação em Investimentos',               'TRANSFERENCIA_INTERNA', false, true, null),
  ('Resgate de Investimentos',                 'TRANSFERENCIA_INTERNA', false, true, null),
  ('Transferência entre Contas',               'TRANSFERENCIA_INTERNA', false, true, null),
  ('Transferência para Reserva de Emergência', 'TRANSFERENCIA_INTERNA', false, true, null),
  ('Transferência entre Bancos',               'TRANSFERENCIA_INTERNA', false, true, null),
  ('Transferência entre Carteiras',            'TRANSFERENCIA_INTERNA', false, true, null);
