// カラフルパチンコゲーム ロジック（初期バージョン）
const canvas = document.getElementById('pachinko-board');
const ctx = canvas.getContext('2d');
const launchBtn = document.getElementById('launch-btn');
const ballsDisplay = document.getElementById('balls');
const messageDiv = document.getElementById('message');
// PSG風サウンド生成関数
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

// --- FM音源風BGM ---
let bgmStarted = false;
let bgmNodes = [];

function startFMBGM() {
    if (bgmStarted) return;
    bgmStarted = true;
    const tempo = 76;
    const beatDur = 60 / tempo;
    let step = 0;
    // コード進行: C → Am → Dm → G7
    const chords = [
        [261.63, 329.63, 392.00],            // C: C E G
        [220.00, 261.63, 329.63],            // Am: A C E
        [293.66, 349.23, 440.00],            // Dm: D F A
        [196.00, 246.94, 392.00, 311.13],    // G7: G B D F
    ];
    let chordStep = 0;
    function playStep() {
        if (!bgmStarted) return;
        const chord = chords[chordStep % chords.length];
        // 和音
        chord.forEach(freq => {
            const carrier = audioCtx.createOscillator();
            const modulator = audioCtx.createOscillator();
            const modGain = audioCtx.createGain();
            const outGain = audioCtx.createGain();
            carrier.type = 'sine';
            carrier.frequency.value = freq;
            modulator.type = 'sine';
            modulator.frequency.value = freq * 2.01;
            modGain.gain.value = freq * 0.22;
            outGain.gain.value = 0.19;
            modulator.connect(modGain);
            modGain.connect(carrier.frequency);
            carrier.connect(outGain);
            outGain.connect(audioCtx.destination);
            carrier.start();
            modulator.start();
            carrier.stop(audioCtx.currentTime + beatDur * 2.5);
            modulator.stop(audioCtx.currentTime + beatDur * 2.5);
            bgmNodes.push(carrier, modulator, modGain, outGain);
            setTimeout(() => {
                outGain.disconnect();
            }, beatDur * 2000);
        });
        // 4周目以降はドラム＆ベース追加（パーカッションを明確に）
        if (chordStep >= 4) {
            // ベース: コードの最低音
            const root = chord[0];
            const bassOsc = audioCtx.createOscillator();
            const bassGain = audioCtx.createGain();
            bassOsc.type = 'triangle';
            bassOsc.frequency.value = root;
            bassGain.gain.value = 0.18;
            bassOsc.connect(bassGain);
            bassGain.connect(audioCtx.destination);
            bassOsc.start();
            bassOsc.stop(audioCtx.currentTime + beatDur * 1.7);
            bgmNodes.push(bassOsc, bassGain);
            setTimeout(() => { bassGain.disconnect(); }, beatDur * 1600);
            // --- ドラムパターン ---
            // キック（頭）
            const drumOsc1 = audioCtx.createOscillator();
            const drumGain1 = audioCtx.createGain();
            drumOsc1.type = 'sine';
            drumOsc1.frequency.setValueAtTime(110, audioCtx.currentTime);
            drumOsc1.frequency.linearRampToValueAtTime(45, audioCtx.currentTime + 0.11);
            drumGain1.gain.value = 0.25;
            drumGain1.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.12);
            drumOsc1.connect(drumGain1);
            drumGain1.connect(audioCtx.destination);
            drumOsc1.start();
            drumOsc1.stop(audioCtx.currentTime + 0.13);
            bgmNodes.push(drumOsc1, drumGain1);
            setTimeout(() => { drumGain1.disconnect(); }, 130);
            // スネア（中間）
            const bufferSize = audioCtx.sampleRate * 0.09;
            const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
            const noise = audioCtx.createBufferSource();
            noise.buffer = buffer;
            const snareGain = audioCtx.createGain();
            snareGain.gain.value = 0.19;
            snareGain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.09);
            noise.connect(snareGain);
            snareGain.connect(audioCtx.destination);
            noise.start(audioCtx.currentTime + beatDur * 1.0);
            noise.stop(audioCtx.currentTime + beatDur * 1.09);
            bgmNodes.push(noise, snareGain);
            setTimeout(() => { snareGain.disconnect(); }, beatDur * 1100);
            // キック（終わり）
            const drumOsc2 = audioCtx.createOscillator();
            const drumGain2 = audioCtx.createGain();
            drumOsc2.type = 'sine';
            drumOsc2.frequency.setValueAtTime(90, audioCtx.currentTime + beatDur * 1.7);
            drumOsc2.frequency.linearRampToValueAtTime(40, audioCtx.currentTime + beatDur * 1.81);
            drumGain2.gain.setValueAtTime(0.19, audioCtx.currentTime + beatDur * 1.7);
            drumGain2.gain.linearRampToValueAtTime(0, audioCtx.currentTime + beatDur * 1.82);
            drumOsc2.connect(drumGain2);
            drumGain2.connect(audioCtx.destination);
            drumOsc2.start(audioCtx.currentTime + beatDur * 1.7);
            drumOsc2.stop(audioCtx.currentTime + beatDur * 1.82);
            bgmNodes.push(drumOsc2, drumGain2);
            setTimeout(() => { drumGain2.disconnect(); }, beatDur * 1900);
            // ハイハット（チッチキチッチキチー）
            for (let i = 0; i < 7; i++) { // 0,0.25,0.5,0.75,1,1.25,1.5
                const hhTime = audioCtx.currentTime + beatDur * 0.25 * i;
                const hhBuffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.045, audioCtx.sampleRate);
                const hhData = hhBuffer.getChannelData(0);
                for (let j = 0; j < hhBuffer.length; j++) hhData[j] = Math.random() * 2 - 1;
                const hh = audioCtx.createBufferSource();
                hh.buffer = hhBuffer;
                const hhGain = audioCtx.createGain();
                hhGain.gain.value = 0.12;
                hhGain.gain.linearRampToValueAtTime(0, hhTime + 0.045);
                hh.connect(hhGain);
                hhGain.connect(audioCtx.destination);
                hh.start(hhTime);
                hh.stop(hhTime + 0.045);
                bgmNodes.push(hh, hhGain);
                setTimeout(() => { hhGain.disconnect(); }, beatDur * 400);
            }
            // チー（終わり、やや長め）
            const cheeTime = audioCtx.currentTime + beatDur * 1.75;
            const cheeBuffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.08, audioCtx.sampleRate);
            const cheeData = cheeBuffer.getChannelData(0);
            for (let j = 0; j < cheeBuffer.length; j++) cheeData[j] = Math.random() * 2 - 1;
            const chee = audioCtx.createBufferSource();
            chee.buffer = cheeBuffer;
            const cheeGain = audioCtx.createGain();
            cheeGain.gain.value = 0.19;
            cheeGain.gain.linearRampToValueAtTime(0, cheeTime + 0.08);
            chee.connect(cheeGain);
            cheeGain.connect(audioCtx.destination);
            chee.start(cheeTime);
            chee.stop(cheeTime + 0.08);
            bgmNodes.push(chee, cheeGain);
            setTimeout(() => { cheeGain.disconnect(); }, beatDur * 600);
        }
        chordStep++;
        setTimeout(playStep, beatDur * 2000);
    }
    playStep();
}
function stopFMBGM() {
    bgmStarted = false;
    bgmNodes.forEach(node => { try { node.disconnect(); } catch(e){} });
    bgmNodes = [];
}

