# Arquitetura e organização do código

Este documento descreve a estrutura atual do protótipo goTAI e as convenções para manter a interface e a API fáceis de evoluir.

## Interface web

`apps/web/src/styles.css` é o ponto de entrada dos estilos e importa os módulos da pasta `apps/web/src/styles/`.

O frontend usa `apps/web/src/App.tsx` como composição de autenticação, layout e rotas. Cada área funcional vive em sua própria pasta dentro de `pages/`:

| Caminho | Domínio |
| --- | --- |
| `pages/public/` | Página inicial pública e cabeçalho público. |
| `pages/auth/` | Login, entrada por convite e nova tentativa de solicitação. |
| `pages/admin/` | Convites, solicitações de entrada e cadastros administrativos. |
| `pages/informational/` | Feed informativo, avisos e eventos. |
| `pages/social/` | Feed social, cartões de post, curtidas e comentários. |
| `pages/profile/` | Perfil pessoal, resumo de práticas e publicações da pessoa. |
| `pages/practices/` | Registro e calendário das práticas. |
| `pages/organogram/` | Organograma e gestão das posições da sede. |

`app/auth.tsx` mantém o estado global de sessão; `layouts/` contém navegação autenticada compartilhada. `components/` guarda elementos de interface reutilizados e `lib/` reúne chamadas HTTP e formatação comum. O código específico de uma funcionalidade deve permanecer no domínio correspondente, evitando transformar `App.tsx` em um arquivo de páginas.

| Arquivo | Responsabilidade |
| --- | --- |
| `base.css` | Tokens visuais, tipografia, componentes gerais, páginas públicas e administração. |
| `member.css` | Estrutura autenticada, sidebar, navegação dos feeds e área principal. |
| `profile.css` | Perfil, dados pessoais, resumo visual das práticas e publicações no perfil. |
| `feed-components.css` | Compositor de conteúdo, mídia e elementos comuns aos feeds. |
| `social.css` | Cartões sociais, curtidas, comentários e ações dos posts. |
| `practices.css` | Calendário, lista de práticas e estados de registro. |
| `organogram.css` | Árvore de cargos, posições, delegações e formulários do organograma. |
| `public-home.css` | Identidade visual da página inicial pública. |
| `responsive.css` | Ajustes para tablet e celular, incluindo sidebar móvel e barra inferior. |

As regras devem ficar junto à área visual que controlam. Ajustes que afetam várias páginas ou breakpoints devem ser colocados no módulo comum ou em `responsive.css`, respectivamente. A identidade usa verde escuro e amarelo da marca. O texto e os ícones da navegação devem permanecer acessíveis, com ícones decorativos marcados como ocultos para leitores de tela.

Os ícones React vêm de `react-icons/ri` (Remix Icon). A navegação dos feeds usa um conjunto visual próprio, centralizado sobre o conteúdo em telas maiores e adaptado para a barra inferior em telas pequenas.

### Layout autenticado

- Em desktop, o conteúdo ocupa a área restante após a sidebar, com cerca de 38 px de respiro entre a navegação e os cartões; tablet e celular usam margens menores.
- O seletor Informativo/Social fica centralizado no espaço acima do conteúdo; a opção atual recebe maior contraste, fundo dourado e ícone.
- A página de perfil destaca o nome da pessoa; “Meu Perfil” identifica somente a navegação da sidebar. O bloco pessoal e o resumo visual das práticas aparecem lado a lado, com o histórico de publicações em uma seção abaixo.
- A partir do breakpoint de tablet, as colunas do perfil e da tela de práticas passam a empilhar. Em celular, a navegação dos feeds permanece fixa no rodapé.

## API Node.js

`apps/api/src/server.ts` configura Fastify, cookies, CORS, sessão, seed local, rotas globais e inicialização do servidor. As rotas são registradas por domínio:

| Arquivo | Responsabilidade |
| --- | --- |
| `routes/identity.ts` | Convites, solicitação e aprovação de entrada, autenticação e administração da sede. |
| `routes/practices-profile.ts` | Perfil e práticas pessoais. |
| `routes/social.ts` | Publicações sociais, curtidas e comentários. |
| `routes/informational.ts` | Avisos e eventos do feed informativo. |
| `routes/organogram.ts` | Consulta e gestão de posições, vínculos e delegações do organograma. |
| `lib/request-context.ts` | Tipo de usuário autenticado, cargos/categorias e verificações de acesso reutilizadas pelas rotas. |
| `lib/media.ts` | Tipo, schema e validação compartilhada dos anexos de foto, áudio e vídeo. |
| `database/schema.ts` | Criação das tabelas, índices e migrações locais do SQLite. |
| `db.ts` | Abre a conexão SQLite, configura pragmas e inicializa o schema. |
| `security.ts` | Geração/verificação de tokens e senhas. |

Cada módulo de rotas exporta uma função `register...Routes(app)` e mantém junto os endpoints de um domínio. A autorização comum fica em `lib/request-context.ts`; validações e regras específicas devem permanecer no módulo da funcionalidade. Consultas continuam usando SQLite por meio da conexão compartilhada em `db.ts`.

## Fluxo de inicialização e dependências

1. O ponto de entrada da web importa `styles.css`, que carrega os módulos em ordem.
2. A API carrega variáveis de ambiente e configura o Fastify.
3. `db.ts` abre a base local e chama `initializeSchema` em `database/schema.ts` antes de registrar as rotas.
4. O hook de sessão preenche o contexto da requisição; os módulos usam os guardas de acesso compartilhados.
5. `server.ts` registra cada domínio e inicia o listener.

Esta organização mantém o MVP local em Node.js e SQLite. Uma futura migração para Supabase deverá substituir a implementação de persistência e os limites de serviço, sem misturar consultas SQL nos componentes de interface.
