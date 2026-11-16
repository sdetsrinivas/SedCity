"use client";
import dynamic from "next/dynamic";

export const MessagesClient = dynamic(() => import("./MessagesInbox"), {
  ssr: false,
  loading: () => <div className="skeleton" style={{ height: 80 }} />,
});