function ensureBGMStart() {
    if (!bgmStarted) startFMBGM();
}

function playPSGSquare(frequency, duration, gain = 0.15, echo = false) {
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = 'square';
    osc.frequency.value = frequency;
    g.gain.value = gain;
    osc.connect(g);
    g.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + duration);
    if (echo) {
        // 簡易エコー
        const delay = audioCtx.createDelay();
        delay.delayTime.value = 0.18;
        const g2 = audioCtx.createGain();
        g2.gain.value = gain * 0.45;
        g.connect(delay);
        delay.connect(g2);
        g2.connect(audioCtx.destination);
    }
}
function seLaunchPSG() {
    playPSGSquare(880, 0.09, 0.16, true);
}
const pinMelodyNotes = [523.25, 587.33, 659.25, 698.46, 783.99, 880.00, 987.77]; // C D E F G A B (Hz)
let pinMelodyIdx = 0;
function seHitPSG() {
    playPSGSquare(pinMelodyNotes[pinMelodyIdx], 0.09, 0.17, true);
    pinMelodyIdx = (pinMelodyIdx + 1) % pinMelodyNotes.length;
}
function seTulipCoinPSG() {
    // Marioコイン風: E-G-C の上昇アルペジオ
    playPSGSquare(659, 0.06, 0.18, false); // E5
    setTimeout(() => playPSGSquare(784, 0.06, 0.17, false), 50); // G5
    setTimeout(() => playPSGSquare(1047, 0.12, 0.19, false), 110); // C6
}

