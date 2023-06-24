import React, { useRef, useEffect, useState, CSSProperties } from "react";
import TextField from "@mui/material/TextField";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Modal from "@mui/material/Modal";
import PinyinEngine from "pinyin-engine";
import { BlockEntity } from "@logseq/libs/dist/LSPlugin";

import { useAppVisible, getTags } from "./utils";

function App() {
  const innerRef = useRef<HTMLDivElement>(null);
  const textFieldRef = useRef(null);
  const visible = useAppVisible();
  const [modalStyle, setModalStyle] = useState<CSSProperties>({
    position: "fixed",
    right: "auto",
    bottom: "auto",
  });
  const [allTags, setAllTags] = useState<string[]>([]);
  const [matchTags, setMatchTags] = useState<string[]>([]);
  const [pinyinEngine, setPinyinEngine] = useState<PinyinEngine | null>(null);
  const [currentBlock, setCurrentBlock] = useState<BlockEntity | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [blockContent, setBlockContent] = useState<string>("");
  const [modalVisible, setModalVisible] = useState(false);

  const initMainUI = async () => {
    logseq.showMainUI();

    const { left, top, rect } =
      (await logseq.Editor.getEditingCursorPosition()) || {};
    if (left === undefined || top === undefined || !rect) {
      return;
    }
    setModalStyle({
      ...modalStyle,
      left: `${rect.left + left}px`,
      top: `${rect.top + top + 25}px`,
    });

    // @ts-ignore next-line
    textFieldRef.current.focus();

    // 按 ESC 键关闭弹窗
    // document.addEventListener(
    //   "keydown",
    //   function (e) {
    //     if (e.key === "Escape") {
    //       logseq.hideMainUI({ restoreEditingCursor: true });
    //       setMatchTags([]);
    //       // setModalVisible(false)
    //     }
    //     e.stopPropagation();
    //   },
    //   false
    // );
  };

  const initPinyinEngine = async () => {
    const tags = await getTags();
    /**
     * 建立数据索引
     * 因为查询出来的 tag 会分 [[]] 和 # 两种形式的，而我们这里不做区分，所以你建立索引之前要去重
     * 但是目前这种用 JS 去重的方法性能比较差，后期看能不能在从 datascript 上去重
     */
    const pinyinEngine = new PinyinEngine([...new Set(tags)]); // TODO: datascript 去重

    setAllTags(tags);
    setPinyinEngine(pinyinEngine);
  };

  useEffect(() => {
    logseq.Editor.registerSlashCommand("tags-picker-pinyin", async () => {
      const currentBlock = await logseq.Editor.getCurrentBlock();
      setCurrentBlock(currentBlock);

      initMainUI();
      initPinyinEngine();

      setModalVisible(true);

      if (!currentBlock?.uuid) return;
      logseq.DB.onBlockChanged(currentBlock.uuid, ({ content }) => {
        setBlockContent(content);
      });
    });
  }, []);

  const handleInputChange = (e: any) => {
    const field = e.target.value;
    if (!field || !pinyinEngine) {
      setMatchTags([]);
      return;
    }
    const matchTags = pinyinEngine.query(field);

    setMatchTags(matchTags);
    setSelectedIndex(0);
  };

  const handleClickTagList = async (index: number) => {
    const tag = matchTags[index];
    setSelectedIndex(index);
    if (!currentBlock?.uuid) return;
    logseq.Editor.updateBlock(currentBlock.uuid, `${blockContent} #${tag}`);
  };

  const handleInputKeyDown = (e: any) => {
    if (e.key === "Enter") {
      handleClickTagList(selectedIndex);
    }
  };

  const handleCloseModal = () => {
    logseq.hideMainUI({ restoreEditingCursor: true });
    setMatchTags([]);
    setModalVisible(false);
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
        {/* <div style={modalStyle} className="tags-picker"> */}
        <Modal
          ref={innerRef}
          style={modalStyle}
          className="tags-picker"
          open={modalVisible}
          hideBackdrop
          onClose={handleCloseModal}
        >
          <>
            <div className="input-container">
              <ListItem>
                <div
                  style={{
                    width: "100%",
                    textAlign: "center",
                    color: "#ddd",
                  }}
                >
                  {`${matchTags.length} / ${allTags.length}`}
                </div>
              </ListItem>
              <TextField
                inputRef={textFieldRef}
                InputLabelProps={{
                  sx: { color: "#ddd" }, // 设置标题颜色
                }}
                InputProps={{
                  sx: {
                    "& fieldset": {
                      borderColor: "#ddd", // 设置边框颜色
                    },
                    color: "#ddd", // 设置内容颜色
                  },
                }}
                fullWidth
                label="拼音首字母或全拼"
                variant="outlined"
                color="info"
                onChange={handleInputChange}
                onKeyDown={handleInputKeyDown}
              />
            </div>
            <div className="list-container">
              {matchTags.length !== 0 && (
                <List>
                  {matchTags.map((item, index) => (
                    <ListItem key={item} disablePadding>
                      <ListItemButton
                        selected={selectedIndex === index}
                        onClick={() => handleClickTagList(index)}
                      >
                        <ListItemText
                          primary={item}
                          style={{ color: "#ddd" }}
                        />
                      </ListItemButton>
                    </ListItem>
                  ))}
                </List>
              )}
            </div>
          </>
        </Modal>
        {/* </div> */}
      </main>
    );
  }
  return null;
}

export default App;
