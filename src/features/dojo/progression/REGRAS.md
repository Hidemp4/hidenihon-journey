# Ligas, troféus e XP do Dojô

Regras do sistema de progresso do Dojô. Todos os números daqui estão em `rules.ts`: para ajustar o
equilíbrio, mude lá (os testes conferem que o código segue estas regras).

São duas coisas separadas, como no Clash of Clans:

| | **XP → Nível** | **Troféus → Liga** |
| --- | --- | --- |
| Mede | dedicação (quanto você treina) | desempenho (quão bem você treina) |
| Sobe com | qualquer treino | vitórias |
| Desce? | nunca | sim, nas derrotas |
| Aparece em | o seu perfil e o ranking | o ranking (é o que ordena) |

---

## 1. Ligas

Todo mundo começa no **Bronze III com 0 troféus**. Cada liga tem três divisões (III → II → I), menos
a Lendário, que é uma só. Os nomes ficam num lugar só (`LEAGUES` em `rules.ts`) e podem mudar sem
mexer nas regras.

| Liga | III | II | I | Meta no piso da liga | Queda na derrota |
| --- | ---: | ---: | ---: | ---: | ---: |
| Bronze | 0 | 100 | 200 | 40% | ½ |
| Prata | 300 | 450 | 600 | 55% | ¾ |
| Ouro | 750 | 950 | 1150 | 65% | inteira |
| Platina | 1350 | 1600 | 1850 | 73% | inteira |
| Diamante | 2100 | 2400 | 2700 | 80% | inteira |
| Imortal | 3000 | 3300 | 3600 | 86% | inteira |
| Titã | 3900 | 4250 | 4600 | 91% | inteira |
| Lendário | 5000 | — | — | 95% | inteira |

- **Meta**: o desempenho mínimo para vencer uma partida. Ela sobe aos poucos com os troféus, numa
  linha reta entre o piso de uma liga e o da seguinte. Com 525 troféus, por exemplo, ela fica no meio
  do caminho entre Prata (55%) e Ouro (65%): 60%. Na Lendário, ela sobe 1 ponto a cada 250 troféus,
  até no máximo 99%. A meta é arredondada para um número inteiro.
- Os troféus nunca ficam negativos. Dá para cair de divisão e de liga.
- Por isso a liga mostra o seu nível de verdade: quanto mais você sobe, mais difícil fica vencer, até
  você parar onde o seu desempenho alcança. Simulação com o código real (`balance.test.ts` confere),
  com o desempenho variando ±7 de uma partida para outra e Exames de 20 perguntas:

  | Desempenho médio | Depois de 100 partidas | Onde para |
  | ---: | --- | --- |
  | 50% | Bronze I | Bronze I / Prata III |
  | 60% | Prata I | Prata I |
  | 70% | Ouro I | Platina III |
  | 80% | Platina I | Diamante II |
  | 85% | Diamante III | Imortal II |
  | 90% | Diamante II | Titã I |
  | 93% ou mais | Diamante II | Lendário |

- **Sem temporadas por enquanto.** Como a meta sobe junto com os troféus, cada pessoa se estabiliza na
  faixa do próprio desempenho, e não é preciso zerar o ranking todo mês. Só quem joga perto de 100%
  continua subindo dentro do Lendário, onde a meta chega a 99%.

---

## 2. Partida ranqueada

Uma sessão vale troféus (é uma **partida ranqueada**) quando:

1. a atividade mede o desempenho sozinha. Os **Pergaminhos** ficam de fora, porque lá é você quem dá
   a nota. Também ficam de fora a **revisão dos erros** do Exame (ela tende a 100%) e o **Estudar
   ordem** do Pincel (lá só se olha);
2. a sessão tem o **volume mínimo** da atividade (tabela abaixo).

| Atividade | Mínimo para valer | Volume de referência | Variedade cheia |
| --- | --- | --- | --- |
| Arena de Reflexos | 15 respostas | 30 respostas | 12 kana diferentes |
| Exame Chunin | 10 respostas | 20 respostas | 8 itens diferentes |
| Selos | 6 pares formados | 8 pares | — (cada par já é diferente) |
| Pincel (Traçar / De memória) | 5 caracteres | 10 caracteres | 5 caracteres diferentes |

**Sair no meio não salva da derrota.** Se você sai de uma sessão que já tem o volume mínimo, ela conta
como partida, mas só pode dar derrota ou empate: nunca vitória. Antes do mínimo, sair não conta.

---

## 3. Desempenho da partida (0 a 100)

Cada atividade transforma a sessão num número de 0 a 100, o **desempenho**:

| Atividade | Como se calcula |
| --- | --- |
| Arena de Reflexos | 75% precisão + 25% velocidade |
| Exame Chunin | 85% precisão + 15% velocidade |
| Selos | eficiência: `100 × 1,6 × pares ÷ jogadas`, até 100 |
| Pincel | média das notas dos caracteres, na régua `nota × 100 ÷ 85`, até 100 |

- **Precisão**: acertos ÷ respostas. Tempo esgotado conta como erro.
- **Velocidade**: cada acerto ganha de 0 a 100 pelo tempo que levou, e vale a média dos acertos. Sem
  acerto, a velocidade é 0.
  - Na Arena: 100 até 0,5 s e 0 a partir de 1,5 s. Do tempo, sai o que se gasta digitando: 0,12 s por
    letra além da primeira (a mesma régua do rótulo de reação).
  - No Exame: 100 até 1,5 s e 0 a partir de 5 s.
- **Selos**: com memória perfeita, uma mesa sai em cerca de 1,6 jogada por par (a mesma conta das
  estrelas). Com 6 pares, 10 jogadas valem 96, 12 valem 80 e 15 valem 64.
