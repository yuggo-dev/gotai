# Especificação: organograma do Dojotai

> Status: regras de edição e relações principais definidas. A estrutura de dados deve permitir variações entre sedes, sem impor uma única cadeia fixa.

## Objetivo

Apresentar a estrutura de cargos e Buntai da sede, mostrando quem ocupa cada posição e a quem ela se vincula. O organograma é configurado por Dojotai.

## Cargos e relações

- **Taityo:** posição de referência principal da sede.
- **Buntaityo:** responsável por um Buntai; a posição deve identificar o Buntai correspondente.
- **Fukubuntaityo:** auxilia o Buntaityo e fica associado ao mesmo Buntai.
- **Shotaityo:** pode receber o vínculo de um ou mais Buntai e seus Buntaityos.
- **Fukutaityo:** pode receber diretamente o vínculo de Buntaityos quando não há Shotaityo, ou estar acima de um Shotaityo conforme a cadeia configurada.
- **Shomu:** função administrativa ligada ao Dojotai e associada obrigatoriamente a um Buntai. Sua posição na hierarquia visual pode ficar sem superior direto até essa relação ser definida.

São válidas as cadeias descritas no contexto do produto:

- Buntaityo → Shotaityo → Fukutaityo → Taityo
- Buntaityo → Shotaityo → Taityo
- Buntaityo → Fukutaityo → Taityo

O Buntaityo também pode se vincular diretamente ao Taityo quando a sede não tiver uma posição intermediária. A ligação é explícita por posição; não deve ser inferida somente pelo nome do cargo.

## Modelo conceitual

O organograma deve separar **cargo** de **posição ocupada**. Uma posição representa um lugar na estrutura e contém:

- o cargo;
- o Dojotai;
- o Buntai, quando aplicável;
- a pessoa vinculada;
- a posição superior direta, quando aplicável.

Uma pessoa pode ocupar várias posições, inclusive cargos distintos. Cada Buntai pertence a um único Dojotai. As relações entre posições devem pertencer à mesma sede e não podem formar ciclos. A estrutura deve permitir caminhos diferentes para Buntaityos distintos.

A posição de Shomu sempre referencia um Buntai do mesmo Dojotai. Essa associação é necessária mesmo que a posição não tenha superior hierárquico configurado.

Os cargos atribuídos no vínculo da pessoa continuam disponíveis para autorização por cargo. A posição organizacional acrescenta o escopo e a relação hierárquica usados para exibir o organograma e resolver permissões ligadas a um Buntai ou a uma linha de responsabilidade.

Uma posição só pode ser criada para um cargo já atribuído à pessoa no vínculo ativo com a sede. No protótipo, a posição de Shomu fica associada ao Buntai e aparece sem superior direto enquanto a hierarquia desse cargo não for definida.

## Edição e permissões

- O Taityo pode criar e editar posições, atribuir pessoas e organizar os vínculos hierárquicos.
- O Taityo pode delegar a permissão de administrar o organograma. A delegação deve ser explícita.
- Ocupar um cargo ou aparecer no organograma não concede automaticamente permissão para editá-lo.
- As regras de acesso por cargo, vínculo e pessoa continuam seguindo [permissoes.md](permissoes.md), incluindo bloqueios individuais.
- Na transferência entre Dojotais, os vínculos organizacionais anteriores não são copiados. O Dojotai de destino define as novas posições e relações.

## Exibição

- Mostrar a sede como contexto da estrutura e organizar as posições em níveis conforme seus vínculos diretos.
- Mostrar cargo, nome, username e Buntai associado quando houver.
- Se uma pessoa ocupar mais de uma posição, cada posição aparece no seu lugar correspondente na estrutura.
- A tela deve refletir as relações configuradas, inclusive quando a sede não tiver Shotaityo ou Fukutaityo em uma cadeia.

## Pendências

- Definir se posições podem existir sem uma pessoa atribuída e como aparecem enquanto vagas.
- Definir se um Buntai pode ter mais de um Buntaityo ou Fukubuntaityo simultaneamente.
- Definir se Shomu deve ser conectado a uma posição superior ou permanecer em um ramo próprio do Buntai.
- Definir se alterações no organograma precisam preservar versões históricas e uma trilha de auditoria.
