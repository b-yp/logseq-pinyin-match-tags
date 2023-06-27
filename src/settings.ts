import {  SettingSchemaDesc } from "@logseq/libs/dist/LSPlugin";

export const settings: SettingSchemaDesc[] = [
  {
    key: "pinyinShortcutKey",
    description: "/tags-picker-pinyin 弹窗拼音匹配快捷键",
    type: "string",
    default: "mod+t",
    title: "拼音匹配快捷键",
  },
];
