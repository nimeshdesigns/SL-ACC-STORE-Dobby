import React, { useEffect, useRef } from "react";

export default function InteractiveBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Particle class for fire emotes / ash embers
    interface Particle {
      x: number;
      y: number;
      size: number;
      speedX: number;
      speedY: number;
      alpha: number;
      color: string;
      rotation: number;
      rotationSpeed: number;
    }

    const particles: Particle[] = [];
    const colors = [
      "rgba(255, 90, 0, ", // neon orange
      "rgba(255, 190, 0, ", // neon gold
      "rgba(230, 20, 60, ", // fire red
    ];

    const createParticle = (initBottom = false): Particle => {
      const colorBase = colors[Math.floor(Math.random() * colors.length)];
      return {
        x: Math.random() * width,
        y: initBottom ? height + 10 : Math.random() * height,
        size: Math.random() * 4 + 1,
        speedX: (Math.random() - 0.5) * 1.5,
        speedY: -(Math.random() * 2 + 0.5),
        alpha: Math.random() * 0.5 + 0.2,
        color: colorBase,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.02,
      };
    };

    // Populate initially
    for (let i = 0; i < 80; i++) {
      particles.push(createParticle(false));
    }

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    // Animation Loop
    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw cyber matrix grid backdrop
      ctx.strokeStyle = "rgba(255, 100, 0, 0.03)";
      ctx.lineWidth = 1;
      const gridSize = 60;
      
      // Vertical grid lines
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      
      // Horizontal grid lines
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Render & update embers
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.y += p.speedY;
        p.x += p.speedX;
        p.rotation += p.rotationSpeed;

        // If particle moves off-screen or fades out
        if (p.y < -10 || p.x < -10 || p.x > width + 10) {
          particles[i] = createParticle(true);
          continue;
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = `${p.color}${p.alpha})`;
        
        ctx.shadowBlur = 10;
        ctx.shadowColor = p.color === colors[0] ? "#ff5a00" : p.color === colors[1] ? "#ffbe00" : "#e6143c";

        // Draw diamond shapes for general Free Fire aesthetic
        ctx.beginPath();
        ctx.moveTo(0, -p.size);
        ctx.lineTo(p.size, 0);
        ctx.lineTo(0, p.size);
        ctx.lineTo(-p.size, 0);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      id="live-gaming-background"
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-0 h-full w-full opacity-60 dark:opacity-90"
    />
  );
}
