import React, { useState, useRef, useMemo, useEffect, Suspense, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, RoundedBox, ContactShadows, Html } from "@react-three/drei";
import {
  Wind, Leaf, ShieldCheck, MoveHorizontal, X, QrCode, Star,
  ChevronRight, ChevronLeft, Check, Thermometer, Gauge, Sparkles
} from "lucide-react";

/* ============================================================
   GLOBAL STYLE + FONTS
============================================================ */
const GlobalStyle = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,400&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');

    .aura-root {
      --obsidian: #0A0A0B;
      --charcoal: #171512;
      --charcoal-2: #1D1A16;
      --sand: #E7DFD0;
      --ivory: #F5F1E8;
      --brass: #B4915B;
      --brass-light: #D8BD8C;
      --sage: #7C9A8E;
      --hairline: rgba(245,241,232,0.12);
      font-family: 'Inter', sans-serif;
      background: var(--obsidian);
      color: var(--ivory);
      position: relative;
      overflow-x: hidden;
    }
    .aura-root .font-display { font-family: 'Fraunces', serif; }
    .aura-root .font-mono { font-family: 'IBM Plex Mono', monospace; }

    .aura-root ::selection { background: var(--brass); color: var(--obsidian); }

    @keyframes auraFadeUp {
      from { opacity: 0; transform: translateY(18px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes auraChar {
      from { opacity: 0; transform: translateY(0.6em) rotate(3deg); }
      to { opacity: 1; transform: translateY(0) rotate(0deg); }
    }
    @keyframes auraPulseRing {
      0% { box-shadow: 0 0 0 0 rgba(180,145,91,0.45); }
      100% { box-shadow: 0 0 0 14px rgba(180,145,91,0); }
    }
    @keyframes auraDrift {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-10px); }
    }
    @media (prefers-reduced-motion: reduce) {
      .aura-root * { animation-duration: 0.001ms !important; transition-duration: 0.001ms !important; }
    }

    .aura-root .char-reveal span {
      display: inline-block;
      animation: auraChar 0.7s cubic-bezier(0.16,1,0.3,1) both;
    }
    .aura-root .fade-up { animation: auraFadeUp 0.8s cubic-bezier(0.16,1,0.3,1) both; }
    .aura-root .drift { animation: auraDrift 6s ease-in-out infinite; }

    .aura-root button:focus-visible,
    .aura-root a:focus-visible,
    .aura-root [tabindex]:focus-visible {
      outline: 2px solid var(--brass-light);
      outline-offset: 3px;
    }

    .aura-root .magnetic {
      transition: transform 0.25s cubic-bezier(0.16,1,0.3,1), background 0.25s ease, color 0.25s ease, border-color 0.25s ease;
    }

    .aura-root .grain {
      pointer-events: none;
      position: fixed;
      inset: 0;
      z-index: 60;
      opacity: 0.035;
      mix-blend-mode: overlay;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
    }

    .aura-root .no-scrollbar::-webkit-scrollbar { display: none; }
    .aura-root .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
  `}</style>
);

/* ============================================================
   DATA
============================================================ */
const MATERIALS = [
  { id: "silk", name: "Obsidian Silk", roughness: 0.15, sheen: 0.9, tint: 0.0, blurb: "Mulberry-silk face, cool to the touch." },
  { id: "velvet", name: "Midnight Velvet", roughness: 0.75, sheen: 0.4, tint: 0.08, blurb: "Deep-pile velvet with directional drape." },
  { id: "bamboo", name: "Sand Bamboo", roughness: 0.45, sheen: 0.55, tint: -0.05, blurb: "Breathable bamboo-viscose weave." },
  { id: "foam-knit", name: "Cashmere Knit", roughness: 0.6, sheen: 0.5, tint: 0.03, blurb: "Brushed cashmere-cotton blend." },
];

const COLORS = [
  { id: "midnight", name: "Midnight", hex: "#15181C" },
  { id: "sand", name: "Sand Cashmere", hex: "#D8C7A8" },
  { id: "clay", name: "Fired Clay", hex: "#8B5C42" },
  { id: "sage", name: "Quiet Sage", hex: "#6F8478" },
];

const LAYERS = [
  {
    key: "cover",
    index: "01",
    title: "Outer cover",
    desc: "Hypoallergenic fabric face, engineered for airflow and a cool first touch.",
    metric: "99.4%",
    metricLabel: "airflow efficiency",
    color: "#D8C7A8",
  },
  {
    key: "gel",
    index: "02",
    title: "Cooling gel matrix",
    desc: "Ventilated channels draw heat away from the contact zone in real time.",
    metric: "-3.2°C",
    metricLabel: "surface temp drop",
    color: "#8FB3C7",
  },
  {
    key: "foam",
    index: "03",
    title: "Ergonomic core",
    desc: "High-density memory foam, contoured to hold spinal alignment all night.",
    metric: "0",
    metricLabel: "pressure points",
    color: "#EDE6D6",
  },
];

const QUIZ_STEPS = [
  {
    id: "position",
    question: "How do you fall asleep?",
    options: [
      { id: "side", label: "On my side" },
      { id: "back", label: "On my back" },
      { id: "stomach", label: "On my stomach" },
    ],
  },
  {
    id: "support",
    question: "How much neck support do you need?",
    options: [
      { id: "low", label: "Minimal — I barely notice my pillow" },
      { id: "medium", label: "Moderate — I wake with mild stiffness" },
      { id: "high", label: "Significant — neck pain is a regular issue" },
    ],
  },
  {
    id: "feel",
    question: "What feel do you prefer?",
    options: [
      { id: "plush", label: "Plush and soft" },
      { id: "balanced", label: "Balanced" },
      { id: "firm", label: "Firm and supportive" },
    ],
  },
];

function computeRecommendation(answers) {
  const heightMap = { side: "High loft, 14cm", back: "Medium loft, 11cm", stomach: "Low loft, 8cm" };
  const firmMap = { low: "Soft", medium: "Medium-firm", high: "Firm" };
  const contourMap = {
    side: "Shoulder-relief contour",
    back: "Cervical-curve contour",
    stomach: "Flat-profile contour",
  };
  return {
    height: heightMap[answers.position] || "Medium loft, 11cm",
    firmness: firmMap[answers.support] || "Medium-firm",
    contour: contourMap[answers.position] || "Cervical-curve contour",
    material: answers.feel === "plush" ? "Midnight Velvet" : answers.feel === "firm" ? "Sand Bamboo" : "Obsidian Silk",
  };
}

const REVIEWS = [
  {
    name: "M. Alvarez",
    profile: "Side sleeper",
    rating: 5,
    text: "Three weeks in and the shoulder ache I'd had for a year is gone. The contour actually holds its shape through the night.",
  },
  {
    name: "J. Okonkwo",
    profile: "Back sleeper",
    rating: 5,
    text: "The cooling layer is not a gimmick — I run hot and this is the first pillow that stays cool past 2am.",
  },
  {
    name: "R. Chen",
    profile: "Combination sleeper",
    rating: 4,
    text: "Took about a week to adjust to the firmer core, but the spinal alignment difference is noticeable every morning.",
  },
  {
    name: "S. Patel",
    profile: "Stomach sleeper",
    rating: 5,
    text: "Low-loft option finally exists for stomach sleepers. My old pillow always pushed my neck at the wrong angle.",
  },
];

/* ============================================================
   3D — PILLOW MODEL
============================================================ */
function LayerMesh({ layer, index, explode, color, roughness, sheen, active, onClick, showCallout }) {
  const ref = useRef();
  const targetY = useMemo(() => (index - 1) * 1.15, [index]);
  const baseY = useMemo(() => (index - 1) * 0.32, [index]);

  useFrame(() => {
    if (!ref.current) return;
    const goalY = baseY + explode * (targetY - baseY);
    ref.current.position.y += (goalY - ref.current.position.y) * 0.12;
    const scaleTarget = active ? 1.03 : 1;
    ref.current.scale.x += (scaleTarget - ref.current.scale.x) * 0.15;
    ref.current.scale.y += (scaleTarget - ref.current.scale.y) * 0.15;
    ref.current.scale.z += (scaleTarget - ref.current.scale.z) * 0.15;
  });

  const dims =
    layer.key === "cover" ? [3.4, 0.42, 2.4] : layer.key === "gel" ? [3.05, 0.32, 2.05] : [2.7, 0.5, 1.7];

  const matProps =
    layer.key === "cover"
      ? { color, roughness, metalness: 0.05, clearcoat: sheen, clearcoatRoughness: 0.3 }
      : layer.key === "gel"
      ? { color: layer.color, roughness: 0.2, metalness: 0, transparent: true, opacity: 0.72 }
      : { color: layer.color, roughness: 0.9, metalness: 0 };

  return (
    <group ref={ref} position={[0, baseY, 0]}>
      <RoundedBox
        args={dims}
        radius={layer.key === "foam" ? 0.35 : 0.5}
        smoothness={4}
        castShadow
        receiveShadow
        onClick={(e) => {
          e.stopPropagation();
          onClick(layer.key);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => (document.body.style.cursor = "auto")}
      >
        <meshPhysicalMaterial {...matProps} />
      </RoundedBox>
      {showCallout && (
        <Html position={[dims[0] / 2 + 0.3, 0, 0]} center distanceFactor={8} occlude={false}>
          <div
            className="font-mono text-[11px] whitespace-nowrap px-3 py-2 rounded-sm border backdrop-blur-md"
            style={{
              background: "rgba(10,10,11,0.85)",
              borderColor: "rgba(245,241,232,0.18)",
              color: "#F5F1E8",
            }}
          >
            <div style={{ color: "#D8BD8C" }}>{layer.metric}</div>
            <div className="opacity-70">{layer.metricLabel}</div>
          </div>
        </Html>
      )}
    </group>
  );
}

function PillowRig({ explode, activeLayer, setActiveLayer, coverColor, material }) {
  const group = useRef();
  useFrame((state) => {
    if (group.current && activeLayer === null) {
      group.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.15) * 0.35 + 0.3;
    }
  });
  return (
    <group ref={group}>
      {LAYERS.map((layer, i) => (
        <LayerMesh
          key={layer.key}
          layer={layer}
          index={i}
          explode={explode}
          color={layer.key === "cover" ? coverColor : layer.color}
          roughness={material.roughness}
          sheen={material.sheen}
          active={activeLayer === layer.key}
          showCallout={activeLayer === layer.key}
          onClick={setActiveLayer}
        />
      ))}
    </group>
  );
}

function ConfiguratorCanvas({ explode, activeLayer, setActiveLayer, coverColor, material }) {
  return (
    <Canvas shadows camera={{ position: [4.2, 2.4, 5.2], fov: 32 }} dpr={[1, 1.75]}>
      <color attach="background" args={["#0A0A0B"]} />
      <ambientLight intensity={0.45} />
      <directionalLight
        position={[5, 6, 4]}
        intensity={1.4}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <pointLight position={[-4, 2, -3]} intensity={0.5} color="#B4915B" />
      <pointLight position={[3, -2, 4]} intensity={0.3} color="#7C9A8E" />
      <Suspense fallback={null}>
        <group position={[0, -0.2, 0]}>
          <PillowRig
            explode={explode}
            activeLayer={activeLayer}
            setActiveLayer={setActiveLayer}
            coverColor={coverColor}
            material={material}
          />
        </group>
        <ContactShadows position={[0, -1.15, 0]} opacity={0.55} scale={10} blur={2.2} far={3} />
      </Suspense>
      <OrbitControls
        enablePan={false}
        minDistance={3.5}
        maxDistance={8}
        maxPolarAngle={Math.PI / 1.9}
        autoRotate={false}
      />
    </Canvas>
  );
}

/* ============================================================
   SMALL UI PRIMITIVES
============================================================ */
function SplitHeadline({ text, className = "" }) {
  return (
    <span className={`char-reveal ${className}`} aria-label={text}>
      {text.split("").map((ch, i) => (
        <span key={i} style={{ animationDelay: `${i * 0.02}s` }}>
          {ch === " " ? "\u00A0" : ch}
        </span>
      ))}
    </span>
  );
}

function Pill({ children, className = "" }) {
  return (
    <span
      className={`font-mono text-[11px] px-3 py-1.5 rounded-full border ${className}`}
      style={{ borderColor: "var(--hairline)", color: "var(--sand)" }}
    >
      {children}
    </span>
  );
}

function MagneticButton({ children, primary, onClick, className = "" }) {
  const ref = useRef();
  const onMove = (e) => {
    const r = ref.current.getBoundingClientRect();
    const x = e.clientX - r.left - r.width / 2;
    const y = e.clientY - r.top - r.height / 2;
    ref.current.style.transform = `translate(${x * 0.18}px, ${y * 0.28}px)`;
  };
  const onLeave = () => {
    if (ref.current) ref.current.style.transform = "translate(0,0)";
  };
  return (
    <button
      ref={ref}
      onClick={onClick}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={`magnetic px-6 py-3.5 text-sm font-medium rounded-full ${className}`}
      style={
        primary
          ? { background: "var(--brass)", color: "var(--obsidian)" }
          : { background: "transparent", color: "var(--ivory)", border: "1px solid var(--hairline)" }
      }
    >
      {children}
    </button>
  );
}

/* ============================================================
   NAV
============================================================ */
function Nav({ onOpenAR }) {
  return (
    <header className="fixed top-0 left-0 right-0 z-40 px-6 md:px-10 py-5 flex items-center justify-between backdrop-blur-md" style={{ background: "rgba(10,10,11,0.55)", borderBottom: "1px solid var(--hairline)" }}>
      <div className="font-display text-lg tracking-tight" style={{ letterSpacing: "0.02em" }}>
        AURA <span style={{ color: "var(--brass-light)" }}>Comfort</span>
      </div>
      <nav className="hidden md:flex items-center gap-8 font-mono text-[12px]" style={{ color: "var(--sand)" }}>
        <a href="#configurator" className="hover:text-white transition-colors">customizer</a>
        <a href="#engineering" className="hover:text-white transition-colors">engineering</a>
        <a href="#finder" className="hover:text-white transition-colors">sleep finder</a>
        <a href="#reviews" className="hover:text-white transition-colors">reviews</a>
      </nav>
      <button
        onClick={onOpenAR}
        className="magnetic font-mono text-[12px] px-4 py-2 rounded-full border hover:border-[var(--brass-light)] hover:text-[var(--brass-light)] transition-colors"
        style={{ borderColor: "var(--hairline)" }}
      >
        View in your room
      </button>
    </header>
  );
}

/* ============================================================
   HERO
============================================================ */
function Hero({ onExplore, onFind }) {
  return (
    <section className="relative min-h-screen pt-32 pb-16 px-6 md:px-10 grid md:grid-cols-2 gap-10 items-center">
      <div className="max-w-xl fade-up">
        <Pill className="mb-6 inline-block">the aura cushion — engineered for sleep</Pill>
        <h1 className="font-display text-[13vw] md:text-[4.2vw] leading-[0.98] font-normal mb-6" style={{ color: "var(--ivory)" }}>
          <SplitHeadline text="Sleep, held" /> <br />
          <SplitHeadline text="in alignment." />
        </h1>
        <p className="text-[15px] leading-relaxed max-w-md mb-8" style={{ color: "var(--sand)" }}>
          Three engineered layers — a breathable cover, a cooling gel matrix, and a
          contoured memory-foam core — built to keep your spine in one straight line,
          all night.
        </p>
        <div className="flex flex-wrap gap-3 mb-10">
          <MagneticButton primary onClick={onExplore}>Explore 3D customizer</MagneticButton>
          <MagneticButton onClick={onFind}>Find your sleep alignment</MagneticButton>
        </div>
        <div className="flex flex-wrap gap-6 font-mono text-[11px]" style={{ color: "var(--sand)" }}>
          <span className="flex items-center gap-2"><ShieldCheck size={14} style={{ color: "var(--brass-light)" }} /> Ergonomically certified</span>
          <span className="flex items-center gap-2"><Wind size={14} style={{ color: "var(--brass-light)" }} /> 100-night trial</span>
          <span className="flex items-center gap-2"><Sparkles size={14} style={{ color: "var(--brass-light)" }} /> Zero-gravity support</span>
        </div>
      </div>
      <div className="relative h-[52vh] md:h-[70vh] drift">
        <ConfiguratorCanvas
          explode={0.15}
          activeLayer={null}
          setActiveLayer={() => {}}
          coverColor="#D8C7A8"
          material={MATERIALS[0]}
        />
      </div>
    </section>
  );
}

/* ============================================================
   CONFIGURATOR SECTION
============================================================ */
function Configurator() {
  const [explode, setExplode] = useState(0);
  const [activeLayer, setActiveLayer] = useState(null);
  const [materialId, setMaterialId] = useState(MATERIALS[0].id);
  const [colorId, setColorId] = useState(COLORS[0].id);

  const material = MATERIALS.find((m) => m.id === materialId);
  const color = COLORS.find((c) => c.id === colorId);

  return (
    <section id="configurator" className="px-6 md:px-10 py-24 border-t" style={{ borderColor: "var(--hairline)" }}>
      <div className="flex items-end justify-between mb-10 flex-wrap gap-4">
        <div>
          <Pill className="mb-4 inline-block">01 — configurator</Pill>
          <h2 className="font-display text-4xl md:text-5xl">Build your cushion.</h2>
        </div>
        <p className="max-w-sm text-sm" style={{ color: "var(--sand)" }}>
          Drag to rotate. Slide to separate the structural layers. Click any layer
          for its engineering metric.
        </p>
      </div>

      <div className="grid md:grid-cols-[1fr_360px] gap-8">
        <div
          className="relative h-[60vh] rounded-2xl overflow-hidden"
          style={{ background: "var(--charcoal)", border: "1px solid var(--hairline)" }}
        >
          <ConfiguratorCanvas
            explode={explode}
            activeLayer={activeLayer}
            setActiveLayer={(k) => setActiveLayer((prev) => (prev === k ? null : k))}
            coverColor={color.hex}
            material={material}
          />
          <div className="absolute bottom-0 left-0 right-0 p-6 flex items-center gap-4" style={{ background: "linear-gradient(to top, rgba(10,10,11,0.9), transparent)" }}>
            <span className="font-mono text-[11px]" style={{ color: "var(--sand)" }}>assembled</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={explode}
              onChange={(e) => setExplode(parseFloat(e.target.value))}
              className="flex-1 accent-[#B4915B]"
              aria-label="Explode layers"
            />
            <span className="font-mono text-[11px]" style={{ color: "var(--sand)" }}>exploded</span>
          </div>
        </div>

        <div className="flex flex-col gap-8">
          <div>
            <div className="font-mono text-[11px] mb-3" style={{ color: "var(--sand)" }}>fabric</div>
            <div className="flex flex-col gap-2">
              {MATERIALS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMaterialId(m.id)}
                  className="magnetic text-left px-4 py-3 rounded-lg border flex items-center justify-between"
                  style={{
                    borderColor: materialId === m.id ? "var(--brass-light)" : "var(--hairline)",
                    background: materialId === m.id ? "var(--charcoal-2)" : "transparent",
                  }}
                >
                  <div>
                    <div className="text-sm">{m.name}</div>
                    <div className="text-[11px] opacity-60">{m.blurb}</div>
                  </div>
                  {materialId === m.id && <Check size={16} style={{ color: "var(--brass-light)" }} />}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="font-mono text-[11px] mb-3" style={{ color: "var(--sand)" }}>colorway</div>
            <div className="flex gap-3">
              {COLORS.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setColorId(c.id)}
                  aria-label={c.name}
                  className="w-10 h-10 rounded-full relative"
                  style={{
                    background: c.hex,
                    boxShadow: colorId === c.id ? "0 0 0 2px var(--obsidian), 0 0 0 4px var(--brass-light)" : "0 0 0 1px var(--hairline)",
                  }}
                />
              ))}
            </div>
            <div className="text-[11px] mt-2 opacity-60">{color.name}</div>
          </div>

          <div className="pt-4 border-t" style={{ borderColor: "var(--hairline)" }}>
            {LAYERS.map((l) => (
              <button
                key={l.key}
                onClick={() => setActiveLayer((prev) => (prev === l.key ? null : l.key))}
                className="w-full text-left py-3 border-b flex items-start gap-3 last:border-b-0"
                style={{ borderColor: "var(--hairline)" }}
              >
                <span className="font-mono text-[11px] mt-0.5" style={{ color: activeLayer === l.key ? "var(--brass-light)" : "var(--sand)" }}>
                  {l.index}
                </span>
                <span>
                  <span className="block text-sm" style={{ color: activeLayer === l.key ? "var(--brass-light)" : "var(--ivory)" }}>{l.title}</span>
                  <span className="block text-[12px] opacity-60 mt-0.5">{l.desc}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   BENTO GRID
============================================================ */
function HeatMapCard() {
  const [hot, setHot] = useState(false);
  return (
    <div
      className="rounded-2xl p-6 flex flex-col justify-between min-h-[220px] col-span-2 md:col-span-1"
      style={{ border: "1px solid var(--hairline)", background: "var(--charcoal)" }}
    >
      <div className="flex items-center justify-between">
        <Thermometer size={18} style={{ color: "var(--sage)" }} />
        <button
          onClick={() => setHot((h) => !h)}
          className="font-mono text-[10px] px-2.5 py-1 rounded-full border"
          style={{ borderColor: "var(--hairline)", color: "var(--sand)" }}
        >
          {hot ? "night view" : "day view"}
        </button>
      </div>
      <div>
        <div className="text-2xl font-display mb-1">Temperature control</div>
        <div
          className="h-16 rounded-lg mt-3 transition-all duration-700"
          style={{
            background: hot
              ? "linear-gradient(90deg, #7C9A8E, #4E6A61)"
              : "linear-gradient(90deg, #C97B5A, #8B5C42)",
          }}
        />
        <div className="text-[12px] opacity-60 mt-3">
          {hot ? "Gel matrix active — surface cooling engaged." : "Ambient daytime surface reading."}
        </div>
      </div>
    </div>
  );
}

function SustainabilityCard() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let raf;
    const start = performance.now();
    const tick = (t) => {
      const p = Math.min(1, (t - start) / 1400);
      setCount(Math.round(p * 100));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <div
      className="rounded-2xl p-6 flex flex-col justify-between min-h-[220px]"
      style={{ border: "1px solid var(--hairline)", background: "var(--charcoal)" }}
    >
      <Leaf size={18} style={{ color: "var(--sage)" }} />
      <div>
        <div className="font-display text-5xl mb-1" style={{ color: "var(--brass-light)" }}>{count}%</div>
        <div className="text-sm mb-1">Organic-certified materials</div>
        <div className="text-[12px] opacity-60">GOTS &amp; OEKO-TEX verified sourcing, cover to core.</div>
      </div>
    </div>
  );
}

function TiltCard({ icon: Icon, title, desc }) {
  const ref = useRef();
  const onMove = (e) => {
    const r = ref.current.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    ref.current.style.transform = `perspective(600px) rotateX(${-y * 8}deg) rotateY(${x * 8}deg)`;
  };
  const onLeave = () => {
    ref.current.style.transform = "perspective(600px) rotateX(0) rotateY(0)";
  };
  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className="rounded-2xl p-6 min-h-[220px] flex flex-col justify-between transition-transform duration-200"
      style={{ border: "1px solid var(--hairline)", background: "var(--charcoal)" }}
    >
      <Icon size={18} style={{ color: "var(--brass-light)" }} />
      <div>
        <div className="text-sm font-medium mb-1">{title}</div>
        <div className="text-[12px] opacity-60">{desc}</div>
      </div>
    </div>
  );
}

function BentoGrid() {
  return (
    <section id="engineering" className="px-6 md:px-10 py-24 border-t" style={{ borderColor: "var(--hairline)" }}>
      <Pill className="mb-4 inline-block">02 — engineering</Pill>
      <h2 className="font-display text-4xl md:text-5xl mb-10 max-w-lg">Material science, made legible.</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <HeatMapCard />
        <SustainabilityCard />
        <TiltCard icon={Wind} title="Cross-flow ventilation" desc="Channel geometry moves air, not just heat, through the gel layer." />
        <TiltCard icon={Gauge} title="Density-mapped foam" desc="Firmness varies by zone to match shoulder, neck, and head load." />
      </div>
    </section>
  );
}

/* ============================================================
   SLEEP FINDER QUIZ
============================================================ */
function SleepQuiz() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const done = step >= QUIZ_STEPS.length;
  const rec = done ? computeRecommendation(answers) : null;

  const select = (qid, oid) => {
    setAnswers((a) => ({ ...a, [qid]: oid }));
    setTimeout(() => setStep((s) => s + 1), 250);
  };

  const restart = () => {
    setAnswers({});
    setStep(0);
  };

  return (
    <section id="finder" className="px-6 md:px-10 py-24 border-t" style={{ borderColor: "var(--hairline)" }}>
      <Pill className="mb-4 inline-block">03 — sleep finder</Pill>
      <h2 className="font-display text-4xl md:text-5xl mb-10 max-w-lg">Three questions to your ideal cushion.</h2>

      <div className="grid md:grid-cols-[1fr_380px] gap-8">
        <div
          className="rounded-2xl p-8 md:p-10 min-h-[340px] flex flex-col justify-center"
          style={{ border: "1px solid var(--hairline)", background: "var(--charcoal)" }}
        >
          {!done ? (
            <div key={step} className="fade-up">
              <div className="font-mono text-[11px] mb-4" style={{ color: "var(--sand)" }}>
                {step + 1} of {QUIZ_STEPS.length}
              </div>
              <div className="text-2xl font-display mb-8">{QUIZ_STEPS[step].question}</div>
              <div className="flex flex-col gap-3">
                {QUIZ_STEPS[step].options.map((o) => (
                  <button
                    key={o.id}
                    onClick={() => select(QUIZ_STEPS[step].id, o.id)}
                    className="magnetic text-left px-5 py-4 rounded-lg border hover:border-[var(--brass-light)] flex items-center justify-between group"
                    style={{ borderColor: "var(--hairline)" }}
                  >
                    <span>{o.label}</span>
                    <ChevronRight size={16} className="opacity-40 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
              {step > 0 && (
                <button
                  onClick={() => setStep((s) => s - 1)}
                  className="mt-6 font-mono text-[11px] flex items-center gap-1 opacity-60 hover:opacity-100"
                >
                  <ChevronLeft size={14} /> back
                </button>
              )}
            </div>
          ) : (
            <div className="fade-up">
              <div className="font-mono text-[11px] mb-4" style={{ color: "var(--brass-light)" }}>your match</div>
              <div className="grid grid-cols-2 gap-4 mb-6">
                {[
                  ["Firmness", rec.firmness],
                  ["Height profile", rec.height],
                  ["Contour", rec.contour],
                  ["Recommended fabric", rec.material],
                ].map(([label, val]) => (
                  <div key={label}>
                    <div className="text-[11px] opacity-60 mb-1">{label}</div>
                    <div className="text-lg font-display">{val}</div>
                  </div>
                ))}
              </div>
              <button onClick={restart} className="font-mono text-[11px] opacity-60 hover:opacity-100">start over</button>
            </div>
          )}
        </div>

        <div className="rounded-2xl overflow-hidden h-[340px]" style={{ border: "1px solid var(--hairline)", background: "var(--charcoal)" }}>
          <ConfiguratorCanvas
            explode={done ? 0.5 : 0.1}
            activeLayer={null}
            setActiveLayer={() => {}}
            coverColor={done ? (rec.material === "Midnight Velvet" ? "#15181C" : rec.material === "Sand Bamboo" ? "#D8C7A8" : "#8B5C42") : "#D8C7A8"}
            material={MATERIALS.find((m) => m.name === (rec ? rec.material : "Obsidian Silk")) || MATERIALS[0]}
          />
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   COMPARISON SLIDER
============================================================ */
function ComparisonSlider() {
  const [pos, setPos] = useState(50);
  const trackRef = useRef();
  const dragging = useRef(false);

  const updateFromClientX = (clientX) => {
    const r = trackRef.current.getBoundingClientRect();
    const p = ((clientX - r.left) / r.width) * 100;
    setPos(Math.min(100, Math.max(0, p)));
  };

  useEffect(() => {
    const onMove = (e) => {
      if (!dragging.current) return;
      const x = e.touches ? e.touches[0].clientX : e.clientX;
      updateFromClientX(x);
    };
    const onUp = () => (dragging.current = false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("touchmove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchend", onUp);
    };
  }, []);

  const METRICS = [
    ["Pressure distribution", "Uneven, single points of load", "Zone-mapped, zero pressure points"],
    ["Longevity", "Flattens within 8–12 months", "Retains loft past 3 years"],
    ["Spinal alignment", "No structural support", "Cervical-curve contour matched"],
  ];

  return (
    <section className="px-6 md:px-10 py-24 border-t" style={{ borderColor: "var(--hairline)" }}>
      <Pill className="mb-4 inline-block">04 — comparison</Pill>
      <h2 className="font-display text-4xl md:text-5xl mb-10 max-w-lg">Standard pillow vs. Aura.</h2>

      <div
        ref={trackRef}
        className="relative h-16 rounded-xl overflow-hidden select-none cursor-ew-resize"
        style={{ border: "1px solid var(--hairline)" }}
        onMouseDown={(e) => { dragging.current = true; updateFromClientX(e.clientX); }}
        onTouchStart={(e) => { dragging.current = true; updateFromClientX(e.touches[0].clientX); }}
      >
        <div className="absolute inset-0 flex items-center px-6 justify-start font-mono text-[12px]" style={{ background: "#2A2521", color: "var(--sand)" }}>
          Standard pillow
        </div>
        <div
          className="absolute inset-y-0 left-0 flex items-center px-6 font-mono text-[12px] overflow-hidden"
          style={{ width: `${pos}%`, background: "var(--brass)", color: "var(--obsidian)" }}
        >
          <span className="whitespace-nowrap">AURA Comfort</span>
        </div>
        <div
          className="absolute inset-y-0 flex items-center justify-center"
          style={{ left: `calc(${pos}% - 14px)`, width: 28 }}
        >
          <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "var(--obsidian)", border: "2px solid var(--brass-light)" }}>
            <MoveHorizontal size={14} style={{ color: "var(--brass-light)" }} />
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4 mt-6">
        {METRICS.map(([label, before, after]) => (
          <div key={label} className="rounded-xl p-5" style={{ border: "1px solid var(--hairline)" }}>
            <div className="font-mono text-[11px] mb-3 opacity-60">{label}</div>
            <div className="text-[13px] opacity-50 mb-2 line-through decoration-1">{before}</div>
            <div className="text-[14px]" style={{ color: "var(--brass-light)" }}>{after}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ============================================================
   REVIEWS
============================================================ */
function Reviews() {
  const [index, setIndex] = useState(0);
  const [filter, setFilter] = useState("All");
  const profiles = ["All", ...new Set(REVIEWS.map((r) => r.profile))];
  const filtered = filter === "All" ? REVIEWS : REVIEWS.filter((r) => r.profile === filter);
  const current = filtered[index % filtered.length] || filtered[0];

  return (
    <section id="reviews" className="px-6 md:px-10 py-24 border-t" style={{ borderColor: "var(--hairline)" }}>
      <Pill className="mb-4 inline-block">05 — verified sleepers</Pill>
      <div className="flex items-end justify-between flex-wrap gap-4 mb-10">
        <h2 className="font-display text-4xl md:text-5xl max-w-lg">What people wake up to.</h2>
        <div className="flex gap-2 flex-wrap">
          {profiles.map((p) => (
            <button
              key={p}
              onClick={() => { setFilter(p); setIndex(0); }}
              className="font-mono text-[11px] px-3 py-1.5 rounded-full border"
              style={{
                borderColor: filter === p ? "var(--brass-light)" : "var(--hairline)",
                color: filter === p ? "var(--brass-light)" : "var(--sand)",
              }}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {current && (
        <div className="rounded-2xl p-8 md:p-12 max-w-2xl" style={{ border: "1px solid var(--hairline)", background: "var(--charcoal)" }}>
          <div className="flex gap-1 mb-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} size={14} fill={i < current.rating ? "var(--brass-light)" : "none"} style={{ color: "var(--brass-light)" }} />
            ))}
          </div>
          <p className="text-lg font-display leading-relaxed mb-6">&ldquo;{current.text}&rdquo;</p>
          <div className="font-mono text-[12px] opacity-60">{current.name} — {current.profile}</div>
        </div>
      )}

      <div className="flex gap-3 mt-6">
        <button onClick={() => setIndex((i) => (i - 1 + filtered.length) % filtered.length)} className="magnetic w-10 h-10 rounded-full border flex items-center justify-center" style={{ borderColor: "var(--hairline)" }}>
          <ChevronLeft size={16} />
        </button>
        <button onClick={() => setIndex((i) => (i + 1) % filtered.length)} className="magnetic w-10 h-10 rounded-full border flex items-center justify-center" style={{ borderColor: "var(--hairline)" }}>
          <ChevronRight size={16} />
        </button>
      </div>
    </section>
  );
}

/* ============================================================
   AR MODAL
============================================================ */
function qrPattern(seed) {
  const cells = [];
  let s = seed;
  const rand = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  for (let i = 0; i < 121; i++) cells.push(rand() > 0.55);
  return cells;
}

function ARModal({ open, onClose }) {
  const cells = useMemo(() => qrPattern(42), []);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ background: "rgba(10,10,11,0.75)" }} onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="rounded-2xl p-8 max-w-sm w-full fade-up"
        style={{ background: "var(--charcoal)", border: "1px solid var(--hairline)" }}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="font-display text-xl">View in your room</div>
          <button onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>
        <div className="w-40 h-40 mx-auto mb-6 rounded-lg p-3" style={{ background: "var(--ivory)" }}>
          <div className="grid grid-cols-11 gap-[2px] w-full h-full">
            {cells.map((on, i) => (
              <div key={i} style={{ background: on ? "#0A0A0B" : "transparent" }} />
            ))}
          </div>
        </div>
        <p className="text-[13px] text-center opacity-70 mb-6">
          Scan with your phone camera to place the Aura Cushion in your space with AR QuickLook.
        </p>
        <MagneticButton primary className="w-full flex items-center justify-center gap-2" onClick={onClose}>
          <QrCode size={16} /> Continue on this device
        </MagneticButton>
      </div>
    </div>
  );
}

/* ============================================================
   FOOTER
============================================================ */
function Footer() {
  return (
    <footer className="px-6 md:px-10 py-16 border-t flex flex-col md:flex-row justify-between gap-6" style={{ borderColor: "var(--hairline)" }}>
      <div className="font-display text-2xl">AURA Comfort</div>
      <div className="font-mono text-[11px] opacity-50 max-w-sm">
        Engineered sleep support. Designed and assembled with organic-certified
        materials. 100-night trial on every order.
      </div>
    </footer>
  );
}

/* ============================================================
   APP
============================================================ */
export default function App() {
  const [arOpen, setArOpen] = useState(false);

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="aura-root min-h-screen" style={{ scrollBehavior: "smooth" }}>
      <GlobalStyle />
      <div className="grain" />
      <Nav onOpenAR={() => setArOpen(true)} />
      <Hero onExplore={() => scrollTo("configurator")} onFind={() => scrollTo("finder")} />
      <Configurator />
      <BentoGrid />
      <SleepQuiz />
      <ComparisonSlider />
      <Reviews />
      <Footer />
      <ARModal open={arOpen} onClose={() => setArOpen(false)} />
    </div>
  );
}