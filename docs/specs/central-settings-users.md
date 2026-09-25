# Configurações centralizadas e usuários — 16/09/2026

## Direção vigente

Uma área de **Configurações**, compartilhada por master e empresas. A interface oferece Empresa, Usuários, Financeiro, CRM e Serviços, respeitando os módulos e permissões. Não existe mais uma tela separada de configurações de usuários master.

**Clientes e ambientes** continua exclusivo do master. Cada cartão tem **Entrar no ambiente** (abre os dados daquela empresa), **Configurações** (seleciona aquele ambiente e abre a configuração da empresa) e **Usuários** (abre a gestão de pessoas com aquela empresa selecionada).

## Usuários

Rota canônica: `/configuracoes/usuarios`.

- Master vê busca e seletor de empresas cadastradas. Pode cadastrar e gerenciar pessoas de qualquer empresa sem precisar trocar o ambiente dos módulos. A empresa escolhida fica explícita na tela e nos parâmetros das ações verificadas pelo servidor.
- Administrador e gerente veem somente a própria empresa. A seleção de outra empresa pela URL é ignorada para eles; alterações em outra empresa são negadas no servidor e na RPC.
- Usuário comum não vê o acesso a Usuários em Configurações ou Dashboard. Acesso direto à rota também é bloqueado antes da consulta da equipe.
- Papéis disponíveis para master/administrador: Usuário, Gerente e Administrador. Master permanece um papel exclusivo da plataforma, concedido na seção **Masters da Lume** dentro da mesma tela, somente por outro master.
- Regra adotada para gerente, enquanto a pergunta de escopo aguarda resposta: cadastra e gerencia somente usuários comuns; não altera outros gerentes, administradores, proprietários, masters ou o próprio acesso. Só pode conceder permissões que ele próprio possui. Novos usuários criados por gerente recebem permissões limitadas às dele e aos módulos liberados.
- Papéis e permissões são editados na lista de usuários. Não há convites; cadastro novo define nome, e-mail e senha inicial.
- Empresas e usuários são paginados em 25 registros. A busca de empresas não é disponibilizada nem consultada para operadores de empresa. Permissões carregam somente para as pessoas da página e para o operador.

O cadastro administrativo usa a mesma chave do servidor e a API Auth Admin da entrega anterior. Criação Auth e vínculo são operações separadas: se o vínculo falhar após criar a conta, usar a opção de conta existente para completar após resolver a causa.

## Configurações por módulo

- **Empresa**: dados cadastrais; master também configura situação, plano/módulos e consulta histórico administrativo nesse mesmo local.
- **Financeiro**: gerenciamento real de categorias por administrador/master. Quem só pode ler o módulo consulta as categorias. O botão no financeiro aponta para essa seção, sem outro editor de categorias na tela operacional.
- **CRM**: centraliza os atalhos de cadastros e consulta das regras atuais das etapas. A edição de etapas por empresa não foi implementada. O pipeline ainda é demonstrativo, conforme escopo anterior.
- **Serviços**: catálogo existente com cadastro, edição, busca e inativação. Após salvar, permanece nas configurações. `/servicos` redireciona para a seção, preservando filtros e edição.

Rotas antigas de Equipe e Masters redirecionam para Usuários. Rotas antigas de configuração/criação de usuários por cliente apontam para as configurações centrais. A entrada em ambiente continua validando acesso no servidor e usa cookie httpOnly; a escolha de empresa não concede autorização.

## SQL e validação pendentes

O agente não executou SQL, npm, servidor ou testes. Revisão estática concluída; implementação ainda não homologada.

Ordem para o usuário:

1. `supabase/migrations/20260916120000_direct_user_management.sql` — entrega anterior, aplicação não confirmada nesta conversa. **Somente se ainda não aplicada**. Não repetir se já executou com sucesso.
2. `supabase/migrations/20260916150000_central_settings_managers.sql` — **nova, pendente**. Depende do cadastro direto acima e da base financeira `20260914220000_company_finance.sql`. Acrescenta o papel `manager`, ajusta a leitura das permissões e atualiza as RPCs de cadastro/gestão. Nenhuma migration anterior foi editada nesta entrega.
3. `supabase/tests/central-settings-managers.sql` — teste novo; executar inteiro, com `ROLLBACK` final. Esperado `PASS: manager scope...`. Pode executar também `supabase/tests/direct-user-management.sql` para os cenários gerais de cadastro direto; ambos usam fixtures temporárias.
4. `npm run lint` e `npm run build`, separadamente. Compartilhar resultados atuais.

A chave administrativa continua exclusiva do servidor. A retirada de convites e a configuração de autocadastro remoto estão documentadas em [cadastro direto](direct-user-management.md).

## Conferência no navegador

1. Master: clicar **Entrar no ambiente** em duas empresas e conferir nome no cabeçalho e dados de cada uma. Testar desktop e celular.
2. Abrir Configurações pelo menu e pelo perfil: ambos devem abrir a mesma área. Configurações no cartão de empresa deve selecionar aquela empresa e abrir a seção Empresa.
3. Master: em Usuários, buscar/selecionar outra empresa; cadastrar nela; conferir que o ambiente dos módulos permanece o anterior. Editar um papel na empresa selecionada e recarregar.
4. Administrador: conferir ausência de seletor/busca de empresas; abrir URL com ID de outra empresa e confirmar que continua vendo somente a própria. Criar um gerente e um usuário; conferir papéis após login.
5. Gerente: criar usuário comum, editar suas permissões/situação, tentar conceder permissão não disponível ao gerente; conferir bloqueio de criação/edição de papéis privilegiados e de outra empresa. Não ganha acesso integral aos módulos por ser gerente.
6. Usuário comum: conferir ausência de atalhos e bloqueio direto de `/configuracoes/usuarios`, inclusive via antiga rota de equipe.
7. Master: na seção Masters da tela Usuários, cadastrar/conceder e remover um master de teste. O master principal não deve ser recriado nem removido.
8. Financeiro: salvar categoria e conferir atualização da lista e disponibilidade nos lançamentos. Serviços: cadastrar/editar/inativar e conferir permanência na seção Configurações. Conferir retorno das rotas antigas e mês/empresa diferentes.
9. Conferir empresa suspensa, conta inativa e troca de permissões enquanto a tela está aberta. As RPCs devem negar operações que perderam autorização.

O teste SQL cobre gerente, limites de delegação, isolamento, revogação, usuário comum e master. Concorrência real e renderização ainda exigem os testes de interface e os checks atuais.