function seJackpotPSG() {
    playPSGSquare(1047, 0.12, 0.19, true);
    setTimeout(() => playPSGSquare(1568, 0.12, 0.17, true), 100);
    setTimeout(() => playPSGSquare(2093, 0.18, 0.14, true), 220);
}

// Sound for ball hitting the slot start pocket
function seSlotStartPocketHit() {
    playPSGSquare(600, 0.10, 0.18, true); // Example: A clear, slightly higher pitched sound
    setTimeout(() => playPSGSquare(900, 0.08, 0.15, false), 80);
}

// Sound for slot spinning (can be called multiple times or made more complex)
function seSlotSpin() {
    playPSGSquare(300 + Math.random() * 200, 0.07, 0.10, false); // Rapid, varying pitch
}

// Sound for the fighter jet win animation sequence
function seSlotWinFighterJet() {
    // Ascending triumphant sound
    playPSGSquare(880, 0.15, 0.20, true); // A4
    setTimeout(() => playPSGSquare(1046.50, 0.15, 0.18, true), 120); // C6
    setTimeout(() => playPSGSquare(1318.51, 0.20, 0.16, true), 240); // E6
    setTimeout(() => playPSGSquare(1567.98, 0.30, 0.19, true), 360); // G6 (longer)
}

// Sound for slot loss
function seSlotLose() {
    playPSGSquare(400, 0.15, 0.15, false);
    setTimeout(() => playPSGSquare(300, 0.20, 0.12, false), 160); // Descending, short
}


let balls = 100;
let gameActive = true;
let isSlotAnimationPlaying = false;
let slotLotteryWin = false; // To store the win/loss result for the animation loop
let animationStage = 0; // 0: initial, 1: slot_start, 2: main_event (win/loss), 3: finished
let animationStartTime = 0;
let currentAnimationDuration = 0;


// 盤面の定義
const tulips = [
    { x: 100, y: 200, r: 20, open: true, timer: 0 },
    { x: 300, y: 200, r: 20, open: true, timer: 20 },
    { x: 140, y: 320, r: 20, open: true, timer: 40 },
    { x: 260, y: 320, r: 20, open: true, timer: 60 },
];
const jackpot = { x: 200, y: 530, r: 22, open: false, timer: 0 };
const loseHole = { x: 200, y: 570, r: 30 };
const slotStartPocket = { x: 200, y: 40, r: 20, color: '#32CD32' }; // Example: LimeGreen

// 釘（ピン）の三角格子配置
const pins = [];
(function generatePins() {
    const pinRows = 8;
    const pinCols = 7;
    const pinSpacingX = 48; // 球直径10×2.2=22より十分広い
    const pinSpacingY = 60;
    const offsetX = 60;
    const offsetY = 90;
    for (let row = 0; row < pinRows; row++) {
        for (let col = 0; col < pinCols; col++) {
            const x = offsetX + col * pinSpacingX + (row % 2 === 0 ? 0 : pinSpacingX / 2);
            const y = offsetY + row * pinSpacingY;
            // 4つのチューリップ周辺は釘を減らして入りやすく
            let nearTulip = false;
            for (const tulip of tulips) {
                if (Math.hypot(x - tulip.x, y - tulip.y) < tulip.r + 18) nearTulip = true;
            }
            if (nearTulip) continue;
            // ジャックポット周辺は釘を密集させてガード
            if (y > jackpot.y - 60 && y < jackpot.y + 40 && Math.abs(x - jackpot.x) < 60) {
                if (Math.abs(x - jackpot.x) < 36 && y < jackpot.y + 18) {
                    pins.push({ x, y });
                } else if (Math.abs(x - jackpot.x) < 24 && y < jackpot.y + 28) {
                    pins.push({ x, y });
                }
                continue;
            }
            if (Math.hypot(x - loseHole.x, y - loseHole.y) < loseHole.r + 18) continue;
            if (x < 20 || x > 380 || y > 570) continue;
            pins.push({ x, y });
        }
    }
    for (let i = -2; i <= 2; i++) {
        pins.push({ x: jackpot.x + i * 14, y: jackpot.y - 28 });
        if (i !== 0) pins.push({ x: jackpot.x + i * 20, y: jackpot.y - 48 });
    }
})();

// ボールの物理パラメータ
const BALL_RADIUS = 10;
const GRAVITY = 0.85; // 重力を強く
const FRICTION = 0.985; // 速度減衰も強め（跳ねを抑制）

