/* Título do hero: cada linha que aparece na tela alterna creme / vermelho,
   recalculado quando a largura muda ou as fontes terminam de carregar. */
(function(){
  var h=document.querySelector(".hero h1"); if(!h) return;
  var palavras=h.textContent.trim().split(/\s+/);
  h.innerHTML=palavras.map(function(p){return '<span class="pal">'+p+'</span>';}).join(" ");
  var spans=h.querySelectorAll(".pal"), larg=0;
  function pintar(){
    var topo=null, linha=-1;
    for(var i=0;i<spans.length;i++){
      var t=spans[i].offsetTop;
      if(topo===null||t>topo+2){topo=t;linha++;}
      spans[i].classList.toggle("alt",linha%2===1);
    }
  }
  pintar();
  if(document.fonts&&document.fonts.ready) document.fonts.ready.then(pintar);
  window.addEventListener("resize",function(){ if(innerWidth!==larg){larg=innerWidth;pintar();} });
  if(window.ResizeObserver) new ResizeObserver(pintar).observe(h);
})();
