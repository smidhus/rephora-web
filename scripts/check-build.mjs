import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as cheerio from "cheerio";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(projectRoot, "dist");
const siteOrigin = "https://www.rephora.app";
const iosStoreUrl = "https://apps.apple.com/app/id6819848216";
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
  const structuredData = JSON.parse($("script[type='application/ld+json']").first().html());
  const graph = structuredData["@graph"];
  assert(Array.isArray(graph), `${locale}: structured data graph is missing`);
  const website = graph.find((entity) => entity["@id"] === `${siteOrigin}/#website`);
  const organization = graph.find((entity) => entity["@id"] === "https://www.smidhus.com/#organization");
  const application = graph.find((entity) => entity["@id"] === `${siteOrigin}/#application`);
  assert(website?.["@type"] === "WebSite", `${locale}: WebSite entity is missing`);
  assert(website?.name === "Rephora", `${locale}: invalid website name`);
  assert(website?.alternateName === "rephora.app", `${locale}: invalid website alternate name`);
  assert(website?.url === `${siteOrigin}/`, `${locale}: invalid website URL`);
  assert(organization?.["@type"] === "Organization", `${locale}: Organization entity is missing`);
  assert(application?.["@type"] === "MobileApplication", `${locale}: MobileApplication entity is missing`);
  assert(application?.name === "Rephora", `${locale}: invalid application name`);
  assert(application?.mainEntityOfPage?.["@id"] === expectedCanonical, `${locale}: invalid application page reference`);
  assert(application?.inLanguage === locale, `${locale}: invalid application language`);
  assert(application?.publisher?.["@id"] === organization?.["@id"], `${locale}: invalid application publisher`);
  assert(application?.operatingSystem?.includes("Android"), `${locale}: Android platform is missing`);
  assert(application?.operatingSystem?.includes("iOS"), `${locale}: iOS platform is missing`);
  assert(application?.sameAs?.includes("https://play.google.com/store/apps/details?id=com.smidhus.rephora"), `${locale}: Google Play identity is missing`);
  assert(application?.sameAs?.includes(iosStoreUrl), `${locale}: App Store identity is missing`);
  assert(application?.downloadUrl?.includes(iosStoreUrl), `${locale}: App Store download URL is missing`);
  assert($("[data-ios-store-link]").length === 2, `${locale}: expected two App Store links`);
  $("[data-ios-store-link]").each((_, element) => {
    assert($(element).attr("href") === iosStoreUrl, `${locale}: invalid App Store link`);
    assert($(element).attr("aria-label")?.endsWith("App Store"), `${locale}: missing App Store label`);
  });
}

for (const asset of [
  "app.js",
  "styles.css",
  "robots.txt",
  "sitemap.xml",
  "assets/app-icon.webp",
  "assets/app-icon-96.webp",
  "assets/raphi-ordered.webp",
  "assets/raphi-challenge.webp",
  "assets/rephora-radio.webp",
  "assets/web-images/hero/raphi.webp"
]) {
  await access(path.join(outputRoot, asset));
}

console.log(`Validated ${locales.length} localized pages and shared assets.`);
