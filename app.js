(() => {
  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));
  const canvas = $('#canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const work = document.createElement('canvas');
  const wctx = work.getContext('2d', { willReadFrequently: true });
  const blurCanvas = document.createElement('canvas');
  const bctx = blurCanvas.getContext('2d');
  const depthCanvas = document.createElement('canvas');
  const dctx = depthCanvas.getContext('2d', { willReadFrequently: true });
  const inferCanvas = document.createElement('canvas');
  const inferCtx = inferCanvas.getContext('2d', { willReadFrequently: true });
  const video = $('#video');
  const image = $('#image');
  const fileInput = $('#fileInput');
  const emptyState = $('#emptyState');
  const seek = $('#seek');

  let mediaType = null;
  let selectedFx = 'filmSoft';
  let objectUrl = null;
  let raf = null;
  let previewDirty = true;
  let lastPreviewPaint = 0;
  let recording = null;
  let recordedChunks = [];
  let depthBusy = false;
  let depthReady = false;
  let lastDepthAt = 0;
  let depthGeneration = 0;
  const feedbackCanvas=document.createElement('canvas'), fctx=feedbackCanvas.getContext('2d');
  const prevCanvas=document.createElement('canvas'), pctx=prevCanvas.getContext('2d');
  let feedbackValid=false, prevValid=false, particles=[];

  const fxDefs = {
    filmSoft:{label:'SOFT 35',controls:{glow:[0,100,58],grain:[0,100,24],warmth:[-50,50,12],fade:[0,100,12],softness:[0,100,34],vignette:[0,100,18]}},
    disposable:{label:'DISPOSABLE',controls:{flash:[0,100,32],grain:[0,100,38],warmth:[-50,50,8],contrast:[0,100,61],vignette:[0,100,24],date:[0,1,0,'toggle']}},
    super8:{label:'SUPER 8',controls:{grain:[0,100,52],warmth:[-50,50,18],fade:[0,100,18],jitter:[0,100,24],vignette:[0,100,32],flicker:[0,100,18]}},
    dv:{label:'DV 2003',controls:{sharpness:[0,100,22],cool:[0,100,16],noise:[0,100,20],scan:[0,100,12],bleed:[0,100,15]}},
    night:{label:'NIGHT VISION',controls:{gain:[0,100,58],grain:[0,100,28],bloom:[0,100,22],vignette:[0,100,36],green:[0,100,80]}},
    dither:{label:'1-BIT DITHER',controls:{threshold:[0,255,128],scale:[1,8,2],contrast:[0,100,60],invert:[0,1,0,'toggle']}},
    crt:{label:'CRT',controls:{scanlines:[0,100,45],curvature:[0,100,12],rgbSplit:[0,20,3],noise:[0,100,16],glow:[0,100,16],vignette:[0,100,32]}},
    receipt:{label:'RECEIPT PAPER',controls:{threshold:[0,255,150],grain:[0,100,25],paper:[0,100,18],streaks:[0,100,14],invert:[0,1,0,'toggle']}},
    depth:{label:'DEPTH MAP',controls:{black:[0,40,3],white:[60,100,97],gamma:[50,180,92],smooth:[0,100,18],temporal:[0,100,38],invert:[0,1,0,'toggle']}},
    datamosh:{label:'DATAMOSH',controls:{smear:[0,100,68],motion:[0,100,55],blocks:[4,64,18],decay:[0,100,72],tear:[0,100,28]}},
    feedback:{label:'FEEDBACK LOOP',controls:{decay:[0,100,78],zoom:[-30,30,5],rotate:[-20,20,1],shiftX:[-40,40,2],shiftY:[-40,40,1]}},
    blob:{label:'BLOB TRACKING',controls:{threshold:[0,255,125],grid:[8,48,20],boxes:[0,1,1,'toggle'],trails:[0,100,48],invert:[0,1,0,'toggle']}},
    particleBlob:{label:'PARTICLE BLOB',controls:{threshold:[0,255,125],amount:[1,12,5],life:[10,120,55],size:[1,12,4],trails:[0,100,65]}},
    fluid:{label:'FLUID DISPLACE',controls:{strength:[0,100,42],scale:[5,80,30],speed:[0,100,35],chromatic:[0,20,3],waves:[1,8,3]}},
    smoke:{label:'SMOKE DISPLACE',controls:{strength:[0,100,35],scale:[10,100,52],speed:[0,100,22],softness:[0,100,30],drift:[-50,50,12]}},
    vhs:{label:'RETRO VHS',controls:{tracking:[0,100,36],noise:[0,100,28],bleed:[0,20,5],scan:[0,100,28],jitter:[0,100,22],dropouts:[0,100,14]}},
    xerox:{label:'XEROX',controls:{threshold:[0,255,142],contrast:[0,100,78],grain:[0,100,48],streaks:[0,100,25],invert:[0,1,0,'toggle']}},
    halftone:{label:'HALFTONE PRINT',controls:{dots:[2,12,5],angle:[0,90,45],contrast:[0,100,68],paper:[0,100,18],invert:[0,1,0,'toggle']}},
    riso:{label:'RISO PRINT',controls:{threshold:[0,255,132],offset:[0,12,3],grain:[0,100,32],bleed:[0,100,24],paper:[0,100,16]}},
    pixelSort:{label:'PIXEL SORT',controls:{threshold:[0,255,105],length:[4,80,28],amount:[0,100,62],vertical:[0,1,0,'toggle']}},
    cctv:{label:'CCTV',controls:{contrast:[0,100,62],noise:[0,100,24],scan:[0,100,32],vignette:[0,100,28],timestamp:[0,1,1,'toggle']}},
    infrared:{label:'INFRARED',controls:{contrast:[0,100,70],bloom:[0,100,28],grain:[0,100,20],invert:[0,1,0,'toggle']}},
    thermal:{label:'THERMAL',controls:{contrast:[0,100,68],bands:[3,12,7],noise:[0,100,10],invert:[0,1,0,'toggle']}},
    ascii:{label:'ASCII VIDEO',controls:{cell:[5,20,9],contrast:[0,100,65],invert:[0,1,0,'toggle'],green:[0,1,0,'toggle']}},
    poster:{label:'POSTERIZE',controls:{levels:[2,12,5],contrast:[0,100,58],grain:[0,100,8]}},
    fax:{label:'FAX MACHINE',controls:{threshold:[0,255,145],lines:[0,100,42],noise:[0,100,30],skew:[0,20,3]}},
    newspaper:{label:'NEWSPAPER',controls:{dots:[2,10,4],contrast:[0,100,72],yellow:[0,100,18],grain:[0,100,20]}},
    scanner:{label:'SCANNER BED',controls:{line:[0,100,65],glow:[0,100,18],cool:[0,100,14],noise:[0,100,12]}},
    jpeg:{label:'JPEG DAMAGE',controls:{blocks:[4,32,12],damage:[0,100,55],shift:[0,30,8],poster:[2,16,8]}},
    rgbFeedback:{label:'RGB FEEDBACK',controls:{decay:[0,100,76],split:[0,24,6],zoom:[-20,30,4],rotate:[-12,12,1]}},
    recursive:{label:'RECURSIVE ZOOM',controls:{copies:[2,10,5],zoom:[2,30,10],rotate:[-20,20,2],decay:[0,100,65]}},
    edgeGlow:{label:'EDGE GLOW',controls:{threshold:[0,255,45],glow:[0,100,48],invert:[0,1,0,'toggle'],mono:[0,1,1,'toggle']}},
    liquid:{label:'LIQUID GLASS',controls:{strength:[0,100,34],scale:[5,60,22],speed:[0,100,28],bands:[8,80,35]}},
    web04:{label:'WEBCAM 2004',controls:{pixel:[1,8,3],noise:[0,100,32],cool:[-30,30,5],contrast:[0,100,58],timestamp:[0,1,0,'toggle']}},
    digiflash:{label:'DIGICAM FLASH',controls:{flash:[0,100,62],sharp:[0,100,44],noise:[0,100,18],cool:[-30,30,-4],vignette:[0,100,14]}}
  };
  const values = {};
  Object.entries(fxDefs).forEach(([k,d]) => values[k] = Object.fromEntries(Object.entries(d.controls).map(([n,c]) => [n,c[2]])));

  function renderControls(){
    const def = fxDefs[selectedFx];
    $('#controlTitle').textContent = def.label;
    $('#activeFxLabel').textContent = def.label;
    const host = $('#controls'); host.innerHTML = '';
    Object.entries(def.controls).forEach(([name,c]) => {
      if(c[3] === 'toggle'){
        const row = document.createElement('label'); row.className = 'toggle-row';
        row.innerHTML = `<span>${name.toUpperCase()}</span><input type="checkbox" ${values[selectedFx][name] ? 'checked' : ''}>`;
        row.querySelector('input').addEventListener('change', e => { values[selectedFx][name] = e.target.checked ? 1 : 0; queuePreview(true); });
        host.appendChild(row);
      } else {
        const row = document.createElement('div'); row.className = 'control-row';
        row.innerHTML = `<label><span>${name.toUpperCase()}</span><output>${values[selectedFx][name]}</output></label><input type="range" min="${c[0]}" max="${c[1]}" value="${values[selectedFx][name]}">`;
        const input = row.querySelector('input'), out = row.querySelector('output');
        input.addEventListener('input', () => { values[selectedFx][name] = +input.value; out.value = input.value; queuePreview(false); });
        host.appendChild(row);
      }
    });
  }

  $$('.fx').forEach(btn => btn.addEventListener('click', () => {
    $$('.fx').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedFx = btn.dataset.fx;
    renderControls();
    depthReady = false;
    if (selectedFx === 'depth') requestDepth(true);
    queuePreview(true);
  }));

  function fitSize(sw,sh){
    const maxW = 1280, maxH = 720;
    const r = Math.min(maxW/sw, maxH/sh, 1);
    return [Math.max(2, Math.round(sw*r)), Math.max(2, Math.round(sh*r))];
  }
  function setupFor(sw,sh){
    const [w,h] = fitSize(sw,sh);
    [canvas,work,blurCanvas,depthCanvas,feedbackCanvas,prevCanvas].forEach(c => { c.width = w; c.height = h; }); feedbackValid=false; prevValid=false;
  }

  function setState(text){ $('#systemState').textContent = text; }
  function setDepthState(text){ const el = $('#depthState'); if(el) el.textContent = text; }

  function loadFile(file){
    if(!file) return;
    if(objectUrl) URL.revokeObjectURL(objectUrl);
    objectUrl = URL.createObjectURL(file);
    depthGeneration++;
    depthReady = false; feedbackValid=false; prevValid=false; particles=[];
    setState('INPUT ONLINE');
    $('#mediaMeta').textContent = `${file.type || file.name.split('.').pop().toUpperCase()} // ${(file.size/1048576).toFixed(1)} MB`;

    const isVideo = file.type.startsWith('video/') || /\.(mov|mp4|m4v|webm|avi)$/i.test(file.name);
    const isImage = file.type.startsWith('image/') || /\.(png|jpe?g|webp|bmp|gif)$/i.test(file.name);

    if(isVideo){
      mediaType = 'video';
      video.src = objectUrl;
      video.loop = true;
      video.muted = false;
      video.onloadedmetadata = () => {
        setupFor(video.videoWidth, video.videoHeight);
        emptyState.hidden = true;
        emptyState.classList.add('is-hidden');
        seek.disabled = false;
      };
      video.onloadeddata = () => {
        queuePreview(true);
        updateTime();
        startPreviewLoop();
        // Attempt active preview immediately. If Chromium blocks autoplay, the first frame still displays.
        video.play().catch(() => setState('READY // PRESS PLAY'));
      };
      video.onerror = () => { setState('DECODE ERROR'); alert('This video codec could not be decoded by Chromium. MP4/H.264 and most MOV files work best.'); };
    } else if(isImage){
      mediaType = 'image';
      image.src = objectUrl;
      image.onload = () => {
        setupFor(image.naturalWidth, image.naturalHeight);
        emptyState.hidden = true;
        emptyState.classList.add('is-hidden');
        seek.disabled = true;
        $('#timeReadout').textContent = 'STILL IMAGE';
        queuePreview(true);
        if(selectedFx === 'depth') requestDepth(true);
      };
    } else {
      alert('Unsupported media type.');
    }
  }

  function source(){ return mediaType === 'video' ? video : mediaType === 'image' ? image : null; }

  function drawBase(){
    const src = source();
    if(!src || (mediaType === 'video' && video.readyState < 2)) return false;
    const W = work.width, H = work.height;
    wctx.save(); wctx.clearRect(0,0,W,H);
    let jx = 0, jy = 0;
    if(selectedFx === 'super8'){
      const j = values.super8.jitter/100*4;
      jx = (Math.random()-.5)*j; jy = (Math.random()-.5)*j;
    }
    wctx.drawImage(src, jx, jy, W, H);
    wctx.restore();
    return true;
  }

  function drawCurrent(forceDepth = false){
    if(!drawBase()) return;
    const W = work.width, H = work.height;
    if(selectedFx === 'depth'){
      if(depthReady) drawDepthStyled(W,H);
      else {
        // Never show a fake brightness-based 'depth'. Show source until the real model result arrives.
        ctx.clearRect(0,0,W,H); ctx.drawImage(work,0,0);
        drawProcessingOverlay();
      }
      if(forceDepth) requestDepth(true);
    } else {
      applyEffect(W,H);
    }
    if(mediaType === 'video') updateTime();
  }

  function queuePreview(forceDepth = false){
    previewDirty = true;
    if(forceDepth && selectedFx === 'depth') requestDepth(true);
    if(!raf) startPreviewLoop();
  }

  function startPreviewLoop(){
    if(raf) return;
    const tick = (now) => {
      raf = requestAnimationFrame(tick);
      if(!source()) return;

      // Video frames are redrawn continuously while playing. Still images redraw only
      // when an effect/control changes. This makes the monitor a true live preview.
      const videoLive = mediaType === 'video' && !video.paused && video.readyState >= 2;
      const due = now - lastPreviewPaint >= (videoLive ? 33 : 0);
      if((previewDirty || videoLive) && due){
        previewDirty = false;
        lastPreviewPaint = now;
        drawCurrent(false);
        if(selectedFx === 'depth' && videoLive) requestDepth(false);
      }
    };
    raf = requestAnimationFrame(tick);
  }

  function stopPreviewLoop(){
    if(raf) cancelAnimationFrame(raf);
    raf = null;
  }

  function drawProcessingOverlay(){
    const W = canvas.width, H = canvas.height;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,.58)';
    ctx.fillRect(0,H-42,W,42);
    ctx.fillStyle = '#f2b632';
    ctx.font = `${Math.max(12,Math.round(W/75))}px monospace`;
    ctx.fillText('DEPTH MODEL // PROCESSING FRAME', 18, H-16);
    ctx.restore();
  }

  async function requestDepth(force){
    if(selectedFx !== 'depth' || !source() || depthBusy || !window.signalForge) return;
    const now = performance.now();
    // CPU-friendly active preview: about 4 inference frames/sec; visual playback remains smooth between results.
    if(!force && now - lastDepthAt < 240) return;
    lastDepthAt = now;
    const generation = depthGeneration;
    depthBusy = true;
    setState('DEPTH PROCESSING');
    setDepthState('Depth Anything V2 // running locally');
    try {
      const src = source();
      const sw = mediaType === 'video' ? video.videoWidth : image.naturalWidth;
      const sh = mediaType === 'video' ? video.videoHeight : image.naturalHeight;
      if(!sw || !sh) return;
      const maxSide = 448;
      const r = Math.min(1, maxSide / Math.max(sw,sh));
      const iw = Math.max(64, Math.round(sw*r));
      const ih = Math.max(64, Math.round(sh*r));
      inferCanvas.width = iw; inferCanvas.height = ih;
      inferCtx.clearRect(0,0,iw,ih);
      inferCtx.drawImage(src,0,0,iw,ih);
      const frame = inferCtx.getImageData(0,0,iw,ih);
      const result = await window.signalForge.runDepth({ width: iw, height: ih, rgba: Array.from(frame.data) });
      if(generation !== depthGeneration || selectedFx !== 'depth') return;
      if(!result?.ok) throw new Error(result?.error || 'Depth inference failed');
      buildDepthCanvas(result);
      depthReady = true;
      setState('DEPTH ONLINE');
      setDepthState('Depth Anything V2 // LOCAL DEPTH ACTIVE');
      drawCurrent(false);
    } catch(err){
      console.error(err);
      depthReady = false;
      setState('DEPTH MODEL ERROR');
      setDepthState(`Depth model error // ${String(err.message || err).slice(0,80)}`);
    } finally {
      depthBusy = false;
    }
  }

  function buildDepthCanvas(result){
    const rw = result.width, rh = result.height;
    const tmp = document.createElement('canvas'); tmp.width = rw; tmp.height = rh;
    const tctx = tmp.getContext('2d');
    const out = tctx.createImageData(rw,rh);
    const od = out.data;

    if(result.values){
      const vals = result.values;
      const sample = [];
      const stride = Math.max(1, Math.floor(vals.length/50000));
      for(let i=0;i<vals.length;i+=stride){ const n = Number(vals[i]); if(Number.isFinite(n)) sample.push(n); }
      sample.sort((a,b)=>a-b);
      const lo = sample[Math.floor(sample.length*.02)] ?? 0;
      const hi = sample[Math.floor(sample.length*.98)] ?? 1;
      const span = Math.max(1e-6, hi-lo);
      for(let i=0;i<rw*rh;i++){
        let n = (Number(vals[i]) - lo)/span;
        n = Math.max(0,Math.min(1,n));
        const g = Math.round(n*255); // Depth Anything relative inverse depth: near = brighter.
        const j=i*4; od[j]=od[j+1]=od[j+2]=g; od[j+3]=255;
      }
    } else if(result.bytes){
      const bytes = result.bytes;
      const channels = Math.max(1, Math.round(bytes.length/(rw*rh)));
      for(let i=0;i<rw*rh;i++){
        const g = bytes[i*channels] ?? 0;
        const j=i*4; od[j]=od[j+1]=od[j+2]=g; od[j+3]=255;
      }
    }
    tctx.putImageData(out,0,0);

    // Temporal smoothing prevents crawling/flicker in video while preserving clear subject silhouettes.
    const temporal = values.depth.temporal/100;
    if(depthCanvas.width !== work.width || depthCanvas.height !== work.height){ depthCanvas.width=work.width; depthCanvas.height=work.height; }
    if(mediaType === 'video' && temporal > 0 && depthReady){
      const prev = document.createElement('canvas'); prev.width=depthCanvas.width; prev.height=depthCanvas.height;
      prev.getContext('2d').drawImage(depthCanvas,0,0);
      dctx.clearRect(0,0,depthCanvas.width,depthCanvas.height);
      dctx.globalAlpha = 1;
      dctx.drawImage(tmp,0,0,depthCanvas.width,depthCanvas.height);
      dctx.globalAlpha = temporal*.72;
      dctx.drawImage(prev,0,0);
      dctx.globalAlpha = 1;
    } else {
      dctx.clearRect(0,0,depthCanvas.width,depthCanvas.height);
      dctx.drawImage(tmp,0,0,depthCanvas.width,depthCanvas.height);
    }
  }

  function drawDepthStyled(W,H){
    // Start from the model's actual relative-depth map, then grade it to the reference look:
    // near subjects white, mid-depth gray, distant/background black.
    wctx.clearRect(0,0,W,H);
    wctx.drawImage(depthCanvas,0,0,W,H);
    const im = wctx.getImageData(0,0,W,H), d=im.data, v=values.depth;
    const black = v.black/100, white = v.white/100;
    const gamma = Math.max(.25, v.gamma/100);
    const span = Math.max(.01, white-black);
    for(let i=0;i<d.length;i+=4){
      let n = d[i]/255;
      n = Math.max(0,Math.min(1,(n-black)/span));
      n = Math.pow(n,gamma);
      if(v.invert) n = 1-n;
      const g = Math.round(n*255);
      d[i]=d[i+1]=d[i+2]=g; d[i+3]=255;
    }
    wctx.putImageData(im,0,0);
    if(v.smooth > 0){
      bctx.clearRect(0,0,W,H);
      bctx.filter = `blur(${(v.smooth/100)*3.0}px)`;
      bctx.drawImage(work,0,0); bctx.filter='none';
      wctx.clearRect(0,0,W,H); wctx.drawImage(blurCanvas,0,0);
    }
    ctx.clearRect(0,0,W,H); ctx.drawImage(work,0,0);
  }

  function pixels(fn){ const im=wctx.getImageData(0,0,work.width,work.height),d=im.data; fn(d,work.width,work.height); wctx.putImageData(im,0,0); }
  function clamp(v){ return Math.max(0,Math.min(255,v)); }
  function grain(d,amount,mono=true){ const a=amount*.55; for(let i=0;i<d.length;i+=4){ const n=(Math.random()-.5)*a; if(mono){d[i]=clamp(d[i]+n);d[i+1]=clamp(d[i+1]+n);d[i+2]=clamp(d[i+2]+n);}else{d[i]=clamp(d[i]+(Math.random()-.5)*a);d[i+1]=clamp(d[i+1]+(Math.random()-.5)*a);d[i+2]=clamp(d[i+2]+(Math.random()-.5)*a);}} }
  function compositeBlur(strength,screen=.55){ if(strength<=0)return; const px=1+strength/100*13; bctx.clearRect(0,0,blurCanvas.width,blurCanvas.height); bctx.filter=`blur(${px}px)`; bctx.drawImage(work,0,0); bctx.filter='none'; wctx.save(); wctx.globalCompositeOperation='screen'; wctx.globalAlpha=strength/100*screen; wctx.drawImage(blurCanvas,0,0); wctx.restore(); }
  function vignette(amount){ if(!amount)return; const W=work.width,H=work.height,g=wctx.createRadialGradient(W/2,H/2,Math.min(W,H)*.18,W/2,H/2,Math.max(W,H)*.68); g.addColorStop(0,'rgba(0,0,0,0)'); g.addColorStop(1,`rgba(0,0,0,${amount/100*.7})`); wctx.fillStyle=g; wctx.fillRect(0,0,W,H); }
  function contrastPixel(v,c){ return clamp((v-128)*(1+c)+128); }

  function applyEffect(W,H){
    const v=values[selectedFx];
    if(selectedFx==='filmSoft'){
      pixels(d=>{for(let i=0;i<d.length;i+=4){const fade=v.fade/100*.28;d[i]=clamp(d[i]*(1-fade)+235*fade+v.warmth*.35);d[i+1]=clamp(d[i+1]*(1-fade)+220*fade+v.warmth*.12);d[i+2]=clamp(d[i+2]*(1-fade)+205*fade-v.warmth*.18);}grain(d,v.grain);}); compositeBlur(v.glow,.55); if(v.softness){bctx.clearRect(0,0,W,H);bctx.filter=`blur(${v.softness/100*2}px)`;bctx.drawImage(work,0,0);bctx.filter='none';wctx.globalAlpha=v.softness/100*.13;wctx.drawImage(blurCanvas,0,0);wctx.globalAlpha=1;} vignette(v.vignette);
    } else if(selectedFx==='disposable'){
      pixels(d=>{const c=(v.contrast-50)/65;for(let i=0;i<d.length;i+=4){d[i]=contrastPixel(d[i]+v.warmth*.25+v.flash*.18,c);d[i+1]=contrastPixel(d[i+1]+v.flash*.15,c);d[i+2]=contrastPixel(d[i+2]-v.warmth*.18+v.flash*.12,c);}grain(d,v.grain);});vignette(v.vignette);if(v.date){wctx.font=`${Math.max(14,W/45)}px monospace`;wctx.fillStyle='#ff9a35';wctx.fillText(new Date().toLocaleDateString('en-US',{year:'2-digit',month:'2-digit',day:'2-digit'}),W*.73,H*.93);}
    } else if(selectedFx==='super8'){
      const flick=(Math.random()-.5)*v.flicker*.5;pixels(d=>{for(let i=0;i<d.length;i+=4){d[i]=clamp(d[i]+v.warmth*.4+flick+v.fade*.12);d[i+1]=clamp(d[i+1]+flick);d[i+2]=clamp(d[i+2]-v.warmth*.22+flick);}grain(d,v.grain);});vignette(v.vignette);
    } else if(selectedFx==='dv'){
      pixels(d=>{for(let i=0;i<d.length;i+=4){d[i]=clamp(d[i]-v.cool*.08);d[i+1]=clamp(d[i+1]+v.cool*.05);d[i+2]=clamp(d[i+2]+v.cool*.28);}grain(d,v.noise,false);});if(v.bleed){const snap=wctx.getImageData(0,0,W,H),src=snap.data,out=wctx.createImageData(W,H),d=out.data,s=Math.round(v.bleed/10);for(let y=0;y<H;y++)for(let x=0;x<W;x++){const i=(y*W+x)*4,il=(y*W+Math.max(0,x-s))*4,ir=(y*W+Math.min(W-1,x+s))*4;d[i]=src[il];d[i+1]=src[i+1];d[i+2]=src[ir+2];d[i+3]=255;}wctx.putImageData(out,0,0);}if(v.scan){wctx.fillStyle=`rgba(0,0,0,${v.scan/100*.16})`;for(let y=0;y<H;y+=3)wctx.fillRect(0,y,W,1);}
    } else if(selectedFx==='night'){
      pixels(d=>{for(let i=0;i<d.length;i+=4){let y=(.299*d[i]+.587*d[i+1]+.114*d[i+2])*(1+v.gain/120);d[i]=clamp(y*(1-v.green/100*.72));d[i+1]=clamp(y*(.65+v.green/100*.62));d[i+2]=clamp(y*(1-v.green/100*.72));}grain(d,v.grain);});compositeBlur(v.bloom,.35);vignette(v.vignette);
    } else if(selectedFx==='dither'){
      pixels((d,w,h)=>{const scale=v.scale,mat=[[0,8,2,10],[12,4,14,6],[3,11,1,9],[15,7,13,5]],c=(v.contrast-50)/50;for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=(y*w+x)*4;let g=.299*d[i]+.587*d[i+1]+.114*d[i+2];g=contrastPixel(g,c);const th=v.threshold+(mat[Math.floor(y/scale)%4][Math.floor(x/scale)%4]-7.5)*8;let o=g>th?255:0;if(v.invert)o=255-o;d[i]=d[i+1]=d[i+2]=o;}});
    } else if(selectedFx==='crt'){
      const snap=wctx.getImageData(0,0,W,H);if(v.rgbSplit){const s=Math.round(v.rgbSplit),src=snap.data,out=wctx.createImageData(W,H),d=out.data;for(let y=0;y<H;y++)for(let x=0;x<W;x++){const i=(y*W+x)*4,il=(y*W+Math.max(0,x-s))*4,ir=(y*W+Math.min(W-1,x+s))*4;d[i]=src[il];d[i+1]=src[i+1];d[i+2]=src[ir+2];d[i+3]=255;}wctx.putImageData(out,0,0);}pixels(d=>grain(d,v.noise,false));if(v.scanlines){wctx.fillStyle=`rgba(0,0,0,${v.scanlines/100*.55})`;for(let y=1;y<H;y+=3)wctx.fillRect(0,y,W,1);}compositeBlur(v.glow,.2);vignette(v.vignette);
    } else if(selectedFx==='datamosh'){
      if(prevValid){const bs=Math.max(4,v.blocks|0), amt=v.smear/100; for(let y=0;y<H;y+=bs){for(let x=0;x<W;x+=bs){if(Math.random()<amt*.45){const dx=(Math.random()-.5)*v.motion*.7,dy=(Math.random()-.5)*v.tear*.25;wctx.globalAlpha=.25+v.decay/140;wctx.drawImage(prevCanvas,x,y,bs,bs,x+dx,y+dy,bs+Math.random()*bs*1.8,bs);}}}wctx.globalAlpha=1;} pctx.clearRect(0,0,W,H);pctx.drawImage(work,0,0);prevValid=true;
    } else if(selectedFx==='feedback'){
      if(feedbackValid){const z=1+v.zoom/500,r=v.rotate*Math.PI/180;wctx.save();wctx.globalAlpha=v.decay/100;wctx.translate(W/2+v.shiftX,H/2+v.shiftY);wctx.rotate(r);wctx.scale(z,z);wctx.translate(-W/2,-H/2);wctx.globalCompositeOperation='screen';wctx.drawImage(feedbackCanvas,0,0);wctx.restore();}fctx.clearRect(0,0,W,H);fctx.drawImage(work,0,0);feedbackValid=true;
    } else if(selectedFx==='blob' || selectedFx==='particleBlob'){
      const im=wctx.getImageData(0,0,W,H),d=im.data,g=Math.max(8,v.grid||20);let blobs=[];for(let y=0;y<H;y+=g)for(let x=0;x<W;x+=g){let sum=0,n=0;for(let yy=y;yy<Math.min(H,y+g);yy+=3)for(let xx=x;xx<Math.min(W,x+g);xx+=3){let i=(yy*W+xx)*4;sum+=(d[i]+d[i+1]+d[i+2])/3;n++;}let hit=sum/n>(v.threshold||125);if(v.invert)hit=!hit;if(hit)blobs.push([x+g/2,y+g/2]);}
      if(selectedFx==='blob'){wctx.fillStyle=`rgba(0,0,0,${v.trails/180})`;wctx.fillRect(0,0,W,H);wctx.strokeStyle='#e8ffef';wctx.fillStyle='#e8ffef';wctx.lineWidth=Math.max(1,W/700);blobs.forEach((b,i)=>{if(v.boxes)wctx.strokeRect(b[0]-g/2,b[1]-g/2,g,g);if(i%4===0)wctx.fillRect(b[0]-1,b[1]-1,3,3);});}
      else {blobs.filter((_,i)=>i%Math.max(1,Math.floor(blobs.length/80))===0).forEach(b=>{for(let k=0;k<v.amount;k++)particles.push({x:b[0],y:b[1],vx:(Math.random()-.5)*3,vy:(Math.random()-.5)*3,life:v.life});});particles=particles.slice(-2500).filter(p=>--p.life>0);wctx.fillStyle=`rgba(0,0,0,${v.trails/180})`;wctx.fillRect(0,0,W,H);wctx.fillStyle='#fff';particles.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.vy-=.015;wctx.globalAlpha=Math.min(1,p.life/20);wctx.beginPath();wctx.arc(p.x,p.y,v.size,0,Math.PI*2);wctx.fill();});wctx.globalAlpha=1;}
    } else if(selectedFx==='fluid' || selectedFx==='smoke'){
      const src=document.createElement('canvas');src.width=W;src.height=H;src.getContext('2d').drawImage(work,0,0);wctx.clearRect(0,0,W,H);const t=performance.now()/1000*(v.speed/100+0.05), strips=80, sh=Math.ceil(H/strips)+1;for(let y=0;y<H;y+=sh){const phase=y/(v.scale||30)+t;const dx=Math.sin(phase*(v.waves||2))*v.strength*.35 + (selectedFx==='smoke'?Math.sin(phase*.37)*v.strength*.3+v.drift:0);wctx.drawImage(src,0,y,W,sh,dx,y,W,sh+1);}if(selectedFx==='fluid'&&v.chromatic){wctx.globalCompositeOperation='screen';wctx.globalAlpha=.16;wctx.drawImage(src,v.chromatic,0);wctx.globalAlpha=1;wctx.globalCompositeOperation='source-over';}if(selectedFx==='smoke'&&v.softness)compositeBlur(v.softness,.18);
    } else if(selectedFx==='vhs'){
      const src=document.createElement('canvas');src.width=W;src.height=H;src.getContext('2d').drawImage(work,0,0);wctx.clearRect(0,0,W,H);const band=4;for(let y=0;y<H;y+=band){let dx=Math.sin(y*.07+performance.now()*.004)*v.tracking*.12+(Math.random()-.5)*v.jitter*.08;wctx.drawImage(src,0,y,W,band,dx,y,W,band);}if(v.bleed){wctx.globalCompositeOperation='screen';wctx.globalAlpha=.14;wctx.drawImage(src,v.bleed,0);wctx.globalAlpha=1;wctx.globalCompositeOperation='source-over';}pixels(d=>grain(d,v.noise,false));wctx.fillStyle=`rgba(0,0,0,${v.scan/240})`;for(let y=1;y<H;y+=3)wctx.fillRect(0,y,W,1);wctx.fillStyle='rgba(255,255,255,.35)';for(let n=0;n<Math.floor(v.dropouts/8);n++){let y=Math.random()*H;wctx.fillRect(0,y,W*Math.random(),1+Math.random()*2);}
    } else if(selectedFx==='xerox'){
      pixels(d=>{const c=(v.contrast-50)/35;for(let i=0;i<d.length;i+=4){let g=.299*d[i]+.587*d[i+1]+.114*d[i+2];g=contrastPixel(g,c)+(Math.random()-.5)*v.grain;let o=g>v.threshold?246:12;if(v.invert)o=255-o;d[i]=d[i+1]=d[i+2]=o;}});wctx.fillStyle=`rgba(0,0,0,${v.streaks/350})`;for(let x=0;x<W;x+=Math.max(9,Math.round(W/47)))if(Math.random()<.35)wctx.fillRect(x,0,1,H);
    } else if(selectedFx==='halftone'){
      const im=wctx.getImageData(0,0,W,H),d=im.data,step=v.dots*2;wctx.fillStyle=`rgb(${245-v.paper*.25},${242-v.paper*.22},${232-v.paper*.12})`;wctx.fillRect(0,0,W,H);wctx.fillStyle='#111';for(let y=0;y<H;y+=step)for(let x=0;x<W;x+=step){let i=(Math.min(H-1,y)*W+Math.min(W-1,x))*4,g=(d[i]+d[i+1]+d[i+2])/765;if(v.invert)g=1-g;let r=(1-g)*step*.62*(.6+v.contrast/160);if(r>.4){wctx.beginPath();wctx.arc(x,y,r,0,Math.PI*2);wctx.fill();}}
    } else if(selectedFx==='riso'){
      pixels(d=>{for(let i=0;i<d.length;i+=4){let g=(d[i]+d[i+1]+d[i+2])/3+(Math.random()-.5)*v.grain;let k=g>v.threshold?1:0;d[i]=k?236:32;d[i+1]=k?226:68;d[i+2]=k?205:78;}});if(v.offset){wctx.globalCompositeOperation='multiply';wctx.globalAlpha=.22;wctx.drawImage(work,v.offset,0);wctx.globalAlpha=1;wctx.globalCompositeOperation='source-over';}
    } else if(selectedFx==='pixelSort'){
      const im=wctx.getImageData(0,0,W,H),d=im.data,L=v.length|0;if(!v.vertical){for(let y=0;y<H;y++)for(let x=0;x<W-L;x+=L){let i=(y*W+x)*4,g=(d[i]+d[i+1]+d[i+2])/3;if(g>v.threshold&&Math.random()<v.amount/100){let arr=[];for(let k=0;k<L;k++){let q=(y*W+x+k)*4;arr.push([d[q],d[q+1],d[q+2]])}arr.sort((a,b)=>a[0]+a[1]+a[2]-b[0]-b[1]-b[2]);arr.forEach((c,k)=>{let q=(y*W+x+k)*4;d[q]=c[0];d[q+1]=c[1];d[q+2]=c[2]})}}}wctx.putImageData(im,0,0);
    } else if(selectedFx==='cctv'){
      pixels(d=>{const c=(v.contrast-50)/45;for(let i=0;i<d.length;i+=4){let g=contrastPixel(.299*d[i]+.587*d[i+1]+.114*d[i+2],c);d[i]=clamp(g*.72);d[i+1]=clamp(g*.95);d[i+2]=clamp(g*.78);}grain(d,v.noise);});wctx.fillStyle=`rgba(0,0,0,${v.scan/220})`;for(let y=1;y<H;y+=3)wctx.fillRect(0,y,W,1);vignette(v.vignette);if(v.timestamp){wctx.fillStyle='#e9fff0';wctx.font=`${Math.max(12,W/48)}px monospace`;wctx.fillText(new Date().toLocaleString(),18,H-18);}
    } else if(selectedFx==='infrared'){
      pixels(d=>{const c=(v.contrast-50)/40;for(let i=0;i<d.length;i+=4){let g=contrastPixel(.299*d[i]+.587*d[i+1]+.114*d[i+2],c);if(v.invert)g=255-g;d[i]=d[i+1]=d[i+2]=g;}grain(d,v.grain);});compositeBlur(v.bloom,.32);
    } else if(selectedFx==='thermal'){
      pixels(d=>{const c=(v.contrast-50)/45,b=v.bands;for(let i=0;i<d.length;i+=4){let g=contrastPixel(.299*d[i]+.587*d[i+1]+.114*d[i+2],c)/255;if(v.invert)g=1-g;g=Math.round(g*(b-1))/(b-1);let r=clamp(255*Math.min(1,g*2)), bl=clamp(255*Math.min(1,(1-g)*2)), gr=clamp(255*(1-Math.abs(g-.5)*2));d[i]=r;d[i+1]=gr;d[i+2]=bl;}grain(d,v.noise,false);});
    } else if(selectedFx==='poster'){
      pixels(d=>{const n=v.levels-1,c=(v.contrast-50)/55;for(let i=0;i<d.length;i+=4)for(let k=0;k<3;k++)d[i+k]=Math.round(contrastPixel(d[i+k],c)/255*n)/n*255;grain(d,v.grain);});
    } else if(selectedFx==='ascii'){
      const im=wctx.getImageData(0,0,W,H),d=im.data,cell=v.cell,chars=' .:-=+*#%@';wctx.fillStyle=v.invert?'#fff':'#050706';wctx.fillRect(0,0,W,H);wctx.font=`${cell}px monospace`;wctx.textBaseline='top';for(let y=0;y<H;y+=cell)for(let x=0;x<W;x+=cell){let i=(Math.min(H-1,y)*W+Math.min(W-1,x))*4,g=(d[i]+d[i+1]+d[i+2])/765;if(v.invert)g=1-g;let ch=chars[Math.min(chars.length-1,Math.floor(g*chars.length))];wctx.fillStyle=v.green?`rgb(${30+g*80},${100+g*155},${50+g*80})`:(v.invert?'#111':'#eee');wctx.fillText(ch,x,y);}
    } else if(selectedFx==='fax'){
      pixels(d=>{for(let i=0;i<d.length;i+=4){let g=.299*d[i]+.587*d[i+1]+.114*d[i+2]+(Math.random()-.5)*v.noise;let o=g>v.threshold?245:15;d[i]=d[i+1]=d[i+2]=o;}});wctx.fillStyle=`rgba(0,0,0,${v.lines/250})`;for(let y=0;y<H;y+=4)wctx.fillRect(0,y,W,1);
    } else if(selectedFx==='newspaper'){
      const im=wctx.getImageData(0,0,W,H),d=im.data,step=v.dots*2;wctx.fillStyle=`rgb(${245-v.yellow*.12},${240-v.yellow*.18},${220-v.yellow*.2})`;wctx.fillRect(0,0,W,H);wctx.fillStyle='#161616';for(let y=0;y<H;y+=step)for(let x=0;x<W;x+=step){let i=(y*W+x)*4,g=(d[i]+d[i+1]+d[i+2])/765,r=(1-g)*step*.6;if(r>.3){wctx.beginPath();wctx.arc(x,y,r,0,Math.PI*2);wctx.fill();}}
    } else if(selectedFx==='scanner'){
      pixels(d=>{for(let i=0;i<d.length;i+=4){d[i]=clamp(d[i]-v.cool*.12);d[i+1]=clamp(d[i+1]+v.cool*.08);d[i+2]=clamp(d[i+2]+v.cool*.25);}grain(d,v.noise);});compositeBlur(v.glow,.2);let sy=(performance.now()/18)%H;let gg=wctx.createLinearGradient(0,sy-25,0,sy+25);gg.addColorStop(0,'rgba(255,255,255,0)');gg.addColorStop(.5,`rgba(220,255,255,${v.line/100*.7})`);gg.addColorStop(1,'rgba(255,255,255,0)');wctx.fillStyle=gg;wctx.fillRect(0,sy-25,W,50);
    } else if(selectedFx==='jpeg'){
      pixels(d=>{const n=v.poster-1;for(let i=0;i<d.length;i+=4)for(let k=0;k<3;k++)d[i+k]=Math.round(d[i+k]/255*n)/n*255;});const snap=document.createElement('canvas');snap.width=W;snap.height=H;snap.getContext('2d').drawImage(work,0,0);let bs=v.blocks;for(let y=0;y<H;y+=bs)for(let x=0;x<W;x+=bs)if(Math.random()<v.damage/180){let dx=(Math.random()-.5)*v.shift;wctx.drawImage(snap,x,y,bs,bs,x+dx,y,bs,bs);}
    } else if(selectedFx==='rgbFeedback'){
      if(feedbackValid){wctx.save();wctx.globalCompositeOperation='screen';wctx.globalAlpha=v.decay/100*.7;let z=1+v.zoom/500;wctx.translate(W/2,H/2);wctx.rotate(v.rotate*Math.PI/180);wctx.scale(z,z);wctx.translate(-W/2,-H/2);wctx.drawImage(feedbackCanvas,-v.split,0);wctx.globalAlpha*=.65;wctx.drawImage(feedbackCanvas,v.split,0);wctx.restore();}fctx.clearRect(0,0,W,H);fctx.drawImage(work,0,0);feedbackValid=true;
    } else if(selectedFx==='recursive'){
      const snap=document.createElement('canvas');snap.width=W;snap.height=H;snap.getContext('2d').drawImage(work,0,0);for(let i=1;i<=v.copies;i++){let s=1-i*v.zoom/200,ww=W*s,hh=H*s;wctx.save();wctx.globalAlpha=(v.decay/100)*(1-i/(v.copies+2));wctx.translate(W/2,H/2);wctx.rotate(i*v.rotate*Math.PI/180);wctx.drawImage(snap,-ww/2,-hh/2,ww,hh);wctx.restore();}
    } else if(selectedFx==='edgeGlow'){
      const im=wctx.getImageData(0,0,W,H),d=im.data,out=wctx.createImageData(W,H),o=out.data;for(let y=1;y<H-1;y++)for(let x=1;x<W-1;x++){let i=(y*W+x)*4,ir=(y*W+x+1)*4,id=((y+1)*W+x)*4,g=Math.abs((d[i]+d[i+1]+d[i+2])-(d[ir]+d[ir+1]+d[ir+2]))/3+Math.abs((d[i]+d[i+1]+d[i+2])-(d[id]+d[id+1]+d[id+2]))/3;let q=g>v.threshold?255:0;if(v.invert)q=255-q;o[i]=v.mono?q:q;o[i+1]=v.mono?q:clamp(q*.7);o[i+2]=v.mono?q:clamp(q*1.1);o[i+3]=255;}wctx.putImageData(out,0,0);compositeBlur(v.glow,.5);
    } else if(selectedFx==='liquid'){
      const src=document.createElement('canvas');src.width=W;src.height=H;src.getContext('2d').drawImage(work,0,0);wctx.clearRect(0,0,W,H);let bh=Math.max(2,Math.floor(H/v.bands)),t=performance.now()/1000*(.2+v.speed/80);for(let y=0;y<H;y+=bh){let dx=Math.sin(y/v.scale+t*2)*v.strength*.35;wctx.drawImage(src,0,y,W,bh,dx,y,W,bh+1);}
    } else if(selectedFx==='web04'){
      let px=Math.max(1,v.pixel);if(px>1){bctx.imageSmoothingEnabled=false;bctx.clearRect(0,0,W,H);bctx.drawImage(work,0,0,Math.ceil(W/px),Math.ceil(H/px));wctx.clearRect(0,0,W,H);wctx.imageSmoothingEnabled=false;wctx.drawImage(blurCanvas,0,0,Math.ceil(W/px),Math.ceil(H/px),0,0,W,H);wctx.imageSmoothingEnabled=true;}pixels(d=>{let c=(v.contrast-50)/55;for(let i=0;i<d.length;i+=4){d[i]=contrastPixel(d[i]-v.cool*.1,c);d[i+1]=contrastPixel(d[i+1],c);d[i+2]=contrastPixel(d[i+2]+v.cool*.2,c);}grain(d,v.noise,false);});if(v.timestamp){wctx.fillStyle='#fff';wctx.font=`${Math.max(11,W/55)}px monospace`;wctx.fillText(new Date().toLocaleDateString(),12,H-14);}
    } else if(selectedFx==='digiflash'){
      pixels(d=>{for(let i=0;i<d.length;i+=4){let lum=(d[i]+d[i+1]+d[i+2])/3,boost=v.flash/100*(80*(1-lum/255)+20);d[i]=clamp(d[i]+boost-v.cool*.08);d[i+1]=clamp(d[i+1]+boost);d[i+2]=clamp(d[i+2]+boost+v.cool*.15);}grain(d,v.noise,false);});compositeBlur(Math.max(0,30-v.sharp*.25),.12);vignette(v.vignette);
    } else if(selectedFx==='receipt'){
      pixels((d,w,h)=>{for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=(y*w+x)*4;let g=.299*d[i]+.587*d[i+1]+.114*d[i+2]+(Math.random()-.5)*v.grain;const bayer=((x&1)^(y&1))?10:-10;let o=g+bayer>v.threshold?248:24;if(v.invert)o=255-o;d[i]=clamp(o+v.paper*.3);d[i+1]=clamp(o+v.paper*.25);d[i+2]=clamp(o+v.paper*.18);}});if(v.streaks){wctx.fillStyle=`rgba(255,255,255,${v.streaks/100*.15})`;for(let x=7;x<W;x+=Math.max(17,Math.round(W/35)))wctx.fillRect(x,0,1,H);}
    }
    ctx.clearRect(0,0,W,H); ctx.drawImage(work,0,0);
  }

  function updateTime(){
    if(mediaType!=='video' || !Number.isFinite(video.duration)) return;
    seek.value=Math.round(video.currentTime/video.duration*1000)||0;
    $('#timeReadout').textContent=`${fmt(video.currentTime)} / ${fmt(video.duration)}`;
    $('#frameReadout').textContent=fmt(video.currentTime).replace(':',':00:');
    $('#previewState').textContent=video.paused?'PAUSED':'LIVE';
  }
  function fmt(s){s=Math.max(0,s||0);const m=Math.floor(s/60),ss=Math.floor(s%60);return `${String(m).padStart(2,'0')}:${String(ss).padStart(2,'0')}`;}

  $('#browseBtn').onclick=()=>fileInput.click();
  fileInput.onchange=e=>loadFile(e.target.files[0]);
  $('#dropZone').addEventListener('dragover',e=>{e.preventDefault();e.dataTransfer.dropEffect='copy';});
  $('#dropZone').addEventListener('drop',e=>{e.preventDefault();loadFile(e.dataTransfer.files[0]);});

  $('#playBtn').onclick=()=>{if(mediaType==='video'){video.play().then(()=>{startPreviewLoop(); if(selectedFx==='depth')requestDepth(true);});}};
  $('#stopBtn').onclick=()=>{if(mediaType==='video'){video.pause();video.currentTime=0;queuePreview(true);}};
  $('#rewindBtn').onclick=()=>{if(mediaType==='video'){video.currentTime=Math.max(0,video.currentTime-5);}};
  seek.oninput=()=>{if(mediaType==='video'&&Number.isFinite(video.duration)){video.currentTime=video.duration*(+seek.value/1000);}};
  video.addEventListener('seeked',()=>{queuePreview(true);});
  video.addEventListener('pause',()=>queuePreview(false));
  video.addEventListener('play',()=>{setState(selectedFx==='depth'?'DEPTH ONLINE':'INPUT ONLINE');previewDirty=true;startPreviewLoop();});

  $('#exportImage').onclick=()=>{
    if(!source()) return alert('Load an image or video first.');
    drawCurrent(false);
    const a=document.createElement('a');a.download=`signal-forge-${selectedFx}-${Date.now()}.png`;a.href=canvas.toDataURL('image/png');a.click();
  };
  $('#recordVideo').onclick=async()=>{
    if(mediaType!=='video') return alert('Load a video first.');
    if(recording&&recording.state==='recording'){recording.stop();video.pause();return;}
    const stream=canvas.captureStream(30);recordedChunks=[];let mime='video/webm;codecs=vp9';if(!MediaRecorder.isTypeSupported(mime))mime='video/webm';
    recording=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:10000000});
    recording.ondataavailable=e=>{if(e.data.size)recordedChunks.push(e.data);};
    recording.onstop=()=>{const blob=new Blob(recordedChunks,{type:'video/webm'}),a=document.createElement('a');a.download=`signal-forge-${selectedFx}-${Date.now()}.webm`;a.href=URL.createObjectURL(blob);a.click();$('#recordVideo').textContent='RECORD EFFECTED VIDEO';setState('INPUT ONLINE');};
    video.currentTime=0;await video.play();recording.start(1000);$('#recordVideo').textContent='STOP + SAVE RECORDING';setState('RECORDING');startPreviewLoop();
    video.addEventListener('ended',()=>{if(recording?.state==='recording')recording.stop();},{once:true});
  };

  renderControls();
  startPreviewLoop();
})();
