import { LSPluginUserEvents } from "@logseq/libs/dist/LSPlugin.user";
import React from "react";

import { QueryResultBlockEntity } from "./logseqQueryResultTypes";

let _visible = logseq.isMainUIVisible;

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

export const getTags = async () => {
  const tags: [string, string, QueryResultBlockEntity][] = await logseq.DB.datascriptQuery(`
    [:find ?content ?tag (pull ?b [*])
      :where
      [?b :block/refs ?page-ref]
      [?b :block/content ?content]
      [?page-ref :block/name ?tag]
    ]
  `);

  return tags.map(i => i[1])
}
