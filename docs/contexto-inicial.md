# goTAI — contexto do produto

> Documento de referência para visão, conceitos e decisões consolidadas. Requisitos do MVP e fluxos específicos estão nas especificações ligadas abaixo. Itens ainda sem decisão aparecem como pendências, não como regras implementadas.

## Visão

goTAI é uma rede social PWA do Dojotai de Campo Grande, MS, para pessoas ligadas à Mahikari. O produto busca fortalecer o estímulo mútuo, apoiar o acompanhamento de práticas, compartilhar experiências e divulgar atividades locais. A identidade deve transmitir espiritualidade, acolhimento e simplicidade.

O público principal tem de 10 a 38 anos. O Taityo pode aprovar exceções. Pessoas menores de 18 anos seguem o mesmo fluxo de convite e aprovação do Dojotai.

Cada pessoa pertence a um Dojotai por vez. Pessoas vinculadas à mesma sede formam a comunidade local sem precisar seguir ou adicionar umas às outras.

## Conceitos de organização

### Categorias

- **Shonenbu:** dos 10 aos 13 anos. A mudança de idade não altera automaticamente a categoria.
- **Pré-Mahikaritai:** categoria em treinamento, a partir dos 14 anos.
- **Oficial.**

A categoria é distinta de cargo e Buntai. Na entrada, a pessoa autorizada que aprova define categoria, cargo e Buntai. Em transferência, a categoria atual é mantida; o novo Dojotai define os cargos e o Buntai de destino.

### Cargos e vínculos

- **Fukubuntaityo:** auxilia o Buntaityo.
- **Buntaityo:** responsável por um Buntai, grupo de integrantes.
- **Shotaityo:** nível ao qual Buntaityos podem estar vinculados.
- **Fukutaityo:** cargo ligado ao Taityo; pode receber o vínculo dos Buntaityos quando não há Shotaityo.
- **Taityo:** responsável master do Dojotai.
- **Shomu:** função de escritório e administração, também ligada ao Dojotai.

Uma pessoa pode ocupar mais de um cargo. A estrutura descrita admite Buntaityo → Shotaityo → Fukutaityo → Taityo; Buntaityo → Shotaityo → Taityo; e Buntaityo → Fukutaityo → Taityo. Cada Buntai pertence a um único Dojotai. Cada sede mantém seu próprio organograma.

## Especificações

- [Escopo do MVP](especificacoes/mvp.md)
- [Entrada, cadastro e perfis](especificacoes/entrada-e-perfis.md)
- [Permissões e visibilidade](especificacoes/permissoes.md)
- [Práticas, streaks e pódios](especificacoes/praticas-e-podios.md)
- [Feeds, eventos e notificações](especificacoes/feeds-e-eventos.md)
- [Transferência entre Dojotais](especificacoes/transferencia-dojotai.md)

## Identidade visual

O nome do aplicativo é **goTAI**. A logo enviada pelo usuário é a referência visual. As cores percebidas são amarelo-dourado, branco e verde muito escuro. A identidade deve apoiar os valores de espiritualidade, acolhimento e simplicidade.

## Pendências gerais

- Completar a matriz de permissões por ação, recurso, cargo, vínculo organizacional e pessoa.
- Definir todos os detalhes do organograma e como as relações entre cargos e Buntai são configuradas por sede.
- Fechar critérios de pontuação e edição dos pesos dos pódios além das regras já registradas na especificação de práticas.
- Definir detalhes operacionais ainda listados nas especificações, como a combinação de vários filtros de público de evento.
