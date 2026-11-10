# Especificação: entrada, cadastro e perfis

> Status: fluxo principal definido. A matriz completa de permissões é mantida em [permissoes.md](permissoes.md).

## Cadastro

Campos obrigatórios:

- Nome completo
- Username, exibido com `@`
- Data de nascimento
- E-mail
- Telefone
- Senha

Descrição e foto de perfil são opcionais. O MVP não exige verificação de e-mail nem de telefone.

O público principal tem de 10 a 38 anos. O Taityo pode aprovar exceções. Solicitantes menores de 18 anos seguem o mesmo processo de convite e aprovação do Dojotai.

## Convite e solicitação

1. Uma pessoa com permissão cria e compartilha um link de convite.
2. O link é geral, pode ser usado uma única vez e expira após cinco dias.
3. A primeira pessoa que enviar uma solicitação por esse link fica associada a ele. O link não pode ser reutilizado.
4. A solicitação de entrada exige aprovação. Só pessoas com permissão de aprovação podem ver os dados cadastrais do solicitante.
5. Criar convites e aprovar entradas são permissões distintas. Quem criou o convite só pode aprovar se também tiver permissão de aprovação.
6. Na aprovação, a pessoa autorizada atribui categoria, cargo e Buntai antes de liberar o acesso à comunidade. A pessoa que aprova já deve estar vinculada a um Dojotai.
7. Se a solicitação for recusada, ela é encerrada. Para tentar novamente, a pessoa precisa de um novo convite.
8. Se o link expirar, uma pessoa autorizada pode criar outro.

## Perfil e visibilidade

O perfil apresenta nome, username com `@`, foto e descrição, quando disponíveis. A própria pessoa pode editar nome, username, descrição e foto. O username permanece único e é exibido com `@`. E-mail e telefone não ficam visíveis para a comunidade por padrão; o Dojotai configura acesso por cargo/vínculo e pessoa. O Taityo mantém acesso mestre.

O histórico de práticas aparece em uma grade visual por prática, com dez quadrados correspondentes aos últimos dez dias. Um quadrado preenchido indica que a prática foi registrada naquele dia. Essa grade é somente visual: não permite registrar, alterar ou remover práticas e não exibe detalhes ao toque. O registro e a correção acontecem exclusivamente na aba Práticas. Se a pessoa visitante não tiver permissão para ver as práticas, a seção inteira fica oculta.

As publicações aparecem abaixo do resumo de práticas. A pessoa pode iniciar uma publicação pelo botão de criação no Feed Social; a publicação também aparece em seu perfil.

Cada pessoa pertence a um único Dojotai por vez. Não há mecanismo de seguir ou adicionar integrantes individualmente.

## Pendências

- Definir a matriz detalhada de permissões para leitura de perfil, contatos, histórico, criação de convite e aprovação.
- Definir requisitos para a foto de perfil, como formatos e tamanho máximo do arquivo.
