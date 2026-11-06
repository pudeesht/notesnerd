const MIRRORED = [
  "boxSizing", "width", "paddingTop", "paddingRight", "paddingBottom", "paddingLeft",
  "borderTopWidth", "borderRightWidth", "borderBottomWidth", "borderLeftWidth",
  "fontFamily", "fontSize", "fontWeight", "fontStyle", "letterSpacing", "lineHeight",
  "tabSize", "textIndent", "textTransform", "wordSpacing",
] as const;

/** Pixel position of a textarea caret, relative to the textarea's top-left, via a hidden mirror div. */
export function caretCoords(ta: HTMLTextAreaElement, pos: number) {
  const style = getComputedStyle(ta);
  const div = document.createElement("div");
  for (const p of MIRRORED) div.style[p] = style[p];
  Object.assign(div.style, { position: "absolute", visibility: "hidden", top: "0", left: "-9999px", whiteSpace: "pre-wrap", overflowWrap: "break-word" });
  div.textContent = ta.value.slice(0, pos);
  const marker = document.createElement("span");
  marker.textContent = ".";
  div.appendChild(marker);
  document.body.appendChild(div);
  const coords = {
    top: marker.offsetTop - ta.scrollTop,
    left: marker.offsetLeft - ta.scrollLeft,
    height: parseFloat(style.lineHeight) || 20,
  };
  div.remove();
  return coords;
}
