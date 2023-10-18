import React, { useRef, useEffect, useState, CSSProperties } from "react";
import PinyinEngine from "pinyin-engine";
import { BlockEntity } from "@logseq/libs/dist/LSPlugin";
import throttle from "lodash/throttle";

import TextField from "@mui/material/TextField";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Modal from "@mui/material/Modal";
import CircularProgress from "@mui/material/CircularProgress";
import Button from "@mui/material/Button";

import { useAppVisible, getTags } from "./utils";

const mainContentContainerId = "#app-container";
const contentContainer = top?.document.querySelector(mainContentContainerId);

let containerWidth = 0;
let containerHeight = 0;
containerWidth = contentContainer?.clientWidth || 0;
containerHeight = contentContainer?.clientHeight || 0;

const observer = new ResizeObserver(() => {
  containerWidth = contentContainer?.clientWidth || 0;
  containerHeight = contentContainer?.clientHeight || 0;
});

if (contentContainer) {
  observer.observe(contentContainer);
}

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
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [pinyinEngine, setPinyinEngine] = useState<PinyinEngine | null>(null);
  const [currentBlock, setCurrentBlock] = useState<BlockEntity | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [blockContent, setBlockContent] = useState<string>("");
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isAscend, setIsAscend] = useState(logseq.settings?.["sortType"]);

  const initMainUI = async () => {
    logseq.showMainUI();

    const { left, top, rect } =
      (await logseq.Editor.getEditingCursorPosition()) || {};
    if (left === undefined || top === undefined || !rect) {
      return;
    }

    const _left = rect.left + left;
    const _top = rect.top + top + 25; // 25 为一行 block 的高度，姑且算 25
    const currentLeft = _left + 500 <= containerWidth ? _left : _left - 500; // 500 为弹窗宽
    const currentTop = _top + 420 <= containerHeight ? _top : _top - 25 - 420; // 420 为弹窗高

    setModalStyle({
      ...modalStyle,
      left: `${currentLeft < 0 ? 0 : currentLeft}px`,
      top: `${currentTop < 48 ? 48 : currentTop}px`, // 48 为 Logseq 顶栏的高度，所以设置最小高度 48 避免弹窗按钮被遮挡
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

  const initPinyinEngine = async (currentBlock: BlockEntity, flag = false) => {
    const content = currentBlock.content;
    const tagsByBlock = content
      .match(/(#[^\s#]+)/gi)
      ?.map((i) => i.substring(1));
    console.time("查询耗时: ");
    setLoading(true);
    const tags = await getTags(flag);
    setLoading(false);
    console.timeEnd("查询耗时: ");
    // 过滤掉 block 中已经有的 tag
    const newTags = tags.filter((i: string) => !tagsByBlock?.includes(i));
    const uniqueArray = [...new Set(newTags)] as string[];
    /**
     * 建立数据索引
     * 因为查询出来的 tag 会分 [[]] 和 # 两种形式的，而我们这里不做区分，所以你建立索引之前要去重
     * 但是目前这种用 JS 去重的方法性能比较差，后期看能不能在从 datascript 上去重
     */
    const pinyinEngine = new PinyinEngine(uniqueArray); // TODO: datascript 去重

    setAllTags(uniqueArray);
    // 默认设置所有 tag 为可选项
    setMatchTags(handleSort(uniqueArray, isAscend));
    setPinyinEngine(pinyinEngine);
    setSelectedTags([]);
  };

  const init = async (flag = false) => {
    const currentBlock = await logseq.Editor.getCurrentBlock();
    if (!currentBlock) return;

    setCurrentBlock(currentBlock);
    setBlockContent(currentBlock.content);
    setModalVisible(true);

    initMainUI();
    initPinyinEngine(currentBlock, flag);
  };

  useEffect(() => {
    // 斜杠命令触发
    logseq.Editor.registerSlashCommand("tags-picker-pinyin", () => init());

    // 快捷键触发
    const shortcutKey = logseq.settings && logseq.settings["pinyinShortcutKey"];

    logseq.App.registerCommandShortcut(
      {
        binding: shortcutKey,
      },
      () => {
        console.log("快捷键:", shortcutKey);
        init();
      }
    );

    // 应一位朋友的请求，加入这个功能
    // 选择一段文本，按快捷键，将这段文本作为 tag 插入到当前 block 后
    // -------------------------------------------------------
    // 监听选中文本
    let selectedText = "";
    logseq.Editor.onInputSelectionEnd((e) => {
      selectedText = e.text;
    });
    // 注册快捷键，
    const insertTagShortcutKey =
      logseq.settings && logseq.settings["insertTagShortcutKey"];
    logseq.App.registerCommandShortcut(
      {
        binding: insertTagShortcutKey,
      },
      async () => {
        // 将选中文本作为 tag 插入 block 后
        const currentBlock = await logseq.Editor.getCurrentBlock();
        if (!currentBlock) return;
        await logseq.Editor.updateBlock(
          currentBlock.uuid,
          `${currentBlock.content} #${selectedText}`
        );
        logseq.Editor.exitEditingMode();
      }
    );
    // --------------------------------------------------------
  }, []);

  useEffect(() => {
    // 当前 block 改变时要清空已选标签
    setSelectedTags([]);
    setBlockContent(currentBlock?.content || "");

    // if (!currentBlock?.uuid) return;
    // // 监听块的变化
    // logseq.DB.onBlockChanged(currentBlock.uuid, ({ content }) => {
    //   console.log('content',content)
    //   setBlockContent(content);
    // });
  }, [currentBlock?.uuid]);

  useEffect(() => {
    handleSetIsAscend();
  }, [modalVisible]);

  useEffect(() => {
    const list = handleSort(matchTags, isAscend);
    setMatchTags(list);
  }, [isAscend]);

  const handleSetIsAscend = () => {
    const sortType = logseq.settings && logseq.settings["sortType"];
    setIsAscend(sortType === "升序");
  };

  const handleInputChange = throttle((e: any) => {
    const field = e.target.value;
    if (!field) {
      setMatchTags(handleSort(allTags, isAscend));
      return;
    }

    if (!pinyinEngine) {
      setMatchTags([]);
      return;
    }

    let newPinyinEngine = pinyinEngine;
    let matchTags: string[] = [];

    field.split(" ").forEach((i: string) => {
      matchTags = newPinyinEngine.query(i);
      newPinyinEngine = new PinyinEngine(matchTags);
    });

    // set 之前过滤一下已经插入的 tag
    const newMatchTags = matchTags!.filter((i: string) => !selectedTags.includes(i));

    setMatchTags(handleSort(newMatchTags, isAscend));
    setSelectedIndex(0);
  }, 500);

  const handleClickTagList = async (index: number) => {
    const tag = matchTags[index];
    setSelectedIndex(index);
    // 将已经插入的 tag 过滤掉
    setSelectedTags((values) => {
      const newValues = [...values];
      newValues.push(tag);
      return newValues;
    });
    setMatchTags([...matchTags].filter((i) => i !== tag));
    if (!currentBlock?.uuid) return;
    /**
     * TODO 使用 insertAtEditingCursor 插入性能好不用等待，并且不需要保存块的内容
     * 但是同时将 block 变为编辑模式了，导致在插件中的键盘操作不管用了
     * 如何在 insert 之后退出编辑模式呢 ？
     */
    // logseq.Editor.insertAtEditingCursor(` #${tag}`);
    // 在这个问题没解决之前先用之前的方案
    // TODO: 有这样一个 API 可以试试：logeq.Editor.exitEditingCursor()
    logseq.Editor.updateBlock(currentBlock.uuid, `${blockContent} #${tag}`);
    setBlockContent(`${blockContent} #${tag}`);
  };

  const handleInputKeyDown = (e: any) => {
    if (e.key === "Enter") {
      handleClickTagList(selectedIndex);
    }
  };

  const handleCloseModal = () => {
    handleSetIsAscend();
    logseq.hideMainUI({ restoreEditingCursor: true });
    setMatchTags([]);
    setModalVisible(false);
  };

  const handleSort = (list: string[], flag: boolean): string[] => {
    const newList = [...list].sort((a, b) =>
      flag ? a.length - b.length : b.length - a.length
    );
    return newList;
  };

  if (visible) {
    return (
      <main
        className="logseq-pinyin-tags-picker-main"
        onClick={(e) => {
          if (!innerRef.current?.contains(e.target as any)) {
            handleSetIsAscend();
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
            <div className="search-container">
              <ListItem
                secondaryAction={
                  <>
                    <Button onClick={() => init(true)}>刷新</Button>
                    <Button onClick={() => setIsAscend(!isAscend)}>
                      {isAscend ? "升序" : "降序"}
                    </Button>
                  </>
                }
              >
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
              {loading ? (
                <CircularProgress sx={{ m: "16px auto", display: "block" }} />
              ) : (
                matchTags.length !== 0 && (
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
                )
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
