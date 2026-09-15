# Busca financeira e relatório para PDF

Implementação escrita em 15/09/2026. SQL, lint, build e impressão real ainda aguardam execução pelo usuário.

## Continuidade — revisão dos filtros em 15/09/2026

- A busca agora tem seu próprio campo de tipo (todos, a receber ou a pagar). Trocar o tipo remove uma categoria incompatível.
- Os rascunhos da busca ficam preservados ao trocar mês, tipo ou página da lista principal e ao recolher os filtros.
- Limpar filtros recria o formulário vazio: todos os tipos, situação Ativos e período mensal baseado no mês atual dos indicadores. Não abre resultados nem altera a lista principal. A limpeza também funciona depois de repetir uma busca ou preencher novos rascunhos.
- O texto da lista principal esclarece que seu PDF usa mês/tipo da lista; o PDF do modal usa os critérios da busca.

Revisão estática realizada; sem SQL adicional. Lint, build e teste no navegador continuam pendentes. Conferir: preencher cliente, categoria, valores e intervalo; buscar e fechar; limpar; repetir a limpeza após novos rascunhos; trocar tipo entre receita/despesa; alterar o mês da lista com rascunho preenchido; comparar os critérios dos dois relatórios.

## Uso

Em `/financeiro`, o painel **Buscar lançamentos** combina:

O painel começa recolhido. **Filtrar** abre os campos e **Ocultar filtros** recolhe sem remover os critérios aplicados nem os rascunhos. O campo de categoria abre a lista ao receber foco ou clique e filtra pelo texto digitado, ignorando acentos. Seleção por clique, setas e Enter; Escape fecha. O mesmo seletor é usado no cadastro/edição de lançamentos, preservando as restrições por tipo e histórico. Esta alteração de interface não exige SQL adicional.

- Dia, mês, ano ou intervalo, com datas inicial/final inclusivas por vencimento.
- Nome ou parte do nome do cliente/fornecedor, incluindo cadastros inativos com histórico.
- Categoria específica, incluindo categorias inativas.
- Valor total mínimo/máximo do título, em centavos; usar o mesmo valor nos dois campos para busca exata.
- Palavra-chave, tipo a pagar/receber e situação, inclusive cancelados quando selecionado.

**Buscar** abre um modal com os resultados, critérios, totais, paginação, detalhes e **Imprimir / PDF**. A lista principal mantém seu mês e página. Fechar ou pressionar Escape devolve o foco à busca; os critérios ficam preenchidos para uma nova consulta. **Limpar filtros** limpa o formulário sem abrir o modal. As listas continuam com 30 registros por página. O controle superior **Mês dos indicadores** mantém os indicadores e gráficos mensais, independentemente do período consultado no modal. A mudança para modal não exige SQL adicional.

Os totais abaixo dos filtros consideram todos os títulos encontrados. A receber/a pagar usam o saldo em aberto. Recebido/pago usam baixas acumuladas dos títulos encontrados, sem os estornos, inclusive baixas realizadas fora do período de vencimento. Cancelados não entram nesses totais. Não confundir com fluxo de caixa do mês ou saldo bancário.

## Imprimir / PDF

Depois de aplicar os filtros, **Imprimir / PDF** abre `/relatorios/financeiro` em outra aba. O relatório mostra empresa da conta, emissão, critérios aplicados, totais e todos os registros da consulta, independentemente da página aberta na listagem.

Na página do relatório, **Imprimir / Salvar PDF** abre a impressão do navegador. Escolher **Salvar como PDF** ou a impressora desejada. Não há instalação de biblioteca nem geração de arquivo no servidor. O layout usa A4 paisagem, cabeçalho de tabela repetido e evita dividir linhas entre páginas. Cabeçalhos/rodapés automáticos e numeração podem ser ativados na janela de impressão do navegador.

O relatório é uma nova consulta no momento da abertura: alterações salvas por outra sessão entre a busca e a impressão podem aparecer. Dentro da consulta de relatório, lista, contagem e totais são obtidos juntos. Não há paginação por múltiplas requisições para montar um relatório.

O limite é 5.000 títulos por relatório. Acima disso, a geração é recusada com pedido para refinar os filtros; não há corte silencioso. A lista continua paginada normalmente. Este limite não substitui benchmark de uso com grande volume.

## Acesso e SQL

- Leitura financeira é exigida também para imprimir; não há nova permissão de exportação nesta entrega.
- Sessão e empresa ativa verificadas no servidor, inclusive quando a URL é alterada. Usuário de outra empresa ou com acesso revogado não pode consultar o relatório.
- A função privada verifica `finance_guard` antes de consultar dados, sempre delimitados pelo workspace; a função pública é um wrapper `security invoker`. Execução concedida apenas a `authenticated`.
- A consulta filtra empresa/data antes de agregar pagamentos e reutiliza os resultados para totais/paginação. Utiliza os índices existentes de workspace/vencimento e pagamentos por título. Nenhum índice foi criado sem medição.
- Nenhuma migration já aplicada foi modificada.

### Executar nesta ordem

1. `supabase/migrations/20260915120000_finance_search_reports.sql` — **nova, pendente**. Depende de `20260914220000_company_finance.sql`, base financeira anterior. Não reaplicar a base que já está funcionando.
2. `supabase/tests/finance-search-reports.sql` — teste, não migration; executar inteiro. Fixtures temporárias e `ROLLBACK` final. Esperado: `PASS: financial search...`. Inclui 5.001 títulos temporários para verificar a recusa de relatório acima do limite.
3. `npm run lint` e `npm run build`, executados separadamente pelo usuário; compartilhar os resultados atuais.

Testes SQL preparados: filtros combinados antes de paginar, centavos exatos, data de ano bissexto, mês/ano, limites inclusivos, paridade entre relatório e páginas, total com baixa fora do vencimento, resultado vazio, página além do final, filtro inválido, relatório acima do limite, usuário com financeiro sem CRM, isolamento, acesso revogado e anônimo.

### Conferência visual e funcional

1. Buscar um dia, mês, ano e intervalo; testar cliente + categoria + valor juntos. Confirmar que limpar remove filtros aplicados e rascunhos.
2. Conferir um valor com centavos e mínimo maior que máximo; a mensagem deve preservar os campos.
3. Com mais de 30 resultados, abrir a segunda página e gerar o PDF; todos devem aparecer no relatório, na mesma ordem e com os mesmos totais, se não houver alterações concorrentes.
4. Salvar um PDF com várias páginas, nomes longos e valores altos; conferir margens, acentos, títulos e ausência de cortes. Testar resultado vazio e impressão no celular.
5. Trocar a empresa ativa antes de abrir a URL do relatório; deve solicitar recarregar. Conferir usuário somente leitura e acesso revogado.
6. Alterar os filtros e tentar imprimir durante a atualização: o link só reaparece quando a consulta termina. Rascunhos ainda não aplicados não alteram o PDF.

Não foram executados SQL, comandos npm, servidor ou impressão pelo agente, conforme AGENTS.md. Esta implementação ainda não está homologada.

Referências técnicas consultadas: [CTEs do PostgreSQL](https://www.postgresql.org/docs/current/queries-with.html) e [CSS para impressão](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Media_queries/Printing).
