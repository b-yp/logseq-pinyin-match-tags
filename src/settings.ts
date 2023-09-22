import { SettingSchemaDesc } from "@logseq/libs/dist/LSPlugin";

export const settings: SettingSchemaDesc[] = [
  {
    key: "pinyinShortcutKey",
    title: "拼音匹配快捷键",
    description: "弹窗拼音匹配快捷键，默认是 mod + t (mod 在 Windows 下是 Ctrl，在 Mac 下是 Command), 注意📢：如果修改快捷键需要重启 Logseq 才能生效",
    type: "string",
    default: "mod+t",
  },
  {
    key: "insertTagShortcutKey",
    title: "插入标签快捷键",
    description: "弹窗拼音匹配快捷键，默认是 mod + shift + i, 注意📢：如果修改快捷键需要重启 Logseq 才能生效",
    type: "string",
    default: "mod+shift+i",
  },
  {
    key: "sortType",
    title: "默认排序方式",
    description: "默认排序方式",
    type: "enum",
    default: "升序",
    enumChoices: ["升序", "降序"],
    enumPicker: "radio",
  },
];
