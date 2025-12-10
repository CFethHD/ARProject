import {
  World,
  SessionMode,
  Mesh,
  MeshStandardMaterial,
  MeshBasicMaterial,
  PlaneGeometry,
  SphereGeometry,
  BoxGeometry,
  Group,
  CanvasTexture,
  PanelUI,
  ScreenSpace,
} from '@iwsdk/core';

// Simple world with WebXR (AR)
World.create(document.getElementById('scene-container'), {
  xr: {
    sessionMode: SessionMode.ImmersiveAR,
    offer: 'always',
  },
}).then((world) => {
  // MESSAGE BOARD 
  const msgWidth = 1024;
  const msgHeight = 256;

  const msgCanvas = document.createElement('canvas');
  msgCanvas.width = msgWidth;
  msgCanvas.height = msgHeight;
  const msgCtx = msgCanvas.getContext('2d');

  const msgTexture = new CanvasTexture(msgCanvas);
  const msgMesh = new Mesh(
    new PlaneGeometry(1.0, 0.25),
    new MeshBasicMaterial({ map: msgTexture, transparent: true })
  );
  // height
  msgMesh.position.set(0, 0.4, -4.0);

  const msgEntity = world.createTransformEntity(msgMesh);
  msgEntity.addComponent(PanelUI, {
    screenSpace: ScreenSpace.World,
  });

  let score = 0;
  let bestScore = 0;
  let streak = 0;
  let messageTimeoutId = null;

  function renderHud(mainText) {
    if (!msgCtx) return;

    msgCtx.clearRect(0, 0, msgWidth, msgHeight);

    // background
    msgCtx.fillStyle = '#ffffff';
    msgCtx.fillRect(0, 0, msgWidth, msgHeight);

    msgCtx.fillStyle = '#111111';
    msgCtx.textAlign = 'center';
    msgCtx.textBaseline = 'middle';

    const centerX = msgWidth / 2;
    const centerY = msgHeight / 2;

    const scoreText = 'Score: ' + score;
    const streakText = 'Streak: ' + streak;
    const bestText = 'Best: ' + bestScore;

    if (mainText) {
      msgCtx.font = 'bold 96px sans-serif';
      msgCtx.fillText(mainText, centerX, centerY - 60);

      msgCtx.font = 'bold 70px sans-serif';
      msgCtx.fillText(scoreText, centerX, centerY + 10);

      msgCtx.font = 'bold 60px sans-serif';
      msgCtx.fillText(`${streakText} | ${bestText}`, centerX, centerY + 80);
    } else {
      msgCtx.font = 'bold 90px sans-serif';
      msgCtx.fillText(scoreText, centerX, centerY - 30);

      msgCtx.font = 'bold 70px sans-serif';
      msgCtx.fillText(`${streakText} | ${bestText}`, centerX, centerY + 50);
    }

    msgTexture.needsUpdate = true;
  }

  function showMessage(text, durationMs) {
    if (messageTimeoutId !== null) {
      clearTimeout(messageTimeoutId);
      messageTimeoutId = null;
    }

    renderHud(text);

    if (text) {
      messageTimeoutId = setTimeout(() => {
        renderHud('');
        messageTimeoutId = null;
      }, durationMs || 1200);
    }
  }

  // initial HUD
  renderHud('');

  // BOARD GROUP
  const boardRoot = new Group();
  world.createTransformEntity(boardRoot);

  // Put the board in front of the player, slightly tilted, but lower to floor
  boardRoot.position.set(0, 0.2, -2.0);
  const baseTiltX = -Math.PI / 4; // base tilt towards player
  boardRoot.rotation.set(baseTiltX, 0, 0);

  // FIELD 
  const fieldWidth = 1.5;
  const fieldHeight = 4.0;

  const fieldMesh = new Mesh(
    new PlaneGeometry(fieldWidth, fieldHeight),
    new MeshStandardMaterial({ color: '#0b6623' })
  );
  fieldMesh.rotation.x = -Math.PI / 2; // horizontal
  boardRoot.add(fieldMesh);

  // low borders around field
  const wallHeight = 0.08;
  const wallThickness = 0.03;
  const wallMaterial = new MeshStandardMaterial({ color: '#222222' });

  const backWall = new Mesh(
    new BoxGeometry(fieldWidth, wallHeight, wallThickness),
    wallMaterial
  );
  backWall.position.set(0, wallHeight / 2, -fieldHeight / 2 - wallThickness / 2);
  boardRoot.add(backWall);

  const leftWall = new Mesh(
    new BoxGeometry(wallThickness, wallHeight, fieldHeight),
    wallMaterial
  );
  leftWall.position.set(-fieldWidth / 2 - wallThickness / 2, wallHeight / 2, 0);
  boardRoot.add(leftWall);

  const rightWall = new Mesh(
    new BoxGeometry(wallThickness, wallHeight, fieldHeight),
    wallMaterial
  );
  rightWall.position.set(fieldWidth / 2 + wallThickness / 2, wallHeight / 2, 0);
  boardRoot.add(rightWall);

  // center + goal box
  function makeLine(width, depth) {
    const line = new Mesh(
      new PlaneGeometry(width, depth),
      new MeshBasicMaterial({ color: 'white' })
    );
    line.rotation.x = -Math.PI / 2;
    line.position.y = 0.002;
    return line;
  }

  // Center line
  const centerLine = makeLine(fieldWidth * 0.9, 0.01);
  centerLine.position.z = 0;
  boardRoot.add(centerLine);

  // "Penalty box" near goal
  const boxWidth = 0.9;
  const boxDepth = 0.01;
  const boxFront = makeLine(boxWidth, boxDepth);
  boxFront.position.z = -fieldHeight / 4;
  boardRoot.add(boxFront);

  const boxLeft = makeLine(boxDepth, fieldHeight / 4);
  boxLeft.position.set(-boxWidth / 2, 0.002, -fieldHeight / 4 - (fieldHeight / 8));
  boxLeft.rotation.y = Math.PI / 2;
  boardRoot.add(boxLeft);

  const boxRight = makeLine(boxDepth, fieldHeight / 4);
  boxRight.position.set(boxWidth / 2, 0.002, -fieldHeight / 4 - (fieldHeight / 8));
  boxRight.rotation.y = Math.PI / 2;
  boardRoot.add(boxRight);

  // --- GOAL (yellow strip at far/top edge) ---
  const goalDepth = 0.25;
  const goalWidth = 0.8;

  const goalMesh = new Mesh(
    new BoxGeometry(goalWidth, 0.02, goalDepth),
    new MeshStandardMaterial({ color: 'yellow' })
  );
  goalMesh.position.set(0, 0.01, -fieldHeight / 2 + goalDepth / 2);
  boardRoot.add(goalMesh);

  // BALL
  const ballRadius = 0.06;
  const ballMesh = new Mesh(
    new SphereGeometry(ballRadius, 32, 32),
    new MeshStandardMaterial({ color: 'white' })
  );
  ballMesh.position.set(
    -fieldWidth / 2 + ballRadius * 2,
    ballRadius,
    fieldHeight / 2 - ballRadius * 2
  );
  boardRoot.add(ballMesh);

  function resetBall() {
    ballMesh.position.set(
      -fieldWidth / 2 + ballRadius * 2,
      ballRadius,
      fieldHeight / 2 - ballRadius * 2
    );
    state.vx = 0;
    state.vz = 0;
  }

  // STRIKER 
  const strikerWidth = 0.35;
  const strikerDepth = 0.07;
  const strikerHeight = 0.04;

  const strikerMesh = new Mesh(
    new BoxGeometry(strikerWidth, strikerHeight, strikerDepth),
    new MeshStandardMaterial({ color: '#ff3333' })
  );
  strikerMesh.position.set(
    0,
    strikerHeight / 2,
    fieldHeight / 2 - 0.6
  );
  boardRoot.add(strikerMesh);

  function resetStriker() {
    strikerMesh.position.set(
      0,
      strikerHeight / 2,
      fieldHeight / 2 - 0.6
    );
  }

  // OBSTACLES
  const obstacleMaterial = new MeshStandardMaterial({ color: '#333333' });

  const obstacle1 = new Mesh(
    new BoxGeometry(0.25, 0.05, 0.25),
    obstacleMaterial
  );
  obstacle1.position.set(-0.35, 0.025, 0);
  boardRoot.add(obstacle1);

  const obstacle2 = new Mesh(
    new BoxGeometry(0.25, 0.05, 0.25),
    obstacleMaterial
  );
  obstacle2.position.set(0.35, 0.025, -0.4);
  boardRoot.add(obstacle2);

  // Let the "defenders" gently oscillate
  let obstacleTime = 0;

  // tilt + rolling physics
  const state = {
    tiltX: 0, 
    tiltZ: 0, 
    vx: 0,
    vz: 0,
  };

  // tilting with keys
  const tiltKeys = { left: false, right: false, up: false, down: false };
  const strikerKeys = { left: false, right: false, up: false, down: false };

  window.addEventListener('keydown', (e) => {
    if (e.code === 'ArrowLeft') tiltKeys.left = true;
    if (e.code === 'ArrowRight') tiltKeys.right = true;
    if (e.code === 'ArrowUp') tiltKeys.up = true;
    if (e.code === 'ArrowDown') tiltKeys.down = true;

    if (e.code === 'KeyA') strikerKeys.left = true;
    if (e.code === 'KeyD') strikerKeys.right = true;
    if (e.code === 'KeyW') strikerKeys.up = true;
    if (e.code === 'KeyS') strikerKeys.down = true;
  });

  window.addEventListener('keyup', (e) => {
    if (e.code === 'ArrowLeft') tiltKeys.left = false;
    if (e.code === 'ArrowRight') tiltKeys.right = false;
    if (e.code === 'ArrowUp') tiltKeys.up = false;
    if (e.code === 'ArrowDown') tiltKeys.down = false;

    if (e.code === 'KeyA') strikerKeys.left = false;
    if (e.code === 'KeyD') strikerKeys.right = false;
    if (e.code === 'KeyW') strikerKeys.up = false;
    if (e.code === 'KeyS') strikerKeys.down = false;
  });

  function updateTiltFromKeys() {
    const targetX = (tiltKeys.up ? 1 : 0) + (tiltKeys.down ? -1 : 0);
    const targetZ = (tiltKeys.right ? 1 : 0) + (tiltKeys.left ? -1 : 0);

    const lerp = 0.12;
    state.tiltX += (targetX - state.tiltX) * lerp;
    state.tiltZ += (targetZ - state.tiltZ) * lerp;
  }

  function updateStrikerFromKeys(dt) {
    const moveSpeed = 1.8;
    let mx = 0;
    let mz = 0;

    if (strikerKeys.left) mx -= 1;
    if (strikerKeys.right) mx += 1;
    if (strikerKeys.up) mz -= 1;
    if (strikerKeys.down) mz += 1;

    if (mx !== 0 || mz !== 0) {
      const len = Math.hypot(mx, mz) || 1;
      mx /= len;
      mz /= len;

      strikerMesh.position.x += mx * moveSpeed * dt;
      strikerMesh.position.z += mz * moveSpeed * dt;
    }
  }

  // XR controller thumb sticks
  function readXRThumbsticks() {
    if (!world.xr || !world.xr.session) {
      return { tilt: null, striker: null };
    }

    const session = world.xr.session;
    const DEADZONE = 0.15;

    let rightStick = null;
    let leftStick = null;
    let fallback = null;

    for (const source of session.inputSources) {
      const gp = source.gamepad;
      if (!gp || !gp.axes || gp.axes.length < 2) continue;

      let x = gp.axes[0];
      let y = gp.axes[1];

      const mag = Math.hypot(x, y);
      if (mag < DEADZONE) continue;

      if (Math.abs(x) < DEADZONE) x = 0;
      if (Math.abs(y) < DEADZONE) y = 0;

      const stick = { x, y };

      if (source.handedness === 'right') {
        rightStick = stick;
      } else if (source.handedness === 'left') {
        leftStick = stick;
      } else {
        fallback = stick;
      }
    }

    // If we only have one controller, use it for tilt
    if (!rightStick && !leftStick && fallback) {
      rightStick = fallback;
    }

    return { tilt: rightStick, striker: leftStick };
  }

  // Board & goal bounds (local coordinates)
  const halfW = fieldWidth / 2 - ballRadius;
  const halfH = fieldHeight / 2 - ballRadius;

  const goalZBandMin = -fieldHeight / 2;
  const goalZBandMax = -fieldHeight / 2 + goalDepth;
  const goalXHalf = goalWidth / 2;

  const strikerHalfW = strikerWidth / 2;
  const strikerHalfD = strikerDepth / 2;

  let lastTime = performance.now();
  let lastOutcomeTime = 0;
  const OUTCOME_COOLDOWN_MS = 800;

  let idleTimer = 0;

  // CONFETTI
  const confettiPieces = [];
  const confettiColors = ['#ff4444', '#ffbb33', '#00C851', '#33b5e5', '#aa66cc'];

  function spawnGoalConfetti() {
    const count = 20;
    for (let i = 0; i < count; i++) {
      const size = 0.02 + Math.random() * 0.03;
      const mesh = new Mesh(
        new BoxGeometry(size, size, size),
        new MeshStandardMaterial({
          color: confettiColors[i % confettiColors.length],
          transparent: true,
          opacity: 1,
        })
      );

      mesh.position.set(
        goalMesh.position.x + (Math.random() - 0.5) * 0.7,
        0.1 + Math.random() * 0.25,
        goalMesh.position.z + (Math.random() - 0.5) * 0.3
      );

      boardRoot.add(mesh);

      confettiPieces.push({
        mesh,
        vy: 1.3 + Math.random() * 0.7,
        life: 1.6 + Math.random() * 0.6,
        spinX: (Math.random() - 0.5) * 6,
        spinY: (Math.random() - 0.5) * 6,
      });
    }
  }

  function updateConfetti(dt) {
    for (let i = confettiPieces.length - 1; i >= 0; i--) {
      const c = confettiPieces[i];
      c.vy -= 3.5 * dt;
      c.mesh.position.y += c.vy * dt;
      c.mesh.rotation.x += c.spinX * dt;
      c.mesh.rotation.y += c.spinY * dt;
      c.life -= dt;

      const t = Math.max(0, c.life / 2);
      if (c.mesh.material && 'opacity' in c.mesh.material) {
        c.mesh.material.opacity = t;
      }

      if (c.life <= 0 || c.mesh.position.y < 0) {
        boardRoot.remove(c.mesh);
        confettiPieces.splice(i, 1);
      }
    }
  }

  function clampStrikerInsideField() {
    // Limit striker to front half of board and inside field edges
    const marginX = 0.1;
    const marginZ = 0.3;

    const minX = -fieldWidth / 2 + strikerHalfW + marginX;
    const maxX = fieldWidth / 2 - strikerHalfW - marginX;

    const minZ = 0; // front half only
    const maxZ = fieldHeight / 2 - strikerHalfD - marginZ;

    if (strikerMesh.position.x < minX) strikerMesh.position.x = minX;
    if (strikerMesh.position.x > maxX) strikerMesh.position.x = maxX;

    if (strikerMesh.position.z < minZ) strikerMesh.position.z = minZ;
    if (strikerMesh.position.z > maxZ) strikerMesh.position.z = maxZ;

    strikerMesh.position.y = strikerHeight / 2;
  }

  function handleStrikerCollision() {
    const dx = ballMesh.position.x - strikerMesh.position.x;
    const dz = ballMesh.position.z - strikerMesh.position.z;
    const dist = Math.hypot(dx, dz);

    const minDist =
      ballRadius + Math.max(strikerHalfW, strikerHalfD) * 0.9;

    if (dist > 0 && dist < minDist) {
      const nx = dx / dist;
      const nz = dz / dist;

      // Separate ball from striker to avoid sticking
      const overlap = minDist - dist;
      ballMesh.position.x += nx * overlap;
      ballMesh.position.z += nz * overlap;

      // Reflect + add impulse to ball velocity
      const dot = state.vx * nx + state.vz * nz;
      if (dot < 0) {
        state.vx = state.vx - 2 * dot * nx;
        state.vz = state.vz - 2 * dot * nz;
      }

      const hitStrength = 6.0;
      state.vx += nx * hitStrength;
      state.vz += nz * hitStrength;
    }
  }

  function handleObstacleCollision(obstacleMesh) {
    const dx = ballMesh.position.x - obstacleMesh.position.x;
    const dz = ballMesh.position.z - obstacleMesh.position.z;
    const dist = Math.hypot(dx, dz);

    const obstacleHalf = 0.18; // rough radius for the box
    const minDist = ballRadius + obstacleHalf;

    if (dist > 0 && dist < minDist) {
      const nx = dx / dist;
      const nz = dz / dist;

      const overlap = minDist - dist;
      ballMesh.position.x += nx * overlap;
      ballMesh.position.z += nz * overlap;

      const dot = state.vx * nx + state.vz * nz;
      if (dot < 0) {
        state.vx = state.vx - 2 * dot * nx;
        state.vz = state.vz - 2 * dot * nz;
      }
    }
  }

  function handleGoalOrMiss() {
    const nowMs = performance.now();
    if (nowMs - lastOutcomeTime < OUTCOME_COOLDOWN_MS) return;

    // Only care when ball is near the back edge
    const backZone = goalZBandMax + 0.02;
    if (ballMesh.position.z > backZone) return;

    const inGoalZBand =
      ballMesh.position.z >= goalZBandMin &&
      ballMesh.position.z <= goalZBandMax;
    const inGoalX = Math.abs(ballMesh.position.x) <= goalXHalf;

    if (inGoalZBand && inGoalX) {
      // GOAL!
      lastOutcomeTime = nowMs;
      score += 1;
      streak += 1;
      if (score > bestScore) bestScore = score;
      resetBall();
      resetStriker();
      spawnGoalConfetti();
      showMessage('GOAL!', 1200);
    } else if (!inGoalX) {
      // MISS: hit back wall but not in goal
      lastOutcomeTime = nowMs;
      streak = 0;
      resetBall();
      resetStriker();
      showMessage('MISS!', 800);
    }
  }

  function step(now) {
    const dt = Math.min(0.05, (now - lastTime) / 1000);
    lastTime = now;

    // INPUT
    const sticks = readXRThumbsticks();

    if (sticks.tilt) {
      // Right-hand thumbstick: x = left/right, y = forward/back (up is -1)
      state.tiltZ = sticks.tilt.x;
      state.tiltX = -sticks.tilt.y;
    } else {
      updateTiltFromKeys();
    }

    if (sticks.striker) {
      const moveSpeed = 1.8;
      const sx = sticks.striker.x;
      const sz = -sticks.striker.y;

      strikerMesh.position.x += sx * moveSpeed * dt;
      strikerMesh.position.z += sz * moveSpeed * dt;
    } else {
      updateStrikerFromKeys(dt);
    }

    clampStrikerInsideField();

    // Apply tilt visually (add on top of base tilt).
    const maxExtraTilt = Math.PI / 8; // 22.5 degrees
    boardRoot.rotation.x = baseTiltX + state.tiltX * maxExtraTilt;
    boardRoot.rotation.z = state.tiltZ * maxExtraTilt;

    // "Gravity" along board surface
    const accelScale = 7.0;
    state.vx += state.tiltZ * accelScale * dt;
    state.vz += state.tiltX * accelScale * dt;

    // Friction
    const FRICTION = 0.96;
    state.vx *= FRICTION;
    state.vz *= FRICTION;

    // Integrate local position
    ballMesh.position.x += state.vx * dt;
    ballMesh.position.z += state.vz * dt;
    ballMesh.position.y = ballRadius; // keep on surface

    // Clamp & bounce off edges
    if (ballMesh.position.x > halfW) {
      ballMesh.position.x = halfW;
      state.vx *= -0.5;
    } else if (ballMesh.position.x < -halfW) {
      ballMesh.position.x = -halfW;
      state.vx *= -0.5;
    }

    if (ballMesh.position.z > halfH) {
      ballMesh.position.z = halfH;
      state.vz *= -0.5;
    } else if (ballMesh.position.z < -halfH) {
      ballMesh.position.z = -halfH;
      state.vz *= -0.5;
    }

    // Moving defenders
    obstacleTime += dt;
    obstacle1.position.x = -0.35 + Math.sin(obstacleTime * 0.8) * 0.15;
    obstacle2.position.x = 0.35 + Math.cos(obstacleTime * 0.7) * 0.15;

    // Collisions with striker and obstacles
    handleStrikerCollision();
    handleObstacleCollision(obstacle1);
    handleObstacleCollision(obstacle2);

    // Check GOAL/MISS
    handleGoalOrMiss();

    // Auto-reset if ball is stuck / barely moving
    const speedSq = state.vx * state.vx + state.vz * state.vz;
    if (speedSq < 0.001) {
      idleTimer += dt;
      if (idleTimer > 3.0) {
        idleTimer = 0;
        streak = 0;
        resetBall();
        resetStriker();
        showMessage('Reset!', 600);
      }
    } else {
      idleTimer = 0;
    }

    // Confetti animation
    updateConfetti(dt);

    requestAnimationFrame(step);
  }

  // Start with a quick controls hint
  showMessage('Tilt: Arrows / Right Stick • Hit: WASD / Left Stick', 2600);
  requestAnimationFrame(step);
});
