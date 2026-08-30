"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  FlaskConical,
  Radio,
  RotateCcw,
  Search,
  Shield,
  Sparkles,
  Swords,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type Scene = "title" | "intro" | "map" | "battle" | "result";
type MapId = "lab" | "unknown";
type Position = { x: number; y: number };
type Dialog = { lines: string[]; index: number; complete?: "partner" | "none" };
type SaveData = { story: number; captured: boolean };

const SAVE_KEY = "powermonstar-save-v1";
const GRID_W = 10;
const GRID_H = 8;

const introLines = [
  "西暦20XX年。世界各地に、地図に存在しない空間が現れた。",
  "重力、時間、記憶さえもねじ曲げる――アンノウンエリア。",
  "そこから現れた未知の生命体を、研究者たちは『パワモン』と呼んだ。",
  "そして今日、ひとりの新人調査員が研究施設を訪れる。",
];

const professorLines = [
  "待っていたよ。君が新しい調査員だね。",
  "保管中のモンスターコアが、君にだけ反応している。",
  "……起動した！ 未確認パワモンとのリンクを確認！",
  "その子と一緒なら、第07アンノウンエリアを調査できるはずだ。",
];

const labBlocked = new Set([
  "1,1", "2,1", "3,1", "5,1", "6,1", "1,2", "2,2", "5,4", "1,5", "2,5", "7,5", "8,5",
]);
const unknownBlocked = new Set([
  "2,1", "3,1", "6,1", "7,1", "2,2", "6,2", "2,3", "4,3", "5,3", "6,3", "8,3", "4,4", "8,4", "1,5", "4,5", "6,5", "8,5", "6,6",
]);

function readSave(): SaveData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    return raw ? (JSON.parse(raw) as SaveData) : null;
  } catch {
    return null;
  }
}

