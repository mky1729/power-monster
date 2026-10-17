"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Boxes,
  FlaskConical,
  Radio,
  RotateCcw,
  Save,
  Search,
  Shield,
  Sparkles,
  Swords,
  UsersRound,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import { type PowmonId, type CardType, type ItemId, CARD_IMAGE_ROOT, cardNames, powmons, getPowmon, powmonName, powmonImage, cardImageFor, captureChance, forestTrees, forestSpots, forestItems, nextForestPowmon } from "@/lib/powmon";

type Scene = "title" | "intro" | "map" | "battle" | "battle2" | "result" | "result2" | "forest-battle" | "forest-result";
type MapId = "lab" | "unknown" | "dream" | "forest";
type Position = { x: number; y: number };
type GameDialog = { lines: string[]; index: number; complete?: "partner" | "mission2" | "none" };
type CapturedCards = Partial<Record<PowmonId, CardType>>;
type SaveData = { story: number; captured: boolean; fragments?: number[]; collection?: PowmonId[]; party?: PowmonId[]; evolved?: PowmonId[]; capturedCards?: CapturedCards; items?: ItemId[] };

const SAVE_KEY = "powermonstar-save-v1";
const GRID_W = 10;
const GRID_H = 8;
const ALLY_IMAGE = "https://raw.githubusercontent.com/mky1729/power-monster/main/public/powermon/ally-001.jpeg";
const ALLY_EVOLVED_IMAGE = "https://raw.githubusercontent.com/mky1729/power-monster/main/public/powermon/ally-002.jpeg";
const ENEMY_IMAGE = "https://raw.githubusercontent.com/mky1729/power-monster/main/public/powermon/enemy-001.png";
const ENEMY_EVOLVED_IMAGE = "https://raw.githubusercontent.com/mky1729/power-monster/main/public/powermon/enemy-002.jpeg";

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

