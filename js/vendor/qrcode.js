/* QRCode for JavaScript — Copyright (c) 2009 Kazuhiko Arase — MIT License */
var QRCodeLib=function(){var t={};function e(e){return e=e.replace("./",""),t[e]}return t.QRMode={exports:{MODE_NUMBER:1,MODE_ALPHA_NUM:2,MODE_8BIT_BYTE:4,MODE_KANJI:8}}.exports,t.QRErrorCorrectLevel=function(){var t={exports:({},{L:1,M:0,Q:3,H:2})};return t.exports}(),t.QRMaskPattern=function(){var t={exports:({},{PATTERN000:0,PATTERN001:1,PATTERN010:2,PATTERN011:3,PATTERN100:4,PATTERN101:5,PATTERN110:6,PATTERN111:7})};return t.exports}(),t.QRMath=function(){for(var t={exports:{}},e={glog:function(t){if(t<1)throw new Error("glog("+t+")");return e.LOG_TABLE[t]},gexp:function(t){for(;t<0;)t+=255;for(;t>=256;)t-=255;return e.EXP_TABLE[t]},EXP_TABLE:new Array(256),LOG_TABLE:new Array(256)},r=0;r<8;r++)e.EXP_TABLE[r]=1<<r;for(r=8;r<256;r++)e.EXP_TABLE[r]=e.EXP_TABLE[r-4]^e.EXP_TABLE[r-5]^e.EXP_TABLE[r-6]^e.EXP_TABLE[r-8];for(r=0;r<255;r++)e.LOG_TABLE[e.EXP_TABLE[r]]=r;return t.exports=e,t.exports}(),t.QRPolynomial=function(){var t={exports:{}},r=e("./QRMath");function o(t,e){if(void 0===t.length)throw new Error(t.length+"/"+e);for(var r=0;r<t.length&&0===t[r];)r++;this.num=new Array(t.length-r+e);for(var o=0;o<t.length-r;o++)this.num[o]=t[o+r]}return o.prototype={get:function(t){return this.num[t]},getLength:function(){return this.num.length},multiply:function(t){for(var e=new Array(this.getLength()+t.getLength()-1),n=0;n<this.getLength();n++)for(var i=0;i<t.getLength();i++)e[n+i]^=r.gexp(r.glog(this.get(n))+r.glog(t.get(i)));return new o(e,0)},mod:function(t){if(this.getLength()-t.getLength()<0)return this;for(var e=r.glog(this.get(0))-r.glog(t.get(0)),n=new Array(this.getLength()),i=0;i<this.getLength();i++)n[i]=this.get(i);for(var s=0;s<t.getLength();s++)n[s]^=r.gexp(r.glog(t.get(s))+e);
// recursive call
return new o(n,0).mod(t)}},t.exports=o,t.exports}(),t.QR8bitByte=function(){var t={exports:{}},r=e("./QRMode");function o(t){this.mode=r.MODE_8BIT_BYTE,this.data=t}return o.prototype={getLength:function(){return this.data.length},write:function(t){for(var e=0;e<this.data.length;e++)
// not JIS ...
t.put(this.data.charCodeAt(e),8)}},t.exports=o,t.exports}(),t.QRBitBuffer=function(){var t={exports:{}};function e(){this.buffer=[],this.length=0}return e.prototype={get:function(t){var e=Math.floor(t/8);return 1==(this.buffer[e]>>>7-t%8&1)},put:function(t,e){for(var r=0;r<e;r++)this.putBit(1==(t>>>e-r-1&1))},getLengthInBits:function(){return this.length},putBit:function(t){var e=Math.floor(this.length/8);this.buffer.length<=e&&this.buffer.push(0),t&&(this.buffer[e]|=128>>>this.length%8),this.length++}},t.exports=e,t.exports}(),t.QRRSBlock=function(){var t={exports:{}},r=e("./QRErrorCorrectLevel");function o(t,e){this.totalCount=t,this.dataCount=e}return o.RS_BLOCK_TABLE=[
// L
// M
// Q
// H
// 1
[1,26,19],[1,26,16],[1,26,13],[1,26,9],
// 2
[1,44,34],[1,44,28],[1,44,22],[1,44,16],
// 3
[1,70,55],[1,70,44],[2,35,17],[2,35,13],
// 4		
[1,100,80],[2,50,32],[2,50,24],[4,25,9],
// 5
[1,134,108],[2,67,43],[2,33,15,2,34,16],[2,33,11,2,34,12],
// 6
[2,86,68],[4,43,27],[4,43,19],[4,43,15],
// 7		
[2,98,78],[4,49,31],[2,32,14,4,33,15],[4,39,13,1,40,14],
// 8
[2,121,97],[2,60,38,2,61,39],[4,40,18,2,41,19],[4,40,14,2,41,15],
// 9
[2,146,116],[3,58,36,2,59,37],[4,36,16,4,37,17],[4,36,12,4,37,13],
// 10		
[2,86,68,2,87,69],[4,69,43,1,70,44],[6,43,19,2,44,20],[6,43,15,2,44,16],
// 11
[4,101,81],[1,80,50,4,81,51],[4,50,22,4,51,23],[3,36,12,8,37,13],
// 12
[2,116,92,2,117,93],[6,58,36,2,59,37],[4,46,20,6,47,21],[7,42,14,4,43,15],
// 13
[4,133,107],[8,59,37,1,60,38],[8,44,20,4,45,21],[12,33,11,4,34,12],
// 14
[3,145,115,1,146,116],[4,64,40,5,65,41],[11,36,16,5,37,17],[11,36,12,5,37,13],
// 15
[5,109,87,1,110,88],[5,65,41,5,66,42],[5,54,24,7,55,25],[11,36,12],
// 16
[5,122,98,1,123,99],[7,73,45,3,74,46],[15,43,19,2,44,20],[3,45,15,13,46,16],
// 17
[1,135,107,5,136,108],[10,74,46,1,75,47],[1,50,22,15,51,23],[2,42,14,17,43,15],
// 18
[5,150,120,1,151,121],[9,69,43,4,70,44],[17,50,22,1,51,23],[2,42,14,19,43,15],
// 19
[3,141,113,4,142,114],[3,70,44,11,71,45],[17,47,21,4,48,22],[9,39,13,16,40,14],
// 20
[3,135,107,5,136,108],[3,67,41,13,68,42],[15,54,24,5,55,25],[15,43,15,10,44,16],
// 21
[4,144,116,4,145,117],[17,68,42],[17,50,22,6,51,23],[19,46,16,6,47,17],
// 22
[2,139,111,7,140,112],[17,74,46],[7,54,24,16,55,25],[34,37,13],
// 23
[4,151,121,5,152,122],[4,75,47,14,76,48],[11,54,24,14,55,25],[16,45,15,14,46,16],
// 24
[6,147,117,4,148,118],[6,73,45,14,74,46],[11,54,24,16,55,25],[30,46,16,2,47,17],
// 25
[8,132,106,4,133,107],[8,75,47,13,76,48],[7,54,24,22,55,25],[22,45,15,13,46,16],
// 26
[10,142,114,2,143,115],[19,74,46,4,75,47],[28,50,22,6,51,23],[33,46,16,4,47,17],
// 27
[8,152,122,4,153,123],[22,73,45,3,74,46],[8,53,23,26,54,24],[12,45,15,28,46,16],
// 28
[3,147,117,10,148,118],[3,73,45,23,74,46],[4,54,24,31,55,25],[11,45,15,31,46,16],
// 29
[7,146,116,7,147,117],[21,73,45,7,74,46],[1,53,23,37,54,24],[19,45,15,26,46,16],
// 30
[5,145,115,10,146,116],[19,75,47,10,76,48],[15,54,24,25,55,25],[23,45,15,25,46,16],
// 31
[13,145,115,3,146,116],[2,74,46,29,75,47],[42,54,24,1,55,25],[23,45,15,28,46,16],
// 32
[17,145,115],[10,74,46,23,75,47],[10,54,24,35,55,25],[19,45,15,35,46,16],
// 33
[17,145,115,1,146,116],[14,74,46,21,75,47],[29,54,24,19,55,25],[11,45,15,46,46,16],
// 34
[13,145,115,6,146,116],[14,74,46,23,75,47],[44,54,24,7,55,25],[59,46,16,1,47,17],
// 35
[12,151,121,7,152,122],[12,75,47,26,76,48],[39,54,24,14,55,25],[22,45,15,41,46,16],
// 36
[6,151,121,14,152,122],[6,75,47,34,76,48],[46,54,24,10,55,25],[2,45,15,64,46,16],
// 37
[17,152,122,4,153,123],[29,74,46,14,75,47],[49,54,24,10,55,25],[24,45,15,46,46,16],
// 38
[4,152,122,18,153,123],[13,74,46,32,75,47],[48,54,24,14,55,25],[42,45,15,32,46,16],
// 39
[20,147,117,4,148,118],[40,75,47,7,76,48],[43,54,24,22,55,25],[10,45,15,67,46,16],
// 40
[19,148,118,6,149,119],[18,75,47,31,76,48],[34,54,24,34,55,25],[20,45,15,61,46,16]],o.getRSBlocks=function(t,e){var r=o.getRsBlockTable(t,e);if(void 0===r)throw new Error("bad rs block @ typeNumber:"+t+"/errorCorrectLevel:"+e);for(var n=r.length/3,i=[],s=0;s<n;s++)for(var u=r[3*s+0],a=r[3*s+1],h=r[3*s+2],l=0;l<u;l++)i.push(new o(a,h));return i},o.getRsBlockTable=function(t,e){switch(e){case r.L:return o.RS_BLOCK_TABLE[4*(t-1)+0];case r.M:return o.RS_BLOCK_TABLE[4*(t-1)+1];case r.Q:return o.RS_BLOCK_TABLE[4*(t-1)+2];case r.H:return o.RS_BLOCK_TABLE[4*(t-1)+3];default:return}},t.exports=o,t.exports}(),t.QRUtil=function(){var t={exports:{}},r=e("./QRMode"),o=e("./QRPolynomial"),n=e("./QRMath"),i=e("./QRMaskPattern"),s={PATTERN_POSITION_TABLE:[[],[6,18],[6,22],[6,26],[6,30],[6,34],[6,22,38],[6,24,42],[6,26,46],[6,28,50],[6,30,54],[6,32,58],[6,34,62],[6,26,46,66],[6,26,48,70],[6,26,50,74],[6,30,54,78],[6,30,56,82],[6,30,58,86],[6,34,62,90],[6,28,50,72,94],[6,26,50,74,98],[6,30,54,78,102],[6,28,54,80,106],[6,32,58,84,110],[6,30,58,86,114],[6,34,62,90,118],[6,26,50,74,98,122],[6,30,54,78,102,126],[6,26,52,78,104,130],[6,30,56,82,108,134],[6,34,60,86,112,138],[6,30,58,86,114,142],[6,34,62,90,118,146],[6,30,54,78,102,126,150],[6,24,50,76,102,128,154],[6,28,54,80,106,132,158],[6,32,58,84,110,136,162],[6,26,54,82,110,138,166],[6,30,58,86,114,142,170]],G15:1335,G18:7973,G15_MASK:21522,getBCHTypeInfo:function(t){for(var e=t<<10;s.getBCHDigit(e)-s.getBCHDigit(s.G15)>=0;)e^=s.G15<<s.getBCHDigit(e)-s.getBCHDigit(s.G15);return(t<<10|e)^s.G15_MASK},getBCHTypeNumber:function(t){for(var e=t<<12;s.getBCHDigit(e)-s.getBCHDigit(s.G18)>=0;)e^=s.G18<<s.getBCHDigit(e)-s.getBCHDigit(s.G18);return t<<12|e},getBCHDigit:function(t){for(var e=0;0!==t;)e++,t>>>=1;return e},getPatternPosition:function(t){return s.PATTERN_POSITION_TABLE[t-1]},getMask:function(t,e,r){switch(t){case i.PATTERN000:return(e+r)%2==0;case i.PATTERN001:return e%2==0;case i.PATTERN010:return r%3==0;case i.PATTERN011:return(e+r)%3==0;case i.PATTERN100:return(Math.floor(e/2)+Math.floor(r/3))%2==0;case i.PATTERN101:return e*r%2+e*r%3==0;case i.PATTERN110:return(e*r%2+e*r%3)%2==0;case i.PATTERN111:return(e*r%3+(e+r)%2)%2==0;default:throw new Error("bad maskPattern:"+t)}},getErrorCorrectPolynomial:function(t){for(var e=new o([1],0),r=0;r<t;r++)e=e.multiply(new o([1,n.gexp(r)],0));return e},getLengthInBits:function(t,e){if(1<=e&&e<10)
// 1 - 9
switch(t){case r.MODE_NUMBER:return 10;case r.MODE_ALPHA_NUM:return 9;case r.MODE_8BIT_BYTE:case r.MODE_KANJI:return 8;default:throw new Error("mode:"+t)}else if(e<27)
// 10 - 26
switch(t){case r.MODE_NUMBER:return 12;case r.MODE_ALPHA_NUM:return 11;case r.MODE_8BIT_BYTE:return 16;case r.MODE_KANJI:return 10;default:throw new Error("mode:"+t)}else{if(!(e<41))throw new Error("type:"+e);
// 27 - 40
switch(t){case r.MODE_NUMBER:return 14;case r.MODE_ALPHA_NUM:return 13;case r.MODE_8BIT_BYTE:return 16;case r.MODE_KANJI:return 12;default:throw new Error("mode:"+t)}}},getLostPoint:function(t){var e=t.getModuleCount(),r=0,o=0,n=0;
// LEVEL1
for(o=0;o<e;o++)for(n=0;n<e;n++){for(var i=0,s=t.isDark(o,n),u=-1;u<=1;u++)if(!(o+u<0||e<=o+u))for(var a=-1;a<=1;a++)n+a<0||e<=n+a||0===u&&0===a||s===t.isDark(o+u,n+a)&&i++;i>5&&(r+=3+i-5)}
// LEVEL2
for(o=0;o<e-1;o++)for(n=0;n<e-1;n++){var h=0;t.isDark(o,n)&&h++,t.isDark(o+1,n)&&h++,t.isDark(o,n+1)&&h++,t.isDark(o+1,n+1)&&h++,0!==h&&4!==h||(r+=3)}
// LEVEL3
for(o=0;o<e;o++)for(n=0;n<e-6;n++)t.isDark(o,n)&&!t.isDark(o,n+1)&&t.isDark(o,n+2)&&t.isDark(o,n+3)&&t.isDark(o,n+4)&&!t.isDark(o,n+5)&&t.isDark(o,n+6)&&(r+=40);for(n=0;n<e;n++)for(o=0;o<e-6;o++)t.isDark(o,n)&&!t.isDark(o+1,n)&&t.isDark(o+2,n)&&t.isDark(o+3,n)&&t.isDark(o+4,n)&&!t.isDark(o+5,n)&&t.isDark(o+6,n)&&(r+=40);
// LEVEL4
var l=0;for(n=0;n<e;n++)for(o=0;o<e;o++)t.isDark(o,n)&&l++;return r+=10*(Math.abs(100*l/e/e-50)/5)}};return t.exports=s,t.exports}(),t.index=function(){var t={exports:{}},r=e("./QR8bitByte"),o=e("./QRUtil"),n=e("./QRPolynomial"),i=e("./QRRSBlock"),s=e("./QRBitBuffer");//---------------------------------------------------------------------
// QRCode for JavaScript

// Copyright (c) 2009 Kazuhiko Arase

// URL: http://www.d-project.com/

// Licensed under the MIT license:
//   http://www.opensource.org/licenses/mit-license.php

// The word "QR Code" is registered trademark of 
// DENSO WAVE INCORPORATED
//   http://www.denso-wave.com/qrcode/faqpatent-e.html

//---------------------------------------------------------------------
// Modified to work in node for this project (and some refactoring)
//---------------------------------------------------------------------
function u(t,e){this.typeNumber=t,this.errorCorrectLevel=e,this.modules=null,this.moduleCount=0,this.dataCache=null,this.dataList=[]}return u.prototype={addData:function(t){var e=new r(t);this.dataList.push(e),this.dataCache=null},isDark:function(t,e){if(t<0||this.moduleCount<=t||e<0||this.moduleCount<=e)throw new Error(t+","+e);return this.modules[t][e]},getModuleCount:function(){return this.moduleCount},make:function(){
// Calculate automatically typeNumber if provided is < 1
if(this.typeNumber<1){var t=1;for(t=1;t<40;t++){for(var e=i.getRSBlocks(t,this.errorCorrectLevel),r=new s,n=0,u=0;u<e.length;u++)n+=e[u].dataCount;for(var a=0;a<this.dataList.length;a++){var h=this.dataList[a];r.put(h.mode,4),r.put(h.getLength(),o.getLengthInBits(h.mode,t)),h.write(r)}if(r.getLengthInBits()<=8*n)break}this.typeNumber=t}this.makeImpl(!1,this.getBestMaskPattern())},makeImpl:function(t,e){this.moduleCount=4*this.typeNumber+17,this.modules=new Array(this.moduleCount);for(var r=0;r<this.moduleCount;r++){this.modules[r]=new Array(this.moduleCount);for(var o=0;o<this.moduleCount;o++)this.modules[r][o]=null;//(col + row) % 3;
}this.setupPositionProbePattern(0,0),this.setupPositionProbePattern(this.moduleCount-7,0),this.setupPositionProbePattern(0,this.moduleCount-7),this.setupPositionAdjustPattern(),this.setupTimingPattern(),this.setupTypeInfo(t,e),this.typeNumber>=7&&this.setupTypeNumber(t),null===this.dataCache&&(this.dataCache=u.createData(this.typeNumber,this.errorCorrectLevel,this.dataList)),this.mapData(this.dataCache,e)},setupPositionProbePattern:function(t,e){for(var r=-1;r<=7;r++)if(!(t+r<=-1||this.moduleCount<=t+r))for(var o=-1;o<=7;o++)e+o<=-1||this.moduleCount<=e+o||(this.modules[t+r][e+o]=0<=r&&r<=6&&(0===o||6===o)||0<=o&&o<=6&&(0===r||6===r)||2<=r&&r<=4&&2<=o&&o<=4)},getBestMaskPattern:function(){for(var t=0,e=0,r=0;r<8;r++){this.makeImpl(!0,r);var n=o.getLostPoint(this);(0===r||t>n)&&(t=n,e=r)}return e},createMovieClip:function(t,e,r){var o=t.createEmptyMovieClip(e,r);this.make();for(var n=0;n<this.modules.length;n++)for(var i=1*n,s=0;s<this.modules[n].length;s++){var u=1*s;this.modules[n][s]&&(o.beginFill(0,100),o.moveTo(u,i),o.lineTo(u+1,i),o.lineTo(u+1,i+1),o.lineTo(u,i+1),o.endFill())}return o},setupTimingPattern:function(){for(var t=8;t<this.moduleCount-8;t++)null===this.modules[t][6]&&(this.modules[t][6]=t%2==0);for(var e=8;e<this.moduleCount-8;e++)null===this.modules[6][e]&&(this.modules[6][e]=e%2==0)},setupPositionAdjustPattern:function(){for(var t=o.getPatternPosition(this.typeNumber),e=0;e<t.length;e++)for(var r=0;r<t.length;r++){var n=t[e],i=t[r];if(null===this.modules[n][i])for(var s=-2;s<=2;s++)for(var u=-2;u<=2;u++)2===Math.abs(s)||2===Math.abs(u)||0===s&&0===u?this.modules[n+s][i+u]=!0:this.modules[n+s][i+u]=!1}},setupTypeNumber:function(t){for(var e,r=o.getBCHTypeNumber(this.typeNumber),n=0;n<18;n++)e=!t&&1==(r>>n&1),this.modules[Math.floor(n/3)][n%3+this.moduleCount-8-3]=e;for(var i=0;i<18;i++)e=!t&&1==(r>>i&1),this.modules[i%3+this.moduleCount-8-3][Math.floor(i/3)]=e},setupTypeInfo:function(t,e){
// vertical		
for(var r,n=this.errorCorrectLevel<<3|e,i=o.getBCHTypeInfo(n),s=0;s<15;s++)r=!t&&1==(i>>s&1),s<6?this.modules[s][8]=r:s<8?this.modules[s+1][8]=r:this.modules[this.moduleCount-15+s][8]=r;
// horizontal
for(var u=0;u<15;u++)r=!t&&1==(i>>u&1),u<8?this.modules[8][this.moduleCount-u-1]=r:u<9?this.modules[8][15-u-1+1]=r:this.modules[8][15-u-1]=r;
// fixed module
this.modules[this.moduleCount-8][8]=!t},mapData:function(t,e){for(var r=-1,n=this.moduleCount-1,i=7,s=0,u=this.moduleCount-1;u>0;u-=2)for(6===u&&u--;;){for(var a=0;a<2;a++)if(null===this.modules[n][u-a]){var h=!1;s<t.length&&(h=1==(t[s]>>>i&1)),o.getMask(e,n,u-a)&&(h=!h),this.modules[n][u-a]=h,-1===--i&&(s++,i=7)}if((n+=r)<0||this.moduleCount<=n){n-=r,r=-r;break}}}},u.PAD0=236,u.PAD1=17,u.createData=function(t,e,r){for(var n=i.getRSBlocks(t,e),a=new s,h=0;h<r.length;h++){var l=r[h];a.put(l.mode,4),a.put(l.getLength(),o.getLengthInBits(l.mode,t)),l.write(a)}
// calc num max data.
for(var f=0,g=0;g<n.length;g++)f+=n[g].dataCount;if(a.getLengthInBits()>8*f)throw new Error("code length overflow. ("+a.getLengthInBits()+">"+8*f+")");
// end code
// padding
for(a.getLengthInBits()+4<=8*f&&a.put(0,4);a.getLengthInBits()%8!=0;)a.putBit(!1);
// padding
for(;!(a.getLengthInBits()>=8*f||(a.put(u.PAD0,8),a.getLengthInBits()>=8*f));)a.put(u.PAD1,8);return u.createBytes(a,n)},u.createBytes=function(t,e){for(var r=0,i=0,s=0,u=new Array(e.length),a=new Array(e.length),h=0;h<e.length;h++){var l=e[h].dataCount,f=e[h].totalCount-l;i=Math.max(i,l),s=Math.max(s,f),u[h]=new Array(l);for(var g=0;g<u[h].length;g++)u[h][g]=255&t.buffer[g+r];r+=l;var c=o.getErrorCorrectPolynomial(f),d=new n(u[h],c.getLength()-1).mod(c);a[h]=new Array(c.getLength()-1);for(var m=0;m<a[h].length;m++){var p=m+d.getLength()-a[h].length;a[h][m]=p>=0?d.get(p):0}}for(var v=0,E=0;E<e.length;E++)v+=e[E].totalCount;for(var T=new Array(v),B=0,L=0;L<i;L++)for(var C=0;C<e.length;C++)L<u[C].length&&(T[B++]=u[C][L]);for(var P=0;P<s;P++)for(var A=0;A<e.length;A++)P<a[A].length&&(T[B++]=a[A][P]);return T},t.exports=u,t.exports}(),{QRCode:t.index,ECL:t.QRErrorCorrectLevel}}();