import cheerio from 'cheerio';
import * as logger from './logger';

function validateAndLogTableHasTbody(rootNode: cheerio.Root, path: string) {
  const tables = rootNode('table');
  for (let i = 0; i < tables.length; i += 1) {
    const table = rootNode(tables[i]);
    if (table.find('tbody').length === 0) {
      // eslint-disable-next-line max-len
      logger.error(`Invalid HTML in ${path}. Table must have a tbody tag. Please correct this to avoid vue hydration issues.`);
    }
  }
}

export function checkForVueHydrationWithRules(content: string, path: string) {
  const $ = cheerio.load(content);
  validateAndLogTableHasTbody($, path);
}