const mission2Lines = [
  "持ち帰ったデータを解析した。だが、奇妙なことが分かった。",
  "あのパワモンの記憶は、ひとつの世界ではなく『誰かの夢』につながっている。",
  "ゲートのさらに奥に、3つの記憶反応が出現した。",
  "MISSION 02を開始する。夢界深層から、記憶片を回収してくれ。",
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
  const [fragments, setFragments] = useState<number[]>([]);
  const [collection, setCollection] = useState<PowmonId[]>([]);
  const [party, setParty] = useState<PowmonId[]>([]);
  const [evolved, setEvolved] = useState<PowmonId[]>([]);
  const [capturedCards, setCapturedCards] = useState<CapturedCards>({});
  const [items, setItems] = useState<ItemId[]>([]);
  const [forestEnemy, setForestEnemy] = useState<PowmonId>("raihin");
  const [forestCard, setForestCard] = useState<CardType>("monster");
  const [boxOpen, setBoxOpen] = useState(false);
  const [saveExists, setSaveExists] = useState(false);
  const [introIndex, setIntroIndex] = useState(0);
  const [dialog, setDialog] = useState<GameDialog | null>(null);
  const [toast, setToast] = useState("マップを移動して、研究員に話しかけよう");

  useEffect(() => {
    const timer = window.setTimeout(() => setSaveExists(Boolean(readSave())), 0);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (story === 0) return;
    window.localStorage.setItem(SAVE_KEY, JSON.stringify({ story, captured, fragments, collection, party, evolved, capturedCards, items } satisfies SaveData));
  }, [story, captured, fragments, collection, party, evolved, capturedCards, items]);

  const startNew = () => {
    window.localStorage.removeItem(SAVE_KEY);
    setStory(0);
    setCaptured(false);
    setFragments([]);
    setCollection([]);
    setParty([]);
    setEvolved([]);
    setCapturedCards({});
    setItems([]);
    setIntroIndex(0);
    setScene("intro");
  };

  const continueGame = () => {
    const saved = readSave();
    if (!saved) return startNew();
    setStory(saved.story);
    setCaptured(saved.captured);
    setFragments(saved.fragments ?? []);
    const legacyCollection: PowmonId[] = saved.collection ?? [
      ...(saved.story >= 2 ? ["ally-001" as const] : []),
      ...(saved.captured ? ["enemy-001" as const] : []),
      ...(saved.story >= 7 ? ["enemy-overdrive" as const] : []),
    ];
    setCollection(legacyCollection);
    setParty(saved.party ?? legacyCollection.slice(0, 6));
    setEvolved(saved.evolved ?? []);
    setItems(saved.items ?? []);
    setCapturedCards(saved.capturedCards ?? Object.fromEntries(legacyCollection.map((id) => [id, "monster"])) as CapturedCards);
    setMapId("lab");
    setPosition({ x: 4, y: 6 });
    setToast(saved.story >= 5 ? "MISSION 02：ゲートから夢界深層へ向かおう" : saved.captured ? "調査データを確認しよう" : saved.story >= 2 ? "右上のゲートから調査へ向かおう" : "研究員に話しかけよう");
    setScene("map");
    setToast("下の出口から森へ！ 右上のゲートでは物語の続きを遊べます");
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
      setCollection((value) => value.includes("ally-001") ? value : [...value, "ally-001"]);
      setParty((value) => value.includes("ally-001") ? value : [...value, "ally-001" as const].slice(0, 6));
      setCapturedCards((value) => ({ ...value, "ally-001": value["ally-001"] ?? "monster" }));
      setToast("相棒が仲間になった！ 下の出口から森へ出かけよう");
    }
    if (dialog.complete === "mission2") {
      setStory(5);
      setToast("MISSION 02 START — 右上のゲートから夢界深層へ向かおう");
    }
    setDialog(null);
  }, [dialog]);

  const saveNow = () => {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify({ story, captured, fragments, collection, party, evolved, capturedCards, items } satisfies SaveData));
    setToast("この端末にセーブしました ✓");
  };

  const catchPowmon = (id: PowmonId, card: CardType) => {
    setCollection((value) => value.includes(id) ? value : [...value, id]);
    setParty((value) => value.includes(id) || value.length >= 6 ? value : [...value, id]);
    setCapturedCards((value) => ({ ...value, [id]: card }));
  };

  const evolvePowmon = (id: PowmonId) => {
    if (!getPowmon(id).evolvedImage) return;
    if (id === "ninja" && !items.includes("sword")) return;
    setEvolved((value) => value.includes(id) ? value : [...value, id]);
    setToast(`${powmonName(id, true)}に進化した！`);
  };

  const enterUnknown = useCallback(() => {
    const nextMap = story >= 5 ? "dream" : "unknown";
    setMapId(nextMap);
    setPosition({ x: 1, y: 6 });
    if (nextMap === "unknown") {
      setStory((value) => Math.max(value, 3));
      setToast("第07アンノウンエリア：消失街区を調査せよ");
    } else {
      setToast(`夢界深層：記憶片を回収せよ（${fragments.length}/3）`);
    }
  }, [fragments.length, story]);

  const enterLab = useCallback(() => {
    setMapId("lab");
    setPosition({ x: 7, y: 2 });
    setToast("研究施設へ帰還した");
  }, []);

  const isBlocked = useCallback((x: number, y: number) => {
    if (x < 1 || x > GRID_W - 2 || y < 1 || y > GRID_H - 2) return true;
    const key = `${x},${y}`;
    if (mapId === "lab") return labBlocked.has(key);
    if (mapId === "forest") return forestTrees.some(([tx, ty]) => tx === x && ty === y);
    if (unknownBlocked.has(key)) return true;
    if (mapId === "unknown") return !captured && x === 7 && y === 2;
    return fragments.length === 3 && x === 7 && y === 2;
  }, [mapId, captured, fragments.length]);

  const move = useCallback((dx: number, dy: number) => {
    if (scene !== "map" || dialog || boxOpen) return;
    const next = { x: position.x + dx, y: position.y + dy };
    if (mapId === "lab" && next.x === 4 && next.y === 7) {
      if (story < 2) return setToast("まず研究員に話しかけ、相棒を受け取ろう");
      setMapId("forest"); setPosition({ x: 1, y: 6 });
      setToast("こもれびの森へ！ パワモンの隣で「調べる」を押そう");
      return;
    }
    if (mapId === "forest" && next.x === 0 && next.y === 6) {
      setMapId("lab"); setPosition({ x: 4, y: 6 }); setToast("研究施設へ戻った"); return;
    }
    if (mapId === "lab" && next.x === 8 && next.y === 2) {
      if (story < 2) {
        setToast("ゲートはロックされている。研究員に話を聞こう");
        return;
      }
      enterUnknown();
      return;
    }
    if (mapId !== "lab" && mapId !== "forest" && next.x === 1 && next.y === 6) {
      enterLab();
      return;
    }
    if (!isBlocked(next.x, next.y)) setPosition(next);
  }, [boxOpen, dialog, enterLab, enterUnknown, isBlocked, mapId, position, scene, story]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (boxOpen) return;
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) event.preventDefault();
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
  }, [advanceDialog, boxOpen, dialog, move]);

  const interact = () => {
    if (dialog) return advanceDialog();
    const near = (x: number, y: number) => Math.abs(position.x - x) + Math.abs(position.y - y) <= 1;
    if (mapId === "forest") {
      const item = forestItems.find((i) => !items.includes(i.id) && near(i.x, i.y));
      if (item) {
        setItems((value) => [...value, item.id]);
        setDialog({ lines: [`${item.name}を見つけた！`, item.effect], index: 0 });
        setToast(`${item.name}を道具ポーチに入れた`); return;
      }
      const spot = forestSpots.find((point) => near(point.x, point.y) && nextForestPowmon(point.pool, collection));
      if (spot) { setForestEnemy(nextForestPowmon(spot.pool, collection)!); setScene("forest-battle"); return; }
      setToast("パワモンや光る道具の隣で調べよう。左下の出口から研究施設へ戻れます"); return;
    }
    if (mapId === "lab" && near(5, 4)) {
      if (story < 2) setDialog({ lines: professorLines, index: 0, complete: "partner" });
      else if (story === 4) setDialog({ lines: mission2Lines, index: 0, complete: "mission2" });
      else if (story >= 7) setDialog({ lines: ["3つの記憶片は、すべて同じ夢につながっていた。", "次は夢の主を探す。だが今は、よく戻ってきてくれた。"], index: 0, complete: "none" });
      else setDialog({ lines: [captured ? "夢界深層では、光る記憶片を3つ集めるんだ。" : "第07エリアでは、こちらの常識を信じすぎないことだ。"], index: 0, complete: "none" });
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
    if (mapId === "dream") {
      const fragmentPoints = [
        { id: 1, x: 3, y: 2, text: "誰もいない町で、パワモンと遊ぶ記憶が流れ込んできた。" },
        { id: 2, x: 5, y: 5, text: "研究施設と同じマークが、空いっぱいに浮かんでいる。" },
        { id: 3, x: 7, y: 4, text: "『まだ起こさないで』という声が、深層から聞こえた。" },
      ];
      const target = fragmentPoints.find((point) => !fragments.includes(point.id) && near(point.x, point.y));
      if (target) {
        const nextFragments = [...fragments, target.id];
        setFragments(nextFragments);
        setToast(`記憶片を回収した（${nextFragments.length}/3）`);
        setDialog({
          lines: nextFragments.length === 3 ? [target.text, "3つの記憶が重なり、強大な敵性反応が出現した！"] : [target.text],
          index: 0,
          complete: "none",
        });
        return;
      }
      if (fragments.length === 3 && near(7, 2)) {
        setScene("battle2");
        return;
      }
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
          <h1 id="game-title">PowerMonster</h1>
          <p className="title-copy">失われた世界と、夢を見るモンスター。</p>
          <div className="title-actions">
            <Button className="primary-game-button" size="lg" onClick={startNew}><Zap /> はじめから</Button>
            {saveExists && <Button className="secondary-game-button" size="lg" onClick={continueGame}><RotateCcw /> つづきから</Button>}
          </div>
          <p className="prototype-label">PROTOTYPE / MISSION 01—02</p>
          <p className="title-save-note"><Save /> 進行はこの端末に自動保存されます</p>
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

  if (scene === "forest-battle") {
    return <Battle key={forestEnemy} mode={getPowmon(forestEnemy).boss ? "boss" : "normal"} enemyId={forestEnemy} allyId={party[0] ?? "ally-001"} allyEvolved={evolved.includes(party[0] ?? "ally-001")} items={items} onExit={() => setScene("map")} onVictory={(card) => { catchPowmon(forestEnemy, card); setForestCard(card); setScene("forest-result"); }} />;
  }
  if (scene === "forest-result") {
    return <main className="game-shell result-screen forest-result"><section className="result-card">
      <p className="eyebrow">FOREST COLLECTION</p>
      <CardArtwork id={forestEnemy} card={forestCard} className="result-capture-card" />
      <h1>{powmonName(forestEnemy)}を捕まえた！</h1>
      <div className="file-number"><UsersRound /> {party.includes(forestEnemy) ? "手持ちに加わった！" : "手持ちがいっぱいなのでBOXへ送った！"}</div>
      <p>{cardNames[forestCard]}に保管しました。<br />{getPowmon(forestEnemy).note}</p>
      <Button className="primary-game-button" onClick={() => { setScene("map"); setToast("森のほかの場所も調べてみよう！"); }}>森の探索を続ける</Button>
    </section></main>;
  }

  if (scene === "battle") {
    return <Battle mode="normal" allyEvolved={evolved.includes("ally-001")} onVictory={(card) => { catchPowmon("enemy-001", card); setCaptured(true); setStory(4); setScene("result"); }} />;
  }

  if (scene === "battle2") {
    return <Battle mode="boss" allyEvolved={evolved.includes("ally-001")} onVictory={(card) => { catchPowmon("enemy-overdrive", card); setStory(7); setScene("result2"); }} />;
  }

  if (scene === "result") {
    return (
      <main className="game-shell result-screen">
        <div className="result-orbit" aria-hidden="true" />
        <section className="result-card">
          <p className="eyebrow">CAPTURE COMPLETE</p>
          <CardArtwork id="enemy-001" card={capturedCards["enemy-001"] ?? "monster"} className="result-capture-card" />
          <h1>敵パワモンを捕まえた！</h1>
          <div className="file-number"><UsersRound /> {capturedCards["enemy-001"] === "super" ? "スーパーカード" : "モンスターカード"}で手持ちに加わった！</div>
          <p>消えた街の記憶を持つパワモン。眠っている間、知らない世界の言葉を話す。</p>
          <div className="mystery-note"><Search /> 新たな疑問：これは世界の記憶か、それとも誰かの夢なのか？</div>
          <Button className="primary-game-button" size="lg" onClick={() => { setMapId("lab"); setPosition({ x: 4, y: 6 }); setToast("MISSION 01 COMPLETE — 研究員に報告しよう"); setScene("map"); }}>研究施設へ戻る</Button>
          <Button className="text-button" variant="ghost" onClick={() => setScene("title")}>タイトルへ</Button>
        </section>
      </main>
    );
  }

  if (scene === "result2") {
    return (
      <main className="game-shell result-screen result-two">
        <div className="result-orbit" aria-hidden="true" />
        <section className="result-card">
          <p className="eyebrow">MISSION 02 COMPLETE</p>
          <div className="overdrive-result"><CardArtwork id="enemy-overdrive" card={capturedCards["enemy-overdrive"] ?? "monster"} evolved className="result-capture-card" /></div>
          <h1>オーバードライブ個体を捕まえた！</h1>
          <div className="file-number"><UsersRound /> {capturedCards["enemy-overdrive"] === "super" ? "スーパーカード" : "モンスターカード"}で手持ちに加わった！</div>
          <p>3つの記憶片は、消えた世界ではなく、ひとりの巨大なパワモンが見ている夢につながっていた。</p>
          <div className="mystery-note"><Search /> 新たな反応：夢のさらに奥で、別の誰かがこちらを見ている。</div>
          <Button className="primary-game-button" size="lg" onClick={() => { setMapId("lab"); setPosition({ x: 4, y: 6 }); setToast("MISSION 02 COMPLETE — 主任研究員に報告しよう"); setScene("map"); }}>研究施設へ戻る</Button>
          <Button className="text-button" variant="ghost" onClick={() => setScene("title")}>タイトルへ</Button>
        </section>
      </main>
    );
  }

  const isMission2 = story >= 5;
  const areaName = mapId === "forest" ? "こもれびの森" : mapId === "lab" ? "パワモン研究施設" : mapId === "dream" ? "夢界深層：反転街区" : "第07アンノウンエリア";
  const objective = mapId === "forest" ? `森のパワモンを集めよう（${collection.filter((id) => !["ally-001", "enemy-001", "enemy-overdrive"].includes(id)).length}/9）` : story >= 7
    ? "主任研究員に深層の調査結果を報告する"
    : isMission2
      ? mapId === "lab" ? "調査ゲートから夢界深層へ向かう" : fragments.length < 3 ? `記憶片を回収する（${fragments.length}/3）` : "出現したオーバードライブ個体を倒す"
      : captured ? "研究員に調査結果を報告する" : story < 2 ? "主任研究員に話しかける" : mapId === "lab" ? "下の出口から森へ／右上の調査ゲートへ" : "未知の反応を調査する";

  return (
    <main className={`game-shell map-screen ${mapId}`}>
      <header className="game-hud">
        <div><span className="hud-kicker">CURRENT AREA</span><strong>{areaName}</strong></div>
        <div className="hud-actions">
          <div className="signal-pill"><Radio /> {mapId === "forest" ? "FOREST" : mapId === "lab" ? "SAFE" : mapId === "dream" ? "DREAMING" : "UNSTABLE"}</div>
          <Button className="hud-icon-button" aria-label="手持ちとパワモンBOXを開く" onClick={() => setBoxOpen(true)}><UsersRound /></Button>
          <Button className="hud-icon-button" aria-label="セーブする" onClick={saveNow}><Save /></Button>
        </div>
      </header>
      <section className="mission-strip">
        <span>{mapId === "forest" ? "EXPLORE" : `MISSION ${isMission2 ? "02" : "01"}`}</span>
        <p>{objective}</p>
      </section>
      <GameMap mapId={mapId} position={position} captured={captured} fragments={fragments} collection={collection} items={items} />
      {mapId === "forest" && <div className="forest-help">🌿 パワモンの隣で A：調べる ／ 左下の出口：研究施設</div>}
      {mapId === "lab" && <div className="forest-help">🌳 下の「森へ ↓」から外へ出られます</div>}
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
      <PowmonBox open={boxOpen} onOpenChange={setBoxOpen} collection={collection} party={party} evolved={evolved} capturedCards={capturedCards} items={items} onEvolve={evolvePowmon} onParty={(id) => setParty((value) => [id, ...value.filter((p) => p !== id)].slice(0, 6))} />
    </main>
  );
}

function GameMap({ mapId, position, captured, fragments, collection, items }: { mapId: MapId; position: Position; captured: boolean; fragments: number[]; collection: PowmonId[]; items: ItemId[] }) {
  const tiles = useMemo(() => Array.from({ length: GRID_W * GRID_H }, (_, index) => index), []);
  return (
    <div className="map-frame">
      <div className="tile-map" aria-label={mapId === "forest" ? "こもれびの森マップ" : mapId === "lab" ? "研究施設マップ" : "異常空間マップ"}>
        {tiles.map((tile) => <span key={tile} className={`tile tile-${mapId} ${mapId === "forest" && (Math.floor(tile / GRID_W) === 6 || tile % GRID_W === 4) ? "forest-path" : ""}`} />)}
        {mapId === "forest" ? (
          <>
            {forestTrees.map(([x, y]) => <MapObject key={`${x},${y}`} x={x} y={y} className="forest-tree" label="木"><span /></MapObject>)}
            <MapObject x={0} y={6} className="forest-return" label="研究施設への出口">←</MapObject>
            <MapObject x={7} y={4} className="forest-pond" label="光る泉"><span /></MapObject>
            {forestSpots.map((spot) => { const id = nextForestPowmon(spot.pool, collection); return id ? <MapObject key={spot.label} x={spot.x} y={spot.y} className="forest-wild" label={powmonName(id)}><PowmonArtwork id={id} variant="map" /><span className="forest-spot-name">{spot.label}</span></MapObject> : <MapObject key={spot.label} x={spot.x} y={spot.y} className="forest-found" label={`${spot.label}・調査済み`}>✓</MapObject>; })}
            {forestItems.filter((item) => !items.includes(item.id)).map((item) => <MapObject key={item.id} x={item.x} y={item.y} className="forest-item" label={item.name}><Sparkles /></MapObject>)}
          </>
        ) : mapId === "lab" ? (
          <>
            <MapObject x={4} y={7} className="forest-door" label="森への出口">森へ ↓</MapObject>
            <MapObject x={5} y={4} className="researcher" label="主任研究員"><FlaskConical /></MapObject>
            <MapObject x={8} y={2} className="gate" label="調査ゲート"><span className="gate-ring" /></MapObject>
            <MapObject x={1} y={1} className="lab-console wide" label="解析装置"><span /></MapObject>
            <MapObject x={7} y={5} className="lab-console" label="保管装置"><span /></MapObject>
          </>
        ) : mapId === "unknown" ? (
          <>
            <MapObject x={1} y={6} className="return-gate" label="帰還ゲート"><span className="gate-ring" /></MapObject>
            <MapObject x={3} y={4} className="memory-sign" label="壊れた標識">?</MapObject>
            {!captured && <MapObject x={7} y={2} className="wild-signal" label="未知の反応"><CharacterArtwork side="enemy" variant="map" /></MapObject>}
          </>
        ) : (
          <>
            <MapObject x={1} y={6} className="return-gate" label="帰還ゲート"><span className="gate-ring" /></MapObject>
            {!fragments.includes(1) && <MapObject x={3} y={2} className="memory-fragment" label="記憶片1"><Sparkles /></MapObject>}
            {!fragments.includes(2) && <MapObject x={5} y={5} className="memory-fragment" label="記憶片2"><Sparkles /></MapObject>}
            {!fragments.includes(3) && <MapObject x={7} y={4} className="memory-fragment" label="記憶片3"><Sparkles /></MapObject>}
            {fragments.length === 3 && <MapObject x={7} y={2} className="wild-signal boss-signal" label="オーバードライブ個体"><CharacterArtwork side="enemy" variant="map" evolved /></MapObject>}
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

function CharacterArtwork({ side, variant = "battle", evolved = false }: { side: "ally" | "enemy"; variant?: "battle" | "map" | "result" | "box"; evolved?: boolean }) {
  const image = side === "ally"
    ? evolved ? ALLY_EVOLVED_IMAGE : ALLY_IMAGE
    : evolved ? ENEMY_EVOLVED_IMAGE : ENEMY_IMAGE;
  return (
    <div className={`character-art ${side} ${variant} ${evolved ? "evolved" : ""}`}>
      {/* User-provided artwork is served from the project repository. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={image}
        alt={`${side === "ally" ? "味方" : "敵"}パワモン${evolved ? "の進化後" : ""}`}
        draggable={false}
      />
      <span className="scan-corner corner-one" />
      <span className="scan-corner corner-two" />
    </div>
  );
}

function PowmonArtwork({ id, evolved = false, variant = "battle", side = "enemy" }: { id: PowmonId; evolved?: boolean; variant?: "battle" | "map"; side?: "ally" | "enemy" }) {
  return <div className={`character-art species-art ${side} ${variant}`}>
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={powmonImage(id, evolved)} alt={powmonName(id, evolved)} draggable={false} />
  </div>;
}

function CardArtwork({ id, card, evolved = false, className = "" }: { id: PowmonId; card: CardType; evolved?: boolean; className?: string }) {
  const image = cardImageFor(id, card, evolved);
  return <div className={`powmon-card-art ${card} ${image ? "" : "composed-card"} ${className}`}>
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={image ?? powmonImage(id, evolved)} alt={`${cardNames[card]}に入った${powmonName(id, evolved)}`} draggable={false} />
    <span>{cardNames[card]}</span>
  </div>;
}

function PowmonBox({ open, onOpenChange, collection, party, evolved, capturedCards, items, onEvolve, onParty }: { open: boolean; onOpenChange: (open: boolean) => void; collection: PowmonId[]; party: PowmonId[]; evolved: PowmonId[]; capturedCards: CapturedCards; items: ItemId[]; onEvolve: (id: PowmonId) => void; onParty: (id: PowmonId) => void }) {
  const entries = powmons;
  const caughtEntries = entries.filter((entry) => collection.includes(entry.id));
  const partyEntries = party.flatMap((id) => entries.filter((entry) => entry.id === id));
  const boxEntries = caughtEntries.filter((entry) => !party.includes(entry.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="powmon-box-dialog">
        <DialogHeader>
          <DialogTitle>手持ち・パワモンBOX</DialogTitle>
          <DialogDescription>捕まえたパワモンは、選んだカードに入って手持ちへ加わります。</DialogDescription>
        </DialogHeader>
        <section className="party-section" aria-labelledby="party-title">
          <div className="box-section-title"><span id="party-title"><UsersRound /> 手持ち</span><b>{partyEntries.length} / 6</b></div>
          <div className="party-grid">
            {Array.from({ length: 6 }, (_, index) => {
              const entry = partyEntries[index];
              const hasEvolved = entry ? evolved.includes(entry.id) || entry.id === "enemy-overdrive" : false;
              const canEvolve = entry ? Boolean(entry.evolvedImage) && !hasEvolved && (entry.id !== "ninja" || items.includes("sword")) : false;
              return entry ? (
                <article key={entry.id} className={`party-card ${entry.id === "enemy-overdrive" ? "overdrive-card" : ""} ${hasEvolved ? "evolved-card" : ""}`}>
                  <CardArtwork id={entry.id} card={capturedCards[entry.id] ?? "monster"} evolved={hasEvolved} />
                  <strong title={powmonName(entry.id, hasEvolved)}>{powmonName(entry.id, hasEvolved)}</strong>
                  <button className="party-lead" onClick={() => onParty(entry.id)} disabled={index === 0}>{index === 0 ? "先頭・戦闘に出る" : "先頭にする"}</button>
                  {canEvolve ? (
                    <Button className="evolve-button" size="sm" onClick={() => onEvolve(entry.id)}><Sparkles />進化する</Button>
                  ) : hasEvolved ? <span className="evolved-badge"><Sparkles />進化済み</span> : entry.id === "ninja" && <small className="item-hint">伝説の剣で進化</small>}
                </article>
              ) : <div key={`empty-${index}`} className="party-slot-empty"><span>{index + 1}</span><small>あき</small></div>;
            })}
          </div>
        </section>
        <div className="box-section-title"><span><Boxes /> BOX</span><b>{boxEntries.length}体</b></div>
        <div className="powmon-box-grid">
          {boxEntries.map((entry) => (
            <article key={entry.id} className={`powmon-box-card ${entry.id === "enemy-overdrive" ? "overdrive-card" : ""}`}>
              <CardArtwork id={entry.id} card={capturedCards[entry.id] ?? "monster"} evolved={evolved.includes(entry.id) || entry.id === "enemy-overdrive"} />
              <div><strong>{powmonName(entry.id, evolved.includes(entry.id))}</strong><span>{entry.note}・{cardNames[capturedCards[entry.id] ?? "monster"]}</span><button className="party-lead" onClick={() => onParty(entry.id)}>手持ちの先頭にする{party.length >= 6 ? "（最後の1体はBOXへ）" : ""}</button>{entry.evolvedImage && !evolved.includes(entry.id) && (entry.id !== "ninja" || items.includes("sword")) && <Button className="evolve-button" onClick={() => onEvolve(entry.id)}>進化する</Button>}</div>
            </article>
          ))}
          {boxEntries.length === 0 && <p className="box-empty">手持ちに入りきらないパワモンは、ここへ送られます。</p>}
        </div>
        <section className="item-pouch"><h3>道具ポーチ</h3>{forestItems.map((item) => <div key={item.id} className={items.includes(item.id) ? "found-item" : "missing-item"}>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={item.image} alt={item.name} /><span><strong>{item.name}</strong><small>{items.includes(item.id) ? item.effect : "森で見つけよう"}</small></span></div>)}</section>
        <p className="box-save-help"><Save /> 進化した姿も自動保存されます。進化後は元の姿には戻せません。</p>
      </DialogContent>
    </Dialog>
  );
}

type Intent = "charge" | "attack" | "guard";
type MoveId = "rush" | "break" | "counter" | "link";

function Battle({ onVictory, mode, allyEvolved, enemyId, allyId = "ally-001", items = [], onExit }: { onVictory: (card: CardType) => void; mode: "normal" | "boss"; allyEvolved: boolean; enemyId?: PowmonId; allyId?: PowmonId; items?: ItemId[]; onExit?: () => void }) {
  const isBoss = mode === "boss";
  const playerMaxHp = (isBoss ? 42 : 36) + (items.includes("muffler") ? 8 : 0);
  const enemyMaxHp = isBoss ? 66 : 42;
  const [playerHp, setPlayerHp] = useState(playerMaxHp);
  const [enemyHp, setEnemyHp] = useState(enemyMaxHp);
  const [power, setPower] = useState(0);
  const [turn, setTurn] = useState(0);
  const [locked, setLocked] = useState(false);
  const [won, setWon] = useState(false);
  const [captureLocked, setCaptureLocked] = useState(false);
  const [message, setMessage] = useState("敵の構えを読んで、技を選べ！");
  const intentSequence: Intent[] = isBoss ? ["attack", "charge", "attack", "guard"] : ["charge", "attack", "guard"];
  const intent: Intent = intentSequence[turn % intentSequence.length];
  const intentLabel = { charge: "パワーをためている", attack: "強攻撃の構え", guard: "防御の構え" }[intent];

  const resetBattle = () => {
    setPlayerHp(playerMaxHp); setEnemyHp(enemyMaxHp); setPower(0); setTurn(0); setLocked(false); setWon(false); setCaptureLocked(false); setMessage("敵の構えを読んで、技を選べ！");
  };

  const attemptCapture = (card: CardType) => {
    if (captureLocked) return;
    setCaptureLocked(true);
    const chance = captureChance(card, isBoss);
    setMessage(`${cardNames[card]}を展開！`);
    window.setTimeout(() => {
      if (Math.random() < chance) {
        setMessage("カードリンク成功！ パワモンを捕まえた！");
        window.setTimeout(() => onVictory(card), 650);
      } else {
        setMessage("カードから抜け出した！ カードを選び直そう");
        setCaptureLocked(false);
      }
    }, 720);
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
    if (intent === "attack") playerDamage = move === "counter" ? 2 : isBoss ? 13 : 10;
    if (intent === "charge" && move !== "rush") actionText += " 敵の力が増幅していく…";
    if (damage > 0 && items.includes("glasses")) damage += 2;
    if (damage > 0 && allyEvolved) damage += 2;
    const nextEnemyHp = Math.max(0, enemyHp - damage);
    const nextPlayerHp = Math.max(0, playerHp - (nextEnemyHp === 0 ? 0 : playerDamage));
    setMessage(actionText); setEnemyHp(nextEnemyHp); setPlayerHp(nextPlayerHp); setPower(nextPower);
    window.setTimeout(() => {
      if (nextEnemyHp === 0) { setWon(true); setMessage(isBoss ? "オーバードライブ停止！ 深層コアを安定化できる！" : "未知のパワモンからリンク信号を検出！"); }
      else if (nextPlayerHp === 0) setMessage("リンクが途切れた……再接続しよう");
      else setTurn((value) => value + 1);
      setLocked(false);
    }, 520);
  };

  return (
    <main className={`game-shell battle-screen ${isBoss ? "boss-battle" : ""}`}>
      <div className="battle-noise" />
      <header className="battle-header">
        <div><span>{isBoss ? "BOSS ENCOUNTER" : "ENCOUNTER"}</span><strong>{enemyId ? "こもれびの森" : isBoss ? "OVERDRIVE SIGNAL" : "UNKNOWN SIGNAL"}</strong></div>
        <div className={`intent-badge ${intent}`}>
          {intent === "attack" ? <Swords /> : intent === "guard" ? <Shield /> : <Zap />}
          <span>NEXT<strong>{intentLabel}</strong></span>
        </div>
      </header>
      <section className="battle-field">
        <div className="enemy-unit">
          <div className="unit-info enemy-info"><span>{isBoss ? "夢界深層・敵性反応" : "未確認個体"}</span><strong>{enemyId ? powmonName(enemyId) : isBoss ? "OVERDRIVE" : "UNKNOWN"}</strong><HpBar value={enemyHp} max={enemyMaxHp} /></div>
          {enemyId ? <PowmonArtwork id={enemyId} /> : <CharacterArtwork side="enemy" evolved={isBoss} />}
        </div>
        <div className="player-unit">
          <PowmonArtwork id={allyId} evolved={allyEvolved} side="ally" />
          <div className="unit-info player-info"><span>リンク個体</span><strong>{powmonName(allyId, allyEvolved)}</strong><HpBar value={playerHp} max={playerMaxHp} /></div>
        </div>
      </section>
      <section className="battle-console">
        <div className="battle-message" aria-live="polite">{message}</div>
        <div className="power-meter"><span>POWER</span><div>{Array.from({ length: 5 }, (_, index) => <i key={index} className={index < power ? "filled" : ""} />)}</div></div>
        {playerHp === 0 && !won ? (
          <Button className="primary-game-button battle-retry" onClick={resetBattle}><RotateCcw /> 再接続する</Button>
        ) : won ? (
          <div className="capture-panel" aria-label="捕獲カードを選ぶ">
            <p>捕まえるカードを選ぼう</p>
            <div className="capture-card-grid">
              {(["monster", "super", "rare"] as CardType[]).map((card) => <button key={card} disabled={captureLocked} onClick={() => attemptCapture(card)} className={`capture-card-choice ${card}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`${CARD_IMAGE_ROOT}/${card === "monster" ? "monster" : "super"}_card.jpg`} alt={cardNames[card]} />
                <span><strong>{cardNames[card]}</strong><small>捕獲率 {Math.round(captureChance(card, isBoss) * 100)}％</small></span>
              </button>)}
            </div>
          </div>
        ) : (
          <div className="move-grid">
            <Button disabled={locked} onClick={() => performMove("rush")} className="move-button rush-move"><Zap /><span><strong>ラッシュ</strong><small>ためを妨害・POWER +1</small></span></Button>
            <Button disabled={locked || power < 2} onClick={() => performMove("break")} className="move-button break-move"><Swords /><span><strong>ブレイク</strong><small>防御を破壊・POWER -2</small></span></Button>
            <Button disabled={locked} onClick={() => performMove("counter")} className="move-button counter-move"><Shield /><span><strong>カウンター</strong><small>攻撃を反射・POWER +1</small></span></Button>
            <Button disabled={locked || power < 5} onClick={() => performMove("link")} className="move-button link-move"><Sparkles /><span><strong>パワーリンク</strong><small>最大出力・POWER -5</small></span></Button>
          </div>
        )}
        {onExit && <Button className="forest-battle-exit" disabled={locked || captureLocked} onClick={onExit}>森へ戻る</Button>}
      </section>
    </main>
  );
}

function HpBar({ value, max }: { value: number; max: number }) {
  return <div className="hp-wrap"><span>HP</span><div className="hp-track"><i style={{ width: `${(value / max) * 100}%` }} /></div><b>{value}</b></div>;
}
