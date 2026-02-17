/* ═══════════════════════════════════════════
   Background Effect — Constellation Particles
   ═══════════════════════════════════════════ */
(function () {
  "use strict";
  if (document.documentElement.classList.contains("playground-page")) return;

  function init() {
    var canvas = document.createElement("canvas");
    canvas.id = "bg-constellation-canvas";
    document.body.prepend(canvas);

    var ctx = canvas.getContext("2d");
    var particles = [];
    var mouseX = -9999, mouseY = -9999;
    var MAX_DIST = 130;

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener("resize", resize);

    var count = Math.min(70, Math.floor((window.innerWidth * window.innerHeight) / 18000));
    for (var i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        r: 1.2 + Math.random() * 1.6
      });
    }

    document.addEventListener("mousemove", function (e) {
      mouseX = e.clientX;
      mouseY = e.clientY;
    });

    function animate() {
      requestAnimationFrame(animate);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
        var dx = mouseX - p.x;
        var dy = mouseY - p.y;
        var md = Math.sqrt(dx * dx + dy * dy);
        if (md < 200 && md > 1) {
          p.vx += (dx / md) * 0.015;
          p.vy += (dy / md) * 0.015;
        }
        var spd = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        if (spd > 0.8) {
          p.vx *= 0.8 / spd;
          p.vy *= 0.8 / spd;
        }
      }

      for (var i = 0; i < particles.length; i++) {
        for (var j = i + 1; j < particles.length; j++) {
          var dx = particles[i].x - particles[j].x;
          var dy = particles[i].y - particles[j].y;
          var d = Math.sqrt(dx * dx + dy * dy);
          if (d < MAX_DIST) {
            var alpha = (1 - d / MAX_DIST) * 0.08;
            ctx.strokeStyle = "rgba(11, 78, 138, " + alpha + ")";
            ctx.lineWidth = 0.6;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        ctx.fillStyle = "rgba(11, 78, 138, 0.06)";
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(11, 78, 138, 0.22)";
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }

      if (mouseX > 0 && mouseY > 0) {
        var grad = ctx.createRadialGradient(mouseX, mouseY, 0, mouseX, mouseY, 120);
        grad.addColorStop(0, "rgba(11, 78, 138, 0.04)");
        grad.addColorStop(1, "rgba(11, 78, 138, 0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(mouseX, mouseY, 120, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    animate();

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
