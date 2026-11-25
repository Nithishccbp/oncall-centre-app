// Turns "**bold**" markers into <strong> nodes without dangerouslySetInnerHTML.
export default function renderFormatted(text: any) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part: any, i: any) =>
    part.startsWith('**') && part.endsWith('**') ? <strong key={i}>{part.slice(2, -2)}</strong> : part,
  );
}
