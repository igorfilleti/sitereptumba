# Site Reptumba

Página de pedido da camisa de jogo da Rep. Tumba: dados, personalização com prévia em 3D e pagamento via Pix.

## Como abrir o site localmente

1. Clone o repositório:

   ```bash
   git clone https://github.com/igorfilleti/sitereptumba.git
   ```

2. Na pasta do projeto, inicie o servidor local (não precisa instalar nada):

   ```bash
   powershell -ExecutionPolicy Bypass -File servidor.ps1
   ```

3. Abra http://localhost:8080 no navegador.

O site usa módulos JavaScript, então não funciona abrindo o `index.html` com dois cliques.

## Estrutura

```
index.html              página
css/style.css           estilos
js/app.js               formulário, Pix e envio do pedido (CONFIG no topo)
js/camisa3d/            camisa 3D (three.js)
  viewer.js             cena, luz, câmera e controles
  geometria.js          modelo provisório da camisa (até chegar o .glb definitivo)
  estampa.js            design: listras, gola, escudo, nome e número
js/vendor/qrcode.js     gerador de QR Code (MIT)
assets/img/             escudo, logo "Rep. Tumba" e Unicamp
servidor.ps1            servidor local para testes
```
