import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as cheerio from "cheerio";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(projectRoot, "dist");
const siteOrigin = "https://www.rephora.app";
const localePaths = { en: "/", es: "/es/", pt: "/pt/", de: "/de/", fr: "/fr/" };
const locales = Object.keys(localePaths);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

for (const locale of locales) {
  const relativeDirectory = localePaths[locale] === "/" ? "" : locale;
  const filePath = path.join(outputRoot, relativeDirectory, "index.html");
  const html = await readFile(filePath, "utf8");
  const $ = cheerio.load(html);
  const expectedCanonical = `${siteOrigin}${localePaths[locale]}`;

  assert($("html").attr("lang") === locale, `${locale}: invalid html lang`);
  assert($("title").text().trim().length > 0, `${locale}: missing title`);
  assert($("meta[name='description']").attr("content")?.length > 0, `${locale}: missing description`);
  assert($("link[rel='canonical']").attr("href") === expectedCanonical, `${locale}: invalid canonical`);
  assert($("meta[property='og:url']").attr("content") === expectedCanonical, `${locale}: invalid og:url`);
  assert($("link[rel='alternate'][hreflang]").length === locales.length + 1, `${locale}: incomplete hreflang cluster`);
  assert($("link[rel='alternate'][hreflang='x-default']").attr("href") === `${siteOrigin}/`, `${locale}: invalid x-default`);
  for (const alternateLocale of locales) {
    assert(
      $("link[rel='alternate']").filter((_, element) => $(element).attr("hreflang") === alternateLocale).attr("href") === `${siteOrigin}${localePaths[alternateLocale]}`,
      `${locale}: missing ${alternateLocale} alternate`
    );
  }
  assert($("[data-locale]").val() === locale, `${locale}: locale selector is not selected`);
  assert(!html.includes("undefined"), `${locale}: generated output contains undefined`);
  JSON.parse($("script[type='application/ld+json']").first().html());
}

for (const asset of ["app.js", "styles.css", "robots.txt", "sitemap.xml", "assets/app-icon.webp"]) {
  await access(path.join(outputRoot, asset));
}

console.log(`Validated ${locales.length} localized pages and shared assets.`);
