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
privado (`Resumo PDF`); a atualização diária roda no PC do trabalho.

## Atualização

Job diário no PC do trabalho: baixa as séries, gera o JSON, monta o payload
público enxuto (piso R$ 50 mil + top 100 empenhos por entidade), valida e faz
commit/push. Se o portal falhar, a última versão boa permanece no ar.

## Clone no PC do trabalho (passo a passo)

1. Instale **Git for Windows** e **Python 3.12** (marque "Add python.exe to PATH").
2. Abra o PowerShell e confira:
   ```powershell
   git --version
   python --version
   ```
3. Crie a pasta e configure o Git:
   ```powershell
   mkdir C:\Tesouraria
   git config --global user.name "Seu Nome"
   git config --global user.email "seu@email"
   ```
4. Clone o motor (privado; use a conta que tem acesso):
   ```powershell
   git clone https://github.com/angelojordy-svg/tesouraria-motor.git C:\Tesouraria\motor
   ```
5. Clone este site (público):
   ```powershell
   git clone https://github.com/angelojordy-svg/tesouraria-parauapebas.git C:\Tesouraria\tesouraria-parauapebas
   ```
6. Configure:
   ```powershell
   cd C:\Tesouraria\motor
   copy config.example.json config.json
   notepad config.json
   ```
   Confira `"repo": "C:\\Tesouraria\\tesouraria-parauapebas"`.
7. Teste e publique:
   ```powershell
   verificar_ambiente.bat
   rodar_tesouraria.bat --sem-publicar
   rodar_tesouraria.bat
   ```
8. Agende às 10:00:
   ```powershell
   agendar_tarefa.bat
   ```
9. Desative a publicação na casa (um dono por vez).

Guia detalhado: `COMO-CLONAR-NO-TRABALHO.txt` e `SKILL-tesouraria.md` no repo privado.

## Painel Fiscal

Este painel é um complemento do
[Painel Fiscal Parauapebas](https://angelojordy-svg.github.io/painel-fiscal-parauapebas/).
O macro cobre a execução orçamentária; aqui o foco é caixa e comportamento de
pagamento.
