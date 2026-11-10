# Arquitetura técnica inicial

> Status: direção definida em duas etapas. Primeiro, o backend é executado em Node.js com SQLite local. Depois, a lógica de backend e a persistência migram para recursos Supabase. Os detalhes de autenticação, arquivos e hospedagem ainda serão definidos durante a implementação.

## Stack de interface e PWA

- **React + TypeScript + Vite** para a aplicação web.
- **vite-plugin-pwa** para manifesto, service worker e instalação como PWA.
- CSS com variáveis de design para cores, tipografia, espaçamentos e componentes. A biblioteca visual pode ser escolhida quando começarmos as telas.

## Etapa 1: protótipo local com Node.js e SQLite

### Componentes

- A interface React/PWA conversa com uma API HTTP em **Node.js + TypeScript**.
- **Fastify** é a opção inicial de framework para a API.
- A API persiste os dados em **SQLite** durante a prototipação local.
- O backend Node é responsável pela autenticação, autorização e regras do produto nesta etapa; a solução concreta de sessões/autenticação ainda deve ser escolhida.

### Organização do backend

- Separar as regras do produto do framework HTTP e do banco.
- Manter operações de persistência atrás de uma camada de repositórios/serviços, com uma implementação SQLite inicial.
- Usar IDs estáveis, como UUIDs, migrations versionadas e datas em formato consistente para facilitar a migração.
- Evitar colocar SQL ou recursos específicos do SQLite diretamente nas regras do produto.
- Não fazer a interface acessar o banco SQLite diretamente; todas as chamadas passam pela API Node.

### Segurança

- A API Node aplica as regras de acesso definidas para contas, Dojotais, cargos e permissões.
- Operações como usar convite, aprovar entrada, transferir integrante, conceder permissões e marcar presença precisam validar a autorização no servidor.
- A interface nunca deve ser a única camada de autorização.

## Etapa 2: migração para Supabase

Na segunda etapa, o Supabase passa a fornecer PostgreSQL, Auth, Storage e os recursos de backend escolhidos para o produto. A lógica de backend também passa a rodar em recursos Supabase; a API Node deixa de ser o runtime principal, salvo se houver uma necessidade futura de integração ou serviço externo.

### Reaproveitamento da lógica

- Manter regras de domínio em TypeScript portátil, sem depender de APIs exclusivas de Node ou Fastify.
- Criar adaptadores específicos para transporte, autenticação e persistência.
- Na primeira etapa, os adaptadores usam API Node e SQLite.
- Na migração, criar entradas Supabase e adaptadores para PostgreSQL, Auth e Storage; compartilhar a lógica de domínio que for compatível.
- A migração não é apenas trocar a conexão do banco: políticas RLS, autenticação e operações transacionais precisam ser implementadas e revisadas para o modelo Supabase.

As Supabase Edge Functions usam runtime Deno, não são um servidor Fastify/Node tradicional. Portanto, código de domínio portátil pode ser reaproveitado, mas a entrada da função e integrações dependentes de Node precisam de adaptação. [Documentação de Edge Functions](https://supabase.com/docs/guides/functions)

### Serviços planejados no Supabase

- **PostgreSQL:** persistência principal após a migração.
- **Supabase Auth:** identidade e sessões, se confirmado para a etapa de migração.
- **Supabase Storage:** fotos e mídias de publicações.
- **Edge Functions:** fluxos que precisem de lógica de servidor, como convites, aprovações, transferências e notificações.
- **Row Level Security (RLS):** autorização no banco para acessos feitos pelo cliente e pelas funções.
- **Realtime:** opcional; habilitar apenas para fluxos que precisem de atualização em tempo real.

## Migração de dados

- Criar migrations desde o início para a estrutura SQLite.
- Manter o modelo de domínio independente de tipos e funções exclusivas do SQLite.
- Preparar um processo de exportação e transformação de dados de SQLite para PostgreSQL, incluindo relações, datas, enums e arquivos.
- Preservar IDs e vínculos de integrantes, Dojotais, publicações e práticas sempre que possível.
- Planejar a migração de contas separadamente: senhas e sessões podem depender do mecanismo de autenticação escolhido em cada etapa.
- Não migrar dados reais de usuários até haver plano de validação, cópia de segurança e reconciliação.

## Notificações e mídia

- Na etapa Node/SQLite, manter notificações e arquivos atrás de interfaces próprias para que os provedores possam mudar.
- O destino planejado para mídia é Supabase Storage; o mecanismo temporário local ainda será decidido.
- Push usa service worker e depende de permissão e suporte do navegador/dispositivo.
- O agendamento dos lembretes de eventos deve ter um único responsável por etapa, evitando duplicidade entre worker Node e Supabase Cron.

## Próximas decisões técnicas

- Escolher a solução de autenticação e sessão para o protótipo Node/SQLite.
- Escolher o armazenamento temporário de fotos, áudio e vídeo durante a etapa local.
- Definir o ORM ou estratégia de repositório SQLite e como preparar a migração a PostgreSQL.
- Definir a estrutura de pastas para interface, API e regras de domínio compartilháveis.
- Fechar como as permissões de cargo, relação organizacional e bloqueios individuais serão representadas e testadas em RLS.
- Escolher como executar e monitorar lembretes e notificações push em cada etapa.

## Referências oficiais

- [Vite — Getting Started](https://vite.dev/guide/)
- [React — Installation](https://react.dev/learn/installation)
- [vite-plugin-pwa — Guide](https://github.com/vite-pwa/vite-plugin-pwa/blob/main/docs/guide/index.md)
- [Fastify — TypeScript](https://fastify.dev/docs/latest/Reference/TypeScript/)
- [Supabase — Local Development](https://supabase.com/docs/guides/local-development)
- [Supabase — Edge Functions](https://supabase.com/docs/guides/functions)
- [Supabase — Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase — Database Migrations](https://supabase.com/docs/guides/local-development/overview)
- [MDN — Installable PWAs](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable)
