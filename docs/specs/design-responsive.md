# Interface e responsividade

Referência: docs/reference/ai-prospect-redesign.html. A imagem original incorporada ao HTML foi extraída sem alterações para public/lume-logo.png e reutilizada no componente Brand.

- Marca aplicada ao login, navegação desktop/mobile e painel Lume; no menu recolhido aparece somente o símbolo, por recorte de apresentação.
- Layout compartilhado entre administração Lume e ambientes dos clientes, com menus próprios.
- Cores, tipografia, bordas, espaçamento e largura lateral seguem a referência.
- Menu móvel abaixo de 1024px, com links que fecham o menu ao navegar; a barra permanece visível na rolagem.
- Configurações agrupa Minha empresa e Equipe em abas internas. Rotas canônicas: /configuracoes/empresa e /configuracoes/equipe; /configuracoes e /equipe redirecionam.
- Tabelas dos cadastros passam a cartões compactos no celular. A tabela comercial e o pipeline mantêm rolagem horizontal dentro da sua área.
- Filtros comerciais quebram em linhas; formulários e detalhes usam altura dinâmica e rolagem interna.
- Foco visível, link para pular a navegação e respeito a movimento reduzido.

Sem SQL ou mudança no banco. O HTML de referência foi preservado como especificação.

Validação pendente pelo usuário: npm run lint, npm run build e conferência visual em 360, 768, 1024 e 1440px. Nenhum servidor ou comando npm foi iniciado pelo agente.
