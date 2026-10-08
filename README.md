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

## Receber os pedidos

Os pedidos vão para uma planilha e os comprovantes para uma pasta do seu Google Drive.
Passo a passo em [apps-script/LEIA-ME.md](apps-script/LEIA-ME.md). Enquanto o endereço do script
não estiver em `CONFIG.scriptUrl` (js/app.js), o site recusa o envio e avisa a pessoa.

## Estrutura

```
index.html              página
css/style.css           estilos
js/app.js               formulário, Pix e envio do pedido (CONFIG no topo)
js/camisa3d/            camisa 3D (three.js)
  viewer.js             cena, luz, câmera e controles
  modelo.js             carrega o modelo 3D e pinta o design na textura dele
  estampa.js            design (arte da Icone): posições de logos, nome e número
js/vendor/qrcode.js     gerador de QR Code (MIT)
assets/img/             escudo, "Rep. Tumba", Unicamp e "icone"
assets/models/camisa/   modelo 3D da camisa masculina (camisa.glb: ~15 mil triângulos, normais suavizadas)
assets/models/feminina/ modelo 3D da baby look (scene.gltf + scene.bin)
servidor.ps1            servidor local para testes
apps-script/            script do Google que recebe os pedidos (planilha + comprovantes no Drive)
```

## Créditos

Modelo 3D baseado em ["FC Porto Shirt"](https://sketchfab.com/3d-models/fc-porto-shirt-132d995c35f1480889ff544734ca86cf)
de [Carlos.Maciel](https://sketchfab.com/Carlos.Maciel), licença
[CC BY 4.0](http://creativecommons.org/licenses/by/4.0/). Modificado: textura, relevo, arte e objetos de cenário originais removidos; malha simplificada e compactada.

Modelo da baby look baseado em ["T-Shirt for Female"](https://sketchfab.com/3d-models/t-shirt-for-female-fbd56879e5c54b53b3d75d987342c8f8)
de DaaGHrii, licença [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/). Modificado: textura original removida; arte da Rep. Tumba aplicada.

Teste da masculina nova (abrir com `?masc=2`): ["Men Regular Apparel Fit Sporty T-Shirt"](https://sketchfab.com/3d-models/men-regular-apparel-fit-sporty-t-shirt-4d055bb8c1e04549a4b2dac7b27ebb2c)
de [BINARYCLOTH](https://sketchfab.com/binaryclothofficial), licença [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/). Modificado: texturas removidas; malha compactada.
