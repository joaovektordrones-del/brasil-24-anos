# Notas das fontes — dados por UF (uf.csv)

Coleta feita em 2026-10-24 exclusivamente via WebFetch (curl bloqueado). Nenhum número foi inventado; cada linha de `uf.csv` traz a URL de onde o valor foi lido. Onde só havia subconjunto, o subconjunto foi gravado.

## O que funcionou / não funcionou (ordem tentada)

| Tentativa | Resultado |
|---|---|
| `apisidra.ibge.gov.br/values/t/5938/n3/all/v/6/...` | **Falhou** (client_error). A tabela 5938 não tem variável 6 — a lista de variáveis (`desctabapi.aspx?c=5938`) traz PIB (v37), impostos, VAB e participações, mas **nenhuma variável de PIB per capita**. |
| `servicodados.ibge.gov.br/api/v3/agregados/...` | **Falhou** (robots_disallowed para o fetcher). |
| `apisidra.ibge.gov.br/values/t/5938/n3/all/v/37/p/2002,2010,2021,2023/f/n` | **Funcionou** — PIB total por UF. |
| `apisidra.ibge.gov.br/values/t/6579/n3/all/v/9324/p/2002,2010,2021,2023/f/n` | **Funcionou parcialmente** — população estimada só para 2002 e 2021 (2010 é ano censitário e 2023 não consta nessa tabela). |
| `apisidra.ibge.gov.br/values/t/7362/...` (Projeção da População 2018) | **Funcionou** — esperança de vida por UF 2000–2060. |
| Wikipedia pt (PIB per capita, IDH, homicídios) | **Inútil**: as tabelas renderizam com nomes dos estados em imagens/células vazias; o fetcher não retorna os valores. |
| Agência IBGE notícia 45142 (Contas Regionais 2023) e PDF do release | **Funcionaram**. |
| Atlas da Violência 2025 (repositório IPEA) | PDF truncado pelo fetcher (~78 mil caracteres); tabela por UF não alcançada. |
| Atlas da Violência 2026 (FBSP) e Atlas 2016 (cópia no Senado) | **Funcionaram**. |
| API do Atlas da Violência (`ipea.gov.br/atlasviolencia/api/v1/...`) | **Falhou** (client_error); páginas do site são JS. |
| atlasbrasil.org.br/ranking | JS, sem dados. PDF do PNUD (`pnud.org.br/arquivos/ranking-idhm-2010-uf.pdf`) bloqueado por robots. |

## Indicadores gravados

### `pib_total_mil_reais` — 2002, 2010, 2021, 2023 (27 UFs cada)
IBGE, Contas Regionais, SIDRA tabela 5938, variável 37 (PIB a preços correntes, **mil reais**). Fonte: `https://apisidra.ibge.gov.br/values/t/5938/n3/all/v/37/p/2002,2010,2021,2023/f/n`. Valores nominais (não deflacionados). Brasil: 2002 = 1.488.787.276; 2010 = 3.885.847.000; 2021 = 9.012.142.000; 2023 = 10.943.345.439 (mil R$).

### `populacao_estimada` — 2002, 2021 (27 UFs)
IBGE, SIDRA tabela 6579 (População residente estimada, pessoas). Brasil: 2002 = 174.632.960; 2021 = 213.317.639.

### `pib_per_capita_reais_calc` — 2002, 2021 (27 UFs) — **CALCULADO**
PIB (tabela 5938, v37) × 1000 ÷ população (tabela 6579), ambos IBGE. Não é o número oficial de PIB per capita do IBGE (o IBGE usa estimativas populacionais retropolada da Projeção), mas a verificação bate: MA 2002 calc = R$ 2.744 → razão MA/Brasil = 2.744/8.525 = 0,32, idêntica à razão oficial de 2002 (abaixo). Brasil calc: 2002 = R$ 8.525,27; 2021 = R$ 42.247,40.

### `pib_per_capita_reais` — 2023 (27 UFs) — oficial
IBGE, Contas Regionais 2023 (divulgado 14/11/2025), ranking "Produto Interno Bruto per capita". Fonte: `https://agenciadenoticias.ibge.gov.br/pt/agencia-noticias/45142-pib-cresce-em-todos-os-27-estados-do-pais-em-2023.html`. Brasil 2023 = R$ 53.886,67. R$ correntes.

### `pib_per_capita_razao_brasil` — 2002 e 2023 (27 UFs) — oficial
Razão PIB per capita da UF / PIB per capita do Brasil (Brasil = 1,00), tabela "Razão entre o PIB per capita da UF e o PIB per capita do Brasil: 2002-2023" do release de Contas Regionais 2023 (PDF: `https://agenciadenoticias.ibge.gov.br/media/com_mediaibge/arquivos/9c2b887d59dd6c63da1b39b00c6cacce.pdf`). É a melhor medida oficial para "quanto cada estado mudou em relação ao país" em 21 anos, já sem efeito de inflação. O PDF tem a série anual 2002–2023 completa; só 2002 e 2023 foram gravados.