let ballsInPlay = [];
// 各ボールに lastPos, stuckTime(ms) を追加して管理

// ガイドレールのパス（左下→左上角→円弧→出口）
function getGuideRailParams() {
    return {
        straightX: 16, // 左端
        bottomY: 490, // 新しい高さに合わせて下端を調整
        topY: 0, // 画面最上部まで
        arcCenter: { x: 110, y: 0 }, // アーチ天井の中心
        arcRadius: 60, // アーチの半径（縮小）
        arcStartAngle: Math.PI, // 左上から
        arcEndAngle: 0, // 右上まで
        exit: { x: 160, y: 0 } // アーチ出口
    };
}

function drawBoard() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    // --- オーバル型球はみだし防止柵 ---
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(200, 300, 185, 270, 0, 0, Math.PI * 2);
    ctx.lineWidth = 18;
    ctx.strokeStyle = '#00fff7';
    ctx.shadowColor = '#00fff7';
    ctx.shadowBlur = 22;
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.restore();
    // 釘（ピン）: オーバル内のみ描画
    pins.forEach((pin, i) => {
        // オーバル内判定 (中心:200,300, rx:185, ry:270)
        const dx = pin.x - 200;
        const dy = pin.y - 300;
        if ((dx*dx)/(185*185) + (dy*dy)/(270*270) > 1) return;
        ctx.beginPath();
        ctx.arc(pin.x, pin.y, 6, 0, Math.PI * 2);
        ctx.fillStyle = i % 3 === 0 ? '#00fff7' : (i % 3 === 1 ? '#ff00c8' : '#fffa00');
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0;
    });

    // --- 球発射装置の幾何学模様 ---
    ctx.save();
    const cx = 32, cy = 560; // 画面下部の空白エリアに移動
    // 放射状ライン
    for(let i=0;i<18;i++){
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        const angle = (i/18)*2*Math.PI;
        ctx.lineTo(cx+36*Math.cos(angle), cy+36*Math.sin(angle));
        ctx.strokeStyle = i%3===0?'#fffa00':(i%3===1?'#00fff7':'#ff00c8');
        ctx.lineWidth = 2.4;
        ctx.shadowColor = ctx.strokeStyle;
        ctx.shadowBlur = 10;
        ctx.stroke();
    }
    // 輪
    for(let r=10;r<=28;r+=6){
        ctx.beginPath();
        ctx.arc(cx,cy,r,0,Math.PI*2);
        ctx.strokeStyle = r%12===0?'#fffa00':'#00fff7';
        ctx.lineWidth = 2.0;
        ctx.globalAlpha = 0.7;
        ctx.shadowColor = ctx.strokeStyle;
        ctx.shadowBlur = 8;
        ctx.stroke();
    }
    ctx.globalAlpha = 1.0;
    ctx.restore();
    // 4つのチューリップ（通常入賞口）
    tulips.forEach(tulip => {
        ctx.beginPath();
        ctx.arc(tulip.x, tulip.y, tulip.r, Math.PI, 0);
        ctx.lineTo(tulip.x + tulip.r, tulip.y);
        ctx.arc(tulip.x, tulip.y, tulip.r, 0, Math.PI);
        ctx.closePath();
        ctx.fillStyle = tulip.open ? '#fffa00' : '#888';
        ctx.globalAlpha = 0.8;
        ctx.fill();
        ctx.globalAlpha = 1.0;
        ctx.strokeStyle = '#fff';
        ctx.stroke();
    });
    // 究極の大当たり
    ctx.beginPath();
    ctx.arc(jackpot.x, jackpot.y, jackpot.r, Math.PI, 0);
    ctx.lineTo(jackpot.x + jackpot.r, jackpot.y);
    ctx.arc(jackpot.x, jackpot.y, jackpot.r, 0, Math.PI);
    ctx.closePath();
    ctx.fillStyle = jackpot.open ? '#00fff7' : '#222';
    ctx.globalAlpha = 0.95;
    ctx.fill();
    ctx.globalAlpha = 1.0;
    ctx.strokeStyle = '#fff';
    ctx.stroke();
    // はずれ口
    ctx.beginPath();
    ctx.arc(loseHole.x, loseHole.y, loseHole.r, 0, Math.PI * 2);
    ctx.fillStyle = '#ff00c8';
    ctx.globalAlpha = 0.7;
    ctx.fill();
    ctx.globalAlpha = 1.0;
    ctx.strokeStyle = '#fff';
    ctx.stroke();

    // Draw Slot Start Pocket
    ctx.beginPath();
    ctx.arc(slotStartPocket.x, slotStartPocket.y, slotStartPocket.r, 0, Math.PI * 2);
    ctx.fillStyle = slotStartPocket.color;
    ctx.globalAlpha = 0.85; // Consistent with other pockets
    ctx.fill();
    ctx.globalAlpha = 1.0;
    ctx.strokeStyle = '#fff'; // White stroke
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
    // ガイドレール描画
    const rail = getGuideRailParams();
    // レール本体
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(rail.straightX, rail.bottomY);
    ctx.lineTo(rail.straightX, rail.topY);
    ctx.arc(rail.arcCenter.x, rail.arcCenter.y, rail.arcRadius, rail.arcStartAngle, rail.arcEndAngle, false);
    ctx.lineTo(rail.exit.x, rail.exit.y);
    ctx.lineWidth = 20; // 球より太く（さらに縮小）
    ctx.strokeStyle = '#00fff7';
    ctx.shadowColor = '#00fff7';
    ctx.shadowBlur = 18;
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.lineWidth = 10;
    ctx.strokeStyle = '#222';
    ctx.beginPath();
    ctx.moveTo(rail.straightX, rail.bottomY);
    ctx.lineTo(rail.straightX, rail.topY);
    ctx.arc(rail.arcCenter.x, rail.arcCenter.y, rail.arcRadius, rail.arcStartAngle, rail.arcEndAngle, false);
    ctx.lineTo(rail.exit.x, rail.exit.y);
    ctx.stroke();
    ctx.restore();
    // アーチ天井（盤面全体の上部）
    ctx.save();
    ctx.beginPath();
    ctx.arc(200, 0, 190, Math.PI, 0, false);
    ctx.lineWidth = 18;
    ctx.strokeStyle = '#00fff7';
    ctx.shadowColor = '#00fff7';
    ctx.shadowBlur = 16;
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.lineWidth = 8;
    ctx.strokeStyle = '#222';
    ctx.beginPath();
    ctx.arc(200, 0, 190, Math.PI, 0, false);
    ctx.stroke();
    ctx.restore();

    // ボール描画
    ballsInPlay.forEach(ball => {
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, BALL_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = '#fffa00';
        ctx.shadowColor = '#fffa00';
        ctx.shadowBlur = 12;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
    });
}

