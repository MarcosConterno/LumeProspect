# Catálogo de estilos de botões Lume

As variantes estão salvas em `src/app/button-variants.css` e usam a classe base `lume-button`.
Nenhuma variante foi aplicada automaticamente às telas nesta etapa.

## Escolha recomendada

| Nº | Classe | Visual | Uso recomendado |
| --- | --- | --- | --- |
| 01 | `lume-button--solid` | Verde escuro preenchido | Salvar, criar, entrar no ambiente |
| 02 | `lume-button--soft` | Verde claro preenchido | Confirmar uma ação secundária ou destacar uma seção |
| 03 | `lume-button--outline` | Branco com contorno | Filtrar, configurações, ações alternativas |
| 04 | `lume-button--ghost` | Transparente | Fechar, voltar, editar em tabelas e ações discretas |
| 05 | `lume-button--slide` | Contorno com seta no hover | Abrir detalhes, ver cadastro, navegar para uma próxima etapa |
| 06 | `lume-button--shine` | Verde com brilho rápido | Uma única chamada de ação importante por tela |
| 07 | `lume-button--lift` | Sólido com elevação 3D | Ação principal da administração, usar com moderação |
| 08 | `lume-button--success` | Verde semântico | Registrar baixa, confirmar recebimento ou pagamento |
| 09 | `lume-button--danger` | Coral claro | Estornar, cancelar ou remover, sempre com confirmação |
| 10 | `lume-button--icon` | Botão quadrado compacto | Menu, fechar, atualizar ou ações com ícone e `aria-label` |

## Mapa inicial para a Lume

| Área | Principal | Secundária | Discreta/perigosa |
| --- | --- | --- | --- |
| Cadastros | 01 Cadastrar | 03 Filtrar | 04 Abrir cadastro ou 05 Ver detalhes |
| CRM | 01 Novo negócio | 03 Personalizar | 05 Abrir negócio |
| Financeiro | 01 Novo lançamento | 03 Filtros/configurações | 08 Registrar baixa, 09 Estornar |
| Formulários | 01 Salvar | 03 Cancelar/voltar | 09 Excluir/cancelar |
| Cabeçalho | 02 ação contextual | 03 Atualizar | 10 menu/fechar |

## Exemplo

```tsx
<button className="lume-button lume-button--solid">Salvar cadastro</button>
<button className="lume-button lume-button--outline">Filtrar</button>
<button className="lume-button lume-button--danger">Estornar baixa</button>
```

Os estilos foram inspirados nas categorias apresentadas na referência enviada — contorno, brilho, elevação, deslizamento, foco e botões semânticos — mas foram reescritos para a paleta e o comportamento da Lume. A página de referência lista 35 exemplos publicados no CodePen e informa a licença MIT dos exemplos.
