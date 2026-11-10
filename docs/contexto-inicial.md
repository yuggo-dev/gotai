# goTAI — contexto inicial

> Documento de contexto em elaboração. Registra a visão e as decisões discutidas até agora. Regras técnicas, fluxos detalhados e decisões ainda não tomadas permanecem em aberto.

## Visão do produto

goTAI é uma rede social PWA para jovens ligados a um Dojotai (sede) da Mahikari. A proposta é fortalecer o estímulo mútuo, permitir o compartilhamento de experiências e o acompanhamento de práticas, além de divulgar atividades e eventos locais. A experiência deve transmitir espiritualidade, acolhimento e simplicidade.

O escopo da comunidade é local: pessoas vinculadas ao mesmo Dojotai ficam conectadas automaticamente. O grupo abrange pessoas de 10 a 38 anos; essa faixa não precisa ser explicitada na plataforma.

## Práticas e acompanhamento

As práticas mencionadas para registro são:

- Okiyome (imposição das mãos)
- Omairi (oração)
- Leitura de ensinamentos
- Frequência na Sede

Cada pessoa registra e confere as próprias práticas. A proposta inclui streaks visíveis para toda a comunidade do Dojotai e pódios de desempenho. O histórico detalhado das práticas e sua visibilidade ainda precisam ser estudados para avaliar possíveis benefícios e sentimentos de exposição.

Ideias de acompanhamento positivo para relatos de experiência:

- Streak de partilha
- Ritmo de reflexão
- Marcos da caminhada

A ideia de uma streak de retomada foi descartada.

## Gamificação

A gamificação poderá incluir vários pódios:

- Um pódio para cada prática específica
- Um pódio geral, combinando práticas com pesos próprios
- Períodos semanal, mensal e anual

Os pesos, critérios de pontuação e regras de cálculo serão definidos posteriormente. Não há decisão por um ranking geral completo; a proposta atual é usar pódios por quesito e um pódio geral.

## Feeds e publicações

A plataforma terá dois feeds:

### Feed de informações do Dojotai

- Divulga atividades e avisos importantes.
- Pode conter publicações fixadas.
- Cada publicação identifica quem a publicou.
- A publicação é restrita a pessoas que receberam essa permissão.

### Feed social

- Qualquer pessoa vinculada ao Dojotai pode publicar.
- O conteúdo fica visível para toda a comunidade da sede por padrão.
- Aceita texto, fotos, áudio e vídeo, inclusive em combinações.
- Inclui reposts, curtidas e compartilhamento.

Pessoas com permissões de moderação podem moderar publicações e comentários.

## Atividades e eventos

O feed de informações divulgará atividades e eventos. A plataforma poderá permitir confirmar presença e enviar lembretes. O método para conferir posteriormente quem realmente participou ainda está em aberto.

## Usuários, categorias e dados de perfil

Cada usuário pertence a um único Dojotai por vez. A conexão com as demais pessoas da sede é automática; não há necessidade de seguir ou adicionar pessoas individualmente.

Dados obrigatórios no cadastro:

- Nome completo
- Username
- Data de nascimento
- E-mail
- Telefone
- Senha

Dados opcionais:

- Descrição
- Foto de perfil

Cargo, categoria, Buntai e Dojotai não são dados obrigatórios informados para o cadastro inicial. A pessoa que aprovar a solicitação de entrada confere a categoria e o cargo da pessoa e já deve estar vinculada a um Dojotai. Cargo e categoria são camadas distintas; mudanças devem compor o histórico quando essas informações estiverem disponíveis.

As categorias existentes são:

- **Shonenbu:** categoria infantojuvenil, dos 10 aos 13 anos. Não há mudança automática de categoria ao ultrapassar essa idade.
- **Pré-Mahikaritai:** categoria em treinamento, a partir dos 14 anos.
- **Oficial.**

## Cargos e organização do Dojotai

Os cargos citados até agora são:

- **Fukubuntaityo:** auxilia o Buntaityo.
- **Buntaityo:** responsável por um Buntai, que é um grupo de integrantes.
- **Shotaityo:** nível ao qual Buntaityos podem estar vinculados.
- **Fukutaityo:** cargo ligado ao Taityo e que pode receber o vínculo dos Buntaityos quando não há Shotaityo.
- **Taityo:** moderador master do Dojotai.
- **Shomu:** função de escritório e administração, vinculada também ao Dojotai.

Uma pessoa pode ocupar mais de um cargo. A estrutura de vínculo descrita admite:

- Buntaityo → Shotaityo → Fukutaityo → Taityo
- Buntaityo → Shotaityo → Taityo, quando não há Fukutaityo
- Buntaityo → Fukutaityo → Taityo, quando não há Shotaityo

Cada Buntai pertence a um único Dojotai. Cada Dojotai considera sua estrutura organizacional por meio de um organograma, que representa os cargos e vínculos existentes naquela sede.

## Permissões

As regras de permissão variam de um Dojotai para outro. O Taityo possui permissão mestre e consegue ver tudo sobre as pessoas vinculadas à sua sede, incluindo o histórico detalhado das práticas. Também pode conceder permissões a quem quiser, configurando-as por cargo ou diretamente para uma pessoa.

As permissões que podem ser concedidas incluem:

- Moderação de publicações e comentários
- Aprovação de convites
- Publicação no feed de informações do Dojotai

A matriz detalhada de ações e cargos ainda será definida.

## Entrada e transferência entre Dojotais

A entrada em um Dojotai ocorre por link compartilhável enviado por alguém autorizado. Qualquer pessoa com o link pode solicitar entrada enquanto ele estiver válido. O link expira após cinco dias; após expirar, alguém autorizado pode enviar outro.

A solicitação precisa ser aprovada por alguém com cargo/permissão específica. A pessoa que enviou o convite também pode aprovar se tiver a permissão necessária. Quem aprova confere o cargo e a categoria da pessoa solicitante e já deve estar vinculada a um Dojotai.

Uma pessoa pode solicitar transferência entre Dojotais. O processo consiste em uma solicitação com conferência dupla: é necessária a aprovação de pessoas autorizadas na sede atual e na sede de destino. Após a aprovação, a pessoa passa a pertencer à sede de destino e pode receber um novo Buntai e novos cargos. As permissões da sede anterior não são presumidas na sede de destino, pois cada Dojotai configura suas próprias regras.

Os registros anteriores de práticas e publicações podem ser vistos também na sede de destino. A sede anterior mantém o histórico do período em que a pessoa esteve vinculada a ela. Devem ser registrados históricos de transferência e de mudanças de cargos ou categorias, quando essas informações estiverem disponíveis.

## Identidade visual

O nome do aplicativo é **goTAI**. A logo enviada pelo usuário é a referência visual. As cores percebidas na imagem são amarelo-dourado, branco e verde muito escuro. A identidade deve apoiar os valores de espiritualidade, acolhimento e simplicidade.

## Decisões em aberto

- Pesos, pontuação e regras dos pódios.
- Método de validação de presença em eventos.
- Matriz completa de permissões por Dojotai, cargo e pessoa.



