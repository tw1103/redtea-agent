import type { Metadata } from "next";
import "./globals.css";
import "./process-flow.css";
import "./concise-results.css";
import "./settings.css";
import "./cyber-theme.css";
export const metadata: Metadata = { title: "业务场景拆解 Agent", description: "拆业务、拆任务，判断 RPA、AI、API、规则、工作流与人工如何组合" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="zh-CN"><body>{children}</body></html>; }
