/* ═══════════════════════════════════════════
   Background Effect — Constellation Particles
   (Mobile-optimized)
   ═══════════════════════════════════════════ */
(function () {
  "use strict";
  if (document.documentElement.classList.contains("playground-page")) return;

  var isMobile = window.innerWidth <= 900 || "ontouchstart" in window;

  function init() {
    var canvas = document.createElement("canvas");
    canvas.id = "bg-constellation-canvas";
    document.body.prepend(canvas);

    var ctx = canvas.getContext("2d");
    var particles = [];
    var mouseX = -9999, mouseY = -9999;
    var MAX_DIST = isMobile ? 110 : 130;
    var MAX_DIST_SQ = MAX_DIST * MAX_DIST;

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener("resize", resize);

    var count = isMobile
      ? Math.min(25, Math.floor((window.innerWidth * window.innerHeight) / 30000))
      : Math.min(70, Math.floor((window.innerWidth * window.innerHeight) / 18000));

    for (var i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        r: 1.2 + Math.random() * 1.6
      });
    }

    if (!isMobile) {
      document.addEventListener("mousemove", function (e) {
        mouseX = e.clientX;
        mouseY = e.clientY;
      });
    }

    var lastFrame = 0;
    var interval = isMobile ? 33 : 0; // ~30fps on mobile

    function animate(t) {
      requestAnimationFrame(animate);
      if (t - lastFrame < interval) return;
      lastFrame = t;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
        if (!isMobile) {
          var dx = mouseX - p.x;
          var dy = mouseY - p.y;
          var md = dx * dx + dy * dy;
          if (md < 40000 && md > 1) {
            var mdi = 1 / Math.sqrt(md);
            p.vx += dx * mdi * 0.015;
            p.vy += dy * mdi * 0.015;
          }
        }
        var spd = p.vx * p.vx + p.vy * p.vy;
        if (spd > 0.64) {
          var f = 0.8 / Math.sqrt(spd);
          p.vx *= f;
          p.vy *= f;
        }
      }

      // Draw connections (squared distance, no sqrt)
      ctx.lineWidth = 0.6;
      for (var i = 0; i < particles.length; i++) {
        for (var j = i + 1; j < particles.length; j++) {
          var dx = particles[i].x - particles[j].x;
          var dy = particles[i].y - particles[j].y;
          var dsq = dx * dx + dy * dy;
          if (dsq < MAX_DIST_SQ) {
            var d = Math.sqrt(dsq);
            var alpha = (1 - d / MAX_DIST) * 0.08;
            ctx.strokeStyle = "rgba(11,78,138," + alpha + ")";
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      // Draw dots (skip glow on mobile)
      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        if (!isMobile) {
          ctx.fillStyle = "rgba(11,78,138,0.06)";
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r * 3, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = "rgba(11,78,138,0.22)";
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Mouse halo (desktop only)
      if (!isMobile && mouseX > 0 && mouseY > 0) {
        var grad = ctx.createRadialGradient(mouseX, mouseY, 0, mouseX, mouseY, 120);
        grad.addColorStop(0, "rgba(11,78,138,0.04)");
        grad.addColorStop(1, "rgba(11,78,138,0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(mouseX, mouseY, 120, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    requestAnimationFrame(animate);

    // Scroll reveal
    var targets = document.querySelectorAll("section h2, section h3, .publications ol.bibliography li, .post-list-item");
    if (targets.length) {
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.15, rootMargin: "0px 0px -40px 0px" });
      targets.forEach(function (el) {
        el.classList.add("scroll-reveal");
        observer.observe(el);
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
