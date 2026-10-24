# Tesouraria — Parauapebas

Painel público de tesouraria de Parauapebas/PA (Prefeitura, SAAEP e Câmara
Municipal), com foco em **caixa** e **prazos de pagamento**:

- caixa do exercício (receita arrecadada − pagamentos);
- prazo médio entre liquidação e pagamento (FIFO por empenho + credor);
- % pago/liquidado e R$ liquidado em aberto por credor;
- rankings de prazo, percentual pago e valor em aberto.

**Site:** https://angelojordy-svg.github.io/tesouraria-parauapebas/

## Fonte

Portal da Transparência de Parauapebas (`governotransparente.com.br`):
empenho, liquidação, pagamento e receita arrecadada. Dados públicos; pessoas
físicas aparecem sem CPF completo.

## Estrutura

```
index.html
assets/tesouraria.css
assets/tesouraria.js
dados/tesouraria.js
dados/meta.json
.nojekyll
```

O `index.html` e o payload são **gerados**. Não edite o site publicado à mão: a
próxima atualização sobrescreve. A fonte do gerador e o motor ficam no projeto
privado (`Resumo PDF`), no PC do trabalho.

## Atualização

Job diário no PC do trabalho: baixa as séries, gera o JSON, monta o payload
público enxuto (piso R$ 50 mil + top 100 empenhos por entidade), valida e faz
commit/push. Se o portal falhar, a última versão boa permanece no ar.

## Painel Fiscal

Este painel é um complemento do
[Painel Fiscal Parauapebas](https://angelojordy-svg.github.io/painel-fiscal-parauapebas/).
O macro cobre a execução orçamentária; aqui o foco é caixa e comportamento de
pagamento.
