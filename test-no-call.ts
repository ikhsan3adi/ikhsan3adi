import { mkdirSync, writeFileSync } from 'fs';
import { exportToSVG } from './src/core/exporter';
import { Renderer } from './src/core/renderer';
import { createCard, listCards } from './src/cards';
import { HttpService } from './src/core/http-service';

const mockData: Record<string, Record<string, unknown>> = {
  'github-stats': {
    username: 'ikhsan3adi',
    totalStars: 935,
    totalCommits: 13650,
    totalForks: 295,
    totalPRs: 208,
    fetchedAt: '21 May 2026 at 09.21 WIB'
  }
};

async function main() {
  const cardIds = (process.env.CARD_IDS || 'github-stats')
    .split(',')
    .map((s) => s.trim());

  mkdirSync('./profiles', { recursive: true });

  const renderer = new Renderer();
  const http = new HttpService();

  for (const cardId of cardIds) {
    if (!listCards().includes(cardId)) {
      console.error(`Card not found: ${cardId}`);
      process.exit(1);
    }

    const card = createCard(cardId);

    let data: Record<string, unknown>;
    if (cardId === 'wordmark') {
      data = await card.fetchData(http);
    } else {
      data = mockData[cardId];
      if (!data) {
        console.error(`No mock data defined for card "${cardId}"`);
        process.exit(1);
      }
    }

    console.log(`[${cardId}] Rendering light mode...`);
    const lightHtml = await renderer.renderCard(card, data, { dark: false });
    writeFileSync(`./profiles/${cardId}.html`, lightHtml, 'utf-8');
    const lightPath = `./profiles/${cardId}.svg`;
    await exportToSVG(lightHtml, lightPath);
    console.log(`  -> ${lightPath}`);

    console.log(`[${cardId}] Rendering dark mode...`);
    const darkHtml = await renderer.renderCard(card, data, { dark: true });
    writeFileSync(`./profiles/${cardId}-dark.html`, darkHtml, 'utf-8');
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
