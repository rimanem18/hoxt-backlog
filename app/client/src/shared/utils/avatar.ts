/**
 * 名前文字列からアバター用のHEXカラーを決定的に生成する。
 * djb2系ハッシュ関数で得たハッシュ値から色相(hue)を算出し、
 * 彩度・明度は固定してHSL→HEX変換する（白文字とのコントラストを一定にするため）。
 */
export function nameToAvatarColor(name: string): string {
  const safeName = typeof name === 'string' ? name : '';
  let hash = 5381;
  for (let i = 0; i < safeName.length; i++) {
    hash = (hash * 33) ^ safeName.charCodeAt(i);
  }
  const unsignedHash = hash >>> 0;
  const hue = unsignedHash % 360;
  return hslToHex(hue, 65, 45);
}

/**
 * HSLカラーをHEX形式(#RRGGBB)に変換する。
 */
function hslToHex(h: number, s: number, l: number): string {
  const sNorm = s / 100;
  const lNorm = l / 100;
  const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lNorm - c / 2;

  let r = 0;
  let g = 0;
  let b = 0;

  if (h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (h < 300) {
    r = x;
    g = 0;
    b = c;
  } else {
    r = c;
    g = 0;
    b = x;
  }

  const toHex = (value: number): string => {
    const scaled = Math.round((value + m) * 255);
    return scaled.toString(16).padStart(2, '0');
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * 名前の先頭1文字を抽出する。
 * サロゲートペア（絵文字等）を壊さずに先頭1文字を取得し、
 * ラテン文字は大文字化する。
 */
export function extractInitial(name: string): string {
  const trimmed = typeof name === 'string' ? name.trim() : '';
  if (!trimmed) {
    return '?';
  }
  const firstChar = Array.from(trimmed)[0];
  // toUpperCase()は'ß'→'SS'のように複数文字へ展開されうるため、再度先頭1文字に絞る
  return Array.from(firstChar.toUpperCase())[0];
}
