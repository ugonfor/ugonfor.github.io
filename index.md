---
layout: default
hide_header: true
extra_head: |
  <script>document.documentElement.classList.add('landing-page');</script>
  <link rel="stylesheet" href="/assets/css/landing.css">
---

<div class="landing-hero">
  <canvas id="hero-geo" class="hero-geo-canvas"></canvas>
  <h1 class="landing-slogan">Dreaming!</h1>
  <p class="landing-subtitle">Hyogon Ryu — Applied AI Research Engineer</p>
  <div class="landing-scroll-hint">
    <span>SCROLL</span>
    <div class="landing-scroll-arrow"></div>
  </div>
</div>

<script>
(function(){
  var c = document.getElementById("hero-geo");
  if(!c) return;
  var ctx = c.getContext("2d");
  var W, H, cx, cy, mx=0.5, my=0.5;
  var PHI = (1+Math.sqrt(5))/2;
  var mob = window.innerWidth <= 900 || "ontouchstart" in window;

  var rawVerts = [
    [-1,PHI,0],[1,PHI,0],[-1,-PHI,0],[1,-PHI,0],
    [0,-1,PHI],[0,1,PHI],[0,-1,-PHI],[0,1,-PHI],
    [PHI,0,-1],[PHI,0,1],[-PHI,0,-1],[-PHI,0,1]
  ];
  var edges = [
    [0,1],[0,5],[0,7],[0,10],[0,11],[1,5],[1,7],[1,8],[1,9],
    [2,3],[2,4],[2,6],[2,10],[2,11],[3,4],[3,6],[3,8],[3,9],
    [4,5],[4,9],[4,11],[5,9],[5,11],[6,7],[6,8],[6,10],
    [7,8],[7,10],[8,9],[10,11]
  ];
  var len = Math.sqrt(1+PHI*PHI);
  for(var i=0;i<rawVerts.length;i++){
    rawVerts[i][0]/=len; rawVerts[i][1]/=len; rawVerts[i][2]/=len;
  }

  // Mobile: 2 shells, fewer particles, no gradients
  var shells = mob
    ? [
        { scale: 0.5, speed: 0.00025, xSpeed: 0.00008, alpha: 0.16, lineW: 0.7 },
        { scale: 1.2, speed: 0.0003,  xSpeed: 0.0001,  alpha: 0.10, lineW: 0.9 }
      ]
    : [
        { scale: 0.45, speed: 0.00025, xSpeed: 0.00008, alpha: 0.18, lineW: 0.6 },
        { scale: 1.0,  speed: 0.0003,  xSpeed: 0.0001,  alpha: 0.14, lineW: 1.0 },
        { scale: 1.6,  speed: 0.00015, xSpeed: 0.00012, alpha: 0.06, lineW: 0.5 }
      ];

  var pCount = mob ? 15 : 50;
  var particles = [];
  for(var i=0;i<pCount;i++){
    particles.push({
      a: Math.random()*Math.PI*2,
      b: (Math.random()-0.5)*Math.PI,
      r: 0.6+Math.random()*1.8,
      speed: 0.001+Math.random()*0.005,
      drift: (Math.random()-0.5)*0.002,
      size: 0.8+Math.random()*2,
      gold: Math.random() < 0.35
    });
  }

  var pulses = [];
  var lastPulse = 0;
  var heroVisible = true;

  function resize(){
    var rect = c.parentElement.getBoundingClientRect();
    var dpr = mob ? 1 : Math.min(window.devicePixelRatio||1, 2);
    W = rect.width; H = rect.height;
    c.width = W*dpr; c.height = H*dpr;
    c.style.width = W+"px"; c.style.height = H+"px";
    ctx.setTransform(dpr,0,0,dpr,0,0);
    cx = W/2; cy = H/2;
  }
  resize();
  window.addEventListener("resize", resize);

  // Pause when scrolled away
  var obs = new IntersectionObserver(function(entries){
    heroVisible = entries[0].isIntersecting;
  }, { threshold: 0.05 });
  obs.observe(c.parentElement);

  if(!mob){
    document.addEventListener("mousemove", function(e){
      var rect = c.getBoundingClientRect();
      mx = (e.clientX - rect.left)/W;
      my = (e.clientY - rect.top)/H;
    });
  }

  function rotY(v,a){ var cs=Math.cos(a),sn=Math.sin(a); return [v[0]*cs+v[2]*sn, v[1], -v[0]*sn+v[2]*cs]; }
  function rotX(v,a){ var cs=Math.cos(a),sn=Math.sin(a); return [v[0], v[1]*cs-v[2]*sn, v[1]*sn+v[2]*cs]; }
  function rotZ(v,a){ var cs=Math.cos(a),sn=Math.sin(a); return [v[0]*cs-v[1]*sn, v[0]*sn+v[1]*cs, v[2]]; }

  var lastFrame = 0;
  var interval = mob ? 33 : 0;

  function draw(t){
    requestAnimationFrame(draw);
    if(!heroVisible) return;
    if(t - lastFrame < interval) return;
    lastFrame = t;

    ctx.clearRect(0,0,W,H);

    var tiltX = mob ? 0 : (my-0.5)*0.5;
    var tiltY = mob ? 0 : (mx-0.5)*0.7;
    var baseScale = Math.min(W,H)*0.18;
    var breath = 1 + Math.sin(t*0.0008)*0.05;

    // Pulse rings
    if(t - lastPulse > 4000){ lastPulse = t; pulses.push({ born: t }); }
    if(pulses.length > 3) pulses.shift();
    for(var i=pulses.length-1;i>=0;i--){
      var age = (t - pulses[i].born) / 3000;
      if(age > 1){ pulses.splice(i,1); continue; }
      ctx.strokeStyle = "rgba(11,78,138,"+((1-age)*0.08)+")";
      ctx.lineWidth = 1.2*(1-age);
      ctx.beginPath(); ctx.arc(cx,cy, age*baseScale*2.2, 0, Math.PI*2); ctx.stroke();
    }

    // Shells
    var allProj = [];
    for(var si=0;si<shells.length;si++){
      var sh = shells[si];
      var s = baseScale * sh.scale * breath;
      var aY = t * sh.speed * (si%2===0?1:-1);
      var aX = t * sh.xSpeed;

      var proj = [];
      for(var i=0;i<rawVerts.length;i++){
        var v = mob
          ? rotY(rotX(rawVerts[i], aX), aY)
          : rotZ(rotY(rotX(rawVerts[i], aX+tiltX), aY+tiltY), si*0.4);
        var d = 0.5+v[2]*0.5;
        proj.push({ x:cx+v[0]*s, y:cy+v[1]*s, d:d });
      }

      // Edges
      for(var i=0;i<edges.length;i++){
        var a=proj[edges[i][0]], b=proj[edges[i][1]];
        ctx.strokeStyle = "rgba(11,78,138,"+((a.d+b.d)*0.5*sh.alpha)+")";
        ctx.lineWidth = sh.lineW;
        ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke();
      }

      // Vertices
      for(var i=0;i<proj.length;i++){
        var p = proj[i];
        if(!mob){
          var gr = (4+si*2)*p.d;
          var grd = ctx.createRadialGradient(p.x,p.y,0, p.x,p.y, gr);
          grd.addColorStop(0, "rgba(11,78,138,"+(p.d*sh.alpha*0.6)+")");
          grd.addColorStop(1, "rgba(11,78,138,0)");
          ctx.fillStyle = grd;
          ctx.beginPath(); ctx.arc(p.x,p.y, gr, 0, Math.PI*2); ctx.fill();
        }
        ctx.fillStyle = "rgba(11,78,138,"+(p.d*sh.alpha*1.8)+")";
        ctx.beginPath(); ctx.arc(p.x,p.y, (1.2+si*0.6)*p.d, 0, Math.PI*2); ctx.fill();
      }
      allProj.push(proj);
    }

    // Cross-shell connections (desktop only)
    if(!mob && allProj.length>=2){
      ctx.setLineDash([3,4]);
      ctx.lineWidth = 0.4;
      for(var i=0;i<allProj[0].length;i++){
        var a=allProj[0][i], b=allProj[1][i];
        var dx=a.x-b.x, dy=a.y-b.y, dd=dx*dx+dy*dy;
        var lim=baseScale*0.8;
        if(dd < lim*lim){
          ctx.strokeStyle = "rgba(11,78,138,"+((1-Math.sqrt(dd)/lim)*0.04)+")";
          ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke();
        }
      }
      ctx.setLineDash([]);
    }

    // Particles
    for(var i=0;i<particles.length;i++){
      var o = particles[i];
      o.a += o.speed; o.b += o.drift;
      var ox=Math.cos(o.a)*Math.cos(o.b)*o.r, oy=Math.sin(o.b)*o.r, oz=Math.sin(o.a)*Math.cos(o.b)*o.r*0.7;
      var rv = rotY(rotX([ox,oy,oz], t*0.0001+tiltX), t*0.0003+tiltY);
      var s2=baseScale*breath, px=cx+rv[0]*s2, py=cy+rv[1]*s2;
      var dd=0.5+rv[2]*0.5;
      var flicker = 0.5+Math.sin(t*0.004+i*2.3)*0.5;
      var al = dd*flicker*0.15;
      var col = o.gold?"207,143,46":"11,78,138";
      if(!mob){
        var pgr = ctx.createRadialGradient(px,py,0, px,py, o.size*3*dd);
        pgr.addColorStop(0,"rgba("+col+","+al+")");
        pgr.addColorStop(1,"rgba("+col+",0)");
        ctx.fillStyle = pgr;
        ctx.beginPath(); ctx.arc(px,py, o.size*3*dd, 0, Math.PI*2); ctx.fill();
      }
      ctx.fillStyle = "rgba("+col+","+(al*2.5)+")";
      ctx.beginPath(); ctx.arc(px,py, o.size*dd, 0, Math.PI*2); ctx.fill();
    }
  }
  requestAnimationFrame(draw);
})();
</script>

<div class="landing-cards-section">
  <div class="landing-cards">
    <a class="landing-card" href="/about">
      <img class="landing-card-illust" src="/assets/img/card-about.png" alt="About Me" />
      <h2 class="landing-card-title">About Me</h2>
      <p class="landing-card-desc">Research, publications, awards, and career background.</p>
    </a>
    <a class="landing-card" href="/playground">
      <img class="landing-card-illust" src="/assets/img/card-playground.png" alt="Playground" />
      <h2 class="landing-card-title">Playground</h2>
      <p class="landing-card-desc">A tiny open world where AI NPCs live. Step in and explore.</p>
    </a>
    <a class="landing-card" href="/posts">
      <img class="landing-card-illust" src="/assets/img/card-posts.png" alt="Posts" />
      <h2 class="landing-card-title">Posts</h2>
      <p class="landing-card-desc">Dev logs, tech reports, and roadmaps.</p>
    </a>
  </div>
</div>
