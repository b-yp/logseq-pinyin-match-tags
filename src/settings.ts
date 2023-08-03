import { SettingSchemaDesc } from "@logseq/libs/dist/LSPlugin";

export const settings: SettingSchemaDesc[] = [
  {
    key: "pinyinShortcutKey",
    description: "弹窗拼音匹配快捷键，默认是 mod+t (mod 在 Windows 下是 Ctrl，在 Mac 下是 Command), 注意📢：如果修改快捷键要重新关闭打开一下插件新快捷键才能生效",
    type: "string",
    default: "mod+t",
    title: "拼音匹配快捷键",
  },
];
