export interface CreateInput {
  name: string;
  symbol: string;
  description: string;
  logo: string;
  links: { label: string; url: string }[];
}
export function validateIdentity(input: CreateInput): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!input.name.trim() || [...input.name.trim()].length > 64)
    errors.name = "名称必填，最多64个字符";
  if (!input.symbol.trim() || !/^[\x21-\x7E]{1,12}$/.test(input.symbol.trim()))
    errors.symbol = "符号必填，最多12个ASCII字符，不含空格";
  if (new TextEncoder().encode(input.description).length > 2048)
    errors.description = "简介最多2048字节";
  if (!input.logo.trim()) errors.logo = "请选择或填写项目标识";
  return errors;
}
export function validateLinks(
  links: CreateInput["links"],
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const link of links) {
    if (!link.url.trim()) continue;
    try {
      const url = new URL(link.url);
      if (
        !["http:", "https:"].includes(url.protocol) ||
        new TextEncoder().encode(link.url).length > 512
      )
        throw new Error();
    } catch {
      errors[link.label] = "请输入有效的 http/https 链接，最多512字节";
    }
  }
  return errors;
}
