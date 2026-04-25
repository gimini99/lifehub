import { useCallback, useRef, useState } from "react";

interface Props {
  onFile: (text: string, fileName: string) => void;
}

export function FileDrop({ onFile }: Props) {
  const [over, setOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const read = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = () => onFile(String(reader.result ?? ""), file.name);
    reader.readAsText(file);
  }, [onFile]);

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const f = e.dataTransfer.files?.[0];
        if (f) read(f);
      }}
      className={[
        "rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition",
        over ? "border-cyan-400 bg-cyan-400/5" : "border-ink-700 hover:border-ink-700/80 hover:bg-ink-800/40",
      ].join(" ")}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) read(f);
          e.target.value = "";
        }}
      />
      <div className="text-base font-medium">Drop your Fidelity portfolio CSV</div>
      <div className="text-sm text-slate-400 mt-1">or tap to browse — file stays on this device</div>
    </div>
  );
}
