import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import * as cheerio from 'cheerio';
import { validateUrlForSsrf } from './urlSafety.js';

const DEFAULT_FETCH_TIMEOUT_MS = 15000;
const DEFAULT_MAX_SOURCE_CHARS = 30000;
const DEFAULT_MAX_SOURCE_BYTES = 5242880; // 5MB cap
const MAX_REDIRECTS = 3;

/**
 * Normalizes extracted text by trimming extra whitespace and blank lines.
 */
export function normalizeExtractedText(text) {
  if (!text) return '';
  return text
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    .trim();
}

/**
 * Fetches a URL with SSRF checks on every hop, redirect limiting, size limits, and timeouts.
 */
export async function safeFetchHtml(initialUrl, options = {}) {
  const timeoutMs = options.timeoutMs || parseInt(process.env.FETCH_TIMEOUT_MS, 10) || DEFAULT_FETCH_TIMEOUT_MS;
  const maxBytes = options.maxBytes || parseInt(process.env.MAX_SOURCE_BYTES, 10) || DEFAULT_MAX_SOURCE_BYTES;

  let currentUrl = initialUrl;
  let redirectCount = 0;

  while (redirectCount <= MAX_REDIRECTS) {
    // 1. SSRF check on current URL
    const safetyCheck = await validateUrlForSsrf(currentUrl);
    if (!safetyCheck.valid) {
      throw new Error(`SSRF Blocked: ${safetyCheck.error}`);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    let response;
    try {
      response = await fetch(currentUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 AI-Editorial-Workspace/1.0',
          'Accept': 'text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        redirect: 'manual', // We handle redirects manually to re-verify SSRF on each hop
        signal: controller.signal,
      });
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new Error(`Request timed out after ${timeoutMs}ms`);
      }
      throw new Error(`Fetch failed: ${err.message}`);
    } finally {
      clearTimeout(timeoutId);
    }

    // Handle redirects
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      redirectCount++;
      if (redirectCount > MAX_REDIRECTS) {
        throw new Error(`Exceeded maximum allowed redirects (${MAX_REDIRECTS})`);
      }
      const location = response.headers.get('location');
      if (!location) {
        throw new Error(`Redirect status ${response.status} missing Location header`);
      }
      // Resolve relative redirect
      try {
        currentUrl = new URL(location, currentUrl).toString();
      } catch {
        throw new Error(`Invalid redirect Location URL: ${location}`);
      }
      continue;
    }

    if (!response.ok) {
      throw new Error(`HTTP Error ${response.status} ${response.statusText}`);
    }

    // Verify content type
    const contentType = (response.headers.get('content-type') || '').toLowerCase();
    const isHtml = contentType.includes('text/html') || contentType.includes('application/xhtml+xml');
    const isPlain = contentType.includes('text/plain');

    if (!isHtml && !isPlain) {
      throw new Error(`Unsupported content type: '${contentType}'. Only HTML and plain text are supported.`);
    }

    // Read response body with byte cap
    const reader = response.body.getReader();
    const chunks = [];
    let bytesReceived = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        if (bytesReceived + value.length > maxBytes) {
          // Cap at maxBytes and stop reading further to protect memory without failing the source
          const remaining = maxBytes - bytesReceived;
          if (remaining > 0) {
            chunks.push(value.slice(0, remaining));
            bytesReceived += remaining;
          }
          break;
        }

        bytesReceived += value.length;
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }

    const totalBuffer = new Uint8Array(bytesReceived);
    let offset = 0;
    for (const chunk of chunks) {
      totalBuffer.set(chunk, offset);
      offset += chunk.length;
    }

    const decoder = new TextDecoder('utf-8');
    const bodyText = decoder.decode(totalBuffer);

    return {
      body: bodyText,
      finalUrl: currentUrl,
      isHtml,
    };
  }

  throw new Error(`Exceeded maximum redirects`);
}

/**
 * Extracts readable article content and title from raw HTML.
 */
