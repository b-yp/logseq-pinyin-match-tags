import React, { useRef } from "react";

import { useAppVisible } from "./utils";

function App() {
  const innerRef = useRef<HTMLDivElement>(null);
  const visible = useAppVisible();

  if (visible) {
    return (
      <main
        className="logseq-pinyin-tag-picker"
        onClick={(e) => {
          if (!innerRef.current?.contains(e.target as any)) {
            logseq.hideMainUI();
          }
        }}
      >
        <div ref={innerRef} className="tags-picker">
          tags-picker
        </div>
      </main>
    );
  }
  return null;
}

export default App;
