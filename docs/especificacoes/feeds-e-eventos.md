# Especificação: feeds, eventos e notificações

> Status: escopo do MVP consolidado. A matriz de permissões de publicação e moderação está em [permissoes.md](permissoes.md).

## Feed social

- Qualquer integrante vinculado ao Dojotai pode publicar.
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

## Notificações

As notificações do MVP aparecem dentro do app e podem ser enviadas por push se a pessoa permitir. Isso se aplica a lembretes de evento, mudanças de eventos, interações em publicações e às notificações de transferência descritas na especificação correspondente.

## Pendências

- Definir como combinar múltiplas categorias e cargos na seleção do público-alvo de um evento.
- Definir quais campos são obrigatórios ao criar um aviso ou evento e se avisos podem ser fixados.
- Definir se a resposta “não vai” permanece editável até o início como as demais (a regra atual permite alterar qualquer resposta até o início).