export function extractArticleFromHtml(html, url) {
  let title = '';
  let content = '';
  let canonicalUrl = url;

  try {
    // 1. First attempt with Readability for high-quality article extraction
    const dom = new JSDOM(html, { url });
    const reader = new Readability(dom.window.document);
    const parsed = reader.parse();

    if (parsed && parsed.textContent && parsed.textContent.trim().length > 200) {
      title = parsed.title ? parsed.title.trim() : '';
      content = normalizeExtractedText(parsed.textContent);
    }
  } catch (err) {
    // Readability failed; proceed to cheerio fallback
  }

  // 2. Fallback / Canonical extraction using Cheerio
  try {
    const $ = cheerio.load(html);

    // Canonical link
    const canonical = $('link[rel="canonical"]').attr('href');
    if (canonical) {
      try {
        canonicalUrl = new URL(canonical, url).toString();
      } catch {
        // ignore invalid canonical URL
      }
    }

    if (!title) {
      title = $('meta[property="og:title"]').attr('content') ||
              $('title').text() ||
              $('h1').first().text() ||
              '';
      title = title.trim();
    }

    if (!content || content.length < 200) {
      // Remove boilerplate elements
      $('script, style, noscript, nav, footer, header, svg, iframe, form').remove();

      // Look for common main article containers
      const mainContent = $('article, main, .article-content, .post-content, #content, [role="main"]');
      if (mainContent.length > 0) {
        content = normalizeExtractedText(mainContent.text());
      } else {
        content = normalizeExtractedText($('body').text());
      }
    }
  } catch {
    // ignore Cheerio parse errors
  }

  return {
    title: title || 'Untitled Source',
    content: content || '',
    canonicalUrl,
  };
}

/**
 * Extracts content from a single input source (URL or pasted text).
 */
export async function extractSource(sourceInput, index) {
  const id = sourceInput.id || `src-${index + 1}`;
  const maxChars = parseInt(process.env.MAX_SOURCE_CHARS, 10) || DEFAULT_MAX_SOURCE_CHARS;

  // Case A: Pasted Text
  if (sourceInput.type === 'text') {
    const rawText = normalizeExtractedText(sourceInput.value);
    const textLength = rawText.length;
    const truncated = textLength > maxChars;
    const content = truncated ? rawText.slice(0, maxChars) : rawText;

    let status = 'ok';
    let reason;

    if (textLength < 50) {
      status = 'failed';
      reason = 'Pasted text is too short (under 50 characters). Please provide a more detailed excerpt.';
    } else if (textLength < 400) {
      status = 'partial';
      reason = 'Pasted text is under 400 characters; editorial context may be limited.';
    }

    const firstLine = rawText.split('\n')[0].slice(0, 80).trim();
    const title = sourceInput.label || (firstLine ? `Snippet: ${firstLine}...` : `Pasted Source #${index + 1}`);

    return {
      id,
      type: 'text',
      url: null,
      title,
      text: content,
      textLength: content.length,
      originalLength: textLength,
      truncated,
      status,
      reason,
    };
  }

  // Case B: URL
  const url = sourceInput.value.trim();
  const isSocialOrTwitter = /(twitter\.com|x\.com)/i.test(url);

  try {
    const { body, finalUrl, isHtml } = await safeFetchHtml(url);

    let title = sourceInput.label || '';
    let extractedText = '';
    let canonical = finalUrl;

    if (isHtml) {
      const extracted = extractArticleFromHtml(body, finalUrl);
      title = title || extracted.title;
      extractedText = extracted.content;
      canonical = extracted.canonicalUrl || finalUrl;
    } else {
      extractedText = normalizeExtractedText(body);
      title = title || `Plain Text Document (${new URL(finalUrl).hostname})`;
    }

    const textLength = extractedText.length;
    const truncated = textLength > maxChars;
    const content = truncated ? extractedText.slice(0, maxChars) : extractedText;

    let status = 'ok';
    let reason;

    if (textLength < 50) {
      status = 'failed';
      reason = isSocialOrTwitter
        ? 'X/Twitter links cannot be scraped due to authentication walls. Please paste the tweet/post text directly.'
        : 'Article content unavailable or too short (under 50 characters). Please paste the full article text.';
    } else if (textLength < 400) {
      // Treat short extracts as failed for URL sources to avoid using insufficient evidence
      status = 'failed';
      reason = 'Extracted content is insufficient (<400 characters). Please paste the full article text for reliable research.';
    }

    return {
      id,
      type: 'url',
      url: canonical,
      title: title || 'Untitled Article',
      text: content,
      textLength: content.length,
      originalLength: textLength,
      truncated,
      status,
      reason,
    };
  } catch (err) {
    const isTwitterFailure = isSocialOrTwitter;
    return {
      id,
      type: 'url',
      url,
      title: sourceInput.label || url,
      text: '',
      textLength: 0,
      originalLength: 0,
      truncated: false,
      status: 'failed',
      reason: isTwitterFailure
        ? 'X/Twitter links cannot be scraped directly. Please paste the tweet or thread text instead.'
        : `Extraction failed: ${err.message}. Please paste the article text directly.`,
    };
  }
}

/**
 * Processes an array of source inputs.
 */
export async function extractAllSources(sources) {
  const promises = sources.map((s, idx) => extractSource(s, idx));
  return Promise.all(promises);
}

