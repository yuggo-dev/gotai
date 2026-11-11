# Especificação: feeds, eventos e notificações

> Status: escopo do MVP consolidado. A matriz de permissões de publicação e moderação está em [permissoes.md](permissoes.md).

## Feed social

- Depois do login, a pessoa entra por padrão no Feed Informativo. O Feed Social é uma área separada da navegação.
- Em telas grandes, a sidebar à esquerda tem **Meu Perfil** no topo, seguido por **Minhas Práticas** e **Organograma**. Na base da sidebar fica uma barra horizontal com Informativo e Social.
- Em celulares, Informativo e Social ficam em uma barra fixa inferior; Meu Perfil, Minhas Práticas e Organograma ficam disponíveis em um menu lateral recolhível.

- Qualquer integrante vinculado ao Dojotai pode publicar.
- O Feed Social oferece um botão **Criar publicação** para iniciar uma nova publicação.
- Uma publicação pode combinar texto, fotos, áudio e vídeo.
- A publicação pode incluir uma referência opcional a uma prática registrada pela própria pessoa.
- A pessoa pode iniciar essa publicação na aba Práticas, depois de registrar ou consultar uma prática, ou selecionar uma prática no compositor do Feed Social. A ação de publicar é sempre explícita; registrar uma prática nunca a compartilha automaticamente.
- A referência publicada identifica somente a prática e a data selecionadas. Não dá acesso ao restante do histórico de práticas, mesmo que esse histórico seja privado.
- O post é uma publicação nova escrita pela pessoa, não um repost. Se o registro original da prática for removido depois, a publicação permanece com a referência e a data que foram compartilhadas; remover o post é uma ação separada.
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
- Avisos podem combinar texto com uma ou mais fotos, áudios ou vídeos na mesma publicação.
- Publicações informativas e eventos aceitam até quatro arquivos de mídia combinados, com até 5 MB no total. São aceitos arquivos de imagem, áudio e vídeo.
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
- A publicação de uma nova atividade gera uma notificação somente para o público-alvo definido, mesmo quando a atividade estiver visível para toda a sede.
- Alterações de horário, público e cancelamentos notificam todo o público-alvo e quem já respondeu à presença.
- Lembretes automáticos são enviados 24 horas e 1 hora antes para o público-alvo.

- O evento pode combinar seus dados e descrição com uma ou mais fotos, áudios ou vídeos. As mídias ficam associadas ao evento e aparecem no card e nos detalhes.

### Ações de criação

- O botão **Criar evento** inicia o preenchimento dos dados e do público-alvo; o evento só aparece no feed depois de publicado.
- O botão **Criar aviso** inicia a composição do aviso; publicar depende de autorização.
- A composição de aviso permite combinar texto e várias mídias (fotos, áudio e vídeo).
- A criação e publicação de um post social está disponível para qualquer integrante ativo, conforme a regra de publicação do Feed Social.

## Notificações

As notificações do MVP aparecem dentro do app e podem ser enviadas por push se a pessoa permitir. Isso se aplica a:

- publicação de uma nova atividade, para o público-alvo do evento;
- alterações ou cancelamento do evento, para todo o público-alvo e quem já respondeu à presença;
- lembretes de evento, 24 horas e 1 hora antes, para o público-alvo;
- curtidas e comentários nas publicações da pessoa;
- notificações de transferência descritas em [transferencia-dojotai.md](transferencia-dojotai.md);
- lembrete diário para registrar práticas, conforme a regra em [praticas-e-podios.md](praticas-e-podios.md).

## Pendências

- Definir como combinar múltiplas categorias e cargos na seleção do público-alvo de um evento.
- Definir quais campos são obrigatórios ao criar um aviso ou evento e se avisos podem ser fixados.
- Definir se a resposta “não vai” permanece editável até o início como as demais (a regra atual permite alterar qualquer resposta até o início).
