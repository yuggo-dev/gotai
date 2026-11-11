# Especificação: práticas, streaks e pódios

> Status: regras de uso e visibilidade consolidadas. A fórmula completa dos pódios ainda precisa ser detalhada.

## Práticas registradas

- Okiyome (imposição das mãos)
- Omairi (oração)
- Leitura de ensinamentos
- Frequência na Sede

A pessoa registra as próprias práticas. Frequência na Sede também é autodeclarada no MVP.

## Registro e histórico

- A navegação tem uma área própria chamada **Minhas Práticas**. O registro não é feito no Perfil.
- Minhas Práticas inclui um calendário mensal e a lista de práticas. Em telas grandes, calendário e lista ficam lado a lado; em celulares, ficam empilhados, com o calendário primeiro.
- Ao selecionar uma data editável no calendário, a pessoa vê as práticas e pode marcar ou desmarcar cada uma para aquele dia.
- O calendário pode mostrar registros anteriores como histórico; somente hoje e os dois dias anteriores podem ser lançados, corrigidos ou removidos. Datas futuras e datas fora desse prazo não permitem edição.
- Depois de registrar ou consultar uma prática, a pessoa pode escolher **Compartilhar no Social**. Isso abre uma nova publicação com a referência à prática selecionada; nada é publicado sem confirmação explícita.
- A publicação divulga apenas a prática e a data escolhidas, não o histórico completo. Se o registro for removido depois, o post publicado permanece como contexto compartilhado e pode ser removido separadamente.
- O registro é uma marcação de que a prática foi feita em um dia, sem quantidade ou duração.
- A pessoa pode registrar o dia atual e lançar registros de até dois dias anteriores.
- A pessoa pode corrigir ou remover um registro até dois dias depois da data da prática.
- Após um registro válido ser criado, corrigido ou removido, streaks e pódios são recalculados automaticamente.
- O histórico detalhado é visível conforme as permissões definidas pelo Dojotai. O Taityo tem acesso mestre.
- No perfil, cada prática tem uma grade visual com os últimos dez dias: um quadrado por dia, preenchido quando há registro. É um resumo sem ações: os quadrados não abrem detalhes nem permitem registrar ou alterar práticas.
- Para quem não tem permissão de leitura, a seção de práticas do perfil fica completamente oculta.

## Streaks

- Há uma streak separada para cada prática, contando dias consecutivos em que ela foi marcada.
- Há uma streak geral. Para um dia contar nela, a pessoa precisa marcar Okiyome e pelo menos mais uma prática nesse dia.
- Portanto, Okiyome sozinho conta para a streak individual de Okiyome, mas não para a streak geral.
- Pódios e streaks são visíveis para toda a comunidade do Dojotai.

## Lembretes de registro

- O MVP envia um lembrete diário às 20h, no horário local da pessoa, para registrar as práticas do dia.
- O lembrete deixa de ser enviado naquele dia depois que a pessoa registrar Okiyome e pelo menos mais uma prática, que é também o requisito diário da streak geral.
- O lembrete aparece dentro do app e pode ser enviado por push se a pessoa permitir.
- A notificação oferece um atalho para abrir a janela de registro de práticas do dia atual.

## Metas individuais sugeridas

- O MVP pode sugerir metas semanais individuais para Okiyome e Frequência na Sede. As metas são desafios pessoais, não regras obrigatórias.
- A semana da meta vai de segunda a domingo, em alinhamento com o pódio semanal.
- Para sugerir a meta, o sistema calcula a média semanal de cada prática separadamente, usando as quatro semanas completas anteriores. A semana em andamento não entra no cálculo.
- A sugestão aumenta gradualmente o ritmo habitual em uma ocorrência: arredonda a média para um número inteiro e acrescenta uma ocorrência.
- A meta de Okiyome tem teto de sete dias na semana. A meta de Frequência na Sede tem teto de três vezes na semana; se a média já estiver nesse teto ou acima dele, a sugestão será manter o teto, sem propor aumento.
- Se ainda não houver quatro semanas completas de histórico, a pessoa informa sua frequência habitual e disponibilidade para que o sistema gere uma sugestão inicial.
- As metas sugeridas são privadas por padrão. A própria pessoa pode escolher compartilhá-las.
- A pessoa pode aceitar, ajustar ou dispensar a sugestão. Metas e progresso não alteram streaks nem pontuação ou posição nos pódios.

## Pódios

- Pódio individual para cada prática e pódio geral.
- Períodos do MVP: semanal, de segunda a domingo; e mensal, do primeiro ao último dia do mês.
- O Taityo define os pesos do pódio geral e pode delegar essa configuração.
- Até a sede definir pesos próprios, todas as práticas têm peso igual.
- Empates compartilham a posição.
- O placar público apresenta nome, username, pontuação e streak correspondente ao ranking. A foto pode aparecer para as pessoas listadas; sua apresentação pode ser compacta ou destacada conforme a tela.
- A pontuação detalhada e a fórmula completa do pódio ainda não estão fechadas. O placar não deve ser tratado como acesso ao histórico detalhado de práticas.

## Pendências

- Definir a fórmula exata de pontuação dos pódios individuais e geral, além do mecanismo de peso igual inicial.
- Definir como uma pessoa sem qualquer prática registrada aparece nos pódios.
- Fechar detalhes de apresentação do placar e de fotos por tela.
