import { useState, useRef, useCallback } from "react";

const BUILT_IN_IMAGES = [
  { label: "Drake", url: "https://i.imgflip.com/30b1gx.jpg" },
  { label: "Distracted BF", url: "https://i.imgflip.com/1ur9b0.jpg" },
  { label: "Two Buttons", url: "https://i.imgflip.com/1g8my4.jpg" },
  { label: "Change My Mind", url: "https://i.imgflip.com/24y43o.jpg" },
  { label: "Bernie Mittens", url: "https://i.imgflip.com/4ulob7.jpg" },
];

const STICKERS = ["😂", "🔥", "💀", "🤣", "😭", "👀", "🤡", "💯", "🚀", "✨", "🎉", "😤"];

const FILTERS = [
  { label: "None", value: "none" },
  { label: "Grayscale", value: "grayscale(100%)" },
  { label: "Brightness", value: "brightness(1.4)" },
  { label: "Blur", value: "blur(1px)" },
  { label: "Contrast", value: "contrast(1.5)" },
  { label: "Vintage", value: "sepia(60%) contrast(1.1)" },
];

let nextId = 1;

function TextLayer({ layer, onUpdate, onDelete, onSelect, isSelected, containerRef }) {
  const dragging = useRef(false);
  const offset = useRef({ x: 0, y: 0 });

  const handleMouseDown = (e) => {
    e.stopPropagation();
    onSelect(layer.id);
    dragging.current = true;
    offset.current = { x: e.clientX - layer.x, y: e.clientY - layer.y };

    const move = (ev) => {
      if (!dragging.current) return;
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      onUpdate(layer.id, {
        x: ev.clientX - offset.current.x,
        y: ev.clientY - offset.current.y,
      });
    };
    const up = () => { dragging.current = false; window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

  const style = {
    position: "absolute",
    left: layer.x,
    top: layer.y,
    fontSize: layer.fontSize,
    color: layer.color,
    fontWeight: layer.bold ? "bold" : "normal",
    fontStyle: layer.italic ? "italic" : "normal",
    textAlign: layer.align || "left",
    opacity: layer.opacity ?? 1,
    cursor: "move",
    userSelect: "none",
    WebkitTextStroke: layer.outline ? `2px ${layer.outlineColor || "#000"}` : "none",
    border: isSelected ? "2px dashed #6c63ff" : "2px dashed transparent",
    padding: "2px 4px",
    minWidth: 40,
    whiteSpace: "pre",
    lineHeight: 1.2,
    zIndex: layer.zIndex || 1,
  };

  return (
    <div style={style} onMouseDown={handleMouseDown} title="Drag to move">
      {layer.text || "Text"}
    </div>
  );
}

export default function MemeGenerator() {
  const [bgImage, setBgImage] = useState(null);
  const [layers, setLayers] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [filter, setFilter] = useState("none");
  const [history, setHistory] = useState([]);
  const [future, setFuture] = useState([]);
  const containerRef = useRef(null);
  const fileInputRef = useRef(null);

  const saveHistory = (prev) => {
    setHistory(h => [...h.slice(-19), JSON.stringify(prev)]);
    setFuture([]);
  };

  const undo = () => {
    if (!history.length) return;
    const prev = history[history.length - 1];
    setFuture(f => [JSON.stringify(layers), ...f]);
    setLayers(JSON.parse(prev));
    setHistory(h => h.slice(0, -1));
  };

  const redo = () => {
    if (!future.length) return;
    const next = future[0];
    setHistory(h => [...h, JSON.stringify(layers)]);
    setLayers(JSON.parse(next));
    setFuture(f => f.slice(1));
  };

  const addTextLayer = () => {
    const newLayer = {
      id: nextId++,
      type: "text",
      text: "Your text here",
      x: 60,
      y: 60,
      fontSize: 28,
      color: "#ffffff",
      bold: true,
      italic: false,
      align: "left",
      opacity: 1,
      outline: true,
      outlineColor: "#000000",
      zIndex: layers.length + 1,
    };
    saveHistory(layers);
    setLayers(l => [...l, newLayer]);
    setSelectedId(newLayer.id);
  };

  const addSticker = (emoji) => {
    const newLayer = {
      id: nextId++,
      type: "sticker",
      text: emoji,
      x: 80,
      y: 80,
      fontSize: 48,
      color: "#000",
      bold: false,
      italic: false,
      opacity: 1,
      outline: false,
      zIndex: layers.length + 1,
    };
    saveHistory(layers);
    setLayers(l => [...l, newLayer]);
    setSelectedId(newLayer.id);
  };

  const updateLayer = (id, changes) => {
    setLayers(l => l.map(lay => lay.id === id ? { ...lay, ...changes } : lay));
  };

  const deleteLayer = (id) => {
    saveHistory(layers);
    setLayers(l => l.filter(lay => lay.id !== id));
    setSelectedId(null);
  };

  const reorder = (id, dir) => {
    const idx = layers.findIndex(l => l.id === id);
    const newLayers = [...layers];
    if (dir === "up" && idx < layers.length - 1) {
      [newLayers[idx], newLayers[idx + 1]] = [newLayers[idx + 1], newLayers[idx]];
    } else if (dir === "down" && idx > 0) {
      [newLayers[idx], newLayers[idx - 1]] = [newLayers[idx - 1], newLayers[idx]];
    }
    saveHistory(layers);
    setLayers(newLayers.map((l, i) => ({ ...l, zIndex: i + 1 })));
  };

  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setBgImage(url);
    setLayers([]);
    setSelectedId(null);
    setHistory([]);
    setFuture([]);
  };

  const handleBuiltIn = (url) => {
    setBgImage(url);
    setLayers([]);
    setSelectedId(null);
    setHistory([]);
    setFuture([]);
  };

  const downloadMeme = () => {
    const container = containerRef.current;
    if (!container) return;
    import("https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js")
      .catch(() => {})
      .then(() => {
        if (window.html2canvas) {
          window.html2canvas(container, { useCORS: true, allowTaint: true }).then(canvas => {
            const a = document.createElement("a");
            a.download = "my-meme.png";
            a.href = canvas.toDataURL("image/png");
            a.click();
          });
        } else {
          alert("Download library not available. Try right-clicking the meme and saving.");
        }
      });
  };

  const selectedLayer = layers.find(l => l.id === selectedId);

  return (
    <div style={{ minHeight: "100vh", background: "#1a1a2e", color: "#eee", fontFamily: "'Segoe UI', sans-serif", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ background: "#16213e", padding: "14px 24px", borderBottom: "2px solid #6c63ff", display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 28 }}>😂</span>
        <span style={{ fontSize: 22, fontWeight: 700, color: "#6c63ff", letterSpacing: 1 }}>Meme Generator</span>
        <span style={{ marginLeft: "auto", fontSize: 12, color: "#888" }}>5.7 Vibe Coding Exercise</span>
      </div>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Left Panel */}
        <div style={{ width: 240, background: "#16213e", padding: 16, display: "flex", flexDirection: "column", gap: 16, overflowY: "auto", borderRight: "1px solid #333" }}>

          {/* Upload */}
          <Section title="📁 Image">
            <button onClick={() => fileInputRef.current.click()} style={btnStyle("#6c63ff")}>
              Upload Image
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleUpload} />
            <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>Built-in memes:</div>
            {BUILT_IN_IMAGES.map(img => (
              <button key={img.label} onClick={() => handleBuiltIn(img.url)} style={{ ...btnStyle("#2d2d4e"), fontSize: 12, padding: "5px 8px" }}>
                {img.label}
              </button>
            ))}
          </Section>

          {/* Layers */}
          <Section title="📝 Layers">
            <button onClick={addTextLayer} style={btnStyle("#6c63ff")}>+ Add Text</button>
            {layers.length === 0 && <div style={{ fontSize: 11, color: "#666" }}>No layers yet</div>}
            {[...layers].reverse().map((l) => (
              <div key={l.id} onClick={() => setSelectedId(l.id)}
                style={{ background: selectedId === l.id ? "#2a2a5e" : "#22224a", borderRadius: 6, padding: "6px 8px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, border: selectedId === l.id ? "1px solid #6c63ff" : "1px solid transparent" }}>
                <span style={{ fontSize: 14 }}>{l.type === "sticker" ? l.text : "T"}</span>
                <span style={{ flex: 1, fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#ccc" }}>{l.text}</span>
                <button onClick={(e) => { e.stopPropagation(); reorder(l.id, "up"); }} style={iconBtn}>↑</button>
                <button onClick={(e) => { e.stopPropagation(); reorder(l.id, "down"); }} style={iconBtn}>↓</button>
                <button onClick={(e) => { e.stopPropagation(); deleteLayer(l.id); }} style={{ ...iconBtn, color: "#ff6b6b" }}>✕</button>
              </div>
            ))}
          </Section>

          {/* Stickers */}
          <Section title="🎭 Stickers">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {STICKERS.map(s => (
                <button key={s} onClick={() => addSticker(s)}
                  style={{ background: "#22224a", border: "none", borderRadius: 6, fontSize: 22, cursor: "pointer", padding: "4px 6px" }}>
                  {s}
                </button>
              ))}
            </div>
          </Section>

          {/* Filters */}
          <Section title="🎨 Filter">
            <select value={filter} onChange={e => setFilter(e.target.value)}
              style={{ background: "#22224a", color: "#eee", border: "1px solid #444", borderRadius: 6, padding: "6px 8px", width: "100%", fontSize: 13 }}>
              {FILTERS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </Section>

          {/* Undo/Redo + Download */}
          <Section title="💾 Actions">
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={undo} disabled={!history.length} style={{ ...btnStyle("#333"), flex: 1, opacity: history.length ? 1 : 0.4 }}>↩ Undo</button>
              <button onClick={redo} disabled={!future.length} style={{ ...btnStyle("#333"), flex: 1, opacity: future.length ? 1 : 0.4 }}>↪ Redo</button>
            </div>
            <button onClick={downloadMeme} disabled={!bgImage} style={{ ...btnStyle("#22c55e"), opacity: bgImage ? 1 : 0.4 }}>
              ⬇ Download PNG
            </button>
          </Section>
        </div>

        {/* Center Canvas */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, background: "#0f0f23" }}>
          {!bgImage ? (
            <div style={{ textAlign: "center", color: "#555" }}>
              <div style={{ fontSize: 64 }}>🖼️</div>
              <div style={{ fontSize: 16, marginTop: 12 }}>Upload an image or pick a built-in meme to get started</div>
            </div>
          ) : (
            <div
              ref={containerRef}
              onClick={() => setSelectedId(null)}
              style={{ position: "relative", display: "inline-block", maxWidth: "100%", cursor: "default", boxShadow: "0 8px 32px rgba(0,0,0,0.5)", borderRadius: 4 }}>
              <img
                src={bgImage}
                alt="meme base"
                crossOrigin="anonymous"
                style={{ display: "block", maxWidth: "100%", maxHeight: "65vh", filter: filter !== "none" ? filter : "none" }}
              />
              {layers.map(layer => (
                <TextLayer
                  key={layer.id}
                  layer={layer}
                  onUpdate={updateLayer}
                  onDelete={deleteLayer}
                  onSelect={setSelectedId}
                  isSelected={selectedId === layer.id}
                  containerRef={containerRef}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right Panel: Selected Layer Editor */}
        <div style={{ width: 220, background: "#16213e", padding: 16, overflowY: "auto", borderLeft: "1px solid #333" }}>
          {selectedLayer ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: "#6c63ff" }}>Edit Layer</div>

              <Label>Text</Label>
              <textarea
                value={selectedLayer.text}
                rows={3}
                onChange={e => { saveHistory(layers); updateLayer(selectedId, { text: e.target.value }); }}
                style={inputStyle}
              />

              <Label>Font Size: {selectedLayer.fontSize}px</Label>
              <input type="range" min={10} max={120} value={selectedLayer.fontSize}
                onChange={e => updateLayer(selectedId, { fontSize: Number(e.target.value) })}
                style={{ width: "100%" }} />

              <Label>Color</Label>
              <input type="color" value={selectedLayer.color}
                onChange={e => updateLayer(selectedId, { color: e.target.value })}
                style={{ width: "100%", height: 32, border: "none", borderRadius: 4, cursor: "pointer" }} />

              <Label>Opacity: {Math.round((selectedLayer.opacity ?? 1) * 100)}%</Label>
              <input type="range" min={0} max={1} step={0.05} value={selectedLayer.opacity ?? 1}
                onChange={e => updateLayer(selectedId, { opacity: Number(e.target.value) })}
                style={{ width: "100%" }} />

              <Label>Outline</Label>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input type="checkbox" checked={selectedLayer.outline || false}
                  onChange={e => updateLayer(selectedId, { outline: e.target.checked })}
                  style={{ cursor: "pointer" }} />
                <span style={{ fontSize: 12, color: "#aaa" }}>Enable</span>
                {selectedLayer.outline && (
                  <input type="color" value={selectedLayer.outlineColor || "#000000"}
                    onChange={e => updateLayer(selectedId, { outlineColor: e.target.value })}
                    style={{ width: 32, height: 24, border: "none", borderRadius: 4, cursor: "pointer" }} />
                )}
              </div>

              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => updateLayer(selectedId, { bold: !selectedLayer.bold })}
                  style={{ ...btnStyle(selectedLayer.bold ? "#6c63ff" : "#333"), flex: 1, fontWeight: "bold", padding: "6px 0" }}>B</button>
                <button onClick={() => updateLayer(selectedId, { italic: !selectedLayer.italic })}
                  style={{ ...btnStyle(selectedLayer.italic ? "#6c63ff" : "#333"), flex: 1, fontStyle: "italic", padding: "6px 0" }}>I</button>
              </div>

              <button onClick={() => { saveHistory(layers); deleteLayer(selectedId); }}
                style={{ ...btnStyle("#dc2626"), marginTop: 4 }}>🗑 Delete Layer</button>
            </div>
          ) : (
            <div style={{ color: "#555", fontSize: 13, textAlign: "center", marginTop: 40 }}>
              Select a layer to edit its properties
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Helpers
function Section({ title, children }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#6c63ff", letterSpacing: 1, marginBottom: 8, textTransform: "uppercase" }}>{title}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>{children}</div>
    </div>
  );
}

function Label({ children }) {
  return <div style={{ fontSize: 11, color: "#888", marginBottom: -4 }}>{children}</div>;
}

const btnStyle = (bg) => ({
  background: bg,
  color: "#fff",
  border: "none",
  borderRadius: 6,
  padding: "8px 12px",
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 500,
  width: "100%",
  transition: "opacity 0.15s",
});

const iconBtn = {
  background: "none",
  border: "none",
  color: "#888",
  cursor: "pointer",
  fontSize: 12,
  padding: "0 2px",
};

const inputStyle = {
  background: "#22224a",
  color: "#eee",
  border: "1px solid #444",
  borderRadius: 6,
  padding: "6px 8px",
  fontSize: 13,
  width: "100%",
  resize: "vertical",
  fontFamily: "inherit",
};