export default function Home() {
  const [scene, setScene] = useState<Scene>("title");
  const [mapId, setMapId] = useState<MapId>("lab");
  const [position, setPosition] = useState<Position>({ x: 4, y: 6 });
  const [story, setStory] = useState(0);
  const [captured, setCaptured] = useState(false);
  const [saveExists, setSaveExists] = useState(false);
  const [introIndex, setIntroIndex] = useState(0);
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [toast, setToast] = useState("マップを移動して、研究員に話しかけよう");

  useEffect(() => {
    const timer = window.setTimeout(() => setSaveExists(Boolean(readSave())), 0);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (story === 0) return;
    window.localStorage.setItem(SAVE_KEY, JSON.stringify({ story, captured } satisfies SaveData));
  }, [story, captured]);

  const startNew = () => {
    window.localStorage.removeItem(SAVE_KEY);
    setStory(0);
    setCaptured(false);
    setIntroIndex(0);
    setScene("intro");
  };

  const continueGame = () => {
    const saved = readSave();
    if (!saved) return startNew();
    setStory(saved.story);
    setCaptured(saved.captured);
    setMapId("lab");
    setPosition({ x: 4, y: 6 });
    setToast(saved.captured ? "調査データを確認しよう" : saved.story >= 2 ? "右上のゲートから調査へ向かおう" : "研究員に話しかけよう");
    setScene(saved.captured ? "result" : "map");
  };

  const advanceIntro = () => {
    if (introIndex < introLines.length - 1) return setIntroIndex((value) => value + 1);
    setStory(1);
    setSaveExists(true);
    setMapId("lab");
    setPosition({ x: 4, y: 6 });
    setScene("map");
  };

  const advanceDialog = useCallback(() => {
    if (!dialog) return;
    if (dialog.index < dialog.lines.length - 1) {
      setDialog({ ...dialog, index: dialog.index + 1 });
      return;
    }
    if (dialog.complete === "partner") {
      setStory((value) => Math.max(value, 2));
      setToast("パワモンが仲間になった！ 右上のゲートへ向かおう");
    }
    setDialog(null);
  }, [dialog]);

  const enterUnknown = useCallback(() => {
    setMapId("unknown");
    setPosition({ x: 1, y: 6 });
    setStory((value) => Math.max(value, 3));
    setToast("第07アンノウンエリア：消失街区を調査せよ");
  }, []);

  const enterLab = useCallback(() => {
    setMapId("lab");
    setPosition({ x: 7, y: 2 });
    setToast("研究施設へ帰還した");
  }, []);

  const isBlocked = useCallback((x: number, y: number) => {
    if (x < 1 || x > GRID_W - 2 || y < 1 || y > GRID_H - 2) return true;
    const key = `${x},${y}`;
    if (mapId === "lab") return labBlocked.has(key);
    if (unknownBlocked.has(key)) return true;
    return !captured && x === 7 && y === 2;
  }, [mapId, captured]);

  const move = useCallback((dx: number, dy: number) => {
    if (scene !== "map" || dialog) return;
    const next = { x: position.x + dx, y: position.y + dy };
    if (mapId === "lab" && next.x === 8 && next.y === 2) {
      if (story < 2) {
        setToast("ゲートはロックされている。研究員に話を聞こう");
        return;
      }
      enterUnknown();
      return;
    }
    if (mapId === "unknown" && next.x === 1 && next.y === 6) {
      enterLab();
      return;
    }
    if (!isBlocked(next.x, next.y)) setPosition(next);
  }, [dialog, enterLab, enterUnknown, isBlocked, mapId, position, scene, story]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowUp") move(0, -1);
      if (event.key === "ArrowDown") move(0, 1);
      if (event.key === "ArrowLeft") move(-1, 0);
      if (event.key === "ArrowRight") move(1, 0);
      if ((event.key === "Enter" || event.key === " ") && dialog) {
        event.preventDefault();
        advanceDialog();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [advanceDialog, dialog, move]);

  const interact = () => {
    if (dialog) return advanceDialog();
    const near = (x: number, y: number) => Math.abs(position.x - x) + Math.abs(position.y - y) <= 1;
    if (mapId === "lab" && near(5, 4)) {
      if (story < 2) setDialog({ lines: professorLines, index: 0, complete: "partner" });
      else setDialog({ lines: [captured ? "信じられないデータだ。あの空間は、消えた世界の記憶なのかもしれない。" : "第07エリアでは、こちらの常識を信じすぎないことだ。"], index: 0, complete: "none" });
      return;
    }
    if (mapId === "unknown" && near(7, 2) && !captured) {
      setScene("battle");
      return;
    }
    if (mapId === "unknown" && near(3, 4)) {
      setDialog({ lines: ["壊れた標識に『ここは、まだ夢の中』と刻まれている。", "文字に触れると、知らない誰かの記憶が一瞬だけ流れ込んできた。"], index: 0, complete: "none" });
      return;
    }
    setToast("近くに調べられるものはないようだ");
  };

  if (scene === "title") {
    return (
      <main className="game-shell title-screen">
        <div className="scanlines" />
        <section className="title-panel" aria-labelledby="game-title">
          <div className="core-mark" aria-hidden="true"><span /></div>
          <p className="eyebrow">UNKNOWN SIGNAL DETECTED</p>
          <h1 id="game-title">PowerMonstar</h1>
          <p className="title-copy">失われた世界と、夢を見るモンスター。</p>
          <div className="title-actions">
            <Button className="primary-game-button" size="lg" onClick={startNew}><Zap /> はじめから</Button>
            {saveExists && <Button className="secondary-game-button" size="lg" onClick={continueGame}><RotateCcw /> つづきから</Button>}
          </div>
          <p className="prototype-label">PROTOTYPE / MISSION 01</p>
        </section>
      </main>
    );
  }

  if (scene === "intro") {
    return (
      <main className="game-shell intro-screen">
        <div className="memory-grid" aria-hidden="true" />
        <div className="intro-signal" aria-hidden="true"><Radio /></div>
        <section className="story-card" aria-live="polite">
          <span className="story-count">0{introIndex + 1} / 04</span>
          <p>{introLines[introIndex]}</p>
          <Button className="story-next" onClick={advanceIntro}>次へ <ChevronRight /></Button>
        </section>
      </main>
    );
  }

  if (scene === "battle") {
    return <Battle onVictory={() => { setCaptured(true); setStory(4); setScene("result"); }} />;
  }

  if (scene === "result") {
    return (
      <main className="game-shell result-screen">
        <div className="result-orbit" aria-hidden="true" />
        <section className="result-card">
          <p className="eyebrow">LINK COMPLETE</p>
          <MonsterSilhouette variant="small" />
          <h1>未確認パワモンを記録</h1>
          <div className="file-number">FILE No. 001</div>
          <p>消えた街の記憶を持つパワモン。眠っている間、知らない世界の言葉を話す。</p>
          <div className="mystery-note"><Search /> 新たな疑問：これは世界の記憶か、それとも誰かの夢なのか？</div>
          <Button className="primary-game-button" size="lg" onClick={() => { setMapId("lab"); setPosition({ x: 4, y: 6 }); setToast("MISSION 01 COMPLETE — 研究員に報告しよう"); setScene("map"); }}>研究施設へ戻る</Button>
          <Button className="text-button" variant="ghost" onClick={() => setScene("title")}>タイトルへ</Button>
        </section>
      </main>
    );
  }

  return (
    <main className={`game-shell map-screen ${mapId}`}>
      <header className="game-hud">
        <div><span className="hud-kicker">CURRENT AREA</span><strong>{mapId === "lab" ? "パワモン研究施設" : "第07アンノウンエリア"}</strong></div>
        <div className="signal-pill"><Radio /> {mapId === "lab" ? "SAFE" : "UNSTABLE"}</div>
      </header>
      <section className="mission-strip">
        <span>MISSION 01</span>
        <p>{captured ? "研究員に調査結果を報告する" : story < 2 ? "主任研究員に話しかける" : mapId === "lab" ? "調査ゲートに入る" : "未知の反応を調査する"}</p>
      </section>
      <GameMap mapId={mapId} position={position} captured={captured} />
      <div className="map-toast" aria-live="polite">{toast}</div>
      <section className="mobile-controls" aria-label="移動操作">
        <div className="dpad">
          <Button aria-label="上へ移動" className="dpad-up" onClick={() => move(0, -1)}><ChevronUp /></Button>
          <Button aria-label="左へ移動" className="dpad-left" onClick={() => move(-1, 0)}><ChevronLeft /></Button>
          <span className="dpad-core" />
          <Button aria-label="右へ移動" className="dpad-right" onClick={() => move(1, 0)}><ChevronRight /></Button>
          <Button aria-label="下へ移動" className="dpad-down" onClick={() => move(0, 1)}><ChevronDown /></Button>
        </div>
        <Button className="action-button" onClick={interact} aria-label="調べる・話す"><span>A</span>調べる</Button>
      </section>
      {dialog && (
        <button className="dialog-box" onClick={advanceDialog} aria-live="polite">
          <span className="dialog-name">{dialog.complete === "partner" ? "主任研究員 クロガネ" : "調査ログ"}</span>
          <p>{dialog.lines[dialog.index]}</p><ChevronDown />
        </button>
      )}
    </main>
  );
}

function GameMap({ mapId, position, captured }: { mapId: MapId; position: Position; captured: boolean }) {
  const tiles = useMemo(() => Array.from({ length: GRID_W * GRID_H }, (_, index) => index), []);
  return (
    <div className="map-frame">
      <div className="tile-map" aria-label={mapId === "lab" ? "研究施設マップ" : "異常空間マップ"}>
        {tiles.map((tile) => <span key={tile} className={`tile tile-${mapId}`} />)}
        {mapId === "lab" ? (
          <>
            <MapObject x={5} y={4} className="researcher" label="主任研究員"><FlaskConical /></MapObject>
            <MapObject x={8} y={2} className="gate" label="調査ゲート"><span className="gate-ring" /></MapObject>
            <MapObject x={1} y={1} className="lab-console wide" label="解析装置"><span /></MapObject>
            <MapObject x={7} y={5} className="lab-console" label="保管装置"><span /></MapObject>
          </>
        ) : (
          <>
            <MapObject x={1} y={6} className="return-gate" label="帰還ゲート"><span className="gate-ring" /></MapObject>
            <MapObject x={3} y={4} className="memory-sign" label="壊れた標識">?</MapObject>
            {!captured && <MapObject x={7} y={2} className="wild-signal" label="未知の反応"><MonsterSilhouette variant="map" /></MapObject>}
          </>
        )}
        <MapObject x={position.x} y={position.y} className="player" label="主人公"><span className="player-arrow" /></MapObject>
      </div>
    </div>
  );
}

function MapObject({ x, y, className, label, children }: { x: number; y: number; className: string; label: string; children: React.ReactNode }) {
  return <div className={`map-object ${className}`} style={{ left: `${x * 10}%`, top: `${y * 12.5}%` }} aria-label={label}>{children}</div>;
}

function MonsterSilhouette({ variant = "battle" }: { variant?: "battle" | "map" | "small" }) {
  return (
    <div className={`monster-silhouette ${variant}`} aria-label="未確認パワモンのシルエット">
      <span className="unknown-mark">?</span><i className="signal-dot dot-one" /><i className="signal-dot dot-two" /><i className="signal-dot dot-three" />
    </div>
  );
}

type Intent = "charge" | "attack" | "guard";
type MoveId = "rush" | "break" | "counter" | "link";

function Battle({ onVictory }: { onVictory: () => void }) {
  const [playerHp, setPlayerHp] = useState(36);
  const [enemyHp, setEnemyHp] = useState(42);
  const [power, setPower] = useState(0);
  const [turn, setTurn] = useState(0);
  const [locked, setLocked] = useState(false);
  const [won, setWon] = useState(false);
  const [message, setMessage] = useState("敵の構えを読んで、技を選べ！");
  const intent: Intent = (["charge", "attack", "guard"] as Intent[])[turn % 3];
  const intentLabel = { charge: "パワーをためている", attack: "強攻撃の構え", guard: "防御の構え" }[intent];

  const resetBattle = () => {
    setPlayerHp(36); setEnemyHp(42); setPower(0); setTurn(0); setLocked(false); setWon(false); setMessage("敵の構えを読んで、技を選べ！");
  };

  const performMove = (move: MoveId) => {
    if (locked || won) return;
    if (move === "break" && power < 2) return setMessage("ブレイクにはパワーが2必要だ");
    if (move === "link" && power < 5) return setMessage("パワーリンクにはパワーが5必要だ");
    setLocked(true);
    let damage = 0;
    let nextPower = power;
    let playerDamage = 0;
    let actionText = "";
    if (move === "rush") {
      damage = intent === "charge" ? 13 : intent === "guard" ? 4 : 7;
      nextPower = Math.min(5, power + 1);
      actionText = intent === "charge" ? "ラッシュ成功！ ためを打ち消した！" : "ラッシュ攻撃！";
    }
    if (move === "break") {
      damage = intent === "guard" ? 15 : 8;
      nextPower = power - 2;
      actionText = intent === "guard" ? "ブレイク成功！ 防御を破った！" : "ブレイク攻撃！";
    }
    if (move === "counter") {
      damage = intent === "attack" ? 12 : 0;
      nextPower = Math.min(5, power + 1);
      actionText = intent === "attack" ? "カウンター成功！ 攻撃を跳ね返した！" : "攻撃に備えたが、敵は動かなかった";
    }
    if (move === "link") {
      damage = 22; nextPower = 0; actionText = "POWER LINK！ シグナル・オーバーレイ！";
    }
    if (intent === "attack") playerDamage = move === "counter" ? 2 : 10;
    if (intent === "charge" && move !== "rush") actionText += " 敵の力が増幅していく…";
    const nextEnemyHp = Math.max(0, enemyHp - damage);
    const nextPlayerHp = Math.max(0, playerHp - playerDamage);
    setMessage(actionText); setEnemyHp(nextEnemyHp); setPlayerHp(nextPlayerHp); setPower(nextPower);
    window.setTimeout(() => {
      if (nextEnemyHp === 0) { setWon(true); setMessage("未知のパワモンからリンク信号を検出！"); }
      else if (nextPlayerHp === 0) setMessage("リンクが途切れた……再接続しよう");
      else setTurn((value) => value + 1);
      setLocked(false);
    }, 520);
  };

  return (
    <main className="game-shell battle-screen">
      <div className="battle-noise" />
      <header className="battle-header">
        <div><span>ENCOUNTER</span><strong>UNKNOWN SIGNAL</strong></div>
        <div className={`intent-badge ${intent}`}>
          {intent === "attack" ? <Swords /> : intent === "guard" ? <Shield /> : <Zap />}
          <span>NEXT<strong>{intentLabel}</strong></span>
        </div>
      </header>
      <section className="battle-field">
        <div className="enemy-unit">
          <div className="unit-info enemy-info"><span>未確認個体</span><strong>UNKNOWN</strong><HpBar value={enemyHp} max={42} /></div>
          <MonsterSilhouette />
        </div>
        <div className="player-unit">
          <div className="partner-placeholder" aria-label="味方パワモン仮表示"><Sparkles /><span>LINK-01</span></div>
          <div className="unit-info player-info"><span>リンク個体</span><strong>シグナル01</strong><HpBar value={playerHp} max={36} /></div>
        </div>
      </section>
      <section className="battle-console">
        <div className="battle-message" aria-live="polite">{message}</div>
        <div className="power-meter"><span>POWER</span><div>{Array.from({ length: 5 }, (_, index) => <i key={index} className={index < power ? "filled" : ""} />)}</div></div>
        {playerHp === 0 ? (
          <Button className="primary-game-button battle-retry" onClick={resetBattle}><RotateCcw /> 再接続する</Button>
        ) : won ? (
          <Button className="link-button" onClick={onVictory}><Radio /> パワーリンクする</Button>
        ) : (
          <div className="move-grid">
            <Button disabled={locked} onClick={() => performMove("rush")} className="move-button rush-move"><Zap /><span><strong>ラッシュ</strong><small>ためを妨害・POWER +1</small></span></Button>
            <Button disabled={locked || power < 2} onClick={() => performMove("break")} className="move-button break-move"><Swords /><span><strong>ブレイク</strong><small>防御を破壊・POWER -2</small></span></Button>
            <Button disabled={locked} onClick={() => performMove("counter")} className="move-button counter-move"><Shield /><span><strong>カウンター</strong><small>攻撃を反射・POWER +1</small></span></Button>
            <Button disabled={locked || power < 5} onClick={() => performMove("link")} className="move-button link-move"><Sparkles /><span><strong>パワーリンク</strong><small>最大出力・POWER -5</small></span></Button>
          </div>
        )}
      </section>
    </main>
  );
}

function HpBar({ value, max }: { value: number; max: number }) {
  return <div className="hp-wrap"><span>HP</span><div className="hp-track"><i style={{ width: `${(value / max) * 100}%` }} /></div><b>{value}</b></div>;
}
