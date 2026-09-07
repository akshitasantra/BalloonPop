# 🎈 Balloon Pop

A browser-based, webcam-powered arcade game. Balloons drift up the screen and
you pop them with your bare finger.

Built with **React + TypeScript**, **HTML5 Canvas**, and **MediaPipe
HandLandmarker** (`@mediapipe/tasks-vision`).

## Quick start

```bash
npm install
npm run dev
```

Open the printed `localhost` URL in a recent version of Chrome, Edge, or
Firefox. Camera access requires either `localhost` or an HTTPS origin — it
will not work over a plain `http://` connection to a remote host.

```bash
npm run build    # type-check + production build to dist/
npm run preview  # serve the production build locally
npm run lint     # oxlint
```

## How it works

1. **Grant camera access.** Click "Start Game" — this is the user gesture
   that unlocks both the camera prompt and the Web Audio context.
2. **Point your index finger at the screen.** A glowing cursor with a short
   fading trail shows where the game thinks your fingertip is.
3. **Pop balloons** by touching or swiping through them. Golden balloons are
   worth a big bonus; bombs cost you a life and some points — leave those
   alone. Popping several balloons quickly builds a combo multiplier (shown
   as a row of marquee lights) that boosts your score.
4. Missing a normal or golden balloon (letting it float off the top) costs a
   life. You have 60 seconds and 3 lives per round.

## Architecture

```
src/
  game/                 Pure logic + rendering, no React
    types.ts             Shared interfaces (Balloon, Particle, GameState, ...)
    constants.ts          Every tunable number (spawn rate, scoring, colors...)
    engine.ts             stepGame(): spawning, physics, collisions, scoring
    particles.ts           Confetti particle spawning/updating
    renderer.ts             Canvas drawing functions (balloons, particles)
    sound.ts                 Web Audio synthesized sound effects (no audio files)

  hooks/
    useGameLoop.ts        Generic requestAnimationFrame loop (dt-based, clamped)
    useHandTracking.ts     Loads MediaPipe HandLandmarker, tracks fingertips,
                           smooths them with a One-Euro filter

  components/
    WebcamFeed.tsx        <video> element + getUserMedia, mirrored & full-bleed
    HandTracker.tsx         Draws the fingertip cursor/trail on its own <canvas>
    GameCanvas.tsx           Runs the engine loop + draws balloons/particles
    ScoreBoard.tsx            Score, timer, lives, combo meter (presentational)
    StartScreen.tsx            Instructions + rules + Start button
    GameOverScreen.tsx           Final score + restart

  utils/
    geometry.ts           clamp/lerp/random + segment-vs-circle hit testing
    smoothing.ts            One-Euro filter (jitter reduction for landmarks)
    coords.ts                 Maps normalized landmarks -> mirrored screen pixels
    color.ts                   Hex color helpers for canvas gradients
    storage.ts                   High score persistence (localStorage)

  App.tsx                Screen state machine (start/initializing/countdown/
                          playing/gameover) and all the wiring between them
```

### Why two `<canvas>` elements?

`GameCanvas` (balloons + particles) and `HandTracker` (fingertip cursor +
trail) are separate canvases layered with CSS, each driven by its own
`useGameLoop` call. This keeps "visualize the tracked hand" and "simulate the
balloons" as independent concerns — `GameCanvas` reads the same fingertip
positions for hit-testing but never draws them, and `HandTracker` never
touches game state. The performance cost of two `requestAnimationFrame`
callbacks is negligible next to the actual drawing work.

### Why does hardly anything live in React state?

Score, balloon positions, particles, and fingertip coordinates all live in
plain mutable objects inside `useRef`, updated every frame inside
`requestAnimationFrame` callbacks. React state (`useState`) is only touched
for values the *HUD* needs to display, and only when they actually change
(a new integer score, a new second on the clock, a life lost). That keeps
60 FPS gameplay from fighting React's render cycle — `GameCanvas` and
`HandTracker` are wrapped in `React.memo` and receive only stable
(`useRef`/`useCallback`) props, so they never re-render just because a
sibling's score display changed.

### Hand tracking details

- Uses `@mediapipe/tasks-vision`'s `HandLandmarker` (the actively-maintained
  successor to the older `@mediapipe/hands` "Solutions" API), tracking up to
  two hands and reading landmark **#8** (index fingertip) from each.
- The model and WASM runtime load from `storage.googleapis.com` /
  `cdn.jsdelivr.net` as soon as the app mounts — *before* the user grants
  camera permission — so it's usually warm by the time they click Start.
- Raw landmark coordinates are noisy frame-to-frame. Each fingertip is
  smoothed with a **One-Euro filter** (`utils/smoothing.ts`), which stays
  buttery smooth when your hand is nearly still but snaps back to low-latency
  tracking during fast swipes.
- The camera frame is fed to the model **un-mirrored** (that's just how the
  raw pixels come off the sensor); only the CSS display is mirrored via
  `transform: scaleX(-1)`. `utils/coords.ts` does the matching math to map
  normalized landmark coordinates into on-screen pixels, including the crop
  offset introduced by `object-fit: cover`.
- Balloon hits are tested as a **line segment** from last frame's fingertip
  position to this frame's, not just a single point — this catches fast
  swipes that would otherwise skip past a balloon between two tracked frames
  (see `segmentIntersectsCircle` in `utils/geometry.ts`).

### Tuning the game

Everything gameplay-related — spawn rate, balloon speed, scoring, special
balloon odds, combo window, round length — is a named constant in
`src/game/constants.ts`. Nothing else in the codebase hardcodes those
numbers, so balancing the game is a one-file job.

## Browser requirements

- A webcam and a browser that supports `getUserMedia` and WebAssembly
  (current Chrome, Edge, Firefox, or Safari).
- HTTPS or `localhost` (browsers block camera access on insecure origins).
- Works on mobile browsers too — the front (`facingMode: "user"`) camera is
  requested automatically — though holding the phone steady while gesturing
  at the screen is naturally a bit more awkward than on desktop.

## Notes / possible next steps

- Sounds are all synthesized with the Web Audio API in `game/sound.ts` — there
  are no binary audio assets to swap in, but you can drop in real `<audio>`/
  `AudioBufferSourceNode` samples there if you'd like a different feel.
- `MAX_HANDS` in `constants.ts` controls whether one or two hands are
  tracked/playable at once.
- The MediaPipe WASM URL is pinned to the installed `@mediapipe/tasks-vision`
  version in `useHandTracking.ts` (`TASKS_VISION_VERSION`) — keep those two in
  sync if you bump the npm package.