- **Pincel**: a nota do Pincel é rígida (100 só com o traço idêntico, e um traço caprichado fica perto
  de 82), então 85 já vale 100 aqui. No Traçar, o caractere com erro de ordem ou de direção vale metade.

---

## 4. Troféus por partida

Compare o desempenho (D) com a meta (M) do momento:

| Resultado | Quando | Troféus |
| --- | --- | --- |
| **Vitória** | D ≥ M | `+(20 + 10 × (D − M) ÷ (100 − M)) × volume × variedade × dificuldade` |
| **Empate** | M − 3 ≤ D < M | 0 |
| **Derrota** | D < M − 3 | `−(15 + 10 × (M − 3 − D) ÷ (M − 3)) × volume × queda da liga` |

- Arredonda para o inteiro mais próximo. Uma vitória dá de **+1 a +45** e uma derrota tira de **−1 a
  −30**.
- **Volume** = itens da sessão ÷ volume de referência, entre 0,5 e 1,5. Uma sessão maior vale mais,
  porque leva mais tempo.
- **Variedade** (só nas vitórias) = itens diferentes ÷ variedade cheia, entre 0,25 e 1. Repetir
  sempre os mesmos 5 kana que você já sabe rende pouco.
- **Dificuldade** (só nas vitórias). Os bônus se multiplicam, até no máximo ×1,5:

  | Situação | Bônus |
  | --- | --- |
  | Kanji (Exame, Selos kanji ↔ significado, Pincel com kanji) | ×1,25 |
  | Arena no Intermediário / no Avançado | ×1,1 / ×1,25 |
  | Exame na Sobrevivência / no Relâmpago | ×1,1 / ×1,2 |
  | Pincel De memória | ×1,25 |

- **Queda da liga** (só nas derrotas): Bronze perde metade e Prata três quartos. Isso protege quem
  está começando.

Exemplo: Ouro II, com 950 troféus (meta 68%). Um Exame de 20 perguntas de kana com desempenho 88
dá vitória: `20 + 10 × 20 ÷ 32 = 26,25`, com volume 1, variedade 1 e dificuldade 1, ou seja, **+26**.
Com desempenho 60, é derrota: `15 + 10 × 5 ÷ 65 = 15,8`, ou seja, **−16**.

---

## 5. XP

O XP nunca diminui. Qualquer treino dá XP, ranqueado ou não.

### Prática (por sessão)

| Atividade | XP |
| --- | --- |
| Pergaminhos | 2 por carta avaliada (com qualquer nota). A carta virada em menos de 1 s não conta. |
| Arena de Reflexos | 1 por acerto |
| Exame Chunin | 2 por acerto (a revisão dos erros também conta) |
| Selos | 4 por par formado |
| Pincel | até 8 por caractere, proporcional à nota (`8 × nota ÷ 100`). Estudar ordem não dá XP. |

- Na Arena e no Exame, uma sessão com menos de 50% de precisão dá metade do XP de prática. Chutar
  rápido não rende mais do que treinar.
- Nos Pergaminhos o XP não depende da nota. Assim, marcar "Fácil" sem saber não rende nada a mais.

### Bônus

| Bônus | XP | Quando |
| --- | ---: | --- |
| Sessão concluída | +10 | chegou ao resultado com o mínimo de volume (Pergaminhos: 5 cartas) |
| Vitória / Empate | +15 / +5 | numa partida ranqueada |
| Primeiro treino do dia | +20, mais 5 por dia de sequência (até +50) | uma vez por dia, na 1ª sessão que dá XP |
| Tarefa da missão do dia | +25 cada | quando a tarefa se completa |
| Missão do dia completa | +50 | quando as 3 tarefas se completam |
| Liga nova | Prata 100 · Ouro 200 · Platina 300 · Diamante 500 · Imortal 750 · Titã 1000 · Lendário 1500 | na 1ª vez que você alcança cada liga |

---

## 6. Nível

- Todo mundo começa no **nível 1** e não há nível máximo.
- Para passar do nível *n* para o *n + 1* são precisos `100 + 25 × (n − 1)` XP.
- O total para chegar ao nível *n* é `100 × (n − 1) + 25 × (n − 1) × (n − 2) ÷ 2`.

| Nível | XP total | Cerca de (20 min por dia) |
| ---: | ---: | --- |
| 2 | 100 | o primeiro dia |
| 5 | 550 | 1 dia |
| 10 | 1.800 | 3 dias |
| 20 | 6.175 | 10 dias |
| 50 | 34.300 | 2 meses |
| 100 | 131.175 | 7 meses |

---

## 7. Ranking

- Entra quem já fez ao menos uma sessão no Dojô.
- A ordem é por troféus. No empate, vence quem tem mais XP; se ainda empatar, os dois dividem a
  posição.
- A tela mostra os 50 primeiros e, se você estiver fora deles, a sua posição.
- Mostra o nome do perfil, a liga, os troféus e o nível. O e-mail e o id da conta não aparecem.

---

## 8. Integridade

- Cada sessão conta uma vez só (pelo id da sessão), mesmo que seja gravada ao concluir e de novo ao
  sair da página.
- O servidor recusa o que foge das regras: troféus fora de −30…+45, XP fora de 0…3000 e resultados
  incoerentes (uma vitória sem troféus, por exemplo).
- Sem internet, o resultado fica guardado no aparelho e é enviado quando a conexão volta. O ranking
  mostra o último estado conhecido.
- Limite honesto: a partida é calculada no aparelho, não no servidor. O servidor limita e não deixa
  contar duas vezes, mas não refaz a partida.
