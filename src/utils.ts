import { BlockEntity, LSPluginUserEvents } from "@logseq/libs/dist/LSPlugin.user";
import React from "react";

let _visible = logseq.isMainUIVisible;

const localStorageKey = 'byp_pinyin_engine';

function subscribeLogseqEvent<T extends LSPluginUserEvents>(
  eventName: T,
  handler: (...args: any) => void
) {
  logseq.on(eventName, handler);
  return () => {
    logseq.off(eventName, handler);
  };
}

const subscribeToUIVisible = (onChange: () => void) =>
  subscribeLogseqEvent("ui:visible:changed", ({ visible }) => {
    _visible = visible;
    onChange();
  });

export const useAppVisible = () => {
  return React.useSyncExternalStore(subscribeToUIVisible, () => _visible);
};

export const getTags = async (flag = false) => {
  const localTags = JSON.parse(localStorage.getItem(localStorageKey) || '[]')

  if (!flag && localTags.length) {
    return localTags
  }

  const tags: [string, string, BlockEntity][] = await logseq.DB.datascriptQuery(`
    [:find ?content ?tag (pull ?b [*])
      :where
      [?b :block/refs ?page-ref]
      [?b :block/content ?content]
      [?page-ref :block/name ?tag]
    ]
  `);

  const newTags = tags.map(i => i[1])
  localStorage.setItem(localStorageKey, JSON.stringify(newTags));

  return newTags
}

export const isLogseqAttribute = (s: string): boolean => {
  const pattern = /^[^:]+:: .+$/;
  return pattern.test(s);
}