function updateTulip() {
    tulips.forEach((tulip, idx) => {
        tulip.timer++;
        if (tulip.timer % 80 === 0) {
            tulip.open = !tulip.open;
        }
    });
}
function updateJackpot() {
    jackpot.timer++;
    if (jackpot.timer % 200 === 0) {
        jackpot.open = Math.random() < 0.1;
    } else if (jackpot.timer % 200 === 10) {
        jackpot.open = false;
    }
}

// パワーゲージ関連
let power = 0;
let powerInterval = null;
const MAX_POWER = 26; // 画面最上段まで届くように強化
const MIN_POWER = 10; // 弱すぎると途中で止まるくらいに調整
const powerGaugeElem = document.getElementById('power-gauge');
let launchReady = true;

function startPowerCharge() {
    if (!gameActive || balls <= 0 || powerInterval) return;
    power = MIN_POWER;
    powerGaugeElem.style.width = '0%';
    powerInterval = setInterval(() => {
        if (power < MAX_POWER) {
            power += 0.55; // 充填速度を大幅アップ
            powerGaugeElem.style.width = ((power - MIN_POWER) / (MAX_POWER - MIN_POWER) * 100) + '%';
        }
    }, 16);
}
function launchBallSpring() {
    if (!gameActive || balls <= 0 || !powerInterval) return;
    clearInterval(powerInterval);
    powerInterval = null;
    seLaunchPSG();
    balls--;
    ballsDisplay.textContent = `球数: ${balls}`;
    powerGaugeElem.style.width = '0%';
    // 発射位置はガイドレールの一番下
    ballsInPlay.push({
        x: 16,
        y: 390,
        vx: 0,
        vy: -power,
        inRail: true,
        alive: true,
        inArc: false
    });
}
// イベントハンドラを下部で設定

function checkGameEnd() {
    if (balls >= 1000) {
        messageDiv.textContent = 'ゲームクリア！おめでとう！';
        gameActive = false;
    } else if (balls <= 0) {
        messageDiv.textContent = 'ゲームオーバー...';
        gameActive = false;
    }
}

