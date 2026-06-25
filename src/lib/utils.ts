export function cx(...classes: Array<string | false | undefined>) { return classes.filter(Boolean).join(" "); }
export function asList(value: string) { return value.split(/[，,；;\n]/).map((x) => x.trim()).filter(Boolean); }
