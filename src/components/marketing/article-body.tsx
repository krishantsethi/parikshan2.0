import type { ArticleBlock } from "@/content/articles";

/** Renders structured article blocks — no HTML injection anywhere. */
export function ArticleBody({ blocks }: { blocks: ArticleBlock[] }) {
  return (
    <div className="pk-prose">
      {blocks.map((block, index) => {
        switch (block.type) {
          case "h2":
            return (
              <h2 key={index} id={`section-${index}`}>
                {block.text}
              </h2>
            );
          case "ul":
            return (
              <ul key={index}>
                {block.items.map((item, itemIndex) => (
                  <li key={itemIndex}>{item}</li>
                ))}
              </ul>
            );
          case "note":
            return (
              <blockquote key={index} className="rounded-r-lg bg-panel/60 py-2">
                {block.text}
              </blockquote>
            );
          default:
            return <p key={index}>{block.text}</p>;
        }
      })}
    </div>
  );
}
