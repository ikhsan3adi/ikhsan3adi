import { mkdirSync } from 'fs';
import { HttpService } from './src/core/http-service';
import { Renderer } from './src/core/renderer';
import { exportToSVG } from './src/core/exporter';
import { createCard, listCards } from './src/cards';

function getRequired(name: string): string {
  const val = process.env[name];
  if (!val) {
    console.error(`Missing ${name}`);
    process.exit(1);
  }
  return val;
}

function getHttp(cardId: string): HttpService {
  switch (cardId) {
    case 'github-stats':
      return new HttpService(process.env.GITHUB_TOKEN);
    case 'codeberg-stats':
      return new HttpService(process.env.CODEBERG_TOKEN);
    case 'gitlab-stats':
      return new HttpService(process.env.GITLAB_TOKEN);
    default:
      return new HttpService();
  }
}

function getUsername(cardId: string): string {
  switch (cardId) {
    case 'github-stats':
      return getRequired('GITHUB_USERNAME');
    case 'codeberg-stats':
      return getRequired('CODEBERG_USERNAME');
    case 'gitlab-stats':
      return getRequired('GITLAB_USERNAME');
    default:
      return ''
  }
}

async function main() {
  const cardIds = (process.env.CARD_IDS || 'github-stats')
    .split(',')
    .map((s) => s.trim());

  mkdirSync('./profiles', { recursive: true });

  const renderer = new Renderer();

  for (const cardId of cardIds) {
    if (!listCards().includes(cardId)) {
      console.error(
        `Card not found: ${cardId}. Available: ${listCards().join(', ')}`
      );
      process.exit(1);
    }

    const username = getUsername(cardId);
    const http = getHttp(cardId);
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
