import type { ReactNode } from "react";
export function DataTable({ headers, rows }: { headers: string[]; rows: ReactNode[][] }) { return <div className="table-wrap"><table><thead><tr>{headers.map(h=><th key={h} scope="col">{h}</th>)}</tr></thead><tbody>{rows.map((row,i)=><tr key={i}>{row.map((cell,j)=><td key={j}>{cell}</td>)}</tr>)}</tbody></table></div>; }
export function Tags({ items }: { items: string[] }) { return <div className="tech-list">{items.map(x=><span className="badge" key={x}>{x}</span>)}</div>; }
