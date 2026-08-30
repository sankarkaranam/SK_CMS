// three-hero.js - Executive 3D Geometric Core & Ambient Particle Mesh (Light Mode Optimized)
(function () {
  function initHeroCanvas() {
    const canvas = document.getElementById('hero-canvas') || document.getElementById('hero-3d-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 0, height = 0;
    let animationFrameId;

    // Particle System Configuration
    const particles = [];
    const PARTICLE_COUNT = window.innerWidth < 768 ? 35 : 65;
    const CONNECT_DISTANCE = 130;

    // Mouse interaction coordinates
    const mouse = {
      x: null,
      y: null,
      radius: 160
    };

    // 3D Rotating Geometric Core nodes
    const nodes3D = [];
    const NODE_COUNT = 24;
    const SPHERE_RADIUS = 150;
    let angleX = 0;
    let angleY = 0;

    function resize() {
      if (!canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.offsetWidth;
      height = canvas.height = canvas.parentElement.offsetHeight;
    }

    class Particle {
      constructor() {
        this.reset();
      }

      reset() {
        this.x = Math.random() * (width || window.innerWidth);
        this.y = Math.random() * (height || window.innerHeight);
        this.vx = (Math.random() - 0.5) * 0.5;
        this.vy = (Math.random() - 0.5) * 0.5;
        this.size = Math.random() * 2 + 1;
        this.alpha = Math.random() * 0.35 + 0.15;
        this.color = Math.random() > 0.4 ? '#2563eb' : '#6366f1';
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;

        if (this.x < 0 || this.x > width) this.vx *= -1;
        if (this.y < 0 || this.y > height) this.vy *= -1;

        if (mouse.x !== null && mouse.y !== null) {
          const dx = mouse.x - this.x;
          const dy = mouse.y - this.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < mouse.radius && dist > 0) {
            const force = (mouse.radius - dist) / mouse.radius;
            this.x -= (dx / dist) * force * 2;
            this.y -= (dy / dist) * force * 2;
          }
        }
      }

      draw() {
        ctx.save();
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.globalAlpha = this.alpha;
        ctx.fill();
        ctx.restore();
      }
    }

    function init3DNodes() {
      nodes3D.length = 0;
      for (let i = 0; i < NODE_COUNT; i++) {
        const phi = Math.acos(-1 + (2 * i) / NODE_COUNT);
        const theta = Math.sqrt(NODE_COUNT * Math.PI) * phi;

        nodes3D.push({
          x: SPHERE_RADIUS * Math.cos(theta) * Math.sin(phi),
          y: SPHERE_RADIUS * Math.sin(theta) * Math.sin(phi),
          z: SPHERE_RADIUS * Math.cos(phi)
        });
      }
    }

    function initParticles() {
      particles.length = 0;
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        particles.push(new Particle());
      }
    }

    function drawMeshConnections() {
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < CONNECT_DISTANCE) {
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = '#2563eb';
            ctx.globalAlpha = (1 - dist / CONNECT_DISTANCE) * 0.12;
            ctx.lineWidth = 0.8;
            ctx.stroke();
            ctx.restore();
          }
        }
      }
    }

    function draw3DCore() {
      const centerX = width > 900 ? width * 0.78 : width * 0.5;
      const centerY = height * 0.48;

      angleX += 0.003;
      angleY += 0.004;

      const cosX = Math.cos(angleX);
      const sinX = Math.sin(angleX);
      const cosY = Math.cos(angleY);
      const sinY = Math.sin(angleY);

      const projected = nodes3D.map(node => {
        let y1 = node.y * cosX - node.z * sinX;
        let z1 = node.z * cosX + node.y * sinX;

        let x2 = node.x * cosY - z1 * sinY;
        let z2 = z1 * cosY + node.x * sinY;

        const fov = 380;
        const scale = fov / (fov + z2);

        return {
          x: centerX + x2 * scale,
          y: centerY + y1 * scale,
          scale: scale,
          z: z2
        };
      });

      // Draw wireframe interconnects
      for (let i = 0; i < projected.length; i++) {
        for (let j = i + 1; j < projected.length; j++) {
          const dx = projected[i].x - projected[j].x;
          const dy = projected[i].y - projected[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 100) {
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(projected[i].x, projected[i].y);
            ctx.lineTo(projected[j].x, projected[j].y);
            ctx.strokeStyle = '#3b82f6';
            ctx.globalAlpha = (1 - dist / 100) * 0.18;
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.restore();
          }
        }
      }

      // Draw nodes
      projected.forEach(p => {
        ctx.save();
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(1, 2.5 * p.scale), 0, Math.PI * 2);
        ctx.fillStyle = '#2563eb';
        ctx.globalAlpha = Math.max(0.1, 0.45 * p.scale);
        ctx.fill();
        ctx.restore();
      });
    }

    function animate() {
      ctx.clearRect(0, 0, width, height);

      particles.forEach(p => {
        p.update();
        p.draw();
      });

      drawMeshConnections();
      draw3DCore();

      animationFrameId = requestAnimationFrame(animate);
    }

    resize();
    init3DNodes();
    initParticles();
    animate();

    window.addEventListener('resize', () => {
      resize();
      initParticles();
    });

    window.addEventListener('mousemove', e => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    });

    window.addEventListener('mouseleave', () => {
      mouse.x = null;
      mouse.y = null;
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHeroCanvas);
  } else {
    initHeroCanvas();
  }
})();
