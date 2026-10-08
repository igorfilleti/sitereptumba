# Receber os pedidos no Google Drive

Cada pedido feito no site vira uma linha numa planilha, e o comprovante do Pix é salvo numa pasta
do seu Drive. Leva uns 10 minutos e só precisa ser feito uma vez.

## 1. Pasta e planilha

1. No [Google Drive](https://drive.google.com), crie uma pasta, por exemplo **Camisas Rep. Tumba**.
2. Dentro dela: **Novo → Planilhas Google**. Dê o nome **Pedidos camisa**.

## 2. Colar o script

1. Na planilha: **Extensões → Apps Script**.
2. Apague o que estiver no editor e cole todo o conteúdo do arquivo [`Codigo.gs`](Codigo.gs).
3. Clique no disquete (**Salvar**).
4. No menu de funções ao lado de "Depurar", escolha **autorizar** e clique em **Executar**.
   O Google pede permissão para o script usar a planilha e o Drive: escolha sua conta → **Avançado** →
   **Acessar (não seguro)** → **Permitir**. (O aviso aparece porque o script é seu, não verificado
   pelo Google; ele só mexe nesta planilha e na pasta dela.)
   A aba **Pedidos** (com o cabeçalho) e a subpasta **Comprovantes** são criadas na hora.

## 3. Publicar

1. **Implantar → Nova implantação**. Na engrenagem, escolha **App da Web**.
2. **Executar como:** Eu · **Quem pode acessar:** Qualquer pessoa.
3. **Implantar** e copie o **URL do app da Web** (termina em `/exec`).
4. Teste: abra esse endereço no navegador. Deve aparecer `{"ok":true,"status":"Recebendo pedidos."}`.

## 4. Ligar no site

Mande o endereço para quem cuida do site, ou cole em `js/app.js`, no topo:

```js
scriptUrl: 'https://script.google.com/macros/s/.../exec',
```

## Como fica

- **Aba Pedidos:** Pedido (0001, 0002…), Data, Nome, Apelido, WhatsApp, Nome na camisa, Número,
  Modelagem, Tamanho, link do Comprovante, Status (começa em "A conferir"; mude para "Pago",
  "Produzindo", "Entregue"…) e Pagamento ("R$ 120,00 à vista" ou "2x de R$ 60,00").
- **Pasta Comprovantes:** cada arquivo com o número do pedido e o nome da pessoa
  (ex.: `0001 - João da Silva.jpg`).
- No site, a pessoa só vê "Pedido confirmado" quando a planilha gravou de verdade; se algo
  falhar, aparece o erro e ela pode tentar de novo.

## Se mudar o script depois

**Implantar → Gerenciar implantações → lápis → Versão: Nova versão → Implantar.**
Assim o endereço continua o mesmo e o site não precisa mudar.
