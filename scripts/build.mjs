import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import * as cheerio from "cheerio";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(projectRoot, "dist");
const siteOrigin = "https://www.rephora.app";
const locales = ["en", "es", "pt", "de", "fr"];
const localePaths = {
  en: "/",
  es: "/es/",
  pt: "/pt/",
  de: "/de/",
  fr: "/fr/"
};
const openGraphLocales = {
  en: "en_US",
  es: "es_ES",
  pt: "pt_BR",
  de: "de_DE",
  fr: "fr_FR"
};

function loadTranslations(source) {
  const marker = "const supportedLocales = Object.keys(translations);";
  const end = source.indexOf(marker);
  if (end === -1) throw new Error("Could not locate the translation boundary in app.js");

  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(`${source.slice(0, end)}\nglobalThis.__translations = translations;`, sandbox);
  return sandbox.__translations;
}

function requireTranslation(dictionary, key, locale) {
  const value = dictionary[key];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Missing translation for ${locale}:${key}`);
  }
  return value;
}

function localizedDocument(template, translations, locale) {
  const dictionary = translations[locale];
  const canonicalUrl = `${siteOrigin}${localePaths[locale]}`;
  const $ = cheerio.load(template, { decodeEntities: false });

  $("html").attr("lang", locale);
  $("title").text(requireTranslation(dictionary, "meta.title", locale));

  $("[data-i18n]").each((_, element) => {
    const key = $(element).attr("data-i18n");
    $(element).text(requireTranslation(dictionary, key, locale));
  });
  $("[data-i18n-content]").each((_, element) => {
    const key = $(element).attr("data-i18n-content");
    $(element).attr("content", requireTranslation(dictionary, key, locale));
  });
  $("[data-i18n-aria]").each((_, element) => {
    const key = $(element).attr("data-i18n-aria");
    $(element).attr("aria-label", requireTranslation(dictionary, key, locale));
  });
  $("[data-i18n-tooltip]").each((_, element) => {
    const key = $(element).attr("data-i18n-tooltip");
    const value = requireTranslation(dictionary, key, locale);
    $(element).attr("data-library-tooltip", value).attr("aria-description", value);
  });
  $("[data-i18n-alt]").each((_, element) => {
    const key = $(element).attr("data-i18n-alt");
    $(element).attr("alt", requireTranslation(dictionary, key, locale));
  });

  $("link[rel='canonical']").attr("href", canonicalUrl);
  $("link[data-generated-hreflang]").remove();
  const canonical = $("link[rel='canonical']");
  for (const alternateLocale of locales) {
    canonical.after(`<link rel="alternate" hreflang="${alternateLocale}" href="${siteOrigin}${localePaths[alternateLocale]}" data-generated-hreflang>`);
  }
  canonical.after(`<link rel="alternate" hreflang="x-default" href="${siteOrigin}/" data-generated-hreflang>`);

  $("meta[property='og:url']").attr("content", canonicalUrl);
  $("meta[property='og:locale'], meta[property='og:locale:alternate']").remove();
  $("meta[property='og:site_name']").after(`<meta property="og:locale" content="${openGraphLocales[locale]}">`);
  for (const alternateLocale of locales.filter((candidate) => candidate !== locale)) {
    $("meta[property='og:locale']").after(`<meta property="og:locale:alternate" content="${openGraphLocales[alternateLocale]}">`);
  }

  $("[data-locale]").val(locale);
  $("[data-locale]").attr("aria-label", requireTranslation(dictionary, "locale.label", locale));
  const badgeLabel = `${requireTranslation(dictionary, "download.get", locale)} Google Play`;
  $("[data-play-badge]").attr({ src: `/assets/play-badges/${locale}.png`, alt: badgeLabel });
  $("[data-play-badge-link]").attr("aria-label", badgeLabel);

  const structuredDataElement = $("script[type='application/ld+json']").first();
  const structuredData = JSON.parse(structuredDataElement.html());
  const application = structuredData["@graph"]?.find((entity) => entity["@id"] === `${siteOrigin}/#application`);
  if (!application) throw new Error("Could not locate the Rephora application entity");
  application.mainEntityOfPage = { "@id": canonicalUrl };
  application.description = requireTranslation(dictionary, "meta.description", locale);
  application.inLanguage = locale;
  structuredDataElement.text(JSON.stringify(structuredData, null, 2));

  return $.html();
}

async function build() {
  const [template, appSource] = await Promise.all([
    readFile(path.join(projectRoot, "index.html"), "utf8"),
    readFile(path.join(projectRoot, "app.js"), "utf8")
  ]);
  const translations = loadTranslations(appSource);

  for (const locale of locales) {
    if (!translations[locale]) throw new Error(`Missing ${locale} translation dictionary`);
  }

  await rm(outputRoot, { recursive: true, force: true });
  await mkdir(outputRoot, { recursive: true });

  await Promise.all([
    cp(path.join(projectRoot, "assets"), path.join(outputRoot, "assets"), { recursive: true }),
    cp(path.join(projectRoot, "app.js"), path.join(outputRoot, "app.js")),
    cp(path.join(projectRoot, "styles.css"), path.join(outputRoot, "styles.css")),
    cp(path.join(projectRoot, "robots.txt"), path.join(outputRoot, "robots.txt")),
    cp(path.join(projectRoot, "sitemap.xml"), path.join(outputRoot, "sitemap.xml"))
  ]);

  for (const locale of locales) {
    const relativeDirectory = localePaths[locale] === "/" ? "" : locale;
    const destinationDirectory = path.join(outputRoot, relativeDirectory);
    await mkdir(destinationDirectory, { recursive: true });
    await writeFile(
      path.join(destinationDirectory, "index.html"),
      localizedDocument(template, translations, locale),
      "utf8"
    );
  }

  console.log(`Built ${locales.length} localized pages in ${path.relative(projectRoot, outputRoot)}/`);
}

await build();
