import { mkdirSync } from 'fs';
import { HttpService } from './src/core/http-service';
import { Renderer } from './src/core/renderer';
import { exportToSVG } from './src/core/exporter';
import { createCard, listCards } from './src/cards';

async function main() {
  const cardIds = (process.env.CARD_IDS || 'github-stats')
    .split(',')
    .map((s) => s.trim());
  const username = process.env.GITHUB_USERNAME;
  const token = process.env.GITHUB_TOKEN;

  if (cardIds.includes('github-stats') && (!username || !token)) {
    console.error(
      'Missing GITHUB_USERNAME or GITHUB_TOKEN for github-stats card'
    );
    process.exit(1);
  }

  mkdirSync('./profiles', { recursive: true });

  const http = new HttpService(token);
  const renderer = new Renderer();

  for (const cardId of cardIds) {
    if (!listCards().includes(cardId)) {
      console.error(
        `Card not found: ${cardId}. Available: ${listCards().join(', ')}`
      );
      process.exit(1);
    }

    const card = createCard(cardId, { username });
    console.log(`[${cardId}] Fetching data...`);
    const data = await card.fetchData(http);
    console.log(`[${cardId}] Data:`, data);

    console.log(`[${cardId}] Rendering light mode...`);
    const lightHtml = await renderer.renderCard(card, data, { dark: false });
    const lightPath = `./profiles/${cardId}.svg`;
    await exportToSVG(lightHtml, lightPath);
    console.log(`  -> ${lightPath}`);

    console.log(`[${cardId}] Rendering dark mode...`);
    const darkHtml = await renderer.renderCard(card, data, { dark: true });
    const darkPath = `./profiles/${cardId}-dark.svg`;
    await exportToSVG(darkHtml, darkPath);
    console.log(`  -> ${darkPath}`);
  }

  console.log('Done.');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