### `idhm_censo` — 2000 e 2010 (27 UFs)
IDHM do Atlas do Desenvolvimento Humano no Brasil 2013 (PNUD/Ipea/FJP), base censitária. Lido no documento "IDHM DF e AMB" do IPE-DF (`https://ipe.df.gov.br/documents/d/ipedf/idhm-df-e-amb-pdf`, Quadro 1), que reproduz o Atlas 2013. 1991 também existe no documento, não gravado.

### `idhm_pnad` — 2012, 2021, 2024 (27 UFs)
IDHM da série anual baseada em PNAD Contínua ("Painel IDHM", PNUD Brasil; mesma série do Radar IDHM), lida em IPECE, Enfoque Econômico nº 328 (14/08/2026), Tabela 1 (`https://www.ipece.ce.gov.br/wp-content/uploads/sites/45/2026/08/Enfoque_Economico_N328_140826.pdf`). Brasil: 2012 = 0,746; 2021 = 0,766; 2024 = 0,805. **Atenção:** esta série usa metodologia/fontes diferentes da série censitária (2000/2010); não encadear diretamente 2010 (censo) com 2021/2024 (PNAD). Os valores de 2024 coincidem com os da tabela da Wikipedia em inglês.

### `taxa_homicidios_100k` — homicídios por 100 mil habitantes
- **2002 — apenas 7 UFs da Região Norte** (AC, AP, AM, PA, RO, RR, TO). Mapa da Violência 2014 (Waiselfisz/FLACSO), Tabela 3.1.2 "Taxas de homicídios (por 100 mil) na População Total. UF e Região. 2002/2012", fonte SIM/MS. O fetcher truncou o PDF na linha de Alagoas; as outras 20 UFs não foram obtidas. Brasil 2002 = 28,5.
- **2004 e 2010 — 27 UFs.** Atlas da Violência 2016 (Ipea/FBSP), Tabela 1.2 "Taxa de homicídios por Unidade da Federação - Brasil, 2004 a 2014" (cópia no Observatório do Senado). Brasil: 2004 = 26,5; 2010 = 26,7. (A tabela também traz 2014, com Brasil = 29,1 — não gravado para evitar duplicidade com a fonte abaixo, que tem revisão mais recente.)
- **2014 e 2024 — 27 UFs.** Atlas da Violência 2026 (Ipea/FBSP), Tabela 2.1 "Taxa de homicídios registrados por 100 mil habitantes, por UF (2014 a 2024)" — homicídios **registrados** (não os "estimados" com ajuste de MVCI). Brasil: 2014 = 30,2; 2024 = 20,1.
- Todas as três fontes usam o SIM/Ministério da Saúde; pequenas diferenças de vintage entre elas (ex.: 2014 Atlas 2016 vs Atlas 2026) são revisões do SIM e de população.

### `expectativa_vida_anos` — esperança de vida ao nascer, ambos os sexos
- **2002, 2010, 2018 — 27 UFs.** IBGE, Projeção da População 2018, SIDRA tabela 7362 (variável 2503, sexo total). 2018 foi o último ano-base dessa projeção; valores de 2021 existem na tabela mas são projeção pré-pandemia (não refletem a COVID) e **não foram gravados**.
- **2024 — 25 UFs.** IBGE, Projeção da População — Revisão 2024, lida na síntese "IJSN Especial — Projeção da População" (Instituto Jones dos Santos Neves/ES, set/2024). O ranking no PDF trunca os nomes "Rio Grande…": há dois valores, **77,8 e 77,2 anos**, que são RS e RN, mas não foi possível determinar qual é qual; por isso RS e RN ficaram **fora** de 2024. Brasil 2024 = 76,6.
- **Atenção:** a Revisão 2024 reestimou toda a série (ex.: Ceará 77,3 em 2024 vs 74,3 em 2018 na projeção antiga); comparar 2002 (Projeção 2018) com 2024 (Revisão 2024) mistura vintages. Para comparação consistente, usar 2002→2018 (mesma projeção) ou obter a série retroativa da Revisão 2024 (não alcançada via WebFetch; os XLSX do IBGE não são legíveis pelo fetcher).

## O que não foi obtido
- PIB per capita oficial em R$ para 2002/2010/2021 (só razão UF/Brasil oficial para 2002 e 2023, e cálculo próprio para 2002/2021).
- População estimada 2010 e 2023 na tabela 6579.
- IDHM 2021 "oficial Atlas Brasil" direto do site (JS); usado o Painel IDHM via IPECE.
- Taxa de homicídios 2002 para 20 UFs (Nordeste, Sudeste, Sul, Centro-Oeste) e 2023 completa (Atlas 2025 truncado; 16 UFs apareceram no texto, não gravadas por serem taxas "estimadas", série diferente).
- Esperança de vida 2024 para RS e RN (ambiguidade 77,8/77,2) e série retroativa da Revisão 2024.