function updateBalls() {
    const rail = getGuideRailParams();
    for (let ball of ballsInPlay) {
        // --- スタック判定用 ---
        if (!ball.lastPos) {
            ball.lastPos = { x: ball.x, y: ball.y };
            ball.stuckTime = 0;
        } else {
            const dx = Math.abs(ball.x - ball.lastPos.x);
            const dy = Math.abs(ball.y - ball.lastPos.y);
            if (dx < 1 && dy < 1) {
                ball.stuckTime += 16; // 1フレーム約16ms
                if (ball.stuckTime > 10000 && ball.alive) {
                    ball.alive = false;
                    messageDiv.textContent = 'はずれ...';
                    checkGameEnd();
                    continue;
                }
            } else {
                ball.stuckTime = 0;
                ball.lastPos.x = ball.x;
                ball.lastPos.y = ball.y;
            }
        }
        if (!ball.alive) continue;
        if (ball.inRail) {
            // 通常の物理（重力・反射）
            ball.vy += GRAVITY;
            ball.x += ball.vx;
            ball.y += ball.vy;
            // 左端直線内
            if (!ball.inArc && ball.x < rail.straightX + 13 && ball.y > rail.topY) {
                // 左壁反射
                if (ball.x < rail.straightX + BALL_RADIUS) {
                    ball.x = rail.straightX + BALL_RADIUS;
                    ball.vx *= -0.5;
                }
                // 上端に到達したら円弧へ
                if (ball.y <= rail.topY + BALL_RADIUS + 2) {
                    ball.inArc = true;
                    // 円弧進入時の角度・速度を保存
                    const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
                    ball.arcAngle = rail.arcStartAngle;
                    ball.arcSpeed = Math.max(speed, 2.5); // 最低速度
                }
                continue;
            }
            // 円弧内（アーチ天井）
            if (ball.inArc) {
                // アーチ天井上を進む
                ball.arcAngle += (rail.arcEndAngle - rail.arcStartAngle) / 18;
                // アーチ出口判定
                if (ball.arcAngle >= rail.arcEndAngle) {
                    ball.inRail = false;
                    ball.x = rail.exit.x;
                    ball.y = rail.exit.y + BALL_RADIUS;
                    ball.vx = 2.5 * Math.random() - 1.2;
                    ball.vy = 0.8 + Math.random() * 0.6;
                    continue;
                }
                // アーチ上の位置
                ball.x = rail.arcCenter.x + rail.arcRadius * Math.cos(ball.arcAngle);
                ball.y = rail.arcCenter.y + rail.arcRadius * Math.sin(ball.arcAngle);
                continue;
            }
            // 万一レール外に出たら通常物理
            if (ball.x > rail.straightX + 160 || ball.y < 0) {
                ball.inRail = false;
            }
            continue;
        }
        // 重力
        ball.vy += GRAVITY;
        // 速度減衰
        ball.vx *= FRICTION;
        // 位置更新
        ball.x += ball.vx;
        ball.y += ball.vy;
        // 壁反射
        if (ball.x < BALL_RADIUS) {
            ball.x = BALL_RADIUS;
            ball.vx *= -0.5; // 壁反射も跳ね抑制
        } else if (ball.x > 400 - BALL_RADIUS) {
            ball.x = 400 - BALL_RADIUS;
            ball.vx *= -0.5;
        }
        // 釘との衝突
        for (const pin of pins) {
            const dx = ball.x - pin.x;
            const dy = ball.y - pin.y;
            const dist = Math.hypot(dx, dy);
            if (dist < BALL_RADIUS + 6) {
                // 反射ベクトル
                const nx = dx / dist;
                const ny = dy / dist;
                const dot = ball.vx * nx + ball.vy * ny;
                // 跳ね返りを抑制
                ball.vx = (ball.vx - 2 * dot * nx) * 0.45;
                ball.vy = (ball.vy - 2 * dot * ny) * 0.45;
                // 少し押し出す
                ball.x = pin.x + nx * (BALL_RADIUS + 6 + 0.5);
                ball.y = pin.y + ny * (BALL_RADIUS + 6 + 0.5);
                // 釘ヒット音（小さい音）
                playPSGSquare(1200 + Math.random() * 200, 0.03, 0.06, false);
            }
        }
        // 4つのチューリップ判定
        for (const tulip of tulips) {
            if (ball.alive && tulip.open && Math.hypot(ball.x - tulip.x, ball.y - tulip.y) < tulip.r - 2) {
                seTulipCoinPSG(); // 明るいコイン風SE
                balls += 6;
                ballsDisplay.textContent = `球数: ${balls}`;
                messageDiv.textContent = 'チューリップ入賞！+6発';
                ball.alive = false;
                checkGameEnd();
                break;
            }
        }
        // 究極大当たり判定
        if (ball.alive && jackpot.open && Math.hypot(ball.x - jackpot.x, ball.y - jackpot.y) < jackpot.r - 4) {
            seJackpotPSG();
            balls += 500;
            ballsDisplay.textContent = `球数: ${balls}`;
            messageDiv.textContent = '究極の大当たり！+500発';
            ball.alive = false;
            checkGameEnd();
            if (!ball.alive) continue;
        }

        // スロットスタート入賞口判定
        if (ball.alive && Math.hypot(ball.x - slotStartPocket.x, ball.y - slotStartPocket.y) < slotStartPocket.r - 2) {
            ball.alive = false; // Ball is consumed
            seSlotStartPocketHit(); // Sound for ball entering slot pocket
            // messageDiv.textContent = 'スロットスタート！'; // Removed/Commented out as per refinement
            triggerSlotLottery(); // This will set isSlotAnimationPlaying = true and animationStage = 0
            if (!ball.alive) continue; // Skip further physics for this ball
        }

        // はずれ口
        if (ball.alive && ball.y > loseHole.y - loseHole.r) {
            messageDiv.textContent = 'はずれ...';
            ball.alive = false;
            checkGameEnd();
        }
    }
    // 盤面外のボールを除去
    ballsInPlay = ballsInPlay.filter(b => b.alive && b.y < 650);
}

