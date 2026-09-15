# Administração e cadastros — primeira implementação

Implementado em 14/09/2026. Banco aplicado e testado no Supabase online. Lint, build e interface aguardam execução pelo usuário; esta etapa ainda não está homologada.

## Telas e responsabilidades

| Rota | Entrega |
| --- | --- |
| /dashboard | Contagens reais de empresas ativas, contatos ativos, serviços ativos e membros da empresa selecionada |
| /configuracoes | Nome, razão social, documento, e-mail comercial, telefone e localização da empresa da conta |
| /perfil | Nome pessoal editável, e-mail de login somente leitura e acesso ao fluxo existente de recuperação de senha |
| /equipe | Gestão existente de membros e convites; dados empresariais centralizados em Configurações |
| /clientes | Cadastro, edição, busca por nome, filtro, paginação e inativação de empresas atendidas |
| /contatos | Cadastro, edição, busca, filtro e inativação de contatos vinculados a empresas |
| /servicos | Cadastro, edição, busca, filtro e inativação do catálogo de serviços |

Listas de cadastros: 25 registros por página. Busca de empresa no formulário de contato: até 20 empresas ativas por consulta; refinar pelo nome. O vínculo atual aparece mesmo se a empresa tiver sido inativada.

O menu prioriza administração e cadastros. O aviso de demonstração aparece somente nas telas comerciais que ainda usam mocks. CRM não foi conectado nesta etapa; financeiro e prospects não foram implementados.

## Relacionamentos e permissões

- Workspace representa a empresa da conta; company representa uma empresa atendida. Não são o mesmo cadastro.
- Contato exige empresa do mesmo workspace. Negócios continuam referenciando company, contact, service e o membro responsável.
- Proprietário e administrador editam os dados da empresa da conta. Membro pode consultar esses dados e operar os cadastros comerciais.
- Cada pessoa edita apenas seu perfil. O nome de perfil é compartilhado entre suas equipes; o e-mail de login não foi convertido em campo comercial editável.
- Formulários comerciais não excluem registros. Inativação preserva referências existentes.
- Novos vínculos com empresas, contatos e serviços inativos são bloqueados no banco. Alterações em outros campos de um negócio com vínculo antigo continuam permitidas.
- Trocar a empresa de um contato já referenciado por um negócio pode ser impedido pela FK composta. Isso preserva a relação entre negócio, empresa e contato.
- Um serviço não pode repetir o nome na mesma empresa, ignorando caixa e espaços externos. Documento preenchido de empresa atendida tem unicidade por workspace.
- A interface normaliza CPF/CNPJ para dígitos e confere tamanho; não consulta situação cadastral nem valida dígitos verificadores. O documento permanece opcional.
- A primeira data de conversão em cliente é registrada no banco e preservada nas mudanças posteriores de situação.

## Proteção de edição

Profiles, workspaces, companies, contacts e services têm versão gerenciada por trigger. As ações de edição filtram a versão exibida no formulário. Uma alteração concorrente não é sobrescrita silenciosamente.

As ações verificam a sessão, a empresa ativa, campos permitidos e permissões. Uma aba aberta em outra empresa deve ser recarregada antes de salvar. RLS e FKs continuam protegendo o acesso no banco.

Acesso a dados fica no repositório server-only de administração. Componentes interativos recebem campos e usam Server Actions. Os campos controlados mantêm o conteúdo digitado quando o servidor retorna erro.

## Banco e testes

Migration aplicada: `20260914174313_administration_master_records.sql`. Tipos TypeScript gerados novamente do Supabase online.

`supabase/tests/administration-master-records.sql` passou online, incluindo:

- permissões de edição da empresa e do perfil;
- acesso comercial de membros;
- isolamento entre empresas e bloqueio anônimo;
- conflito de versão;
- unicidade de serviço;
- rejeição de novos vínculos inativos;
- preservação de relações e data de cliente.

Todos os dados temporários foram desfeitos com ROLLBACK. Nenhum usuário de teste permanece.

Advisor de segurança sem novos avisos em relação à auditoria anterior. Permanecem a [proteção contra senhas vazadas desabilitada](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) e o [aviso de RLS sem política](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy) para private.platform_admins, cuja negação de acesso é intencional.

## Homologação pelo usuário

Executar separadamente e compartilhar os resultados:

```bash
npm run lint
npm run build
```

Com a aplicação iniciada pelo usuário:

1. Editar os dados em Minha empresa e o nome em Meu perfil; recarregar e conferir a persistência.
2. Cadastrar uma empresa atendida, um contato ligado a ela e um serviço.
3. Buscar e editar os três; recarregar. Inativar e reativar pelo filtro de situação.
4. Abrir o mesmo cadastro em duas abas. Salvar na primeira e tentar salvar na segunda; a segunda deve informar conflito.
5. Se houver outra empresa na conta, trocar a empresa ativa; os cadastros da anterior não devem aparecer.
6. Conferir o menu em tela pequena e as contagens no painel.

Não executar novamente a migration: já foi aplicada online.

## Continuação

Após homologar esta base, conectar o CRM aos cadastros: negócio editável, responsável da equipe, fechamento, atividades, notas, anexos e histórico. Depois estruturar e implementar financeiro. Prospects permanecem por último.

Ainda pendentes na administração ampliada: trilha de auditoria administrativa, transferência de propriedade, permissões financeiras específicas e definição dos papéis cliente/fornecedor. Não confundir essa primeira implementação de cadastros com administração completa de produção.

