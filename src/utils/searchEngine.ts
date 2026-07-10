import { Document } from '../types';

export interface SearchResult {
  answer: string;
  source: string;
}

export function searchDocuments(query: string, documents: Document[]): SearchResult | null {
  const cleanQuery = query.trim().toLowerCase();
  if (!cleanQuery) return null;

  // Split query into keywords
  const keywords = cleanQuery
    .split(/\s+/)
    .filter((word) => word.length > 2)
    .map((w) => w.replace(/[^a-zA-Z0-9]/g, ''));

  if (keywords.length === 0) return null;

  let bestDoc: Document | null = null;
  let maxMatches = 0;

  for (const doc of documents) {
    if (!doc.text) continue;
    const textLower = doc.text.toLowerCase();
    let matches = 0;

    for (const keyword of keywords) {
      if (textLower.includes(keyword)) {
        matches++;
      }
    }

    // Weight match based on doc name as well
    if (doc.name.toLowerCase().includes(cleanQuery)) {
      matches += 3;
    }

    if (matches > maxMatches) {
      maxMatches = matches;
      bestDoc = doc;
    }
  }

  if (bestDoc && maxMatches > 0) {
    const text = bestDoc.text || '';
    const textLower = text.toLowerCase();
    
    // Attempt to locate a high-quality relevant snippet or paragraph
    let snippet = '';
    let matchIndex = -1;

    for (const keyword of keywords) {
      const idx = textLower.indexOf(keyword);
      if (idx !== -1) {
        matchIndex = idx;
        break;
      }
    }

    if (matchIndex !== -1) {
      // Find starting boundary (e.g. start of a line or sentence)
      let start = Math.max(0, matchIndex - 120);
      let end = Math.min(text.length, matchIndex + 380);

      snippet = text.substring(start, end).trim();
      
      if (start > 0) snippet = '...' + snippet;
      if (end < text.length) snippet = snippet + '...';
    } else {
      snippet = text.substring(0, 450) + '...';
    }

    // Clean up snippet formatting for professional display
    snippet = snippet.replace(/\s+/g, ' ').trim();

    const answer = `According to verified files in **${bestDoc.name}**:\n\n${snippet}\n\n*This operational data has been extracted directly from the system's index.*`;

    return {
      answer,
      source: bestDoc.name,
    };
  }

  return null;
}