// スロット抽選と結果表示
function drawSlotStartAnimation(progress) {
    const alpha = Math.sin(progress * Math.PI); // Fades in and out
    ctx.fillStyle = `rgba(255, 255, 0, ${alpha})`; // Yellow, fading
    ctx.font = '30px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('SLOT START!', canvas.width / 2, canvas.height / 2 - 40);
    const dots = ".".repeat(Math.floor(progress * 3) + 1);
    ctx.font = '20px Arial';
    ctx.fillText(`Reels Spinning${dots}`, canvas.width / 2, canvas.height / 2);
}

function drawFighterJetAnimation(progress) {
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.fillStyle = 'white'; // For text
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';

    // Jet (simple triangle)
    const jetX = canvas.width / 2 + (1 - progress) * 100; // Moves from right to center
    const jetY = canvas.height / 2 - 50;
    ctx.beginPath();
    ctx.moveTo(jetX, jetY);
    ctx.lineTo(jetX - 15, jetY + 10);
    ctx.lineTo(jetX + 15, jetY + 10);
    ctx.closePath();
    ctx.stroke();

    // Base (simple square)
    ctx.strokeRect(canvas.width / 2 - 20, canvas.height / 2 + 30, 40, 20);

    if (progress > 0.7) { // Explosion
        const explosionProgress = (progress - 0.7) / 0.3;
        ctx.fillStyle = `rgba(255, 0, 0, ${Math.sin(explosionProgress * Math.PI)})`;
        ctx.beginPath();
        ctx.arc(canvas.width / 2, canvas.height / 2 + 40, 30 * explosionProgress, 0, Math.PI * 2);
        ctx.fill();
        
        if (progress > 0.85) { // Delay message slightly
            ctx.fillStyle = 'yellow'; // Make message stand out
            ctx.font = '22px Arial';
            ctx.fillText('ENEMY BASE DESTROYED!', canvas.width / 2, canvas.height / 2 + 100);
        }
    }
}

function drawSlotLoseAnimation(progress) {
    const alpha = Math.sin(progress * Math.PI);
    const scale = 1 - (progress * 0.2); // Text slightly shrinks
    const fontSize = Math.floor(30 * scale);
    ctx.font = `${fontSize}px Arial`;
    ctx.fillStyle = `rgba(128, 128, 128, ${alpha})`; // Grey
    ctx.textAlign = 'center';
    ctx.fillText('TRY AGAIN...', canvas.width / 2, canvas.height / 2);
}

function triggerSlotLottery() {
    const isWin = Math.random() < (1 / 256);
    slotLotteryWin = isWin; 
    isSlotAnimationPlaying = true; 
    animationStage = 0; // Initialize animation sequence
    
    // Initial messages can be set here or managed by runSlotAnimationLoop stages
    if (isWin) {
        console.log("Lottery Result: WIN!");
    } else {
        console.log("Lottery Result: LOSS");
    }
}

