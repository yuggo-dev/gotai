# Especificação: feeds, eventos e notificações

> Status: escopo do MVP consolidado. A matriz de permissões de publicação e moderação está em [permissoes.md](permissoes.md).

## Feed social

- Depois do login, a pessoa entra por padrão no Feed Informativo. O Feed Social é uma área separada da navegação.
- Em telas maiores, a navegação principal fica em uma barra lateral à esquerda; em celulares, fica em uma barra fixa na parte inferior.
- A navegação do MVP inclui Informativo, Social, Práticas, Organograma e Perfil.

- Qualquer integrante vinculado ao Dojotai pode publicar.
- O Feed Social oferece um botão **Criar publicação** para iniciar uma nova publicação.
- Uma publicação pode combinar texto, fotos, áudio e vídeo.
- Publicações são visíveis para toda a comunidade da sede.
- Integrantes podem curtir e comentar.
- Autores podem editar ou excluir suas próprias publicações e comentários.
- Pessoas autorizadas para moderação podem ocultar ou remover publicações e comentários.
- Curtidas e comentários geram notificação dentro do app e push quando permitido.
- Reposts e compartilhamento ficam fora do MVP.

## Feed de informações

- Divulga avisos, atividades e eventos.
- A publicação de avisos depende de permissão concedida pelo Taityo.
- A pessoa autora é identificada.
- Eventos aparecem como cards no Feed Informativo; tocar em um card abre os detalhes do evento.
- O Feed Informativo oferece botões **Criar aviso** e **Criar evento** somente a quem tiver a permissão correspondente. A criação de aviso já depende de autorização do Taityo; a regra para conceder permissão de criar evento ainda precisa ser definida.
- No protótipo local, criar avisos está disponível para Taityos e criar eventos para integrantes ativos. A regra de criação de eventos é provisória até a matriz de permissões ser definida.

## Eventos

### Público e visibilidade

- O evento tem um público-alvo definido por categorias e cargos, ou pode ser dirigido a toda a sede.
- Público-alvo e visibilidade são campos distintos.
- Quem cria escolhe se a visibilidade será para toda a sede ou somente para o público-alvo.
- Só pessoas do público-alvo podem responder à presença, mesmo quando o evento é visível para toda a sede.

### Respostas e comparecimento

- Respostas disponíveis: confirmado; não vai; chegará atrasado, com horário previsto de chegada; participação parcial, com o período previsto.
- A pessoa pode alterar a resposta até o início do evento.
- Quem criou o evento, o Taityo e pessoas autorizadas por quem criou podem registrar quem compareceu de fato.
- Respostas e lista de comparecimento são visíveis ao criador, Taityo e pessoas autorizadas para aquele evento.

### Edição, cancelamento e lembretes

- Quem criou, o Taityo e pessoas autorizadas para o evento podem editá-lo ou cancelá-lo.
- Alterações de horário, público e cancelamentos notificam todo o público-alvo e quem já respondeu à presença.
- Lembretes automáticos são enviados 24 horas e 1 hora antes para o público-alvo.

### Ações de criação

- O botão **Criar evento** inicia o preenchimento dos dados e do público-alvo; o evento só aparece no feed depois de publicado.
- O botão **Criar aviso** inicia a composição do aviso; publicar depende de autorização.
- A criação e publicação de um post social está disponível para qualquer integrante ativo, conforme a regra de publicação do Feed Social.

## Notificações

As notificações do MVP aparecem dentro do app e podem ser enviadas por push se a pessoa permitir. Isso se aplica a lembretes de evento, mudanças de eventos, interações em publicações e às notificações de transferência descritas na especificação correspondente.

## Pendências

- Definir como combinar múltiplas categorias e cargos na seleção do público-alvo de um evento.
- Definir quais campos são obrigatórios ao criar um aviso ou evento e se avisos podem ser fixados.
- Definir se a resposta “não vai” permanece editável até o início como as demais (a regra atual permite alterar qualquer resposta até o início).
