import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

const W = 471;
const H = 570;
const GROUND = 22;

function App() {
  const canvasRef = useRef(null);
  const gameRef = useRef(null);
  const raf = useRef(0);
  const audioRef = useRef(null);
  const musicRef = useRef(null);
  const musicAudioRef = useRef(null);
  const gameOverAudioRef = useRef(null);
  const restartTimerRef = useRef(null);

  const [screen, setScreen] = useState('ready');
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(() =>
    Number(localStorage.getItem('cc-best') || 0)
  );
  const [sound, setSound] = useState(true);
  const [hero, setHero] = useState(0);
  const [level, setLevel] = useState(1);
  const [restartCountdown, setRestartCountdown] = useState(0);

  const uiRef = useRef({});
  uiRef.current = { screen, score, best, level, sound };

  const assets = useRef({
    bg: new Image(),
    bird: new Image(),
    hero: new Image(),
  });

  useEffect(() => {
    assets.current.bg.src = '/assets/gameplay-reference.png';
    assets.current.bird.src = '/assets/sujan angry.png';
    assets.current.hero.src = '/assets/game-hero-new.jpg';
  }, []);

  const init = () => {
    gameRef.current = {
      bird: { x: 100, y: 190, vy: 0 },
      pipes: [],
      frame: 0,
      score: 0,
      over: false,
      level: 1,
      started: false,
    };

    setScore(0);
    setLevel(1);
    setScreen('ready');
  };

  useEffect(() => {
    init();
  }, []);

  useEffect(() => {
    return () => {
      if (restartTimerRef.current) {
        clearInterval(restartTimerRef.current);
        restartTimerRef.current = null;
      }
    };
  }, []);

  const ensureAudio = () => {
    if (!audioRef.current) {
      audioRef.current = new (
        window.AudioContext || window.webkitAudioContext
      )();
    }

    if (audioRef.current.state === 'suspended') {
      audioRef.current.resume();
    }

    return audioRef.current;
  };

  const tone = (
    freq,
    duration,
    type = 'sine',
    gain = 0.04,
    delay = 0
  ) => {
    if (!uiRef.current.sound) return;

    try {
      const audio = ensureAudio();
      const oscillator = audio.createOscillator();
      const gainNode = audio.createGain();

      oscillator.type = type;
      oscillator.frequency.value = freq;

      gainNode.gain.setValueAtTime(
        gain,
        audio.currentTime + delay
      );
      gainNode.gain.exponentialRampToValueAtTime(
        0.001,
        audio.currentTime + delay + duration
      );

      oscillator.connect(gainNode);
      gainNode.connect(audio.destination);

      oscillator.start(audio.currentTime + delay);
      oscillator.stop(audio.currentTime + delay + duration);
    } catch {}
  };

  const startMusic = () => {
    if (!uiRef.current.sound) return;

    try {
      if (!musicAudioRef.current) {
        musicAudioRef.current = new Audio('/audio/kaki.mpeg');
        musicAudioRef.current.loop = true;
        musicAudioRef.current.volume = 0.45;
      }

      musicAudioRef.current.play().catch(() => {});
    } catch {}
  };

  const stopMusic = () => {
    if (musicRef.current) {
      clearInterval(musicRef.current);
      musicRef.current = null;
    }

    if (musicAudioRef.current) {
      musicAudioRef.current.pause();
      musicAudioRef.current.currentTime = 0;
    }
  };

  const restartGame = () => {
    if (restartTimerRef.current) {
      clearInterval(restartTimerRef.current);
      restartTimerRef.current = null;
    }

    setRestartCountdown(0);
    init();

    requestAnimationFrame(() => {
      const game = gameRef.current;
      if (!game) return;

      game.started = true;
      setScreen('playing');
      startMusic();
      game.bird.vy = -5.3;
      tone(640, 0.07, 'square', 0.025);
    });
  };

  const lose = () => {
    const game = gameRef.current;

    if (!game || game.over) return;

    game.over = true;
    setScreen('over');
    stopMusic();

    if (uiRef.current.sound) {
      try {
        if (!gameOverAudioRef.current) {
          gameOverAudioRef.current = new Audio('/audio/gameover.mpeg');
          gameOverAudioRef.current.volume = 0.8;
        }

        gameOverAudioRef.current.currentTime = 0;
        gameOverAudioRef.current.play().catch(() => {});
      } catch {}
    }

    if (restartTimerRef.current) {
      clearInterval(restartTimerRef.current);
    }

    setRestartCountdown(6);

    restartTimerRef.current = setInterval(() => {
      setRestartCountdown((previous) => {
        if (previous <= 1) {
          clearInterval(restartTimerRef.current);
          restartTimerRef.current = null;
          restartGame();
          return 0;
        }

        return previous - 1;
      });
    }, 1000);
  };

  const flap = () => {
    const game = gameRef.current;
    if (!game) return;

    // Ignore input while the game-over countdown is active.
    if (game.over || uiRef.current.screen === 'over') return;

    if (!game.started) {
      game.started = true;
      setScreen('playing');
      startMusic();
    }

    game.bird.vy = -5.3;
    tone(640, 0.07, 'square', 0.025);
  };

  useEffect(() => {
    const key = (event) => {
      if (event.code === 'Space' || event.code === 'ArrowUp') {
        event.preventDefault();
        flap();
      }
    };

    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    const drawPole = (c, x, y, w, h) => {
      if (h <= 0) return;

      c.save();
      c.shadowColor = '#ffb34c';
      c.shadowBlur = 8;
      c.fillStyle = '#5b260e';
      c.fillRect(x, y, w, h);
      c.shadowBlur = 0;

      const gradient = c.createLinearGradient(x, 0, x + w, 0);
      gradient.addColorStop(0, '#5b230b');
      gradient.addColorStop(0.25, '#ffcc5a');
      gradient.addColorStop(0.5, '#8b3b0d');
      gradient.addColorStop(0.8, '#ffc45c');
      gradient.addColorStop(1, '#4b1c0b');

      c.fillStyle = gradient;
      c.fillRect(x + 5, y, w - 10, h);

      c.fillStyle = '#ffdb77';

      for (let yy = y + 8; yy < y + h; yy += 28) {
        c.fillRect(x + 10, yy, w - 20, 3);
        c.fillRect(x + 17, yy + 5, 8, 4);
      }

      c.fillStyle = '#32160d';
      c.fillRect(x, y, w, 5);
      c.fillRect(x, y + h - 5, w, 5);
      c.restore();
    };

    const circleRect = (cx, cy, r, x, y, w, h) => {
      const px = Math.max(x, Math.min(cx, x + w));
      const py = Math.max(y, Math.min(cy, y + h));
      return (cx - px) ** 2 + (cy - py) ** 2 < r * r;
    };

    const drawFullCharacter = (ctx, image, x, y) => {
      if (!image.complete || !image.naturalWidth || !image.naturalHeight) {
        ctx.fillStyle = '#f9c46c';
        ctx.beginPath();
        ctx.arc(x, y, 22, 0, Math.PI * 2);
        ctx.fill();
        return;
      }

      const boxWidth = 70;
      const boxHeight = 92;
      const imageRatio = image.naturalWidth / image.naturalHeight;
      const boxRatio = boxWidth / boxHeight;

      let drawWidth;
      let drawHeight;

      if (imageRatio > boxRatio) {
        drawWidth = boxWidth;
        drawHeight = boxWidth / imageRatio;
      } else {
        drawHeight = boxHeight;
        drawWidth = boxHeight * imageRatio;
      }

      ctx.drawImage(
        image,
        x - drawWidth / 2,
        y - drawHeight / 2,
        drawWidth,
        drawHeight
      );
    };

    const draw = () => {
      const game = gameRef.current;
      if (!game) return;

      ctx.clearRect(0, 0, W, H);

      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, '#07558a');
      sky.addColorStop(0.48, '#f08b68');
      sky.addColorStop(1, '#ffcf88');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H);

      for (let i = 0; i < 7; i++) {
        const x = (i * 91 + 30) % W;
        const y = 35 + (i % 3) * 48;

        ctx.fillStyle = 'rgba(255,190,150,.32)';
        ctx.beginPath();
        ctx.ellipse(x, y, 38, 10, 0, 0, Math.PI * 2);
        ctx.ellipse(x + 20, y - 7, 24, 13, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = '#173c4b';
      ctx.fillRect(0, 355, W, 120);

      for (let i = 0; i < 8; i++) {
        const x = i * 68 - 15;

        ctx.fillStyle = i % 2 ? '#244c54' : '#1b414e';
        ctx.fillRect(x, 300 + (i % 3) * 25, 55, 160);

        ctx.fillStyle = '#ffbd75';

        for (let j = 0; j < 3; j++) {
          ctx.fillRect(
            x + 9 + j * 14,
            320 + (i % 3) * 25,
            5,
            12
          );
        }
      }

      ctx.fillStyle = '#9c4e2d';
      ctx.fillRect(0, 125, 105, 340);
      ctx.fillStyle = '#f8b66b';
      ctx.fillRect(12, 145, 80, 280);
      ctx.fillStyle = '#753d2c';
      ctx.fillRect(20, 180, 18, 35);
      ctx.fillRect(58, 180, 18, 35);
      ctx.fillRect(20, 240, 18, 35);
      ctx.fillRect(58, 240, 18, 35);
      ctx.fillStyle = '#ffcf85';
      ctx.fillRect(0, 410, 125, 10);

      ctx.fillStyle = '#2a4546';
      ctx.fillRect(0, H - GROUND, W, GROUND);
      ctx.fillStyle = '#ffbb69';
      ctx.fillRect(0, H - GROUND, W, 3);

      game.pipes.forEach((pipe) => {
        drawPole(ctx, pipe.x, 0, 42, pipe.top);
        drawPole(
          ctx,
          pipe.x,
          pipe.top + pipe.gap,
          42,
          H - GROUND - (pipe.top + pipe.gap)
        );
      });

      ctx.save();
      ctx.translate(game.bird.x, game.bird.y);
      ctx.rotate(
        Math.max(-0.35, Math.min(0.6, game.bird.vy * 0.07))
      );
      drawFullCharacter(ctx, assets.current.bird, 0, 0);
      ctx.restore();

      if (game.started && !game.over) {
        game.frame++;
        game.bird.vy = Math.min(7, game.bird.vy + 0.27);
        game.bird.y += game.bird.vy;

        if (game.frame % 92 === 1) {
          const top = 65 + Math.random() * 220;
          game.pipes.push({
            x: W + 10,
            top,
            gap: 170,
            passed: false,
          });
        }

        game.pipes.forEach((pipe) => {
          pipe.x -= 2.5 + game.score * 0.025;

          if (!pipe.passed && pipe.x + 42 < game.bird.x) {
            pipe.passed = true;
            game.score++;
            setScore(game.score);

            if (game.score > uiRef.current.best) {
              setBest(game.score);
              localStorage.setItem('cc-best', game.score);
            }

            const newLevel = 1 + Math.floor(game.score / 10);

            if (newLevel !== game.level) {
              game.level = newLevel;
              setLevel(newLevel);
              tone(800, 0.12, 'triangle');
            }
          }
        });

        game.pipes = game.pipes.filter((pipe) => pipe.x > -50);

        if (
          game.bird.y > H - GROUND - 24 ||
          game.bird.y < 10
        ) {
          lose();
        }

        game.pipes.forEach((pipe) => {
          if (
            circleRect(game.bird.x, game.bird.y, 19, pipe.x, 0, 42, pipe.top) ||
            circleRect(
              game.bird.x,
              game.bird.y,
              19,
              pipe.x,
              pipe.top + pipe.gap,
              42,
              H - GROUND - pipe.top - pipe.gap
            )
          ) {
            lose();
          }
        });
      }

      ctx.fillStyle = 'white';
      ctx.font = 'bold 16px system-ui';
      ctx.shadowColor = '#14283a';
      ctx.shadowBlur = 4;
      ctx.fillText(`Level ${uiRef.current.level}`, 18, 30);

      ctx.font = 'bold 48px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(uiRef.current.score, W / 2, 78);
      ctx.textAlign = 'left';
      ctx.shadowBlur = 0;

      if (uiRef.current.screen === 'ready') {
        ctx.fillStyle = '#0c2038aa';
        ctx.fillRect(30, 215, W - 60, 110);

        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.font = 'bold 25px system-ui';
        ctx.fillText('Ready?', W / 2, 260);

        ctx.font = '16px system-ui';
        ctx.fillText('Tap or press Space to flap', W / 2, 292);
        ctx.textAlign = 'left';
      }

      raf.current = requestAnimationFrame(draw);
    };

    draw();

    return () => cancelAnimationFrame(raf.current);
  }, []);

  return (
    <main className="page">
      <section className="game-shell">
        <header>
          <span className="brand">
            CAMPUS <b>CRUSH</b>
          </span>

          <button
            className="sound"
            onClick={() => {
              setSound((value) => !value);

              if (sound) {
                stopMusic();
              } else if (
                gameRef.current?.started &&
                !gameRef.current?.over
              ) {
                startMusic();
              }
            }}
          >
            ♫ {sound ? 'Sound On' : 'Sound Off'}
          </button>
        </header>

        <div className="stage">
          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            onPointerDown={flap}
          />

          {screen === 'over' && (
            <div className="overlay">
              <div className="modal">
                <h1>Scene cut!</h1>
                <h3>చిన్న బ్రేక్. మరి ఫ్లై!</h3>
                <p>
                  You reached the ground.
                  <br />
                  Restarting in {restartCountdown} seconds...
                </p>

                <div className="hero-box">
                  <img src="/assets/game-hero-new.jpg" alt="Hero" />
                </div>

                <div className="stats">
                  <div>
                    Score
                    <strong>{score}</strong>
                  </div>
                  <div>
                    Best
                    <strong>{best}</strong>
                  </div>
                </div>

                <button className="play" onClick={restartGame}>
                  Restart Now
                </button>

                <button
                  className="switch"
                  onClick={() => {
                    setHero((value) => 1 - value);
                  }}
                >
                  Switch hero
                </button>
              </div>
            </div>
          )}
        </div>

        <footer>
          <span>Tap / Click / Space</span>
          <span>Level {level}</span>
        </footer>
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
