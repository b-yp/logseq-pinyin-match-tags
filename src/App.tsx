import React, { useRef, useEffect, useState } from "react";
import TextField from "@mui/material/TextField";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import PinyinEngine from "pinyin-engine";

import { useAppVisible, getTags } from "./utils";

function App() {
  const innerRef = useRef<HTMLDivElement>(null);
  const visible = useAppVisible();
  const [modalStyle, setModalStyle] = useState({});
  const [matchTags, setMatchTags] = useState<string[]>([]);
  const [pinyinEngine, setPinyinEngine] = useState<PinyinEngine | null>(null);

  const initMainUI = async () => {
    logseq.showMainUI();

    const { left, top, rect } =
      (await logseq.Editor.getEditingCursorPosition()) || {};
    console.log(">>", left, top, rect);
    if (left === undefined || top === undefined || !rect) {
      return;
    }
    setModalStyle({
      left: `${rect.left + left}px`,
      top: `${rect.top + top + 25}px`,
    });

    // 按 ESC 键关闭弹窗
    document.addEventListener(
      "keydown",
      function (e) {
        if (e.key === "Escape") {
          logseq.hideMainUI({ restoreEditingCursor: true });
        }
        e.stopPropagation();
      },
      false
    );
  };

  const initPinyinEngine = async () => {
    const tags = await getTags();
    // 建立数据索引
    const pinyinEngine = new PinyinEngine(tags);

    setPinyinEngine(pinyinEngine);
  };

  useEffect(() => {
    logseq.Editor.registerSlashCommand("pinyin-tags", async () => {
      initMainUI();
      initPinyinEngine();
    });
  }, []);

  const handleInputChange = (e) => {
    const field = e.target.value;
    if (!field || !pinyinEngine) {
      setMatchTags([]);
      return;
    }
    const matchTags = pinyinEngine.query(field);

    setMatchTags(matchTags);
  };

  if (visible) {
    return (
      <main
        className="logseq-pinyin-tags-picker-main"
        onClick={(e) => {
          if (!innerRef.current?.contains(e.target as any)) {
            logseq.hideMainUI();
          }
        }}
      >
        <div ref={innerRef} style={modalStyle} className="tags-picker">
          <div className="input-container">
            <TextField
              className="text-field"
              label="拼音"
              variant="outlined"
              onChange={handleInputChange}
            />
          </div>
          <div className="list-container">
            {matchTags.length !== 0 && (
              <List>
                {matchTags.map((i) => (
                  <ListItem key={i}>{i}</ListItem>
                ))}
              </List>
            )}
          </div>
        </div>
      </main>
    );
  }
  return null;
}

export default App;