function runSlotAnimationLoop() {
    if (!isSlotAnimationPlaying) return; 

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(0,0,0,0.8)'; // Dark overlay for animation mode
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const now = Date.now();
    let progress = (now - animationStartTime) / currentAnimationDuration;
    progress = Math.min(progress, 1); // Cap progress at 1

    switch (animationStage) {
        case 0: // Initial call to start the sequence
            animationStage = 1;
            animationStartTime = now;
            currentAnimationDuration = 1000; // 1 second for slot start animation
            seSlotSpin(); // Play spin sound as stage 1 starts
            messageDiv.textContent = 'Spinning!'; 
            // Fall through to draw the first frame of stage 1
        case 1: // Slot Start Animation
            drawSlotStartAnimation(progress);
            if (progress >= 1) {
                animationStage = 2;
                animationStartTime = now;
                seSlotSpin(); // Sound for reels "locking in"
                if (slotLotteryWin) {
                    currentAnimationDuration = 3000; 
                    messageDiv.textContent = '大当り判定中...'; 
                    seSlotWinFighterJet(); // Play win sound as animation starts
                } else {
                    currentAnimationDuration = 2000; 
                    messageDiv.textContent = '残念...';
                    seSlotLose(); // Play lose sound as animation starts
                }
                progress = 0; 
            }
            break;
        case 2: // Main Event (Win or Lose Animation)
            if (slotLotteryWin) {
                drawFighterJetAnimation(progress);
            } else {
                drawSlotLoseAnimation(progress);
            }
            if (progress >= 1) {
                animationStage = 3; // Mark as finished
            }
            break;
        case 3: // Finished
            if (slotLotteryWin) {
                balls += 1000;
                ballsDisplay.textContent = `球数: ${balls}`;
                messageDiv.textContent = '大当たり！1000発獲得！'; // "Big Win! 1000 balls acquired!"
                seJackpotPSG(); // Play a jackpot sound, maybe a more elaborate one later
                checkGameEnd(); // Check for game clear condition
            } else {
                messageDiv.textContent = 'また挑戦してね！'; // "Try again!" or similar for loss
            }
            isSlotAnimationPlaying = false;
            animationStage = 0; // Reset for next time
            // messageDiv.textContent is now set by the win/loss logic above, so no need to clear it here explicitly unless desired.
            // The main gameLoop will take over on the next rAF call.
            return; // Stop this animation loop
    }
    requestAnimationFrame(runSlotAnimationLoop); // Continue animation
}

function gameLoop() {
    if (isSlotAnimationPlaying) {
        // If animation is playing, and it's the initial stage (0), 
        // kick off the animation loop. It will then self-perpetuate via rAF.
        if (animationStage === 0) { 
            requestAnimationFrame(runSlotAnimationLoop);
        }
        // We still need to request the next frame for gameLoop itself,
        // so it can check the isSlotAnimationPlaying flag again.
        requestAnimationFrame(gameLoop); 
        return; 
    }

    if (!gameActive) {
        requestAnimationFrame(gameLoop); // Keep checking if game becomes active again
        return;
    }

    updateTulip();
    updateJackpot();
    updateBalls();
    drawBoard();
    requestAnimationFrame(gameLoop); // Continue normal game loop if not animating
}

drawBoard(); // Initial draw
requestAnimationFrame(gameLoop); // Start the main loop

// パワーゲージ式発射イベント
launchBtn.addEventListener('mousedown', e => {
    ensureBGMStart();
    startPowerCharge();
});
launchBtn.addEventListener('mouseup', e => {
    ensureBGMStart();
    launchBallSpring();
});
launchBtn.addEventListener('mouseleave', e => {
    if (powerInterval) launchBallSpring();
});
// タッチ
launchBtn.addEventListener('touchstart', e => {
    ensureBGMStart();
    startPowerCharge();
});
launchBtn.addEventListener('touchend', e => {
    ensureBGMStart();
    launchBallSpring();
});

// スペースキー対応
let spacePressed = false;
document.addEventListener('keydown', e => {
    if (e.code === 'Space' && !spacePressed) {
        spacePressed = true;
        ensureBGMStart();
        startPowerCharge();
        e.preventDefault();
    }
});
document.addEventListener('keyup', e => {
    if (e.code === 'Space' && spacePressed) {
        spacePressed = false;
        ensureBGMStart();
        launchBallSpring();
        e.preventDefault();
    }
});
// スマホ等の初回タップでもBGM開始
window.addEventListener('touchstart', ensureBGMStart, { once: true });
window.addEventListener('mousedown', ensureBGMStart, { once: true });
