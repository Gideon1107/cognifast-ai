/**
 * Web Scraper Service
 * Handles fetching and extracting text content from web pages
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import { createLogger } from '../utils/logger';

const logger = createLogger('WEB-SCRAPER-SERVICE');

export class WebScraperService {
  /**
   * Scrape text content from a web page URL
   * @param url - The URL to scrape
   * @returns Extracted text content
   */
  static async scrapeUrl(url: string): Promise<string> {
    try {
      logger.info(`Scraping URL: ${url}`);

      // Validate URL format
      if (!this.isValidUrl(url)) {
        throw new Error(`Invalid URL format: ${url}`);
      }

      // Fetch the HTML content
      const response = await axios.get(url, {
        timeout: 30000, // 30 second timeout
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
        },
        maxRedirects: 5,
        validateStatus: (status) => status >= 200 && status < 400, // Accept 2xx and 3xx
      });

      if (!response.data) {
        throw new Error('No content received from URL');
      }

      // Parse HTML with cheerio
      const $ = cheerio.load(response.data);

      // Remove unwanted elements (scripts, styles, nav, footer, etc.)
      $('script, style, nav, footer, header, aside, .advertisement, .ads, [class*="ad-"], [id*="ad-"]').remove();

      // Extract text from main content areas (prioritize semantic HTML5 elements)
      const contentSelectors = [
        'main',
        'article',
        '[role="main"]',
        '.content',
        '.main-content',
        '#content',
        '#main',
        'body',
      ];

      let textContent = '';

      // Try to find content in semantic elements first
      for (const selector of contentSelectors) {
        const element = $(selector).first();
        if (element.length > 0) {
          textContent = this.extractTextFromElement($, element as any);
          if (textContent.trim().length > 100) {
            // Found substantial content
            break;
          }
        }
      }

      // Fallback: extract from body if no substantial content found
      if (textContent.trim().length < 100) {
        textContent = this.extractTextFromElement($, $('body') as any);
      }

      // Clean up the text
      textContent = this.cleanText(textContent);

      if (textContent.trim().length === 0) {
        throw new Error('No text content could be extracted from the URL');
      }

      logger.info(`Successfully scraped ${textContent.length} characters from ${url}`);
      return textContent;
    } catch (error: any) {
      logger.error(`Failed to scrape URL ${url}: ${error.message}`);
      
      if (error.response) {
        // HTTP error response
        throw new Error(`HTTP ${error.response.status}: ${error.response.statusText}`);
      } else if (error.request) {
        // Request made but no response
        throw new Error('No response received from URL (timeout or network error)');
      } else {
        // Error in request setup
        throw new Error(`Scraping failed: ${error.message}`);
      }
    }
  }

  /**
   * Extract text from a cheerio element, preserving structure
   */
  private static extractTextFromElement($: ReturnType<typeof cheerio.load>, element: any): string {
    // Clone to avoid modifying original
    const clone = (element as any).clone();

    // Remove unwanted nested elements
    clone.find('script, style, nav, footer, header, aside, .advertisement, .ads').remove();

    // Get text content
    let text = clone.text();

    // Preserve some structure - convert headings and paragraphs
    clone.find('h1, h2, h3, h4, h5, h6').each((_index: number, el: cheerio.Element) => {
      const heading = $(el);
      const headingText = heading.text().trim();
      if (headingText) {
        text = text.replace(headingText, `\n\n${headingText}\n`);
      }
    });

    clone.find('p').each((_index: number, el: cheerio.Element) => {
      const paragraph = $(el);
      const paraText = paragraph.text().trim();
      if (paraText) {
        text = text.replace(paraText, `\n\n${paraText}`);
      }
    });

    clone.find('li').each((_index: number, el: cheerio.Element) => {
      const listItem = $(el);
      const itemText = listItem.text().trim();
      if (itemText) {
        text = text.replace(itemText, `\n- ${itemText}`);
      }
    });

    return text;
  }

  /**
   * Clean extracted text
   */
  private static cleanText(text: string): string {
    return text
      // Remove excessive whitespace
      .replace(/\s+/g, ' ')
      // Remove excessive newlines (more than 2 consecutive)
      .replace(/\n{3,}/g, '\n\n')
      // Trim each line
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .join('\n')
      .trim();
  }

  /**
   * Validate URL format
   */
  private static isValidUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  }

  /**
   * Get page title from URL
   */
  static async getPageTitle(url: string): Promise<string> {
    try {
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        maxRedirects: 5,
      });

      const $ = cheerio.load(response.data);
      const title = $('title').text().trim() || $('h1').first().text().trim();
      
      return title || new URL(url).hostname;
    } catch (error: any) {
      logger.warn(`Failed to get page title for ${url}: ${error.message}`);
      return new URL(url).hostname;
    }
  }
}

