# Isolamento das empresas assinantes

## Ambiente

Banco online: projeto Supabase LumeProspect (`kacamgmazqiqorelsbgb`). Nenhum banco local é necessário. Os arquivos em `supabase/migrations` registram as versões já aplicadas no ambiente online. Não reaplicar migrations manualmente sem conferir o histórico remoto.

## Modelo

- `workspaces`: empresas assinantes do Lume.
- `workspace_members`: usuários de cada assinante, com papéis owner, admin e member.
- `companies`: prospects e clientes atendidos pela assinante. Empresas iguais em workspaces diferentes são registros independentes.
- `contacts`, `services`, `deals`, `deal_activities`, `deal_history`: operação comercial isolada por workspace.
- `prospects`, `prospect_contacts` e `prospect_score_axes`: qualificação legada, preservada para uma futura consolidação sem perda de dados.
- `private.platform_admins`: reserva de identidade administrativa da Lume, sem permissões para usuários da aplicação e sem acesso implícito ao CRM. Não constitui ainda um painel administrativo.

## Matriz inicial

| Operação | Owner | Admin | Member |
| --- | --- | --- | --- |
| Ler, criar e editar registros do próprio CRM | Sim | Sim | Sim |
| Excluir registros do CRM | Sim | Sim | Não |
| Adicionar/remover membros comuns | Sim | Sim | Não |
| Atribuir/revogar papel admin | Sim | Não | Não |
| Alterar nome do workspace | Sim | Sim | Não |
| Alterar proprietário ou status de assinatura diretamente | Não | Não | Não |
| Editar/excluir histórico diretamente | Não | Não | Não |
| Administrar a plataforma Lume | Não | Não | Não |

O proprietário consta também como membro para permitir atribuição de negócios. A transferência de propriedade exige um fluxo específico futuro. Desde 14/09/2026 existe gestão de equipe e convites por link; consulte `auth-workspaces.md` para o comportamento atual.

## Garantias implementadas

RLS depende de associação vigente e workspace ativo, consultados no banco; não usa metadados editáveis do usuário. Papéis anônimos não recebem privilégios nas tabelas do produto. O helper de autorização está em schema privado com search_path fixo.

Chaves estrangeiras compostas vinculam prospect, empresa, contato, serviço e responsável ao workspace correto. Um contato selecionado também precisa pertencer à empresa do negócio. Workspace não pode ser alterado em um registro do CRM, mesmo por usuário que pertença a duas assinantes. Campos de autoria do negócio e das atividades são controlados por triggers.

Negócios têm cinco etapas e status separado (open/won/lost). Perda exige motivo. Datas de fechamento, mudança de etapa e conclusão de atividade são calculadas no banco. Histórico de inclusão/alteração de negócios é gravado por trigger, não pelo navegador.

`version` incrementa a cada atualização de negócio. A futura camada de escrita deve enviar a versão lida no filtro UPDATE e tratar zero linhas como conflito; o campo sozinho não impede sobrescritas feitas sem esse filtro.

Exclusão administrativa de um negócio também remove atividades e histórico por cascade. Esse histórico é operacional, não um arquivo imutável de auditoria de exclusões. Retenção e exclusão lógica devem ser definidas antes da produção.

## Busca

Índices compostos atendem workspace, etapa, status, responsável, serviço, fechamento e atividades pendentes. `search_vector` com GIN oferece busca textual em português em empresas e negócios. A camada de consultas ainda precisa usar esses campos, filtrar workspace, paginar e medir desempenho com dados representativos. Não há garantia de capacidade por número de clientes nesta etapa.

## Verificação online

`supabase/tests/workspace-isolation.sql` é um teste SQL executado no projeto online com papéis authenticated e anon. Cria UUIDs aleatórios, duas assinantes e três usuários temporários, verifica acesso próprio, bloqueios cruzados, escalada de papéis, integridade de vínculos, suspensão, histórico, fechamento e atividades. Termina com ROLLBACK e não envia e-mails.

Executado com sucesso em 13/09/2026. O teste é transacional: não executar apenas trechos que excluam o ROLLBACK. Depois dele, conferir que não sobraram usuários nem registros temporários.

O advisor informa RLS sem política em `private.platform_admins`: é intencional, pois essa tabela deve negar acesso aos papéis da aplicação. Índices ainda não usados são esperados em um banco novo.

## Atualização de autenticação — 14/09/2026

Login, recuperação de senha, cadastro de empresa, contexto de workspace e gestão de equipe/convites estão implementados. Consulte `docs/specs/auth-workspaces.md` para fluxos, configuração de e-mail e testes. A camada de dados comercial e as telas do CRM permanecem com mocks identificados. Arquivos/storage, exportações, provisionamento comercial e painel Lume ainda não estão implementados.

